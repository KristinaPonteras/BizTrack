
import { useEffect, useMemo, useState } from 'react';
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Wallet,
    Package,
    AlertTriangle,
    BarChart3,
    Lightbulb,
    Brain,
    CheckCircle,
    Boxes,
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

function getDate(record: RecordData): Date | null {
    const value =
        record.sale_date ??
        record.expense_date ??
        record.created_at ??
        record.date;

    if (!value) return null;

    const text = String(value);
    const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    const date = dateOnly
        ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
        : new Date(text);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getStock(product: RecordData): number {
    return getNumber(
        product.quantity ??
        product.stock_quantity ??
        product.current_stock
    );
}

function getReorderLevel(product: RecordData): number {
    return getNumber(
        product.reorder_level ??
        product.minimum_stock ??
        product.low_stock_threshold
    );
}

function currency(value: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(value);
}

export default function Analytics() {
    const [data, setData] = useState<AnalyticsData>(emptyData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadAnalytics = async () => {
        setLoading(true);
        setError('');

        try {
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

            setData({ sales, expenses, products });

            const failed = results
                .map((result, index) =>
                    result.status === 'rejected'
                        ? ['Sales', 'Expenses', 'Products'][index]
                        : null
                )
                .filter(Boolean);

            if (failed.length) {
                setError(`Unable to load ${failed.join(', ')} data. Some analytics may be incomplete.`);
            }
        } catch {
            setError('Unable to load analytics. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    const analytics = useMemo(() => {
        const completedSales = data.sales.filter(
            sale => String(sale.status ?? 'completed').toLowerCase() === 'completed'
        );

        const totalSales = completedSales.reduce(
            (sum, sale) => sum + getSalesAmount(sale),
            0
        );

        const totalExpenses = data.expenses.reduce(
            (sum, expense) => sum + getNumber(expense.amount),
            0
        );

        const totalStock = data.products.reduce(
            (sum, product) => sum + getStock(product),
            0
        );

        const lowStock = data.products.filter(product => {
            const stock = getStock(product);
            const reorder = getReorderLevel(product);
            return stock > 0 && reorder > 0 && stock <= reorder;
        });

        const outOfStock = data.products.filter(
            product => getStock(product) <= 0
        );

        const now = new Date();

        const monthlyData = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - (5 - index),
                1
            );

            const monthSales = completedSales
                .filter(sale => {
                    const saleDate = getDate(sale);
                    return saleDate &&
                        saleDate.getMonth() === date.getMonth() &&
                        saleDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, sale) => sum + getSalesAmount(sale), 0);

            const monthExpenses = data.expenses
                .filter(expense => {
                    const expenseDate = getDate(expense);
                    return expenseDate &&
                        expenseDate.getMonth() === date.getMonth() &&
                        expenseDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, expense) => sum + getNumber(expense.amount), 0);

            return {
                label: date.toLocaleDateString('en-PH', { month: 'short' }),
                sales: monthSales,
                expenses: monthExpenses,
            };
        });

        const monthsWithSales = monthlyData.filter(
            month => month.sales > 0
        );

        const latestThree = monthsWithSales.slice(-3);

        const salesForecast = latestThree.length === 3
            ? latestThree.reduce((sum, month) => sum + month.sales, 0) / 3
            : null;

        const recommendations: {
            title: string;
            message: string;
            type: 'warning' | 'danger' | 'success' | 'info';
        }[] = [];

        if (outOfStock.length > 0) {
            recommendations.push({
                title: 'Restock Out-of-Stock Products',
                message: `${outOfStock.length} product(s) have no available stock. Review and consider restocking them.`,
                type: 'danger',
            });
        }

        if (lowStock.length > 0) {
            recommendations.push({
                title: 'Monitor Low Stock',
                message: `${lowStock.length} product(s) are at or below their recorded reorder level.`,
                type: 'warning',
            });
        }

        if (data.sales.length > 0 && totalExpenses > totalSales) {
            recommendations.push({
                title: 'Review Business Expenses',
                message: `Recorded expenses exceed sales by ${currency(totalExpenses - totalSales)}.`,
                type: 'warning',
            });
        } else if (data.sales.length > 0 && totalSales > totalExpenses) {
            recommendations.push({
                title: 'Positive Recorded Balance',
                message: `Recorded sales exceed expenses by ${currency(totalSales - totalExpenses)}. Continue monitoring costs.`,
                type: 'success',
            });
        }

        if (data.sales.length === 0) {
            recommendations.push({
                title: 'Record Business Sales',
                message: 'Add actual sales transactions to improve business performance analysis.',
                type: 'info',
            });
        }

        if (data.products.length === 0) {
            recommendations.push({
                title: 'Add Product Records',
                message: 'Add products to begin monitoring inventory and stock levels.',
                type: 'info',
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                title: 'Continue Monitoring',
                message: 'No immediate inventory or expense concerns were identified from the available records.',
                type: 'success',
            });
        }

        return {
            totalSales,
            totalExpenses,
            estimatedProfit: totalSales - totalExpenses,
            totalStock,
            totalProducts: data.products.length,
            totalTransactions: completedSales.length,
            lowStockCount: lowStock.length,
            outOfStockCount: outOfStock.length,
            monthlyData,
            monthsWithSales: monthsWithSales.length,
            salesForecast,
            recommendations,
        };
    }, [data]);

    const maxMonthlyValue = Math.max(
        ...analytics.monthlyData.flatMap(month => [
            month.sales,
            month.expenses,
        ]),
        1
    );

    if (loading) {
        return (
            <div className="analytics-loading">
                <RefreshCw className="spin" size={25} />
                <p>Loading business analytics...</p>
                <style>{styles}</style>
            </div>
        );
    }

    return (
        <div className="analytics-page">
            <style>{styles}</style>

            <header className="analytics-header">
                <div>
                    <span className="eyebrow">STOREFLOW BUSINESS INTELLIGENCE</span>
                    <h1>Business Analytics</h1>
                    <p>Understand your business performance and make better decisions.</p>
                </div>

                <button
                    className="refresh-button"
                    onClick={loadAnalytics}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </header>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            <section className="summary-grid">
                <div className="summary-card">
                    <TrendingUp className="blue-icon" size={22} />
                    <span>Total Sales</span>
                    <strong>{currency(analytics.totalSales)}</strong>
                    <small>{analytics.totalTransactions} completed transactions</small>
                </div>

                <div className="summary-card">
                    <TrendingDown className="orange-icon" size={22} />
                    <span>Total Expenses</span>
                    <strong>{currency(analytics.totalExpenses)}</strong>
                    <small>Recorded expenses</small>
                </div>

                <div className="summary-card">
                    <Wallet className="green-icon" size={22} />
                    <span>Estimated Profit</span>
                    <strong>{currency(analytics.estimatedProfit)}</strong>
                    <small>Sales minus recorded expenses</small>
                </div>

                <div className="summary-card">
                    <Package className="purple-icon" size={22} />
                    <span>Total Products</span>
                    <strong>{analytics.totalProducts}</strong>
                    <small>{analytics.totalStock} total stock units</small>
                </div>
            </section>

            <div className="main-section-heading">
                <span>THE THREE TYPES OF BUSINESS ANALYTICS</span>
                <h2>Know your business. Plan ahead. Take action.</h2>
            </div>

            {/* DESCRIPTIVE */}
            <section className="analytics-section descriptive">
                <div className="section-heading">
                    <div className="number">01</div>
                    <div>
                        <span>WHAT HAPPENED?</span>
                        <h2>Descriptive Analytics</h2>
                        <p>Understand your business using historical and current records.</p>
                    </div>
                </div>

                <div className="descriptive-content">
                    <div className="chart-card">
                        <div className="card-title">
                            <div>
                                <h3>Sales and Expense Trends</h3>
                                <p>Monthly records for the last six months</p>
                            </div>
                            <BarChart3 size={21} />
                        </div>

                        <div className="legend">
                            <span><i className="sales-dot" /> Sales</span>
                            <span><i className="expense-dot" /> Expenses</span>
                        </div>

                        {analytics.monthlyData.every(
                            month => month.sales === 0 && month.expenses === 0
                        ) ? (
                            <div className="empty-state">
                                No sales or expense trend data available yet.
                            </div>
                        ) : (
                            <div className="monthly-chart">
                                {analytics.monthlyData.map(month => (
                                    <div className="month-column" key={month.label}>
                                        <div className="bars">
                                            <div
                                                className="bar sales-bar"
                                                style={{
                                                    height: `${month.sales / maxMonthlyValue * 100}%`,
                                                }}
                                                title={`Sales: ${currency(month.sales)}`}
                                            />
                                            <div
                                                className="bar expense-bar"
                                                style={{
                                                    height: `${month.expenses / maxMonthlyValue * 100}%`,
                                                }}
                                                title={`Expenses: ${currency(month.expenses)}`}
                                            />
                                        </div>
                                        <span>{month.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="chart-card inventory-card">
                        <div className="card-title">
                            <div>
                                <h3>Inventory Summary</h3>
                                <p>Current product records</p>
                            </div>
                            <Boxes size={21} />
                        </div>

                        <div className="inventory-row">
                            <span>Total Products</span>
                            <strong>{analytics.totalProducts}</strong>
                        </div>
                        <div className="inventory-row">
                            <span>Total Stock Units</span>
                            <strong>{analytics.totalStock}</strong>
                        </div>
                        <div className="inventory-row">
                            <span>Low Stock Products</span>
                            <strong className="orange-text">{analytics.lowStockCount}</strong>
                        </div>
                        <div className="inventory-row">
                            <span>Out of Stock</span>
                            <strong className="red-text">{analytics.outOfStockCount}</strong>
                        </div>
                    </div>
                </div>
            </section>

            {/* PREDICTIVE */}
            <section className="analytics-section predictive">
                <div className="section-heading">
                    <div className="number">02</div>
                    <div>
                        <span>WHAT MIGHT HAPPEN?</span>
                        <h2>Predictive Analytics</h2>
                        <p>Estimate possible future sales using historical data.</p>
                    </div>
                    <Brain className="section-symbol" size={30} />
                </div>

                <div className="forecast-card">
                    {analytics.salesForecast !== null ? (
                        <>
                            <div>
                                <span className="forecast-label">ESTIMATED SALES FOR NEXT MONTH</span>
                                <h3>{currency(analytics.salesForecast)}</h3>
                                <p>
                                    Based on the average sales of the three most recent months
                                    with recorded sales.
                                </p>
                            </div>
                            <TrendingUp size={38} className="purple-icon" />
                        </>
                    ) : (
                        <div className="insufficient-data">
                            <AlertTriangle size={25} />
                            <div>
                                <strong>Not Enough Historical Data</strong>
                                <p>
                                    At least three different months with recorded sales are
                                    needed. Currently, {analytics.monthsWithSales} month(s)
                                    with sales were found in the last six months.
                                </p>
                            </div>
                        </div>
                    )}
                    <small>Forecast method: Three-month moving average. This is an estimate, not a guaranteed result.</small>
                </div>
            </section>

            {/* PRESCRIPTIVE */}
            <section className="analytics-section prescriptive">
                <div className="section-heading">
                    <div className="number">03</div>
                    <div>
                        <span>WHAT SHOULD WE DO?</span>
                        <h2>Prescriptive Analytics</h2>
                        <p>Suggested business actions based on available records.</p>
                    </div>
                    <Lightbulb className="section-symbol" size={30} />
                </div>

                <div className="recommendation-list">
                    {analytics.recommendations.map((item, index) => (
                        <div className={`recommendation ${item.type}`} key={index}>
                            {item.type === 'success'
                                ? <CheckCircle size={22} />
                                : <Lightbulb size={22} />}
                            <div>
                                <strong>{item.title}</strong>
                                <p>{item.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="report-note">
                <strong>About these results</strong>
                <p>
                    All figures are calculated from records retrieved from your StoreFlow
                    database. Estimated profit is sales minus recorded expenses and does
                    not account for product costs, taxes, or unrecorded costs. The sales
                    forecast uses a simple three-month moving average.
                </p>
            </div>
        </div>
    );
}

const styles = `
.analytics-page {
  width: 100%;
  color: #172033;
  max-width: 1500px;
  margin: auto;
}
.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.eyebrow {
  color: #2563eb;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.3px;
}
.analytics-header h1 {
  font-size: 27px;
  margin: 7px 0;
  font-weight: 750;
}
.analytics-header p,
.section-heading p,
.card-title p {
  color: #778196;
  font-size: 12px;
  margin: 0;
}
.refresh-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #334155;
  cursor: pointer;
  font-weight: 600;
}
.refresh-button:disabled { opacity: .6; cursor: not-allowed; }
.error-message {
  display: flex;
  gap: 10px;
  padding: 13px;
  margin-bottom: 18px;
  border-radius: 9px;
  background: #fff7ed;
  color: #c2410c;
  font-size: 13px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
  margin-bottom: 30px;
}
.summary-card {
  background: white;
  border: 1px solid #e9edf3;
  border-radius: 11px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
}
.summary-card span { color: #64748b; font-size: 12px; }
.summary-card strong { font-size: 21px; overflow-wrap: anywhere; }
.summary-card small { color: #94a3b8; font-size: 10px; }
.blue-icon { color: #2563eb; }
.orange-icon, .orange-text { color: #d97706; }
.green-icon { color: #16a34a; }
.purple-icon { color: #7c3aed; }
.red-text { color: #dc2626; }
.main-section-heading { margin: 32px 0 20px; }
.main-section-heading span {
  font-size: 10px;
  letter-spacing: 1.2px;
  font-weight: 800;
  color: #64748b;
}
.main-section-heading h2 { font-size: 20px; margin: 7px 0; }
.analytics-section {
  background: white;
  border: 1px solid #e9edf3;
  border-radius: 13px;
  padding: 22px;
  margin-bottom: 18px;
}
.section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 21px;
}
.section-heading .number {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 15px;
  font-weight: 800;
  flex-shrink: 0;
}
.section-heading span {
  color: #2563eb;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .9px;
}
.section-heading h2 { font-size: 19px; margin: 3px 0 5px; }
.section-symbol { margin-left: auto; color: #64748b; flex-shrink: 0; }
.descriptive-content {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 15px;
}
.chart-card {
  border: 1px solid #edf0f5;
  border-radius: 10px;
  padding: 18px;
  min-width: 0;
}
.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.card-title h3 { margin: 0 0 5px; font-size: 14px; }
.card-title svg { color: #64748b; }
.legend {
  display: flex;
  gap: 18px;
  justify-content: flex-end;
  margin: 18px 0 10px;
  font-size: 11px;
  color: #64748b;
}
.legend span { display: flex; align-items: center; gap: 6px; }
.legend i { width: 8px; height: 8px; border-radius: 50%; }
.sales-dot { background: #3b82f6; }
.expense-dot { background: #f59e0b; }
.monthly-chart {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 9px;
  height: 165px;
  align-items: end;
  padding-top: 8px;
}
.month-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  gap: 8px;
  color: #64748b;
  font-size: 10px;
}
.bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  height: 100%;
  width: 100%;
  border-bottom: 1px solid #e2e8f0;
}
.bar { width: min(20px, 40%); min-height: 0; border-radius: 4px 4px 0 0; }
.sales-bar { background: #3b82f6; }
.expense-bar { background: #f59e0b; }
.inventory-card { display: flex; flex-direction: column; }
.inventory-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12px;
  color: #64748b;
}
.inventory-row:last-child { border: 0; }
.inventory-row strong { color: #172033; font-size: 14px; }
.predictive .section-heading .number {
  background: #f5f3ff;
  color: #7c3aed;
}
.predictive .section-heading span { color: #7c3aed; }
.forecast-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  background: #faf9ff;
  border: 1px solid #ede9fe;
  border-radius: 10px;
  padding: 22px;
}
.forecast-label {
  color: #7c3aed;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .8px;
}
.forecast-card h3 {
  font-size: 27px;
  margin: 8px 0;
  overflow-wrap: anywhere;
}
.forecast-card p, .forecast-card small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}
.forecast-card small { display: block; margin-top: 15px; }
.insufficient-data {
  display: flex;
  gap: 12px;
  color: #d97706;
}
.insufficient-data strong { color: #92400e; font-size: 14px; }
.insufficient-data p { margin: 6px 0 0; }
.prescriptive .section-heading .number {
  background: #f0fdf4;
  color: #16a34a;
}
.prescriptive .section-heading span { color: #16a34a; }
.recommendation-list { display: grid; gap: 10px; }
.recommendation {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  border: 1px solid #e9edf3;
  border-radius: 9px;
}
.recommendation strong { font-size: 13px; }
.recommendation p {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
  margin: 5px 0 0;
}
.recommendation.warning { background: #fffbeb; }
.recommendation.warning > svg { color: #d97706; }
.recommendation.danger { background: #fef2f2; }
.recommendation.danger > svg { color: #dc2626; }
.recommendation.success { background: #f0fdf4; }
.recommendation.success > svg { color: #16a34a; }
.recommendation.info { background: #eff6ff; }
.recommendation.info > svg { color: #2563eb; }
.report-note {
  padding: 15px;
  background: #f8fafc;
  border-radius: 9px;
  margin-top: 20px;
}
.report-note strong { font-size: 12px; }
.report-note p {
  color: #64748b;
  font-size: 11px;
  line-height: 1.7;
  margin: 6px 0 0;
}
.empty-state {
  min-height: 150px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}
.analytics-loading {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 1000px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .descriptive-content { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .analytics-header { align-items: flex-start; flex-direction: column; }
  .summary-card { padding: 13px; }
  .summary-card strong { font-size: 17px; }
  .analytics-section { padding: 15px; }
  .section-heading h2 { font-size: 16px; }
  .section-heading p { line-height: 1.5; }
  .main-section-heading h2 { font-size: 17px; }
  .forecast-card { align-items: flex-start; }
}
`;
