<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StoreFlowCatalogSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            // Identify records created by the old sample seeder.
            $sampleProductIds = DB::table('products')
                ->where('sku', 'like', 'BT-SAMPLE-%')
                ->pluck('id');

            $sampleSaleIds = DB::table('sales')
                ->where('invoice_number', 'like', 'BT-SAMPLE-2026-%')
                ->pluck('id');

            if ($sampleSaleIds->isNotEmpty()) {
                DB::table('sale_items')
                    ->whereIn('sale_id', $sampleSaleIds)
                    ->delete();

                DB::table('sales')
                    ->whereIn('id', $sampleSaleIds)
                    ->delete();
            }

            if ($sampleProductIds->isNotEmpty()) {
                DB::table('stock_movements')
                    ->whereIn('product_id', $sampleProductIds)
                    ->whereIn('reference_type', [
                        'sample_opening_stock',
                        'sample_sale'
                    ])
                    ->delete();
            }

            DB::table('expenses')
                ->where('expense_name', 'like', 'Sample Expense %')
                ->delete();

            // StoreFlow product catalog.
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

            // Estimated prices in Philippine pesos.
            // Format: SKU => [cost price, selling price]
            $prices = [
                'SF-CAT-0001' => [48, 55],
                'SF-CAT-0002' => [48, 55],
                'SF-CAT-0003' => [47, 54],
                'SF-CAT-0004' => [18, 22],
                'SF-CAT-0005' => [17, 20],
                'SF-CAT-0006' => [7, 9],
                'SF-CAT-0007' => [17, 20],
                'SF-CAT-0008' => [17, 20],
                'SF-CAT-0009' => [9, 12],
                'SF-CAT-0010' => [9, 12],
                'SF-CAT-0011' => [8, 10],
                'SF-CAT-0012' => [8, 10],
                'SF-CAT-0013' => [18, 22],
                'SF-CAT-0014' => [38, 45],
                'SF-CAT-0015' => [30, 36],
                'SF-CAT-0016' => [18, 22],
                'SF-CAT-0017' => [17, 21],
                'SF-CAT-0018' => [11, 14],
                'SF-CAT-0019' => [12, 15],
                'SF-CAT-0020' => [28, 35],
                'SF-CAT-0021' => [10, 13],
                'SF-CAT-0022' => [22, 27],
                'SF-CAT-0023' => [8, 10],
                'SF-CAT-0024' => [65, 75],
                'SF-CAT-0025' => [55, 65],
                'SF-CAT-0026' => [10, 13],
                'SF-CAT-0027' => [25, 30],
                'SF-CAT-0028' => [12, 15],
                'SF-CAT-0029' => [18, 22],
                'SF-CAT-0030' => [10, 13],
                'SF-CAT-0031' => [20, 25],
                'SF-CAT-0032' => [8, 10],
                'SF-CAT-0033' => [12, 15],
                'SF-CAT-0034' => [10, 13],
                'SF-CAT-0035' => [25, 30],
            ];

            // Category descriptions.
            $categoryDescriptions = [
                'Beverages' => 'Drinks and beverage products',
                'Snacks' => 'Packaged snacks and crackers',
                'Canned Goods' => 'Canned and preserved food products',
                'Instant Foods' => 'Instant noodles and quick-preparation foods',
                'Personal Care' => 'Personal hygiene and care products',
                'Household Supplies' => 'Cleaning and household essentials',
                'School Supplies' => 'Basic school and stationery supplies',
            ];

            // Create categories if they do not exist.
            $categoryIds = [];

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

            // Insert new products or update existing catalog products.
            // Existing stock quantities are NOT changed.
            foreach ($catalog as [$categoryName, $productName, $sku]) {
                [$costPrice, $sellingPrice] = $prices[$sku];

                $existing = DB::table('products')
                    ->where('sku', $sku)
                    ->first();

                $productData = [
                    'category_id' => $categoryIds[$categoryName],
                    'product_name' => $productName,
                    'cost_price' => $costPrice,
                    'selling_price' => $sellingPrice,
                    'updated_at' => now(),
                ];

                if ($existing) {
                    DB::table('products')
                        ->where('id', $existing->id)
                        ->update($productData);
                } else {
                    DB::table('products')->insert(array_merge(
                        $productData,
                        [
                            'sku' => $sku,
                            'stock_quantity' => 0,
                            'reorder_level' => 10,
                            'status' => 'active',
                            'created_at' => now(),
                        ]
                    ));
                }
            }

            // Remove legacy sample products only when no sale item refers to them.
            if ($sampleProductIds->isNotEmpty()) {
                $stillReferenced = DB::table('sale_items')
                    ->whereIn('product_id', $sampleProductIds)
                    ->pluck('product_id')
                    ->unique();

                $safeToDelete = $sampleProductIds->diff($stillReferenced);

                if ($safeToDelete->isNotEmpty()) {
                    DB::table('products')
                        ->whereIn('id', $safeToDelete)
                        ->delete();
                }

                // Preserve sample products connected to other sale history.
                foreach ($sampleProductIds->diff($safeToDelete) as $productId) {
                    $product = DB::table('products')
                        ->where('id', $productId)
                        ->first();

                    if (!$product) {
                        continue;
                    }

                    $number = (int) substr(
                        (string) $product->sku,
                        strlen('BT-SAMPLE-')
                    );

                    if ($number >= 1 && $number <= count($catalog)) {
                        [$categoryName, $productName] = $catalog[$number - 1];

                        DB::table('products')
                            ->where('id', $productId)
                            ->update([
                                'category_id' => $categoryIds[$categoryName],
                                'product_name' => $productName,
                                'sku' => 'SF-LEGACY-' . str_pad(
                                    (string) $number,
                                    4,
                                    '0',
                                    STR_PAD_LEFT
                                ),
                                'updated_at' => now(),
                            ]);
                    } else {
                        DB::table('products')
                            ->where('id', $productId)
                            ->update([
                                'product_name' => 'Archived Product ' . $number,
                                'status' => 'inactive',
                                'updated_at' => now(),
                            ]);
                    }
                }
            }

            // Keep the Beverages category because it is part of the catalog.
        });
    }
}
