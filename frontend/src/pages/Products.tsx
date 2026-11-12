
import { useEffect, useState } from 'react'
import {
    Plus, Search, Pencil, Trash2, X, Package, RefreshCw
} from 'lucide-react'
import api from '../services/api'

interface Product {
    id: number
    category_id: number
    product_name: string
    sku: string
    cost_price: string | number
    selling_price: string | number
    stock_quantity: number
    reorder_level: number
    status: string
    category?: {
        category_name: string
    }
}

interface Category {
    id: number
    category_name: string
}

const emptyForm = {
    category_id: '',
    product_name: '',
    sku: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
    reorder_level: '',
    status: 'active',
}

export default function Products() {
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    async function loadProducts() {
        setLoading(true)
        setError('')

        try {
            const response = await api.get('/products', {
                params: {
                    page,
                    search: search || undefined,
                    category_id: categoryFilter || undefined,
                    status: statusFilter || undefined,
                },
            })

            const result = response.data
            setProducts(Array.isArray(result.data) ? result.data : [])
            setLastPage(result.last_page || 1)
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to load products. Check your Laravel API connection.'
            )
        } finally {
            setLoading(false)
        }
    }

    async function loadCategories() {
        try {
            const response = await api.get('/categories')
            setCategories(response.data.data || [])
        } catch {
            console.error('Unable to load categories')
        }
    }

    useEffect(() => {
        loadProducts()
    }, [page, search, categoryFilter, statusFilter])

    useEffect(() => {
        loadCategories()
    }, [])

    function openAddModal() {
        setEditingId(null)
        setForm(emptyForm)
        setMessage('')
        setModalOpen(true)
    }

    function openEditModal(product: Product) {
        setEditingId(product.id)
        setForm({
            category_id: String(product.category_id),
            product_name: product.product_name,
            sku: product.sku,
            cost_price: String(product.cost_price),
            selling_price: String(product.selling_price),
            stock_quantity: String(product.stock_quantity),
            reorder_level: String(product.reorder_level),
            status: product.status,
        })
        setMessage('')
        setModalOpen(true)
    }

    function updateField(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setMessage('')

        const payload = {
            ...form,
            category_id: Number(form.category_id),
            cost_price: Number(form.cost_price),
            selling_price: Number(form.selling_price),
            stock_quantity: Number(form.stock_quantity),
            reorder_level: Number(form.reorder_level),
        }

        try {
            if (editingId) {
                await api.put(`/products/${editingId}`, payload)
            } else {
                await api.post('/products', payload)
            }

            setModalOpen(false)
            setForm(emptyForm)
            setEditingId(null)
            await loadProducts()
        } catch (err: any) {
            const errors = err.response?.data?.errors
            const validationMessage = errors
                ? Object.values(errors).flat().join(' ')
                : err.response?.data?.message

            setMessage(
                validationMessage || 'Unable to save product. Please try again.'
            )
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: number) {
        const confirmed = window.confirm(
            'Are you sure you want to delete this product?'
        )

        if (!confirmed) return

        try {
            await api.delete(`/products/${id}`)
            await loadProducts()
        } catch (err: any) {
            setError(
                err.response?.data?.message || 'Unable to delete product.'
            )
        }
    }

    return (
        <div className="products-page">
            <div className="page-heading">
                <div>
                    <h1>Products</h1>
                    <p>Manage your products and product information.</p>
                </div>

                <button className="primary-button" onClick={openAddModal}>
                    <Plus size={18} />
                    Add Product
                </button>
            </div>

            <section className="content-card">
                <div className="product-toolbar">
                    <div className="product-search">
                        <Search size={17} />
                        <input
                            placeholder="Search product name or SKU..."
                            value={search}
                            onChange={(e) => {
                                setPage(1)
                                setSearch(e.target.value)
                            }}
                        />
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setPage(1)
                            setCategoryFilter(e.target.value)
                        }}
                    >
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.category_name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setPage(1)
                            setStatusFilter(e.target.value)
                        }}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    <button
                        className="refresh-button"
                        onClick={loadProducts}
                        title="Refresh products"
                    >
                        <RefreshCw size={17} />
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}

                {loading ? (
                    <div className="table-state">Loading products...</div>
                ) : products.length === 0 ? (
                    <div className="table-state">
                        <Package size={35} />
                        <strong>No products found</strong>
                        <span>Add a product or change your search filters.</span>
                    </div>
                ) : (
                    <div className="table-scroll">
                        <table className="products-table">
                            <thead>
                                <tr>
                                    <th>PRODUCT</th>
                                    <th>SKU</th>
                                    <th>CATEGORY</th>
                                    <th>COST PRICE</th>
                                    <th>SELLING PRICE</th>
                                    <th>STOCK</th>
                                    <th>STATUS</th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <strong>{product.product_name}</strong>
                                        </td>
                                        <td>{product.sku}</td>
                                        <td>
                                            {product.category?.category_name || '—'}
                                        </td>
                                        <td>₱{Number(product.cost_price).toFixed(2)}</td>
                                        <td>₱{Number(product.selling_price).toFixed(2)}</td>
                                        <td>
                                            <span className={
                                                product.stock_quantity <= product.reorder_level
                                                    ? 'low-stock'
                                                    : ''
                                            }>
                                                {product.stock_quantity}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-pill ${product.status}`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="edit-action"
                                                    title="Edit"
                                                    onClick={() => openEditModal(product)}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    className="delete-action"
                                                    title="Delete"
                                                    onClick={() => handleDelete(product.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="pagination">
                    <span>Page {page} of {lastPage}</span>
                    <div>
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= lastPage}
                            onClick={() => setPage(page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="product-modal">
                        <div className="modal-heading">
                            <div>
                                <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                                <p>Enter the product information below.</p>
                            </div>
                            <button onClick={() => setModalOpen(false)}>
                                <X size={21} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <label>
                                    Product Name
                                    <input
                                        name="product_name"
                                        value={form.product_name}
                                        onChange={updateField}
                                        required
                                    />
                                </label>

                                <label>
                                    SKU
                                    <input
                                        name="sku"
                                        value={form.sku}
                                        onChange={updateField}
                                        required
                                    />
                                </label>

                                <label className="full-field">
                                    Category
                                    <select
                                        name="category_id"
                                        value={form.category_id}
                                        onChange={updateField}
                                        required
                                    >
                                        <option value="">Select category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.category_name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Cost Price (₱)
                                    <input
                                        type="number"
                                        name="cost_price"
                                        min="0"
                                        step="0.01"
                                        value={form.cost_price}
                                        onChange={updateField}
                                        required
                                    />
                                </label>

                                <label>
                                    Selling Price (₱)
                                    <input
                                        type="number"
                                        name="selling_price"
                                        min="0"
                                        step="0.01"
                                        value={form.selling_price}
                                        onChange={updateField}
                                        required
                                    />
                                </label>

                                <label>
                                    Stock Quantity
                                    <input
                                        type="number"
                                        name="stock_quantity"
                                        min="0"
                                        value={form.stock_quantity}
                                        onChange={updateField}
                                        required
                                    />
                                </label>

                                <label>
                                    Reorder Level
                                    <input
                                        type="number"
                                        name="reorder_level"
                                        min="0"
                                        value={form.reorder_level}
                                        onChange={updateField}
                                        required
                                    />
                                </label>

                                <label className="full-field">
                                    Status
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={updateField}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                            </div>

                            {message && (
                                <div className="error-message">{message}</div>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => setModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}