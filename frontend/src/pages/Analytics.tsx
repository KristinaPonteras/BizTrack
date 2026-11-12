
import { useEffect, useMemo, useState } from 'react';
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Wallet,
    Receipt,
    Package,
    AlertTriangle,
    BarChart3,
    Lightbulb,
    Brain,
    CheckCircle,
} from 'lucide-react';
import api from '../services/api';

type RecordData = Record<string, unknown>;

interface AnalyticsData {
    sales: RecordData[];
    expenses: RecordData[];
    products: RecordData[];
}

const emptyData: AnalyticsData = {
    sales: [],
    expenses: [],
    products: [],
};

function getRecords(response: unknown): RecordData[] {
    if (!response || typeof response !== 'object') return [];

    const result = response as Record<string, unknown>;

    if (Array.isArray(result)) return result as RecordData[];
    if (Array.isArray(result.data)) return result.data as RecordData[];

    if (result.data && typeof result.data === 'object') {
        const nested = result.data as Record<string, unknown>;
        if (Array.isArray(nested.data)) return nested.data as RecordData[];
    }

    return [];
}

function getNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function getSalesAmount(sale: RecordData): number {
    return getNumber(
        sale.total_amount ??
        sale.grand_total ??
        sale.total ??
        sale.amount
    );
}

function getExpenseAmount(expense: RecordData): number {
    return getNumber(expense.amount);
}

function getDate(record: RecordData): Date | null {
    const value =
        record.sale_date ??
        record.expense_date ??
        record.created_at ??
        record.date;

    if (!value) return null;

    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
}

function getProductStock(product: RecordData): number {
    return getNumber(
        product.quantity ??
        product.stock_quantity ??
        product.current_stock
    );
}

function getProductReorderLevel(product: RecordData): number {
    return getNumber(
        product.reorder_level ??
        product.minimum_stock ??
        product.low_stock_threshold
    );
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(amount);
}

