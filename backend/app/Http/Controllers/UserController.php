<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless(
            $request->user() && $request->user()->role === 'admin',
            403,
            'Only administrators can manage user accounts.'
        );
    }

    public function index(Request $request)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', Rule::in(['admin', 'staff'])],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $users = User::query()
            ->select([
                'id',
                'name',
                'email',
                'role',
                'is_active',
                'created_at',
                'updated_at',
            ])
            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($validated['role'] ?? null, function ($query, $role) {
                $query->where('role', $role);
            })
            ->when(isset($validated['status']), function ($query) use ($validated) {
                $query->where(
                    'is_active',
                    $validated['status'] === 'active'
                );
            })
            ->latest()
            ->paginate($validated['per_page'] ?? 10);

        return response()->json($users);
    }

    public function show(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'message' => 'User retrieved successfully.',
            'data' => $user->only([
                'id',
                'name',
                'email',
                'role',
                'is_active',
                'created_at',
                'updated_at',
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'staff'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;

        $user = User::create($validated);

        return response()->json([
            'message' => 'User created successfully.',
            'data' => $user->only([
                'id',
                'name',
                'email',
                'role',
                'is_active',
                'created_at',
            ]),
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        if ($request->user()->id === $user->id) {
            if (
                $request->has('role') &&
                $request->role !== $user->role
            ) {
                return response()->json([
                    'message' => 'You cannot change your own administrator role.',
                ], 422);
            }

            if (
                $request->has('is_active') &&
                !$request->boolean('is_active')
            ) {
                return response()->json([
                    'message' => 'You cannot deactivate your own account.',
                ], 422);
            }
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'required', Rule::in(['admin', 'staff'])],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully.',
            'data' => $user->only([
                'id',
                'name',
                'email',
                'role',
                'is_active',
                'created_at',
                'updated_at',
            ]),
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        if (
            $user->sales()->exists() ||
            $user->expenses()->exists() ||
            $user->stockMovements()->exists()
        ) {
            return response()->json([
                'message' => 'This user has recorded business transactions and cannot be deleted. Deactivate the account instead.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }
}