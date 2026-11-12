<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BizTrackSampleDataSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $user = DB::table('users')
                ->where('email', 'admin@biztrack.com')
                ->first();

            $category = DB::table('categories')->first();

            if (!$user || !$category) {
                throw new \RuntimeException('Administrator or category not found.');
            }

            $paymentMethods = ['cash', 'card', 'e_wallet', 'bank_transfer'];

            $expenseCategories = [
                'Utilities',
                'Supplies',
                'Rent',
                'Maintenance',
                'Transportation',
                'Internet',
            ];

            for ($i = 1; $i <= 49; $i++) {
                $sku = 'BT-SAMPLE-' . str_pad($i, 3, '0', STR_PAD_LEFT);

                $product = DB::table('products')
                    ->where('sku', $sku)
                    ->first();

                if (!$product) {
                    $cost = 10 + ($i % 10) * 2;
                    $price = $cost + 10;

                    $productId = DB::table('products')->insertGetId([
                        'category_id' => $category->id,
                        'product_name' => 'Sample Beverage ' . $i,
                        'sku' => $sku,
                        'cost_price' => $cost,
                        'selling_price' => $price,
                        'stock_quantity' => 100,
                        'reorder_level' => 10,
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $product = DB::table('products')
                        ->where('id', $productId)
                        ->first();
                }

                $openingExists = DB::table('stock_movements')
                    ->where('product_id', $product->id)
                    ->where('reference_type', 'sample_opening_stock')
                    ->exists();

                if (!$openingExists) {
                    DB::table('stock_movements')->insert([
                        'product_id' => $product->id,
                        'user_id' => $user->id,
                        'movement_type' => 'stock_in',
                        'quantity' => 100,
                        'reference_type' => 'sample_opening_stock',
                        'movement_date' => now()->toDateTimeString(),
                        'notes' => 'Sample opening stock',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $invoice = 'BT-SAMPLE-2026-' . str_pad($i, 3, '0', STR_PAD_LEFT);

                $quantity = ($i % 3) + 1;
                $subtotal = $product->selling_price * $quantity;

                $saleDate = now()
                    ->subMonths(($i - 1) % 6)
                    ->subDays(($i * 2) % 25);

                $sale = DB::table('sales')
                    ->where('invoice_number', $invoice)
                    ->first();

                if (!$sale) {
                    $saleId = DB::table('sales')->insertGetId([
                        'invoice_number' => $invoice,
                        'user_id' => $user->id,
                        'sale_date' => $saleDate->toDateTimeString(),
                        'total_amount' => $subtotal,
                        'payment_method' => $paymentMethods[$i % 4],
                        'status' => 'completed',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $saleId = $sale->id;
                }

                $itemExists = DB::table('sale_items')
                    ->where('sale_id', $saleId)
                    ->where('product_id', $product->id)
                    ->exists();

                if (!$itemExists) {
                    DB::table('sale_items')->insert([
                        'sale_id' => $saleId,
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $product->selling_price,
                        'unit_cost' => $product->cost_price,
                        'subtotal' => $subtotal,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $movementExists = DB::table('stock_movements')
                    ->where('product_id', $product->id)
                    ->where('reference_type', 'sample_sale')
                    ->where('reference_id', $saleId)
                    ->exists();

                if (!$movementExists) {
                    DB::table('stock_movements')->insert([
                        'product_id' => $product->id,
                        'user_id' => $user->id,
                        'movement_type' => 'stock_out',
                        'quantity' => $quantity,
                        'reference_type' => 'sample_sale',
                        'reference_id' => $saleId,
                        'movement_date' => $saleDate->toDateTimeString(),
                        'notes' => 'Sample sale stock deduction',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('products')
                        ->where('id', $product->id)
                        ->decrement('stock_quantity', $quantity);
                }

                $expenseName = 'Sample Expense ' . str_pad($i, 3, '0', STR_PAD_LEFT);

                $expenseExists = DB::table('expenses')
                    ->where('user_id', $user->id)
                    ->where('expense_name', $expenseName)
                    ->exists();

                if (!$expenseExists) {
                    DB::table('expenses')->insert([
                        'user_id' => $user->id,
                        'expense_name' => $expenseName,
                        'expense_category' => $expenseCategories[$i % 6],
                        'amount' => 200 + ($i * 25),
                        'expense_date' => $saleDate->toDateString(),
                        'description' => 'Sample business expense',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });

        echo "BizTrack sample data created successfully!";
    }
}