export default function Analytics() {
    const [data, setData] = useState<AnalyticsData>(emptyData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadAnalytics = async () => {
        setLoading(true);
        setError('');

        // Request up to 100 records from each API endpoint.
        const results = await Promise.allSettled([
            api.get('/sales?per_page=100'),
            api.get('/expenses?per_page=100'),
            api.get('/products?per_page=100'),
        ]);

        const sales =
            results[0].status === 'fulfilled'
                ? getRecords(results[0].value.data)
                : [];

        const expenses =
            results[1].status === 'fulfilled'
                ? getRecords(results[1].value.data)
                : [];

        const products =
            results[2].status === 'fulfilled'
                ? getRecords(results[2].value.data)
                : [];

        const failed: string[] = [];

        if (results[0].status === 'rejected') failed.push('Sales');
        if (results[1].status === 'rejected') failed.push('Expenses');
        if (results[2].status === 'rejected') failed.push('Products');

        setData({ sales, expenses, products });

        if (failed.length > 0) {
            setError(
                `Unable to load ${failed.join(', ')} data. Some analytics may be incomplete.`
            );
        }

        setLoading(false);
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    const analytics = useMemo(() => {
        const totalSales = data.sales.reduce(
            (sum, sale) => sum + getSalesAmount(sale),
            0
        );

        const totalExpenses = data.expenses.reduce(
            (sum, expense) => sum + getExpenseAmount(expense),
            0
        );

        const totalStock = data.products.reduce(
            (sum, product) => sum + getProductStock(product),
            0
        );

        const lowStockProducts = data.products.filter((product) => {
            const stock = getProductStock(product);
            const reorder = getProductReorderLevel(product);
            return stock > 0 && reorder > 0 && stock <= reorder;
        });

        const outOfStockProducts = data.products.filter(
            (product) => getProductStock(product) <= 0
        );

        const now = new Date();

        const monthlyData = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - (5 - index),
                1
            );

            const monthSales = data.sales
                .filter((sale) => {
                    const saleDate = getDate(sale);
                    return (
                        saleDate !== null &&
                        saleDate.getMonth() === date.getMonth() &&
                        saleDate.getFullYear() === date.getFullYear()
                    );
                })
                .reduce((sum, sale) => sum + getSalesAmount(sale), 0);

            const monthExpenses = data.expenses
                .filter((expense) => {
                    const expenseDate = getDate(expense);
                    return (
                        expenseDate !== null &&
                        expenseDate.getMonth() === date.getMonth() &&
                        expenseDate.getFullYear() === date.getFullYear()
                    );
                })
                .reduce((sum, expense) => sum + getExpenseAmount(expense), 0);

            return {
                label: date.toLocaleDateString('en-US', {
                    month: 'short',
                    year: '2-digit',
                }),
                sales: monthSales,
                expenses: monthExpenses,
            };
        });

        // Use the three most recent months with recorded sales.
        const monthsWithSales = monthlyData.filter(
            (month) => month.sales > 0
        );

        const latestThreeSalesMonths = monthsWithSales.slice(-3);

        const hasEnoughHistory = latestThreeSalesMonths.length === 3;

        const salesForecast = hasEnoughHistory
            ? latestThreeSalesMonths.reduce(
                (sum, month) => sum + month.sales,
                0
            ) / 3
            : null;

        const recommendations: {
            title: string;
            message: string;
            type: 'warning' | 'danger' | 'success' | 'info';
        }[] = [];

        if (outOfStockProducts.length > 0) {
            recommendations.push({
                title: 'Restock Out-of-Stock Products',
                message: `${outOfStockProducts.length} product(s) currently have no available stock. Review these products and consider restocking them.`,
                type: 'danger',
            });
        }

        if (lowStockProducts.length > 0) {
            recommendations.push({
                title: 'Monitor Low Stock',
                message: `${lowStockProducts.length} product(s) are at or below their recorded reorder level. Consider replenishing them.`,
                type: 'warning',
            });
        }

        if (totalExpenses > totalSales && data.sales.length > 0) {
            recommendations.push({
                title: 'Review Business Expenses',
                message: `Recorded expenses exceed sales by ${formatCurrency(totalExpenses - totalSales)}. Review expenses and monitor business costs.`,
                type: 'warning',
            });
        } else if (totalSales > totalExpenses && data.sales.length > 0) {
            recommendations.push({
                title: 'Positive Recorded Balance',
                message: `Recorded sales exceed recorded expenses by ${formatCurrency(totalSales - totalExpenses)}. Continue monitoring both figures.`,
                type: 'success',
            });
        }

        if (data.sales.length === 0) {
            recommendations.push({
                title: 'Record Business Sales',
                message: 'No sales records are currently available. Record actual transactions to improve your business performance analysis.',
                type: 'info',
            });
        }

        if (data.products.length === 0) {
            recommendations.push({
                title: 'Add Product Records',
                message: 'No products were found. Add products to monitor stock levels and inventory performance.',
                type: 'info',
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                title: 'Inventory and Records Look Good',
                message: 'No immediate inventory or expense concerns were identified from the retrieved records. Continue monitoring your business.',
                type: 'success',
            });
        }

        return {
            totalSales,
            totalExpenses,
            estimatedProfit: totalSales - totalExpenses,
            totalStock,
            totalProducts: data.products.length,
            totalTransactions: data.sales.length,
            totalExpenseRecords: data.expenses.length,
            lowStockCount: lowStockProducts.length,
            outOfStockCount: outOfStockProducts.length,
            monthlyData,
            monthsWithSales: monthsWithSales.length,
            salesForecast,
            recommendations,
        };
    }, [data]);

    const maximumMonthlyValue = Math.max(
        ...analytics.monthlyData.map((month) =>
            Math.max(month.sales, month.expenses)
        ),
        1
    );

    if (loading) {
        return (
            <div className="analytics-loading">
                <RefreshCw className="loading-icon" size={24} />
                <p>Loading analytics from your database...</p>
                <style>{styles}</style>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <style>{styles}</style>

            <div className="analytics-header">
                <div>
                    <h1>Analytics & Reports</h1>
                    <p>
                        Monitor your business performance using your actual
                        sales, expenses, and inventory records.
                    </p>
                </div>

                <button
                    className="refresh-button"
                    onClick={loadAnalytics}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh Data
                </button>
            </div>

            {error && (
                <div className="analytics-error">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* DESCRIPTIVE ANALYTICS */}
            <div className="analytics-section-title">
                <h2>Descriptive Analytics: Business Overview</h2>
                <span>Based on retrieved records</span>
            </div>

            <div className="analytics-cards">
                <div className="analytics-card">
                    <div className="card-icon blue">
                        <TrendingUp size={21} />
                    </div>
                    <div>
                        <p>Total Sales</p>
                        <h3>{formatCurrency(analytics.totalSales)}</h3>
                        <span>{analytics.totalTransactions} transactions</span>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="card-icon orange">
                        <TrendingDown size={21} />
                    </div>
                    <div>
                        <p>Total Expenses</p>
                        <h3>{formatCurrency(analytics.totalExpenses)}</h3>
                        <span>{analytics.totalExpenseRecords} expense records</span>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="card-icon green">
                        <Wallet size={21} />
                    </div>
                    <div>
                        <p>Estimated Profit</p>
                        <h3 className={analytics.estimatedProfit < 0 ? 'negative-value' : ''}>
                            {formatCurrency(analytics.estimatedProfit)}
                        </h3>
                        <span>Sales minus recorded expenses</span>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="card-icon purple">
                        <Package size={21} />
                    </div>
                    <div>
                        <p>Total Products</p>
                        <h3>{analytics.totalProducts}</h3>
                        <span>{analytics.totalStock} total stock units</span>
                    </div>
                </div>
            </div>

            <div className="analytics-section-title">
                <h2>Sales & Expense Trends</h2>
                <span>Last 6 months</span>
            </div>

            <div className="analytics-panel">
                <div className="chart-legend">
                    <span><i className="legend-dot sales-dot" />Sales</span>
                    <span><i className="legend-dot expense-dot" />Expenses</span>
                </div>

                {analytics.monthlyData.every(
                    (month) => month.sales === 0 && month.expenses === 0
                ) ? (
                    <div className="analytics-empty">
                        <BarChart3 size={34} />
                        <strong>No trend data available</strong>
                        <p>Sales and expense records will appear here when available.</p>
                    </div>
                ) : (
                    <div className="monthly-chart">
                        {analytics.monthlyData.map((month) => (
                            <div className="month-column" key={month.label}>
                                <div className="bar-area">
                                    <div
                                        className="chart-bar sales-bar"
                                        style={{
                                            height: `${(month.sales / maximumMonthlyValue) * 100}%`,
                                        }}
                                        title={`Sales: ${formatCurrency(month.sales)}`}
                                    />
                                    <div
                                        className="chart-bar expense-bar"
                                        style={{
                                            height: `${(month.expenses / maximumMonthlyValue) * 100}%`,
                                        }}
                                        title={`Expenses: ${formatCurrency(month.expenses)}`}
                                    />
                                </div>
                                <span className="month-label">{month.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="analytics-section-title">
                <h2>Inventory Summary</h2>
                <span>Current product records</span>
            </div>

            <div className="inventory-summary">
                <div className="inventory-stat">
                    <Package size={22} />
                    <div><span>Total Products</span><strong>{analytics.totalProducts}</strong></div>
                </div>
                <div className="inventory-stat">
                    <Receipt size={22} />
                    <div><span>Total Stock Units</span><strong>{analytics.totalStock}</strong></div>
                </div>
                <div className="inventory-stat warning-stat">
                    <AlertTriangle size={22} />
                    <div><span>Low Stock Products</span><strong>{analytics.lowStockCount}</strong></div>
                </div>
                <div className="inventory-stat danger-stat">
                    <AlertTriangle size={22} />
                    <div><span>Out of Stock</span><strong>{analytics.outOfStockCount}</strong></div>
                </div>
            </div>

            {/* PREDICTIVE ANALYTICS */}
            <div className="analytics-section-title">
                <h2>
                    <Brain size={19} />
                    Predictive Analytics: Sales Forecast
                </h2>
                <span>Estimate based on historical sales</span>
            </div>

            <div className="insight-panel">
                {analytics.salesForecast !== null ? (
                    <>
                        <div className="forecast-heading">
                            <div className="insight-icon purple">
                                <TrendingUp size={23} />
                            </div>
                            <div>
                                <span>Estimated Sales for Next Month</span>
                                <h3>{formatCurrency(analytics.salesForecast)}</h3>
                            </div>
                        </div>
                        <p>
                            This estimate uses the average sales from the three
                            most recent months with recorded sales. It is a
                            simple moving-average forecast, not a guaranteed result.
                        </p>
                    </>
                ) : (
                    <div className="insufficient-data">
                        <AlertTriangle size={25} />
                        <div>
                            <strong>Not Enough Historical Data</strong>
                            <p>
                                At least three different months with recorded
                                sales are needed to calculate this forecast.
                                Currently, {analytics.monthsWithSales} month(s)
                                with sales were found in the last six months.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* PRESCRIPTIVE ANALYTICS */}
            <div className="analytics-section-title">
                <h2>
                    <Lightbulb size={19} />
                    Prescriptive Analytics: Business Recommendations
                </h2>
                <span>Suggested actions based on retrieved records</span>
            </div>

            <div className="recommendation-list">
                {analytics.recommendations.map((recommendation, index) => (
                    <div
                        className={`recommendation-card ${recommendation.type}`}
                        key={`${recommendation.title}-${index}`}
                    >
                        <div className="recommendation-icon">
                            {recommendation.type === 'success' ? (
                                <CheckCircle size={21} />
                            ) : (
                                <Lightbulb size={21} />
                            )}
                        </div>
                        <div>
                            <strong>{recommendation.title}</strong>
                            <p>{recommendation.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="analytics-note">
                <strong>Report Information</strong>
                <p>
                    Estimated profit is calculated by subtracting recorded
                    expenses from recorded sales. It does not yet include
                    product costs, taxes, or other unrecorded business costs.
                    Sales forecasting uses a simple three-month moving average
                    and requires sufficient historical records.
                </p>
            </div>
        </div>
    );
}

const styles = `
.analytics-page { width: 100%; color: #172033; }
.analytics-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 28px; }
.analytics-header h1 { font-size: 25px; font-weight: 700; margin: 0 0 7px; }
.analytics-header p { color: #778196; font-size: 13px; margin: 0; }
.refresh-button { display: flex; align-items: center; gap: 8px; background: #2563eb; color: white; border: none; border-radius: 8px; padding: 10px 15px; font-size: 13px; font-weight: 600; cursor: pointer; }
.refresh-button:disabled { opacity: .6; cursor: not-allowed; }
.analytics-error { display: flex; align-items: center; gap: 10px; padding: 13px; margin-bottom: 20px; border-radius: 8px; background: #fff7ed; color: #c2410c; font-size: 13px; }
.analytics-section-title { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: 25px 0 15px; }
.analytics-section-title h2 { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 700; margin: 0; }
.analytics-section-title span { color: #8992a3; font-size: 12px; }
.analytics-cards { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; }
.analytics-card { display: flex; align-items: flex-start; gap: 13px; padding: 20px; background: white; border: 1px solid #edf0f5; border-radius: 12px; min-width: 0; }
.card-icon,.insight-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-icon.blue { color: #2563eb; background: #eff6ff; }
.card-icon.orange { color: #ea580c; background: #fff7ed; }
.card-icon.green { color: #16a34a; background: #f0fdf4; }
.card-icon.purple,.insight-icon.purple { color: #7c3aed; background: #f5f3ff; }
.analytics-card p { color: #7b8496; font-size: 12px; margin: 2px 0 8px; }
.analytics-card h3 { font-size: 19px; font-weight: 700; margin: 0 0 7px; overflow-wrap: anywhere; }
.analytics-card span { color: #929aaa; font-size: 11px; }
.negative-value { color: #dc2626; }
.analytics-panel,.insight-panel { background: white; border: 1px solid #edf0f5; border-radius: 12px; padding: 22px; }
.chart-legend { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 20px; }
.chart-legend span { display: flex; align-items: center; gap: 7px; color: #6b7280; font-size: 12px; }
.legend-dot { width: 9px; height: 9px; border-radius: 50%; }
.sales-dot { background: #2563eb; }
.expense-dot { background: #f59e0b; }
.monthly-chart { display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 12px; min-height: 220px; align-items: end; }
.month-column { display: flex; flex-direction: column; align-items: center; gap: 12px; height: 220px; }
.bar-area { display: flex; align-items: flex-end; justify-content: center; gap: 7px; width: 100%; height: 185px; border-bottom: 1px solid #e5e7eb; }
.chart-bar { width: min(28px,35%); border-radius: 5px 5px 0 0; }
.sales-bar { background: #3b82f6; }
.expense-bar { background: #f59e0b; }
.month-label { color: #7b8496; font-size: 11px; }
.analytics-empty { min-height: 190px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; gap: 8px; text-align: center; }
.analytics-empty strong { color: #475569; font-size: 14px; }
.analytics-empty p { font-size: 12px; margin: 0; }
.inventory-summary { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
.inventory-stat { display: flex; align-items: center; gap: 13px; padding: 18px; background: white; border: 1px solid #edf0f5; border-radius: 10px; color: #2563eb; }
.inventory-stat div { display: flex; flex-direction: column; gap: 5px; }
.inventory-stat span { font-size: 11px; color: #7b8496; }
.inventory-stat strong { color: #172033; font-size: 20px; }
.warning-stat { color: #d97706; }
.danger-stat { color: #dc2626; }
.insight-panel { margin-bottom: 10px; }
.forecast-heading { display: flex; align-items: center; gap: 14px; }
.forecast-heading span { color: #7b8496; font-size: 12px; }
.forecast-heading h3 { margin: 5px 0 0; font-size: 24px; color: #172033; }
.insight-panel > p { color: #64748b; font-size: 12px; line-height: 1.6; margin: 16px 0 0; }
.insufficient-data { display: flex; gap: 13px; align-items: flex-start; color: #d97706; }
.insufficient-data strong { color: #92400e; font-size: 14px; }
.insufficient-data p { color: #64748b; font-size: 12px; line-height: 1.6; margin: 6px 0 0; }
.recommendation-list { display: grid; gap: 12px; }
.recommendation-card { display: flex; align-items: flex-start; gap: 13px; padding: 17px; background: white; border: 1px solid #edf0f5; border-left: 4px solid #64748b; border-radius: 10px; }
.recommendation-card strong { font-size: 13px; color: #172033; }
.recommendation-card p { font-size: 12px; color: #64748b; line-height: 1.6; margin: 5px 0 0; }
.recommendation-icon { color: #64748b; }
.recommendation-card.warning { border-left-color: #d97706; }
.recommendation-card.warning .recommendation-icon { color: #d97706; }
.recommendation-card.danger { border-left-color: #dc2626; }
.recommendation-card.danger .recommendation-icon { color: #dc2626; }
.recommendation-card.success { border-left-color: #16a34a; }
.recommendation-card.success .recommendation-icon { color: #16a34a; }
.recommendation-card.info { border-left-color: #2563eb; }
.recommendation-card.info .recommendation-icon { color: #2563eb; }
.analytics-note { margin-top: 22px; padding: 16px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; }
.analytics-note strong { color: #1e40af; font-size: 13px; }
.analytics-note p { color: #475569; font-size: 12px; line-height: 1.6; margin: 7px 0 0; }
.analytics-loading { min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #64748b; font-size: 13px; }
.loading-icon { animation: analytics-spin 1s linear infinite; }
@keyframes analytics-spin { to { transform: rotate(360deg); } }
@media (max-width: 1100px) { .analytics-cards,.inventory-summary { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 650px) {
    .analytics-header { align-items: flex-start; flex-direction: column; }
    .analytics-cards,.inventory-summary { grid-template-columns: 1fr; }
    .analytics-section-title { align-items: flex-start; flex-direction: column; }
    .monthly-chart { gap: 5px; }
    .chart-bar { width: 35%; }
    .month-label { font-size: 9px; }
}
`;
