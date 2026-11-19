<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StoreFlowCatalogSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            // Identify only records created by the old sample seeder.
            $sampleProductIds = DB::table('products')
                ->where('sku', 'like', 'BT-SAMPLE-%')
                ->pluck('id');

            $sampleSaleIds = DB::table('sales')
                ->where('invoice_number', 'like', 'BT-SAMPLE-2026-%')
                ->pluck('id');

            if ($sampleSaleIds->isNotEmpty()) {
                DB::table('sale_items')->whereIn('sale_id', $sampleSaleIds)->delete();
                DB::table('sales')->whereIn('id', $sampleSaleIds)->delete();
            }

            if ($sampleProductIds->isNotEmpty()) {
                DB::table('stock_movements')
                    ->whereIn('product_id', $sampleProductIds)
                    ->whereIn('reference_type', ['sample_opening_stock', 'sample_sale'])
                    ->delete();
            }

            DB::table('expenses')
                ->where('expense_name', 'like', 'Sample Expense %')
                ->delete();

            // Remove old sample products only when no remaining sale item refers to them.
            // Products linked to other sales are retained and renamed below where possible.
            $catalog = [
                ['Beverages', 'Coca-Cola Original Taste 1.5L', 'SF-CAT-0001'],
                ['Beverages', 'Sprite 1.5L', 'SF-CAT-0002'],
                ['Beverages', 'Royal Tru-Orange 1.5L', 'SF-CAT-0003'],
                ['Beverages', 'C2 Green Tea Apple 500mL', 'SF-CAT-0004'],
                ['Beverages', 'Wilkins Pure 1L', 'SF-CAT-0005'],
                ['Beverages', 'Great Taste White 3-in-1 Coffee', 'SF-CAT-0006'],

                ['Snacks', "Jack 'n Jill Piattos Cheese", 'SF-CAT-0007'],
                ['Snacks', 'Nova Multigrain', 'SF-CAT-0008'],
                ['Snacks', 'Chippy', 'SF-CAT-0009'],
                ['Snacks', 'Oishi Prawn Crackers', 'SF-CAT-0010'],
                ['Snacks', 'Rebisco Crackers', 'SF-CAT-0011'],
                ['Snacks', 'Fita Crackers', 'SF-CAT-0012'],

                ['Canned Goods', '555 Sardines in Tomato Sauce', 'SF-CAT-0013'],
                ['Canned Goods', 'Century Tuna Flakes in Oil', 'SF-CAT-0014'],
                ['Canned Goods', 'Argentina Corned Beef', 'SF-CAT-0015'],
                ['Canned Goods', 'Mega Sardines', 'SF-CAT-0016'],
                ['Canned Goods', 'Youngs Town Sardines', 'SF-CAT-0017'],

                ['Instant Foods', 'Lucky Me! Pancit Canton Kalamansi', 'SF-CAT-0018'],
                ['Instant Foods', 'Lucky Me! Supreme Chicken Noodles', 'SF-CAT-0019'],
                ['Instant Foods', 'Nissin Cup Noodles Seafood', 'SF-CAT-0020'],
                ['Instant Foods', 'Payless Pancit Canton', 'SF-CAT-0021'],

                ['Personal Care', 'Safeguard Pure White Soap', 'SF-CAT-0022'],
                ['Personal Care', 'Palmolive Naturals Shampoo', 'SF-CAT-0023'],
                ['Personal Care', 'Colgate Total Toothpaste', 'SF-CAT-0024'],
                ['Personal Care', 'Closeup Ever Fresh Toothpaste', 'SF-CAT-0025'],
                ['Personal Care', 'Cream Silk Conditioner', 'SF-CAT-0026'],

                ['Household Supplies', 'Joy Dishwashing Liquid', 'SF-CAT-0027'],
                ['Household Supplies', 'Surf Powder Detergent', 'SF-CAT-0028'],
                ['Household Supplies', 'Zonrox Original Bleach', 'SF-CAT-0029'],
                ['Household Supplies', 'Champion Powder Detergent', 'SF-CAT-0030'],
                ['Household Supplies', 'Sanicare Facial Tissue', 'SF-CAT-0031'],

                ['School Supplies', 'Mongol Pencil No. 2', 'SF-CAT-0032'],
                ['School Supplies', 'Pilot BP-1 RT Ballpoint Pen', 'SF-CAT-0033'],
                ['School Supplies', 'Faber-Castell 2B Pencil', 'SF-CAT-0034'],
                ['School Supplies', 'Corona Yellow Pad Paper', 'SF-CAT-0035'],
            ];

            $categoryIds = [];
            $categoryDescriptions = [
                'Beverages' => 'Drinks and beverage products',
                'Snacks' => 'Packaged snacks and crackers',
                'Canned Goods' => 'Canned and preserved food products',
                'Instant Foods' => 'Instant noodles and quick-preparation foods',
                'Personal Care' => 'Personal hygiene and care products',
                'Household Supplies' => 'Cleaning and household essentials',
                'School Supplies' => 'Basic school and stationery supplies',
            ];

            foreach ($categoryDescriptions as $name => $description) {
                $category = DB::table('categories')
                    ->where('category_name', $name)
                    ->first();

                if (!$category) {
                    $id = DB::table('categories')->insertGetId([
                        'category_name' => $name,
                        'description' => $description,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $id = $category->id;
                }

                $categoryIds[$name] = $id;
            }

            foreach ($catalog as [$categoryName, $productName, $sku]) {
                $existing = DB::table('products')->where('sku', $sku)->first();

                if (!$existing) {
                    DB::table('products')->insert([
                        'category_id' => $categoryIds[$categoryName],
                        'product_name' => $productName,
                        'sku' => $sku,
                        'cost_price' => 0,
                        'selling_price' => 0,
                        'stock_quantity' => 0,
                        'reorder_level' => 10,
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // Remove legacy sample products that no longer have sale history.
            if ($sampleProductIds->isNotEmpty()) {
                $stillReferenced = DB::table('sale_items')
                    ->whereIn('product_id', $sampleProductIds)
                    ->pluck('product_id')
                    ->unique();

                $safeToDelete = $sampleProductIds->diff($stillReferenced);
                if ($safeToDelete->isNotEmpty()) {
                    DB::table('products')->whereIn('id', $safeToDelete)->delete();
                }

                // Preserve any sample-labelled product tied to non-sample sale history.
                // Rename it so the sample placeholder is no longer displayed.
                foreach ($sampleProductIds->diff($safeToDelete) as $productId) {
                    $product = DB::table('products')->where('id', $productId)->first();
                    if (!$product) {
                        continue;
                    }

                    $number = (int) substr((string) $product->sku, strlen('BT-SAMPLE-'));
                    if ($number >= 1 && $number <= count($catalog)) {
                        [$categoryName, $productName] = $catalog[$number - 1];
                        DB::table('products')->where('id', $productId)->update([
                            'category_id' => $categoryIds[$categoryName],
                            'product_name' => $productName,
                            'sku' => 'SF-LEGACY-' . str_pad((string) $number, 4, '0', STR_PAD_LEFT),
                            'updated_at' => now(),
                        ]);
                    } else {
                        DB::table('products')->where('id', $productId)->update([
                            'product_name' => 'Archived Product ' . $number,
                            'status' => 'inactive',
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            // Delete the old Beverages category only if it is genuinely unused.
            $oldBeverages = DB::table('categories')
                ->where('category_name', 'Beverages')
                ->first();

            // Beverages is retained as a valid category in the new catalog.
        });
    }
}
