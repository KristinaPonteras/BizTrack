<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    // Display all products with search and filters
    public function index(Request $request)
    {
        $products = Product::with('category')
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('product_name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->when($request->category_id, function ($query, $categoryId) {
                $query->where('category_id', $categoryId);
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->orderBy('product_name')
            ->paginate($request->input('per_page', 10));

        return response()->json($products, 200);
    }

    // Store a new product
    public function store(StoreProductRequest $request)
    {
        $product = Product::create($request->validated());

        return response()->json([
            'message' => 'Product created successfully.',
            'data' => $product->load('category'),
        ], 201);
    }

    // Display one product
    public function show(Product $product)
    {
        return response()->json([
            'data' => $product->load('category'),
        ], 200);
    }

    // Update a product
    public function update(UpdateProductRequest $request, Product $product)
    {
        $product->update($request->validated());

        return response()->json([
            'message' => 'Product updated successfully.',
            'data' => $product->load('category'),
        ], 200);
    }

    // Delete a product
    public function destroy(Product $product)
    {
        if ($product->saleItems()->exists() || $product->stockMovements()->exists()) {
            return response()->json([
                'message' => 'Cannot delete this product because it has sales or inventory history.',
            ], 422);
        }

        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
        ], 200);
    }
}