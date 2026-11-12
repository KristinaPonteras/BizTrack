
import { useEffect, useState } from 'react'
import {
    Plus,
    ShoppingCart,
    Receipt,
    RefreshCw,
    Search,
    X,
    Trash2,
    CircleDollarSign,
    Package,
} from 'lucide-react'
import api from '../services/api'

interface Product {
    id: number
    product_name: string
    sku: string
    selling_price: string | number
    stock_quantity: number
    status: string
}

interface SaleItem {
    id: number
    product_id: number
    quantity: number
    unit_price: string | number
    subtotal: string | number
    product?: Product
}

interface Sale {
    id: number
    invoice_number: string
    sale_date: string
    total_amount: string | number
    payment_method: string
    status: string
    sale_items: SaleItem[]
    user?: {
        id: number
        name: string
    }
}

interface CartItem {
    product: Product
    quantity: number
}

const money = (value: number | string) =>
    `₱${Number(value || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`

const getErrorMessage = (error: any) => {
    const errors = error?.response?.data?.errors

    if (errors) {
        return Object.values(errors).flat().join(' ')
    }

    return error?.response?.data?.message || 'Something went wrong. Please try again.'
}

function Sales() {
    const [products, setProducts] = useState<Product[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [selectedProduct, setSelectedProduct] = useState('')
    const [quantity, setQuantity] = useState('1')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const total = cart.reduce(
        (sum, item) => sum + Number(item.product.selling_price) * item.quantity,
        0
    )

    const totalTransactions = sales.filter(
        (sale) => sale.status === 'completed'
    ).length

    const totalRevenue = sales
        .filter((sale) => sale.status === 'completed')
        .reduce((sum, sale) => sum + Number(sale.total_amount), 0)

    const loadData = async () => {
        setLoading(true)
        setError('')

        try {
            const [productResponse, salesResponse] = await Promise.all([
                api.get('/products?per_page=100'),
                api.get('/sales?per_page=100'),
            ])

            setProducts(productResponse.data.data || [])
            setSales(salesResponse.data.data || [])
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const addToCart = () => {
        setError('')
        setSuccess('')

        const product = products.find(
            (item) => item.id === Number(selectedProduct)
        )

        const requestedQuantity = Number(quantity)

        if (!product) {
            setError('Please select a product.')
            return
        }

        if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
            setError('Enter a valid quantity.')
            return
        }

        const existing = cart.find((item) => item.product.id === product.id)
        const alreadyAdded = existing?.quantity || 0

        if (alreadyAdded + requestedQuantity > product.stock_quantity) {
            setError(
                `Only ${product.stock_quantity - alreadyAdded} more unit(s) of ${product.product_name} can be added.`
            )
            return
        }

        if (existing) {
            setCart((current) =>
                current.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + requestedQuantity }
                        : item
                )
            )
        } else {
            setCart((current) => [
                ...current,
                { product, quantity: requestedQuantity },
            ])
        }

        setSelectedProduct('')
        setQuantity('1')
    }

    const updateQuantity = (productId: number, value: string) => {
        const nextQuantity = Number(value)
        const item = cart.find((entry) => entry.product.id === productId)

        if (!item || !Number.isInteger(nextQuantity) || nextQuantity < 1) {
            return
        }

        if (nextQuantity > item.product.stock_quantity) {
            setError(`Only ${item.product.stock_quantity} units are available.`)
            return
        }

        setError('')
        setCart((current) =>
            current.map((entry) =>
                entry.product.id === productId
                    ? { ...entry, quantity: nextQuantity }
                    : entry
            )
        )
    }

    const removeFromCart = (productId: number) => {
        setCart((current) =>
            current.filter((item) => item.product.id !== productId)
        )
    }

    const recordSale = async () => {
        if (cart.length === 0) {
            setError('Add at least one product before recording a sale.')
            return
        }

        setSubmitting(true)
        setError('')
        setSuccess('')

        try {
            const response = await api.post('/sales', {
                payment_method: paymentMethod,
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                })),
            })

            setSuccess(
                `Sale ${response.data.data.invoice_number} recorded successfully.`
            )
            setCart([])
            setShowModal(false)
            await loadData()
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setSubmitting(false)
        }
    }

    const filteredSales = sales.filter((sale) =>
        sale.invoice_number.toLowerCase().includes(search.toLowerCase())
    )

    const activeProducts = products.filter(
        (product) => product.status === 'active' && product.stock_quantity > 0
    )

    return (
        <div className="sales-page">
            <style>{`
        .sales-page { color: #172033; }
        .sales-page * { box-sizing: border-box; }
        .sales-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
        .sales-heading h1 { margin:0 0 6px; font-size:25px; font-weight:750; }
        .sales-heading p { margin:0; color:#788397; font-size:13px; }
        .sales-actions { display:flex; gap:10px; }
        .sales-btn { border:1px solid #dce2eb; background:white; color:#344054; border-radius:9px; padding:10px 14px; display:inline-flex; align-items:center; gap:8px; font-weight:650; font-size:13px; cursor:pointer; }
        .sales-btn.primary { background:#2563eb; border-color:#2563eb; color:white; }
        .sales-btn:disabled { opacity:.55; cursor:not-allowed; }
        .sales-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-bottom:22px; }
        .sales-stat { background:white; border:1px solid #e8edf3; border-radius:13px; padding:18px; }
        .sales-stat-top { display:flex; justify-content:space-between; align-items:center; color:#778397; font-size:12px; }
        .sales-stat-icon { width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:#eff6ff; color:#2563eb; }
        .sales-stat strong { display:block; font-size:23px; margin-top:13px; }
        .sales-stat small { color:#8792a3; font-size:12px; }
        .sales-alert { padding:12px 14px; border-radius:9px; margin-bottom:16px; font-size:13px; }
        .sales-alert.error { background:#fff1f2; color:#be123c; border:1px solid #fecdd3; }
        .sales-alert.success { background:#ecfdf3; color:#027a48; border:1px solid #abefc6; }
        .sales-card { background:white; border:1px solid #e8edf3; border-radius:13px; overflow:hidden; }
        .sales-card-header { padding:18px 20px; display:flex; justify-content:space-between; align-items:center; gap:12px; border-bottom:1px solid #edf0f4; flex-wrap:wrap; }
        .sales-card-header h2 { margin:0 0 5px; font-size:16px; }
        .sales-card-header p { margin:0; font-size:12px; color:#8792a3; }
        .sales-search { display:flex; align-items:center; gap:8px; border:1px solid #dce2eb; border-radius:8px; padding:9px 11px; color:#8792a3; }
        .sales-search input { border:0; outline:0; width:190px; font-size:13px; color:#344054; }
        .sales-table-wrap { overflow-x:auto; }
        .sales-table { width:100%; border-collapse:collapse; min-width:650px; }
        .sales-table th { background:#f8fafc; color:#758195; font-size:11px; text-transform:uppercase; letter-spacing:.04em; text-align:left; padding:12px 18px; }
        .sales-table td { padding:14px 18px; border-top:1px solid #edf0f4; font-size:13px; color:#475467; }
        .sales-table td strong { color:#202b3c; }
        .sales-status { display:inline-block; padding:5px 9px; border-radius:20px; background:#ecfdf3; color:#027a48; font-size:11px; font-weight:700; text-transform:capitalize; }
        .sales-empty { padding:45px 20px; text-align:center; color:#8792a3; }
        .sales-empty-icon { margin:0 auto 12px; width:48px; height:48px; border-radius:14px; display:grid; place-items:center; background:#f1f5f9; color:#64748b; }
        .sales-empty strong { display:block; color:#344054; margin-bottom:5px; }
        .sales-empty span { font-size:12px; }
        .sales-modal-backdrop { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.52); display:flex; align-items:center; justify-content:center; padding:18px; }
        .sales-modal { background:white; border-radius:15px; width:100%; max-width:680px; max-height:90vh; overflow:auto; box-shadow:0 20px 60px rgba(0,0,0,.2); }
        .sales-modal-header { display:flex; align-items:center; justify-content:space-between; padding:20px 22px; border-bottom:1px solid #edf0f4; }
        .sales-modal-header h2 { margin:0 0 4px; font-size:18px; }
        .sales-modal-header p { margin:0; color:#8792a3; font-size:12px; }
        .sales-icon-button { border:0; background:#f1f5f9; color:#475467; width:34px; height:34px; border-radius:8px; cursor:pointer; }
        .sales-modal-body { padding:20px 22px; }
        .sales-form-row { display:grid; grid-template-columns:1fr 110px auto; gap:10px; align-items:end; }
        .sales-field label { display:block; font-size:12px; font-weight:650; color:#475467; margin-bottom:7px; }
        .sales-field select,.sales-field input { width:100%; border:1px solid #dce2eb; border-radius:8px; padding:10px; outline:none; background:white; color:#344054; font-size:13px; }
        .sales-cart { margin-top:22px; border:1px solid #edf0f4; border-radius:10px; overflow:hidden; }
        .sales-cart-row { display:grid; grid-template-columns:1fr 90px 100px 32px; align-items:center; gap:10px; padding:12px; border-top:1px solid #edf0f4; font-size:12px; }
        .sales-cart-row:first-child { border-top:0; }
        .sales-cart-row input { width:70px; border:1px solid #dce2eb; border-radius:6px; padding:7px; }
        .sales-remove { border:0; background:transparent; color:#dc2626; cursor:pointer; }
        .sales-total { display:flex; justify-content:space-between; align-items:center; padding:16px 0; font-size:14px; font-weight:700; }
        .sales-total strong { font-size:21px; color:#2563eb; }
        .sales-modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:16px 22px; border-top:1px solid #edf0f4; }
        @media(max-width:700px) {
          .sales-stats { grid-template-columns:1fr; }
          .sales-form-row { grid-template-columns:1fr 90px; }
          .sales-form-row .sales-btn { grid-column:1/-1; justify-content:center; }
          .sales-cart-row { grid-template-columns:1fr 70px 75px 25px; gap:5px; }
          .sales-search input { width:130px; }
        }
      `}</style>

            <div className="sales-heading">
                <div>
                    <h1>Sales Management</h1>
                    <p>Record customer purchases and monitor sales transactions.</p>
                </div>

                <div className="sales-actions">
                    <button className="sales-btn" onClick={loadData} disabled={loading}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button
                        className="sales-btn primary"
                        onClick={() => {
                            setError('')
                            setSuccess('')
                            setShowModal(true)
                        }}
                    >
                        <Plus size={17} /> New Sale
                    </button>
                </div>
            </div>

            {error && <div className="sales-alert error">{error}</div>}
            {success && <div className="sales-alert success">{success}</div>}

            <div className="sales-stats">
                <div className="sales-stat">
                    <div className="sales-stat-top">
                        Completed Transactions
                        <div className="sales-stat-icon"><Receipt size={19} /></div>
                    </div>
                    <strong>{loading ? '—' : totalTransactions}</strong>
                    <small>Recorded completed sales</small>
                </div>

                <div className="sales-stat">
                    <div className="sales-stat-top">
                        Sales Revenue
                        <div className="sales-stat-icon"><CircleDollarSign size={19} /></div>
                    </div>
                    <strong>{loading ? '—' : money(totalRevenue)}</strong>
                    <small>From the latest 100 transactions</small>
                </div>

                <div className="sales-stat">
                    <div className="sales-stat-top">
                        Available Products
                        <div className="sales-stat-icon"><Package size={19} /></div>
                    </div>
                    <strong>{loading ? '—' : activeProducts.length}</strong>
                    <small>Active products with available stock</small>
                </div>
            </div>

            <section className="sales-card">
                <div className="sales-card-header">
                    <div>
                        <h2>Sales Transaction History</h2>
                        <p>Recent sales recorded in BizTrack.</p>
                    </div>

                    <div className="sales-search">
                        <Search size={16} />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search invoice..."
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="sales-empty">
                        <RefreshCw size={25} />
                        <p>Loading sales transactions...</p>
                    </div>
                ) : filteredSales.length === 0 ? (
                    <div className="sales-empty">
                        <div className="sales-empty-icon"><ShoppingCart size={25} /></div>
                        <strong>No sales transactions yet</strong>
                        <span>Record your first sale to see it displayed here.</span>
                    </div>
                ) : (
                    <div className="sales-table-wrap">
                        <table className="sales-table">
                            <thead>
                                <tr>
                                    <th>Invoice Number</th>
                                    <th>Date</th>
                                    <th>Payment Method</th>
                                    <th>Recorded By</th>
                                    <th>Total Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td><strong>{sale.invoice_number}</strong></td>
                                        <td>{new Date(sale.sale_date).toLocaleString()}</td>
                                        <td>{sale.payment_method.replace('_', ' ')}</td>
                                        <td>{sale.user?.name || '—'}</td>
                                        <td><strong>{money(sale.total_amount)}</strong></td>
                                        <td><span className="sales-status">{sale.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {showModal && (
                <div
                    className="sales-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setShowModal(false)
                    }}
                >
                    <div className="sales-modal">
                        <div className="sales-modal-header">
                            <div>
                                <h2>Record New Sale</h2>
                                <p>Select products and enter the quantities sold.</p>
                            </div>
                            <button
                                className="sales-icon-button"
                                onClick={() => setShowModal(false)}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sales-modal-body">
                            {error && <div className="sales-alert error">{error}</div>}

                            <div className="sales-form-row">
                                <div className="sales-field">
                                    <label>Product</label>
                                    <select
                                        value={selectedProduct}
                                        onChange={(event) => setSelectedProduct(event.target.value)}
                                    >
                                        <option value="">Select a product</option>
                                        {activeProducts.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.product_name} — {product.sku} — Stock: {product.stock_quantity}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="sales-field">
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={quantity}
                                        onChange={(event) => setQuantity(event.target.value)}
                                    />
                                </div>

                                <button className="sales-btn primary" onClick={addToCart}>
                                    <Plus size={16} /> Add
                                </button>
                            </div>

                            <div className="sales-field" style={{ marginTop: 18 }}>
                                <label>Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(event) => setPaymentMethod(event.target.value)}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="e_wallet">E-wallet</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                            </div>

                            <div className="sales-cart">
                                {cart.length === 0 ? (
                                    <div className="sales-empty">
                                        <div className="sales-empty-icon"><ShoppingCart size={23} /></div>
                                        <strong>Your sale is empty</strong>
                                        <span>Add products to start a transaction.</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="sales-cart-row" style={{ background: '#f8fafc', fontWeight: 700 }}>
                                            <span>Product</span>
                                            <span>Quantity</span>
                                            <span>Subtotal</span>
                                            <span></span>
                                        </div>

                                        {cart.map((item) => (
                                            <div className="sales-cart-row" key={item.product.id}>
                                                <span>
                                                    <strong>{item.product.product_name}</strong>
                                                    <br />
                                                    {money(item.product.selling_price)} each
                                                </span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.product.stock_quantity}
                                                    value={item.quantity}
                                                    onChange={(event) =>
                                                        updateQuantity(item.product.id, event.target.value)
                                                    }
                                                />
                                                <strong>
                                                    {money(Number(item.product.selling_price) * item.quantity)}
                                                </strong>
                                                <button
                                                    className="sales-remove"
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    aria-label="Remove product"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>

                            <div className="sales-total">
                                <span>Total Amount</span>
                                <strong>{money(total)}</strong>
                            </div>
                        </div>

                        <div className="sales-modal-footer">
                            <button
                                className="sales-btn"
                                onClick={() => setShowModal(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="sales-btn primary"
                                onClick={recordSale}
                                disabled={submitting || cart.length === 0}
                            >
                                {submitting ? 'Recording...' : 'Complete Sale'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Sales