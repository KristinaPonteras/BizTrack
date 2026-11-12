
import { useEffect, useState } from 'react';
import {
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Trash2,
    X,
    Users,
    ShieldCheck,
    UserCheck,
    UserX,
} from 'lucide-react';
import api from '../services/api';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'staff';
    is_active: boolean;
    created_at?: string;
}

interface UserForm {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'staff';
    is_active: boolean;
}

const emptyForm: UserForm = {
    name: '',
    email: '',
    password: '',
    role: 'staff',
    is_active: true,
};

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form, setForm] = useState<UserForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get('/users', {
                params: { search, per_page: 100 },
            });

            const result = response.data;
            setUsers(Array.isArray(result.data) ? result.data : []);
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to load users. Please check your connection.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [search]);

    const openAddModal = () => {
        setEditingUser(null);
        setForm(emptyForm);
        setError('');
        setModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setForm({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            is_active: user.is_active,
        });
        setError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingUser(null);
        setForm(emptyForm);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSaving(true);
            setError('');
            setSuccess('');

            const payload: any = {
                name: form.name,
                email: form.email,
                role: form.role,
                is_active: form.is_active,
            };

            if (form.password.trim()) {
                payload.password = form.password;
            }

            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, payload);
                setSuccess('User updated successfully.');
            } else {
                if (!form.password.trim()) {
                    setError('Password is required when creating a user.');
                    return;
                }

                payload.password = form.password;
                await api.post('/users', payload);
                setSuccess('User created successfully.');
            }

            closeModal();
            await loadUsers();
        } catch (err: any) {
            const validationErrors = err.response?.data?.errors;

            if (validationErrors) {
                setError(Object.values(validationErrors).flat().join(' '));
            } else {
                setError(
                    err.response?.data?.message ||
                    'Something went wrong. Please try again.'
                );
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user: User) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${user.name}?`
        );

        if (!confirmed) return;

        try {
            setError('');
            setSuccess('');

            await api.delete(`/users/${user.id}`);
            setSuccess('User deleted successfully.');
            await loadUsers();
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to delete this user.'
            );
        }
    };

    const handleStatusChange = async (user: User) => {
        try {
            setError('');
            setSuccess('');

            await api.put(`/users/${user.id}`, {
                name: user.name,
                email: user.email,
                role: user.role,
                is_active: !user.is_active,
            });

            setSuccess(
                `${user.name} is now ${user.is_active ? 'inactive' : 'active'}.`
            );

            await loadUsers();
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to update user status.'
            );
        }
    };

    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.is_active).length;
    const inactiveUsers = users.filter(user => !user.is_active).length;
    const adminUsers = users.filter(user => user.role === 'admin').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        User Management
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage administrator and staff accounts.
                    </p>
                </div>

                <button
                    onClick={openAddModal}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus size={18} />
                    Add User
                </button>
            </div>

            {success && (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {success}
                    <button onClick={() => setSuccess('')}>
                        <X size={17} />
                    </button>
                </div>
            )}

            {error && !modalOpen && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                    <button onClick={() => setError('')}>
                        <X size={17} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total Users" value={totalUsers} icon={<Users size={21} />} />
                <StatCard title="Active Users" value={activeUsers} icon={<UserCheck size={21} />} />
                <StatCard title="Inactive Users" value={inactiveUsers} icon={<UserX size={21} />} />
                <StatCard title="Administrators" value={adminUsers} icon={<ShieldCheck size={21} />} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="font-semibold text-gray-900">
                            System Users
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            View and manage registered accounts.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative">
                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search users..."
                                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-64"
                            />
                        </div>

                        <button
                            onClick={loadUsers}
                            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                            title="Refresh users"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
                        <RefreshCw size={18} className="animate-spin" />
                        Loading users...
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users size={35} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-700">No users found</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Add a user account to get started.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">User</th>
                                    <th className="px-5 py-4 font-semibold">Role</th>
                                    <th className="px-5 py-4 font-semibold">Status</th>
                                    <th className="px-5 py-4 font-semibold">Date Created</th>
                                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-gray-900">
                                                {user.name}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {user.email}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {user.role === 'admin' ? 'Administrator' : 'Staff'}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => handleStatusChange(user)}
                                                className={`rounded-full px-3 py-1 text-xs font-medium ${user.is_active
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>

                                        <td className="px-5 py-4 text-gray-500">
                                            {user.created_at
                                                ? new Date(user.created_at).toLocaleDateString()
                                                : '—'}
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                                    title="Edit user"
                                                >
                                                    <Pencil size={17} />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                                    title="Delete user"
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-100 p-5">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {editingUser ? 'Edit User' : 'Add New User'}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {editingUser
                                        ? 'Update this account information.'
                                        : 'Create a new system account.'}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 p-5">
                            {error && (
                                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Full Name
                                </label>
                                <input
                                    required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Email Address
                                </label>
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    {editingUser ? 'New Password (optional)' : 'Password'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    minLength={8}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                                    placeholder={editingUser ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Role
                                </label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm({
                                        ...form,
                                        role: e.target.value as 'admin' | 'staff',
                                    })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                Account is active
                            </label>

                            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{title}</p>
                <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    {icon}
                </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
        </div>
    );
}
