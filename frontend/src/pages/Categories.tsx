
import { useEffect, useState, type FormEvent } from 'react'
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    Tags,
    RefreshCw,
} from 'lucide-react'
import api from '../services/api'

interface Category {
    id: number
    category_name: string
    description: string | null
    products_count?: number
}

const emptyForm = {
    category_name: '',
    description: '',
}

function Categories() {
    const [categories, setCategories] = useState<Category[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)

    const loadCategories = async () => {
        setLoading(true)
        setError('')

        try {
            const response = await api.get('/categories')
            const result = response.data.data ?? response.data

            setCategories(Array.isArray(result) ? result : [])
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to load categories. Please check your connection.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCategories()
    }, [])

    const openAddModal = () => {
        setEditingCategory(null)
        setForm(emptyForm)
        setError('')
        setSuccess('')
        setModalOpen(true)
    }

    const openEditModal = (category: Category) => {
        setEditingCategory(category)
        setForm({
            category_name: category.category_name,
            description: category.description || '',
        })
        setError('')
        setSuccess('')
        setModalOpen(true)
    }

    const closeModal = () => {
        if (saving) return

        setModalOpen(false)
        setEditingCategory(null)
        setForm(emptyForm)
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            if (editingCategory) {
                await api.put(`/categories/${editingCategory.id}`, form)
                setSuccess('Category updated successfully.')
            } else {
                await api.post('/categories', form)
                setSuccess('Category added successfully.')
            }

            setModalOpen(false)
            setForm(emptyForm)
            setEditingCategory(null)

            await loadCategories()
        } catch (err: any) {
            const validationErrors = err.response?.data?.errors
            const firstValidationError = validationErrors
                ? Object.values(validationErrors).flat()[0]
                : null

            setError(
                (firstValidationError as string) ||
                err.response?.data?.message ||
                'Unable to save category. Please try again.'
            )
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (category: Category) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${category.category_name}"?`
        )

        if (!confirmed) return

        setError('')
        setSuccess('')

        try {
            await api.delete(`/categories/${category.id}`)
            setSuccess('Category deleted successfully.')
            await loadCategories()
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to delete this category. It may still have products assigned to it.'
            )
        }
    }

    const filteredCategories = categories.filter((category) =>
        `${category.category_name} ${category.description || ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
    )

    return (
        <div className="categories-page">
            <div className="categories-heading">
                <div>
                    <h1>Categories</h1>
                    <p>Organize and manage your product categories.</p>
                </div>

                <button className="primary-button" onClick={openAddModal}>
                    <Plus size={18} />
                    Add Category
                </button>
            </div>

            {error && (
                <div className="categories-alert categories-alert-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="categories-alert categories-alert-success">
                    {success}
                </div>
            )}

            <section className="content-card categories-card">
                <div className="categories-toolbar">
                    <div>
                        <h2>All Categories</h2>
                        <p>{categories.length} categories in your database</p>
                    </div>

                    <div className="categories-actions">
                        <div className="categories-search">
                            <Search size={17} />
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <button
                            className="categories-refresh"
                            onClick={loadCategories}
                            title="Refresh categories"
                            aria-label="Refresh categories"
                        >
                            <RefreshCw size={17} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="categories-empty">
                        <p>Loading categories...</p>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="categories-empty">
                        <div className="categories-empty-icon">
                            <Tags size={30} />
                        </div>

                        <strong>
                            {search ? 'No matching categories found' : 'No categories found'}
                        </strong>

                        <p>
                            {search
                                ? 'Try another search term.'
                                : 'Add your first category to organize your products.'}
                        </p>

                        {!search && (
                            <button className="primary-button" onClick={openAddModal}>
                                <Plus size={17} />
                                Add Category
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="categories-table-wrapper">
                        <table className="categories-table">
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th>Description</th>
                                    <th>Products</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredCategories.map((category) => (
                                    <tr key={category.id}>
                                        <td>
                                            <strong>{category.category_name}</strong>
                                        </td>

                                        <td>{category.description || 'No description'}</td>

                                        <td>{category.products_count ?? '—'}</td>

                                        <td>
                                            <div className="categories-row-actions">
                                                <button
                                                    className="categories-edit"
                                                    onClick={() => openEditModal(category)}
                                                    title="Edit category"
                                                    aria-label={`Edit ${category.category_name}`}
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                <button
                                                    className="categories-delete"
                                                    onClick={() => handleDelete(category)}
                                                    title="Delete category"
                                                    aria-label={`Delete ${category.category_name}`}
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
            </section>

            {modalOpen && (
                <div
                    className="categories-modal-overlay"
                    onClick={closeModal}
                >
                    <div
                        className="categories-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="categories-modal-header">
                            <div>
                                <h2>
                                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                                </h2>
                                <p>Enter the category information below.</p>
                            </div>

                            <button
                                className="categories-close"
                                onClick={closeModal}
                                disabled={saving}
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <label htmlFor="category_name">Category Name *</label>

                            <input
                                id="category_name"
                                type="text"
                                placeholder="e.g. Beverages"
                                value={form.category_name}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        category_name: e.target.value,
                                    })
                                }
                                required
                                maxLength={255}
                            />

                            <label htmlFor="description">Description</label>

                            <textarea
                                id="description"
                                placeholder="Enter a short category description"
                                value={form.description}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        description: e.target.value,
                                    })
                                }
                                rows={4}
                            />

                            <div className="categories-modal-buttons">
                                <button
                                    type="button"
                                    className="categories-cancel"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? 'Saving...'
                                        : editingCategory
                                            ? 'Update Category'
                                            : 'Save Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Categories