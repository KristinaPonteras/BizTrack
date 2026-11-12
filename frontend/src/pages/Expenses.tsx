
import { useEffect, useMemo, useState } from 'react';
import {
    Plus,
    RefreshCw,
    Search,
    X,
    Trash2,
    Pencil,
    Wallet,
    Receipt,
    TrendingDown,
    CalendarDays,
} from 'lucide-react';
import api from '../services/api';

interface Expense {
    id: number;
    user_id: number;
    expense_name: string;
    expense_category: string;
    amount: string | number;
    expense_date?: string | null;
    date?: string | null;
    created_at?: string | null;
    description: string | null;
    user?: {
        id: number;
        name: string;
    };
}

interface ExpenseForm {
    expense_name: string;
    expense_category: string;
    amount: string;
    expense_date: string;
    description: string;
}

const getExpenseDate = (expense: Expense): string => {
    const rawDate =
        expense.expense_date ||
        expense.date ||
        expense.created_at;

    if (!rawDate) return '';

    // Handle MySQL date format: YYYY-MM-DD
    const dateOnly = String(rawDate).match(/^\d{4}-\d{2}-\d{2}/);

    if (dateOnly) return dateOnly[0];

    const parsed = new Date(String(rawDate));

    if (Number.isNaN(parsed.getTime())) return '';

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const formatExpenseDate = (expense: Expense): string => {
    const dateValue = getExpenseDate(expense);

    if (!dateValue) return 'Date unavailable';

    const [year, month, day] = dateValue.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) return 'Date unavailable';

    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const emptyForm: ExpenseForm = {
    expense_name: '',
    expense_category: '',
    amount: '',
    expense_date: getToday(),
    description: '',
};

const categories = [
    'Utilities',
    'Rent',
    'Salaries',
    'Supplies',
    'Transportation',
    'Maintenance',
    'Marketing',
    'Other',
];

const money = (value: number | string) =>
    `₱${Number(value || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function Expenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [form, setForm] = useState<ExpenseForm>(emptyForm);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get('/expenses?per_page=100');
            const result = response.data;

            const records = Array.isArray(result)
                ? result
                : Array.isArray(result.data)
                    ? result.data
                    : [];

            setExpenses(records);
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to load expenses. Please check your backend connection.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExpenses();
    }, []);

    const filteredExpenses = useMemo(() => {
        return expenses.filter((expense) => {
            const matchesSearch =
                (expense.expense_name || '').toLowerCase().includes(search.toLowerCase()) ||
                (expense.expense_category || '').toLowerCase().includes(search.toLowerCase()) ||
                (expense.description || '').toLowerCase().includes(search.toLowerCase());

            const matchesCategory =
                !selectedCategory || expense.expense_category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [expenses, search, selectedCategory]);

    const totalExpenses = expenses.reduce(
        (total, expense) => total + Number(expense.amount || 0),
        0
    );

    const now = new Date();

    const currentMonthExpenses = expenses
        .filter((expense) => {
            const dateValue = getExpenseDate(expense);

            if (!dateValue) return false;

            const [year, month] = dateValue.split('-').map(Number);

            return (
                month === now.getMonth() + 1 &&
                year === now.getFullYear()
            );
        })
        .reduce((total, expense) => total + Number(expense.amount || 0), 0);

    const openAddModal = () => {
        setEditingExpense(null);
        setForm({
            ...emptyForm,
            expense_date: getToday(),
        });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (expense: Expense) => {
        setEditingExpense(expense);
        setForm({
            expense_name: expense.expense_name || '',
            expense_category: expense.expense_category || '',
            amount: String(expense.amount ?? ''),
            expense_date: getExpenseDate(expense) || getToday(),
            description: expense.description || '',
        });
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;
        setShowModal(false);
        setEditingExpense(null);
        setForm(emptyForm);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        try {
            setSaving(true);
            setError('');

            const payload = {
                expense_name: form.expense_name.trim(),
                expense_category: form.expense_category,
                amount: Number(form.amount),
                expense_date: form.expense_date,
                description: form.description.trim() || null,
            };

            if (editingExpense) {
                await api.put(`/expenses/${editingExpense.id}`, payload);
            } else {
                await api.post('/expenses', payload);
            }

            setShowModal(false);
            setEditingExpense(null);
            setForm(emptyForm);

            await loadExpenses();
        } catch (err: any) {
            const validationErrors = err.response?.data?.errors;

            if (validationErrors) {
                setError(Object.values(validationErrors).flat().join(' '));
            } else {
                setError(
                    err.response?.data?.message ||
                    'Unable to save expense. Please try again.'
                );
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (expense: Expense) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${expense.expense_name}"?`
        );

        if (!confirmed) return;

        try {
            setError('');
            await api.delete(`/expenses/${expense.id}`);
            await loadExpenses();
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to delete expense. Please try again.'
            );
        }
    };

    const updateField = (field: keyof ExpenseForm, value: string) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    return (
        <div className="expenses-page">
            <style>{`
                .expenses-page { color:#172033; }
                .expenses-header { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:24px; }
                .expenses-header h1 { font-size:25px; font-weight:750; margin:0 0 5px; }
                .expenses-header p { color:#718096; margin:0; font-size:13px; }
                .expenses-actions { display:flex; gap:10px; }
                .expenses-btn { border:0; border-radius:8px; padding:10px 14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; font-size:13px; font-weight:600; cursor:pointer; }
                .expenses-primary { background:#2563eb; color:white; }
                .expenses-secondary { background:white; color:#475569; border:1px solid #e2e8f0; }
                .expenses-btn:disabled { opacity:.6; cursor:not-allowed; }
                .expenses-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-bottom:22px; }
                .expenses-stat { background:white; border:1px solid #e8edf3; border-radius:12px; padding:19px; display:flex; align-items:center; gap:14px; }
                .expenses-stat-icon { width:43px; height:43px; border-radius:10px; display:grid; place-items:center; background:#eff6ff; color:#2563eb; flex-shrink:0; }
                .expenses-stat-label { font-size:12px; color:#718096; margin-bottom:6px; }
                .expenses-stat-value { font-size:21px; font-weight:750; color:#172033; }
                .expenses-toolbar { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
                .expenses-search { position:relative; flex:1; min-width:220px; max-width:360px; }
                .expenses-search svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#94a3b8; }
                .expenses-search input { width:100%; box-sizing:border-box; padding:10px 12px 10px 37px; border:1px solid #e2e8f0; border-radius:8px; outline:none; font-size:13px; }
                .expenses-search input:focus,.expenses-select:focus,.expenses-field input:focus,.expenses-field select:focus,.expenses-field textarea:focus { border-color:#3b82f6; box-shadow:0 0 0 3px #dbeafe; outline:none; }
                .expenses-select { border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; background:white; color:#475569; font-size:13px; }
                .expenses-table-wrap { background:white; border:1px solid #e8edf3; border-radius:12px; overflow:hidden; }
                .expenses-table-title { padding:18px 20px; border-bottom:1px solid #edf1f5; display:flex; justify-content:space-between; align-items:center; gap:10px; }
                .expenses-table-title h2 { font-size:15px; font-weight:700; margin:0; }
                .expenses-table-title span { color:#718096; font-size:12px; }
                .expenses-table-scroll { overflow-x:auto; }
                .expenses-table { width:100%; border-collapse:collapse; min-width:760px; }
                .expenses-table th { background:#f8fafc; color:#718096; font-size:10px; letter-spacing:.06em; text-align:left; padding:13px 18px; font-weight:700; }
                .expenses-table td { padding:15px 18px; border-top:1px solid #edf1f5; font-size:12px; color:#475569; }
                .expenses-name { color:#172033 !important; font-weight:650; }
                .expenses-category { display:inline-block; background:#eff6ff; color:#2563eb; padding:5px 9px; border-radius:20px; font-size:11px; font-weight:600; }
                .expenses-amount { font-weight:700; color:#172033 !important; }
                .expenses-row-actions { display:flex; gap:7px; }
                .expenses-icon-btn { width:30px; height:30px; border:1px solid #e2e8f0; background:white; border-radius:7px; display:grid; place-items:center; cursor:pointer; color:#64748b; }
                .expenses-icon-btn.delete { color:#dc2626; }
                .expenses-empty { padding:45px 20px; text-align:center; color:#94a3b8; font-size:13px; }
                .expenses-error { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; border-radius:8px; padding:12px 14px; font-size:13px; margin-bottom:16px; }
                .expenses-modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.48); display:flex; align-items:center; justify-content:center; padding:18px; z-index:1000; }
                .expenses-modal { width:100%; max-width:520px; max-height:90vh; overflow-y:auto; background:white; border-radius:14px; box-shadow:0 20px 60px rgba(0,0,0,.2); }
                .expenses-modal-header { display:flex; justify-content:space-between; align-items:center; padding:20px 22px; border-bottom:1px solid #edf1f5; }
                .expenses-modal-header h2 { margin:0; font-size:18px; font-weight:750; }
                .expenses-close { border:0; background:transparent; color:#64748b; cursor:pointer; }
                .expenses-form { padding:21px 22px; }
                .expenses-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:15px; }
                .expenses-field { display:flex; flex-direction:column; gap:7px; margin-bottom:15px; }
                .expenses-field label { font-size:12px; font-weight:650; color:#475569; }
                .expenses-field input,.expenses-field select,.expenses-field textarea { width:100%; box-sizing:border-box; border:1px solid #e2e8f0; border-radius:8px; padding:10px 11px; font-size:13px; color:#172033; background:white; }
                .expenses-field textarea { min-height:80px; resize:vertical; }
                .expenses-form-footer { display:flex; justify-content:flex-end; gap:9px; margin-top:8px; }
                @media(max-width:700px) { .expenses-stats { grid-template-columns:1fr; gap:10px; } .expenses-stat { padding:14px; } .expenses-stat-value { font-size:19px; } .expenses-form-grid { grid-template-columns:1fr; gap:0; } }
            `}</style>

            <div className="expenses-header">
                <div>
                    <h1>Expenses Management</h1>
                    <p>Track business expenses and monitor where your money goes.</p>
                </div>

                <div className="expenses-actions">
                    <button
                        className="expenses-btn expenses-secondary"
                        onClick={loadExpenses}
                        disabled={loading}
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>
                    <button className="expenses-btn expenses-primary" onClick={openAddModal}>
                        <Plus size={16} />
                        Add Expense
                    </button>
                </div>
            </div>

            {error && <div className="expenses-error">{error}</div>}

            <div className="expenses-stats">
                <div className="expenses-stat">
                    <div className="expenses-stat-icon"><Wallet size={21} /></div>
                    <div>
                        <div className="expenses-stat-label">Total Expenses</div>
                        <div className="expenses-stat-value">{money(totalExpenses)}</div>
                    </div>
                </div>

                <div className="expenses-stat">
                    <div className="expenses-stat-icon"><TrendingDown size={21} /></div>
                    <div>
                        <div className="expenses-stat-label">This Month</div>
                        <div className="expenses-stat-value">{money(currentMonthExpenses)}</div>
                    </div>
                </div>

                <div className="expenses-stat">
                    <div className="expenses-stat-icon"><Receipt size={21} /></div>
                    <div>
                        <div className="expenses-stat-label">Recorded Expenses</div>
                        <div className="expenses-stat-value">{expenses.length}</div>
                    </div>
                </div>
            </div>

            <div className="expenses-toolbar">
                <div className="expenses-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search expenses..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <select
                    className="expenses-select"
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </div>

            <div className="expenses-table-wrap">
                <div className="expenses-table-title">
                    <h2>Expense Records</h2>
                    <span>{filteredExpenses.length} records</span>
                </div>

                <div className="expenses-table-scroll">
                    <table className="expenses-table">
                        <thead>
                            <tr>
                                <th>EXPENSE</th>
                                <th>CATEGORY</th>
                                <th>DATE</th>
                                <th>AMOUNT</th>
                                <th>RECORDED BY</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="expenses-empty">
                                        Loading expenses...
                                    </td>
                                </tr>
                            ) : filteredExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="expenses-empty">
                                        <CalendarDays size={28} style={{ margin: '0 auto 10px' }} />
                                        {search || selectedCategory
                                            ? 'No matching expenses found.'
                                            : 'No expenses recorded yet. Click Add Expense to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense.id}>
                                        <td>
                                            <div className="expenses-name">{expense.expense_name}</div>
                                            {expense.description && (
                                                <div style={{ color: '#94a3b8', marginTop: 4 }}>
                                                    {expense.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="expenses-category">
                                                {expense.expense_category}
                                            </span>
                                        </td>
                                        <td>{formatExpenseDate(expense)}</td>
                                        <td className="expenses-amount">{money(expense.amount)}</td>
                                        <td>{expense.user?.name || 'Unknown'}</td>
                                        <td>
                                            <div className="expenses-row-actions">
                                                <button
                                                    className="expenses-icon-btn"
                                                    title="Edit expense"
                                                    onClick={() => openEditModal(expense)}
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    className="expenses-icon-btn delete"
                                                    title="Delete expense"
                                                    onClick={() => handleDelete(expense)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="expenses-modal-backdrop" onClick={closeModal}>
                    <div className="expenses-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="expenses-modal-header">
                            <h2>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
                            <button
                                className="expenses-close"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form className="expenses-form" onSubmit={handleSubmit}>
                            <div className="expenses-field">
                                <label htmlFor="expense_name">Expense Name *</label>
                                <input
                                    id="expense_name"
                                    type="text"
                                    value={form.expense_name}
                                    onChange={(event) => updateField('expense_name', event.target.value)}
                                    placeholder="e.g. Electricity Bill"
                                    required
                                    maxLength={255}
                                />
                            </div>

                            <div className="expenses-form-grid">
                                <div className="expenses-field">
                                    <label htmlFor="expense_category">Category *</label>
                                    <select
                                        id="expense_category"
                                        value={form.expense_category}
                                        onChange={(event) => updateField('expense_category', event.target.value)}
                                        required
                                    >
                                        <option value="">Select category</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="expenses-field">
                                    <label htmlFor="amount">Amount (₱) *</label>
                                    <input
                                        id="amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={(event) => updateField('amount', event.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="expenses-field">
                                <label htmlFor="expense_date">Expense Date *</label>
                                <input
                                    id="expense_date"
                                    type="date"
                                    value={form.expense_date}
                                    onChange={(event) => updateField('expense_date', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="expenses-field">
                                <label htmlFor="description">Description (Optional)</label>
                                <textarea
                                    id="description"
                                    value={form.description}
                                    onChange={(event) => updateField('description', event.target.value)}
                                    placeholder="Add details about this expense..."
                                />
                            </div>

                            {error && <div className="expenses-error">{error}</div>}

                            <div className="expenses-form-footer">
                                <button
                                    type="button"
                                    className="expenses-btn expenses-secondary"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="expenses-btn expenses-primary"
                                    disabled={saving}
                                >
                                    {saving
                                        ? 'Saving...'
                                        : editingExpense
                                            ? 'Update Expense'
                                            : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}