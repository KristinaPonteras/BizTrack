
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    Boxes,
    History,
    LoaderCircle,
    Package,
    Plus,
    RefreshCw,
    Search,
    X,
} from 'lucide-react'
import api from '../services/api'

interface Product {
    id: number
    product_name: string
    sku: string
    stock_quantity: number
    reorder_level: number
    cost_price: string | number
    selling_price: string | number
    status: string
    category?: {
        id: number
        category_name: string
    }
}

interface StockMovement {
    id: number
    product_id: number
    movement_type: 'stock_in' | 'stock_out' | 'adjustment'
    quantity: number
    movement_date: string
    notes?: string | null
    product?: Product
    user?: {
        id: number
        name: string
    }
}

interface PaginatedResponse<T> {
    data: T[]
}

const inventoryStyles = `
.inventory-page { width: 100%; color: #172033; }
.inventory-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-bottom: 22px; }
.inventory-stat { padding: 19px; background: white; border: 1px solid #edf0f5; border-radius: 11px; }
.inventory-stat-top { display: flex; justify-content: space-between; align-items: center; }
.inventory-stat-icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 10px; background: #edf3ff; color: #3478f6; }
.inventory-stat-icon.warning { background: #fff7e8; color: #d97706; }
.inventory-stat-icon.danger { background: #fff0ef; color: #dc4444; }
.inventory-stat h3 { margin: 15px 0 6px; color: #788398; font-size: 12px; font-weight: 500; }
.inventory-stat strong { font-size: 25px; }
.inventory-stat p { margin: 6px 0 0; color: #9ba4b3; font-size: 10px; }
.inventory-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 11px; margin-bottom: 17px; }
.inventory-search { min-width: 200px; flex: 1; display: flex; align-items: center; gap: 9px; padding: 10px 12px; border: 1px solid #e1e6ee; border-radius: 8px; color: #929bad; background: white; }
.inventory-search input { width: 100%; border: none; outline: none; font-size: 12px; }
.inventory-filter { padding: 10px 12px; border: 1px solid #e1e6ee; border-radius: 8px; background: white; color: #475467; font-size: 12px; }
.inventory-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 14px; border: none; border-radius: 8px; background: #3478f6; color: white; font-size: 12px; font-weight: 600; }
.inventory-action:hover { background: #2464d8; }
.inventory-action:disabled { opacity: .6; cursor: not-allowed; }
.inventory-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 12px; border: 1px solid #e1e6ee; border-radius: 8px; background: white; color: #475467; font-size: 11px; }
.inventory-card { margin-bottom: 20px; padding: 20px; border: 1px solid #edf0f5; border-radius: 11px; background: white; }
.inventory-card-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 17px; }
.inventory-card-heading h2 { margin: 0; font-size: 15px; }
.inventory-card-heading p { margin: 5px 0 0; color: #929bad; font-size: 11px; }
.inventory-table-wrap { width: 100%; overflow-x: auto; }
.inventory-table { width: 100%; min-width: 760px; border-collapse: collapse; text-align: left; }
.inventory-table th { padding: 13px 11px; background: #f8f9fc; color: #8993a5; font-size: 10px; letter-spacing: .4px; white-space: nowrap; }
.inventory-table td { padding: 14px 11px; border-bottom: 1px solid #edf0f5; color: #647086; font-size: 12px; }
.inventory-table td strong { color: #27334a; }
.inventory-badge { display: inline-block; padding: 5px 9px; border-radius: 20px; font-size: 10px; font-weight: 600; white-space: nowrap; }
.inventory-badge.normal { background: #e7f8ef; color: #16834c; }
.inventory-badge.low { background: #fff6e5; color: #b7791f; }
.inventory-badge.out { background: #fff0ef; color: #d44c3c; }
.inventory-alert { margin-bottom: 16px; padding: 12px 14px; border-radius: 8px; font-size: 12px; }
.inventory-alert.error { border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; }
.inventory-alert.success { border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; }
.inventory-empty { min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: #8993a5; text-align: center; font-size: 12px; }
.inventory-empty strong { color: #344054; }
.inventory-empty p { margin: 0; }
.inventory-modal-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(16,24,40,.55); }
.inventory-modal { width: 100%; max-width: 490px; max-height: 90vh; overflow-y: auto; padding: 24px; border-radius: 13px; background: white; box-shadow: 0 20px 50px rgba(15,23,42,.2); }
.inventory-modal-heading { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.inventory-modal-heading h2 { margin: 0 0 6px; font-size: 19px; }
.inventory-modal-heading p { margin: 0; color: #8993a5; font-size: 12px; }
.inventory-modal-close { width: 34px; height: 34px; display: grid; place-items: center; border: none; border-radius: 7px; background: #f3f5f8; color: #64748b; }
.inventory-form label { display: block; margin: 15px 0 7px; color: #475467; font-size: 12px; font-weight: 600; }
.inventory-form input, .inventory-form select, .inventory-form textarea { width: 100%; padding: 11px 12px; border: 1px solid #dce2ea; border-radius: 8px; outline: none; color: #172033; font-family: inherit; font-size: 13px; background: white; }
.inventory-form input:focus, .inventory-form select:focus, .inventory-form textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
.inventory-form textarea { min-height: 85px; resize: vertical; }
.inventory-modal-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 22px; }
.inventory-available { margin-top: 8px; color: #64748b; font-size: 11px; }
.inventory-loading { min-height: 180px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #64748b; font-size: 12px; }
@media(max-width: 1000px) { .inventory-stats { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media(max-width: 600px) { .inventory-stats { grid-template-columns: 1fr 1fr; gap: 10px; } .inventory-stat { padding: 14px; } .inventory-stat strong { font-size: 21px; } .inventory-toolbar { align-items: stretch; } .inventory-search { flex-basis: 100%; } .inventory-filter { flex: 1; min-width: 0; } .inventory-card { padding: 14px; } .inventory-card-heading { align-items: flex-start; flex-direction: column; } .inventory-modal { padding: 19px; } }
@media(max-width: 380px) { .inventory-stats { grid-template-columns: 1fr; } }
`

