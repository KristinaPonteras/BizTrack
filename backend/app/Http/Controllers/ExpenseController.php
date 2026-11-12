<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Expense::with('user');

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('expense_name', 'like', "%{$search}%")
                    ->orWhere('expense_category', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['category'])) {
            $query->where('expense_category', $validated['category']);
        }

        if (!empty($validated['date_from'])) {
            $query->whereDate('expense_date', '>=', $validated['date_from']);
        }

        if (!empty($validated['date_to'])) {
            $query->whereDate('expense_date', '<=', $validated['date_to']);
        }

        $expenses = $query
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15);

        return response()->json($expenses);
    }

    public function show(Expense $expense)
    {
        $expense->load('user');

        return response()->json([
            'message' => 'Expense retrieved successfully.',
            'data' => $expense,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'expense_name' => ['required', 'string', 'max:255'],
            'expense_category' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'expense_date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
        ]);

        $validated['user_id'] = $request->user()->id;

        $expense = Expense::create($validated);

        $expense->load('user');

        return response()->json([
            'message' => 'Expense recorded successfully.',
            'data' => $expense,
        ], 201);
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'expense_name' => ['required', 'string', 'max:255'],
            'expense_category' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'expense_date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
        ]);

        $expense->update($validated);

        $expense->load('user');

        return response()->json([
            'message' => 'Expense updated successfully.',
            'data' => $expense,
        ]);
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return response()->json([
            'message' => 'Expense deleted successfully.',
        ]);
    }
}