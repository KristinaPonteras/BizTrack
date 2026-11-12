<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockMovementController extends Controller
{
    // Display inventory movement history
    public function index(Request $request)
    {
        $request->validate([
            'product_id' => 'nullable|integer|exists:products,id',
            'movement_type' => 'nullable|in:stock_in,stock_out',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $movements = StockMovement::with([
            'product.category',
            'user:id,name'
        ])
            ->when($request->product_id, function ($query, $productId) {
                $query->where('product_id', $productId);
            })
            ->when($request->movement_type, function ($query, $type) {
                $query->where('movement_type', $type);
            })
            ->when($request->date_from, function ($query, $date) {
                $query->whereDate('movement_date', '>=', $date);
            })
            ->when($request->date_to, function ($query, $date) {
                $query->whereDate('movement_date', '<=', $date);
            })
            ->orderByDesc('movement_date')
            ->paginate($request->input('per_page', 10));

        return response()->json($movements, 200);
    }

    // Record stock-in or stock-out
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'movement_type' => 'required|in:stock_in,stock_out',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string|max:1000',
        ]);

        $result = DB::transaction(function () use ($validated, $request) {
            $product = Product::where('id', $validated['product_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $validated['movement_type'] === 'stock_out' &&
                $product->stock_quantity < $validated['quantity']
            ) {
                return [
                    'error' => 'Insufficient stock. Available quantity: '
                        . $product->stock_quantity,
                ];
            }

            if ($validated['movement_type'] === 'stock_in') {
                $product->increment('stock_quantity', $validated['quantity']);
            } else {
                $product->decrement('stock_quantity', $validated['quantity']);
            }

            $movement = StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $request->user()->id,
                'movement_type' => $validated['movement_type'],
                'quantity' => $validated['quantity'],
                'movement_date' => now(),
                'notes' => $validated['notes'] ?? null,
            ]);

            return [
                'movement' => $movement->load([
                    'product.category',
                    'user:id,name'
                ]),
                'product' => $product->fresh(),
            ];
        });

        if (isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], 422);
        }

        return response()->json([
            'message' => 'Inventory movement recorded successfully.',
            'data' => $result['movement'],
            'updated_product' => $result['product'],
        ], 201);
    }
}
