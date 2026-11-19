
import { useEffect, useState } from 'react'
import {
    Package,
    Boxes,
    PhilippinePeso,
    Receipt,
    AlertTriangle,
    Clock,
    RefreshCw,
} from 'lucide-react'
import api from '../services/api'

interface Product {
    id: number
    product_name: string
    sku: string
    stock_quantity: number
    reorder_level: number
    status: string
}

interface Sale {
    id: number
    invoice_number: string
    sale_date: string
    total_amount: number
    payment_method: string
    status: string
}

interface PaginatedResponse<T> {
    data: T[]
    total: number
}

export default function Dashboard() {
    const [products, setProducts] = useState<Product[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const [productTotal, setProductTotal] = useState(0)
    const [salesTotal, setSalesTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const loadDashboard = async () => {
        setLoading(true)
        setError('')

        try {
            const [productResponse, salesResponse] = await Promise.all([
                api.get<PaginatedResponse<Product>>('/products', {
                    params: { per_page: 100 },
                }),
                api.get<PaginatedResponse<Sale>>('/sales', {
                    params: { per_page: 100, status: 'completed' },
                }),
            ])

            setProducts(productResponse.data.data ?? [])
            setProductTotal(productResponse.data.total ?? 0)
            setSales(salesResponse.data.data ?? [])
            setSalesTotal(salesResponse.data.total ?? 0)
        } catch (err) {
            console.error('Dashboard loading error:', err)
            setError('Unable to load dashboard data. Please refresh the page.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDashboard()
    }, [])

    const totalStock = products.reduce(
        (total, product) => total + Number(product.stock_quantity || 0),
        0,
    )

    const totalSales = sales.reduce(
        (total, sale) => total + Number(sale.total_amount || 0),
        0,
    )

    const lowStockProducts = products.filter(
        (product) =>
            Number(product.stock_quantity) > 0 &&
            Number(product.stock_quantity) <= Number(product.reorder_level),
    )

    const outOfStockProducts = products.filter(
        (product) => Number(product.stock_quantity) === 0,
    )

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount)

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })

    if (loading) {
        return (
            <div className="simple-module">
                <p>Loading dashboard data...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="simple-module">
                <p>{error}</p>
                <button onClick={loadDashboard}>
                    <RefreshCw size={16} /> Try Again
                </button>
            </div>
        )
    }

    return (
        <div className="simple-module">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-gray-500 mt-1">
                        Welcome to your StoreFlow business overview.
                    </p>
                </div>

                <button
                    onClick={loadDashboard}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <SummaryCard
                    title="Total Products"
                    value={productTotal.toString()}
                    icon={<Package size={22} />}
                />

                <SummaryCard
                    title="Total Stock Units"
                    value={totalStock.toLocaleString()}
                    icon={<Boxes size={22} />}
                />

                <SummaryCard
                    title="Sales Revenue"
                    value={formatCurrency(totalSales)}
                    icon={<PhilippinePeso size={22} />}
                />

                <SummaryCard
                    title="Completed Transactions"
                    value={salesTotal.toString()}
                    icon={<Receipt size={22} />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={20} className="text-orange-500" />
                        <h2 className="font-semibold text-gray-800">Inventory Alerts</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-orange-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Low Stock</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {lowStockProducts.length}
                            </p>
                        </div>

                        <div className="bg-red-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-600">
                                {outOfStockProducts.length}
                            </p>
                        </div>
                    </div>

                    {lowStockProducts.length === 0 &&
                        outOfStockProducts.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            No inventory alerts at the moment.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {[...lowStockProducts, ...outOfStockProducts]
                                .slice(0, 6)
                                .map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-800">
                                                {product.product_name}
                                            </p>
                                            <p className="text-xs text-gray-500">{product.sku}</p>
                                        </div>

                                        <span
                                            className={`text-xs font-semibold ${Number(product.stock_quantity) === 0
                                                    ? 'text-red-600'
                                                    : 'text-orange-600'
                                                }`}
                                        >
                                            {product.stock_quantity} units
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={20} className="text-blue-600" />
                        <h2 className="font-semibold text-gray-800">Recent Sales</h2>
                    </div>

                    {sales.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            No completed sales records yet.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {sales.slice(0, 5).map((sale) => (
                                <div
                                    key={sale.id}
                                    className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-800 truncate">
                                            {sale.invoice_number}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(sale.sale_date)} · {sale.payment_method}
                                        </p>
                                    </div>

                                    <p className="font-semibold text-green-700 whitespace-nowrap">
                                        {formatCurrency(Number(sale.total_amount))}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

function SummaryCard({
    title,
    value,
    icon,
}: {
    title: string
    value: string
    icon: React.ReactNode
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{title}</p>
                <span className="text-blue-600">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    )
}
