<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    // Display all categories
    public function index(Request $request)
    {
        $categories = Category::withCount('products')
            ->when($request->search, function ($query, $search) {
                $query->where('category_name', 'like', "%{$search}%");
            })
            ->orderBy('category_name')
            ->paginate($request->input('per_page', 10));

        return response()->json($categories, 200);
    }

    // Store a new category
    public function store(StoreCategoryRequest $request)
    {
        $category = Category::create($request->validated());

        return response()->json([
            'message' => 'Category created successfully.',
            'data' => $category,
        ], 201);
    }

    // Display one category
    public function show(Category $category)
    {
        return response()->json([
            'data' => $category->loadCount('products'),
        ], 200);
    }

    // Update a category
    public function update(UpdateCategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return response()->json([
            'message' => 'Category updated successfully.',
            'data' => $category,
        ], 200);
    }

    // Delete a category
    public function destroy(Category $category)
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'Cannot delete this category because it has assigned products.',
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully.',
        ], 200);
    }
}