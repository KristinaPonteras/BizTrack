<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'payment_method' => [
                'nullable',
                'in:cash,card,e_wallet,bank_transfer'
            ],
            'status' => ['nullable', 'in:completed,cancelled'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sales = Sale::with([
            'user:id,name',
            'saleItems.product'
        ])
            ->when($request->search, function ($query, $search) {
                $query->where('invoice_number', 'like', "%{$search}%");
            })
            ->when($request->payment_method, function ($query, $method) {
                $query->where('payment_method', $method);
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->date_from, function ($query, $date) {
                $query->whereDate('sale_date', '>=', $date);
            })
            ->when($request->date_to, function ($query, $date) {
                $query->whereDate('sale_date', '<=', $date);
            })
            ->latest('sale_date')
            ->paginate($request->input('per_page', 10));

        return response()->json($sales);
    }

    public function show(Sale $sale)
    {
        $sale->load([
            'user:id,name',
            'saleItems.product'
        ]);

        return response()->json([
            'message' => 'Sale retrieved successfully.',
            'data' => $sale
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sale_date' => ['nullable', 'date'],
            'payment_method' => [
                'required',
                'in:cash,card,e_wallet,bank_transfer'
            ],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                'distinct',
                'exists:products,id'
            ],
            'items.*.quantity' => [
                'required',
                'integer',
                'min:1'
            ],
        ]);

        $sale = DB::transaction(function () use ($validated, $request) {
            $invoiceNumber = 'SALE-' . now()->format('YmdHis')
                . '-' . strtoupper(Str::random(5));

            $sale = Sale::create([
                'invoice_number' => $invoiceNumber,
                'user_id' => $request->user()->id,
                'sale_date' => $validated['sale_date'] ?? now(),
                'total_amount' => 0,
                'payment_method' => $validated['payment_method'],
                'status' => 'completed',
            ]);

            $totalAmount = 0;

            foreach ($validated['items'] as $item) {
                $product = Product::whereKey($item['product_id'])
                    ->lockForUpdate()
                    ->first();

                if (!$product) {
                    throw ValidationException::withMessages([
                        'items' => ['A selected product could not be found.']
                    ]);
                }

                if ($product->status !== 'active') {
                    throw ValidationException::withMessages([
                        'items' => [
                            $product->product_name . ' is inactive and cannot be sold.'
                        ]
                    ]);
                }

                if ($product->stock_quantity < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => [
                            'Insufficient stock for ' . $product->product_name .
                            '. Available quantity: ' . $product->stock_quantity
                        ]
                    ]);
                }

                $quantity = $item['quantity'];
                $unitPrice = (float) $product->selling_price;
                $unitCost = (float) $product->cost_price;
                $subtotal = $unitPrice * $quantity;

                $sale->saleItems()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'unit_cost' => $unitCost,
                    'subtotal' => $subtotal,
                ]);

                $product->decrement('stock_quantity', $quantity);

                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'movement_type' => 'stock_out',
                    'quantity' => $quantity,
                    'reference_type' => 'sale',
                    'reference_id' => $sale->id,
                    'movement_date' => now(),
                    'notes' => 'Stock deducted from sale ' . $invoiceNumber,
                ]);

                $totalAmount += $subtotal;
            }

            $sale->update([
                'total_amount' => $totalAmount,
            ]);

            return $sale->load([
                'user:id,name',
                'saleItems.product'
            ]);
        });

        return response()->json([
            'message' => 'Sale recorded successfully.',
            'data' => $sale
        ], 201);
    }
}