function getErrorMessage(error: any): string {
    return (
        error?.response?.data?.message ||
        'Something went wrong. Please check your connection and try again.'
    )
}

function Inventory() {
    const [products, setProducts] = useState<Product[]>([])
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [movementType, setMovementType] = useState<'stock_in' | 'stock_out'>('stock_in')
    const [productId, setProductId] = useState('')
    const [quantity, setQuantity] = useState('1')
    const [notes, setNotes] = useState('')

    const loadInventory = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const [productResponse, movementResponse] = await Promise.all([
                api.get<PaginatedResponse<Product>>('/products?per_page=100'),
                api.get<PaginatedResponse<StockMovement>>('/stock-movements?per_page=100'),
            ])

            setProducts(productResponse.data.data || [])
            setMovements(movementResponse.data.data || [])
        } catch (requestError) {
            setError(getErrorMessage(requestError))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadInventory()
    }, [loadInventory])

    const totalUnits = useMemo(
        () => products.reduce((total, product) => total + Number(product.stock_quantity || 0), 0),
        [products],
    )

    const lowStockProducts = useMemo(
        () =>
            products.filter(
                (product) =>
                    Number(product.stock_quantity) > 0 &&
                    Number(product.stock_quantity) <= Number(product.reorder_level),
            ),
        [products],
    )

    const outOfStockProducts = useMemo(
        () => products.filter((product) => Number(product.stock_quantity) <= 0),
        [products],
    )

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch =
                product.product_name.toLowerCase().includes(search.toLowerCase()) ||
                product.sku.toLowerCase().includes(search.toLowerCase())

            const stock = Number(product.stock_quantity)
            const reorder = Number(product.reorder_level)

            const matchesFilter =
                filter === 'all' ||
                (filter === 'low' && stock > 0 && stock <= reorder) ||
                (filter === 'out' && stock <= 0) ||
                (filter === 'normal' && stock > reorder)

            return matchesSearch && matchesFilter
        })
    }, [products, search, filter])

    const openMovementModal = (type: 'stock_in' | 'stock_out') => {
        setMovementType(type)
        setProductId(products.length ? String(products[0].id) : '')
        setQuantity('1')
        setNotes('')
        setError('')
        setSuccess('')
        setShowModal(true)
    }

    const handleMovementSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        const selectedProduct = products.find((product) => String(product.id) === productId)
        const amount = Number(quantity)

        if (!selectedProduct) {
            setError('Please select a product.')
            return
        }

        if (!Number.isInteger(amount) || amount < 1) {
            setError('Quantity must be a whole number greater than zero.')
            return
        }

        if (
            movementType === 'stock_out' &&
            amount > Number(selectedProduct.stock_quantity)
        ) {
            setError(`Insufficient stock. Available quantity: ${selectedProduct.stock_quantity}.`)
            return
        }

        setSaving(true)

        try {
            await api.post('/stock-movements', {
                product_id: Number(productId),
                movement_type: movementType,
                quantity: amount,
                notes: notes.trim() || null,
            })

            setShowModal(false)
            setSuccess(
                movementType === 'stock_in'
                    ? 'Stock-in recorded successfully.'
                    : 'Stock-out recorded successfully.',
            )
            await loadInventory()
        } catch (requestError) {
            setError(getErrorMessage(requestError))
        } finally {
            setSaving(false)
        }
    }

    const formatDate = (date: string) => {
        if (!date) return '—'

        return new Date(date).toLocaleString('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short',
        })
    }

    const getStockStatus = (product: Product) => {
        const stock = Number(product.stock_quantity)
        const reorder = Number(product.reorder_level)

        if (stock <= 0) return { label: 'Out of stock', className: 'out' }
        if (stock <= reorder) return { label: 'Low stock', className: 'low' }
        return { label: 'In stock', className: 'normal' }
    }

    return (
        <>
            <style>{inventoryStyles}</style>

            <section className="inventory-page">
                <div className="page-heading">
                    <div>
                        <h1>Inventory Management</h1>
                        <p>Monitor stock levels and record inventory movements.</p>
                    </div>

                    <button
                        className="inventory-secondary"
                        onClick={loadInventory}
                        disabled={loading}
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>
                </div>

                {error && !showModal && (
                    <div className="inventory-alert error">{error}</div>
                )}

                {success && (
                    <div className="inventory-alert success">{success}</div>
                )}

                <div className="inventory-stats">
                    <div className="inventory-stat">
                        <div className="inventory-stat-top">
                            <div className="inventory-stat-icon"><Package size={21} /></div>
                        </div>
                        <h3>Total Products</h3>
                        <strong>{loading ? '—' : products.length}</strong>
                        <p>Products being monitored</p>
                    </div>

                    <div className="inventory-stat">
                        <div className="inventory-stat-top">
                            <div className="inventory-stat-icon"><Boxes size={21} /></div>
                        </div>
                        <h3>Total Stock Units</h3>
                        <strong>{loading ? '—' : totalUnits.toLocaleString()}</strong>
                        <p>Combined available quantities</p>
                    </div>

                    <div className="inventory-stat">
                        <div className="inventory-stat-top">
                            <div className="inventory-stat-icon warning"><AlertTriangle size={21} /></div>
                        </div>
                        <h3>Low Stock Items</h3>
                        <strong>{loading ? '—' : lowStockProducts.length}</strong>
                        <p>At or below reorder level</p>
                    </div>

                    <div className="inventory-stat">
                        <div className="inventory-stat-top">
                            <div className="inventory-stat-icon danger"><Package size={21} /></div>
                        </div>
                        <h3>Out of Stock</h3>
                        <strong>{loading ? '—' : outOfStockProducts.length}</strong>
                        <p>Products with zero available stock</p>
                    </div>
                </div>

                <div className="inventory-toolbar">
                    <div className="inventory-search">
                        <Search size={17} />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search product name or SKU..."
                        />
                    </div>

                    <select
                        className="inventory-filter"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                    >
                        <option value="all">All stock levels</option>
                        <option value="normal">In stock</option>
                        <option value="low">Low stock</option>
                        <option value="out">Out of stock</option>
                    </select>

                    <button
                        className="inventory-action"
                        onClick={() => openMovementModal('stock_in')}
                        disabled={loading || products.length === 0}
                    >
                        <ArrowDownToLine size={16} />
                        Stock In
                    </button>

                    <button
                        className="inventory-secondary"
                        onClick={() => openMovementModal('stock_out')}
                        disabled={loading || products.length === 0}
                    >
                        <ArrowUpFromLine size={16} />
                        Stock Out
                    </button>
                </div>

                <section className="inventory-card">
                    <div className="inventory-card-heading">
                        <div>
                            <h2>Current Inventory</h2>
                            <p>Stock quantities and reorder status for your products.</p>
                        </div>
                        <span className="inventory-badge normal">
                            {filteredProducts.length} products
                        </span>
                    </div>

                    {loading ? (
                        <div className="inventory-loading">
                            <LoaderCircle size={19} className="animate-spin" />
                            Loading inventory...
                        </div>
                    ) : products.length === 0 ? (
                        <div className="inventory-empty">
                            <Package size={32} />
                            <strong>No products available</strong>
                            <p>Add products first before recording inventory movements.</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="inventory-empty">
                            <Search size={30} />
                            <strong>No matching products</strong>
                            <p>Try changing your search or stock filter.</p>
                        </div>
                    ) : (
                        <div className="inventory-table-wrap">
                            <table className="inventory-table">
                                <thead>
                                    <tr>
                                        <th>PRODUCT</th>
                                        <th>SKU</th>
                                        <th>CATEGORY</th>
                                        <th>CURRENT STOCK</th>
                                        <th>REORDER LEVEL</th>
                                        <th>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => {
                                        const status = getStockStatus(product)

                                        return (
                                            <tr key={product.id}>
                                                <td><strong>{product.product_name}</strong></td>
                                                <td>{product.sku}</td>
                                                <td>{product.category?.category_name || '—'}</td>
                                                <td><strong>{product.stock_quantity}</strong></td>
                                                <td>{product.reorder_level}</td>
                                                <td>
                                                    <span className={`inventory-badge ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="inventory-card">
                    <div className="inventory-card-heading">
                        <div>
                            <h2>Inventory Movement History</h2>
                            <p>Recent stock-in and stock-out records.</p>
                        </div>
                        <History size={19} color="#8993a5" />
                    </div>

                    {loading ? (
                        <div className="inventory-loading">
                            <LoaderCircle size={19} className="animate-spin" />
                            Loading movement history...
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="inventory-empty">
                            <History size={30} />
                            <strong>No inventory movements yet</strong>
                            <p>Stock-in and stock-out transactions will appear here.</p>
                        </div>
                    ) : (
                        <div className="inventory-table-wrap">
                            <table className="inventory-table">
                                <thead>
                                    <tr>
                                        <th>DATE</th>
                                        <th>PRODUCT</th>
                                        <th>MOVEMENT</th>
                                        <th>QUANTITY</th>
                                        <th>RECORDED BY</th>
                                        <th>NOTES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map((movement) => (
                                        <tr key={movement.id}>
                                            <td>{formatDate(movement.movement_date)}</td>
                                            <td>
                                                <strong>{movement.product?.product_name || `Product #${movement.product_id}`}</strong>
                                            </td>
                                            <td>
                                                <span
                                                    className={`inventory-badge ${movement.movement_type === 'stock_in' ? 'normal' : 'low'
                                                        }`}
                                                >
                                                    {movement.movement_type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td><strong>{movement.quantity}</strong></td>
                                            <td>{movement.user?.name || '—'}</td>
                                            <td>{movement.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </section>

            {showModal && (
                <div
                    className="inventory-modal-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget && !saving) {
                            setShowModal(false)
                            setError('')
                        }
                    }}
                >
                    <div className="inventory-modal">
                        <div className="inventory-modal-heading">
                            <div>
                                <h2>{movementType === 'stock_in' ? 'Record Stock In' : 'Record Stock Out'}</h2>
                                <p>
                                    {movementType === 'stock_in'
                                        ? 'Add received quantities to your inventory.'
                                        : 'Record quantities removed from your inventory.'}
                                </p>
                            </div>

                            <button
                                className="inventory-modal-close"
                                onClick={() => {
                                    setShowModal(false)
                                    setError('')
                                }}
                                disabled={saving}
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {error && <div className="inventory-alert error">{error}</div>}

                        <form className="inventory-form" onSubmit={handleMovementSubmit}>
                            <label htmlFor="inventory-product">Product</label>
                            <select
                                id="inventory-product"
                                value={productId}
                                onChange={(event) => setProductId(event.target.value)}
                                required
                            >
                                <option value="">Select a product</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.product_name} ({product.sku})
                                    </option>
                                ))}
                            </select>

                            {movementType === 'stock_out' && productId && (
                                <p className="inventory-available">
                                    Available stock:{' '}
                                    {products.find((product) => String(product.id) === productId)?.stock_quantity ?? 0}
                                </p>
                            )}

                            <label htmlFor="inventory-quantity">Quantity</label>
                            <input
                                id="inventory-quantity"
                                type="number"
                                min="1"
                                step="1"
                                value={quantity}
                                onChange={(event) => setQuantity(event.target.value)}
                                required
                            />

                            <label htmlFor="inventory-notes">Notes (optional)</label>
                            <textarea
                                id="inventory-notes"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder="Enter a note about this stock movement..."
                            />

                            <div className="inventory-modal-actions">
                                <button
                                    type="button"
                                    className="inventory-secondary"
                                    onClick={() => {
                                        setShowModal(false)
                                        setError('')
                                    }}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button type="submit" className="inventory-action" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <LoaderCircle size={15} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={15} />
                                            Record Movement
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

export default Inventory