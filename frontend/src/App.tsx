
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  ShoppingCart,
  Receipt,
  ChartNoAxesCombined,
  Users,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Store,
  LogOut,
  RefreshCw,
  CalendarDays,
} from 'lucide-react'

import Products from './pages/Products'
import Categories from './pages/Categories'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Expenses from './pages/Expenses'
import Analytics from './pages/Analytics'
import UserManagement from './pages/UserManagement'
import Login from './pages/Login'
import api from './services/api'
import './App.css'

interface User {
  id: number
  name: string
  email: string
  role: string
}

type RecordData = Record<string, unknown>

interface Activity {
  id: string
  title: string
  subtitle: string
  amount: number
  date: Date | null
  type: 'sale' | 'expense'
  status?: string
}

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Products', icon: Package },
  { name: 'Categories', icon: Tags },
  { name: 'Inventory', icon: Warehouse },
  { name: 'Sales', icon: ShoppingCart },
  { name: 'Expenses', icon: Receipt },
  { name: 'Analytics & Reports', icon: ChartNoAxesCombined },
  { name: 'User Management', icon: Users },
]

function getRecords(response: unknown): RecordData[] {
  const payload = (response as { data?: unknown })?.data

  if (Array.isArray(payload)) {
    return payload as RecordData[]
  }

  if (payload && typeof payload === 'object') {
    const nested = (payload as { data?: unknown }).data

    if (Array.isArray(nested)) {
      return nested as RecordData[]
    }
  }

  return []
}

function getNumber(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getDate(record: RecordData, fields: string[]): Date | null {
  for (const field of fields) {
    const value = record[field]

    if (typeof value !== 'string' && typeof value !== 'number') {
      continue
    }

    const text = String(value)
    const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    const date = dateOnly
      ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
      : new Date(text)

    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

function getCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(date: Date | null): string {
  if (!date) return 'Date unavailable'

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Dashboard({ onManageProducts }: { onManageProducts: () => void }) {
  const [sales, setSales] = useState<RecordData[]>([])
  const [expenses, setExpenses] = useState<RecordData[]>([])
  const [products, setProducts] = useState<RecordData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadDashboard = async () => {
      setLoading(true)
      setError('')

      const results = await Promise.allSettled([
        api.get('/sales?per_page=100'),
        api.get('/expenses?per_page=100'),
        api.get('/products?per_page=100'),
      ])

      if (cancelled) return

      const [salesResult, expensesResult, productsResult] = results

      if (salesResult.status === 'fulfilled') {
        setSales(getRecords(salesResult.value))
      } else {
        setSales([])
      }

      if (expensesResult.status === 'fulfilled') {
        setExpenses(getRecords(expensesResult.value))
      } else {
        setExpenses([])
      }

      if (productsResult.status === 'fulfilled') {
        setProducts(getRecords(productsResult.value))
      } else {
        setProducts([])
      }

      const labels = ['sales', 'expenses', 'products']

      const failedRequests = results
        .map((result, index) =>
          result.status === 'rejected' ? labels[index] : null,
        )
        .filter((item): item is string => item !== null)

      if (failedRequests.length > 0) {
        setError(
          `Unable to load ${failedRequests.join(', ')} data. Please check your API connection and try again.`,
        )
      }

      setLoading(false)
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const completedSales = sales.filter((sale) => {
    const status = String(sale.status ?? 'completed').toLowerCase()
    return status === 'completed'
  })

  const totalSales = completedSales.reduce(
    (total, sale) => total + getNumber(sale.total_amount),
    0,
  )

  const inventoryValue = products.reduce((total, product) => {
    return (
      total +
      getNumber(product.cost_price) * getNumber(product.stock_quantity)
    )
  }, 0)

  const now = new Date()

  const currentMonthSales = completedSales
    .filter((sale) => {
      const date = getDate(sale, ['sale_date', 'created_at'])

      return (
        date &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      )
    })
    .reduce((total, sale) => total + getNumber(sale.total_amount), 0)

  const previousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  )

  const previousMonthSales = completedSales
    .filter((sale) => {
      const date = getDate(sale, ['sale_date', 'created_at'])

      return (
        date &&
        date.getMonth() === previousMonth.getMonth() &&
        date.getFullYear() === previousMonth.getFullYear()
      )
    })
    .reduce((total, sale) => total + getNumber(sale.total_amount), 0)

  let performanceText = 'No sales yet'

  if (previousMonthSales > 0) {
    const change =
      ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100

    performanceText = `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs last month`
  } else if (currentMonthSales > 0) {
    performanceText = 'Sales recorded this month'
  }

  const monthlySales = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)

    const amount = completedSales
      .filter((sale) => {
        const saleDate = getDate(sale, ['sale_date', 'created_at'])

        return (
          saleDate &&
          saleDate.getMonth() === date.getMonth() &&
          saleDate.getFullYear() === date.getFullYear()
        )
      })
      .reduce((total, sale) => total + getNumber(sale.total_amount), 0)

    return {
      label: date.toLocaleDateString('en-PH', { month: 'short' }),
      amount,
    }
  })

  const maxMonthlySales = Math.max(
    ...monthlySales.map((month) => month.amount),
    1,
  )

  const activities: Activity[] = [
    ...sales.map((sale, index): Activity => ({
      id: `sale-${sale.id ?? index}`,
      title: String(sale.invoice_number ?? `Sale #${sale.id ?? index + 1}`),
      subtitle: `Sale · ${String(sale.payment_method ?? 'Payment')}`,
      amount: getNumber(sale.total_amount),
      date: getDate(sale, ['sale_date', 'created_at']),
      type: 'sale',
      status: String(sale.status ?? 'completed'),
    })),

    ...expenses.map((expense, index): Activity => ({
      id: `expense-${expense.id ?? index}`,
      title: String(expense.expense_name ?? `Expense #${expense.id ?? index + 1}`),
      subtitle: `Expense · ${String(expense.expense_category ?? 'General')}`,
      amount: getNumber(expense.amount),
      date: getDate(expense, ['expense_date', 'created_at']),
      type: 'expense',
    })),
  ]

  const recentActivities = activities
    .sort((a, b) => {
      return (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)
    })
    .slice(0, 5)

  return (
    <>
      <style>{`
        .dashboard-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          border-radius: 9px;
          padding: 9px 13px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .dashboard-refresh:hover {
          background: #f8fafc;
        }

        .dashboard-refresh:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .dashboard-error {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
          padding: 14px 16px;
          border-radius: 10px;
          margin-bottom: 22px;
          font-size: 13px;
        }

        .dashboard-error p {
          margin: 3px 0 0;
          line-height: 1.5;
        }

        .dashboard-stat-value {
          font-size: 25px;
          font-weight: 700;
          color: #172554;
          margin: 12px 0 5px;
          overflow-wrap: anywhere;
        }

        .dashboard-stat-description {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .dashboard-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          gap: 14px;
          height: 210px;
          padding: 20px 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .dashboard-chart-column {
          flex: 1;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .dashboard-chart-bar-area {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .dashboard-chart-bar {
          width: min(42px, 75%);
          min-height: 3px;
          border-radius: 6px 6px 0 0;
          background: #3b82f6;
          transition: height .25s ease;
        }

        .dashboard-chart-label {
          color: #64748b;
          font-size: 12px;
          padding-bottom: 8px;
        }

        .dashboard-chart-amount {
          color: #64748b;
          font-size: 10px;
          text-align: center;
          overflow-wrap: anywhere;
        }

        .dashboard-activity-list {
          display: flex;
          flex-direction: column;
        }

        .dashboard-activity-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .dashboard-activity-item:last-child {
          border-bottom: none;
        }

        .dashboard-activity-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .dashboard-activity-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
        }

        .dashboard-activity-icon.expense {
          background: #fff7ed;
          color: #ea580c;
        }

        .dashboard-activity-info {
          min-width: 0;
        }

        .dashboard-activity-info strong {
          display: block;
          font-size: 13px;
          color: #1e293b;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 180px;
        }

        .dashboard-activity-info span {
          display: block;
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .dashboard-activity-right {
          text-align: right;
          flex-shrink: 0;
        }

        .dashboard-activity-right strong {
          display: block;
          font-size: 13px;
          color: #1e293b;
        }

        .dashboard-activity-right span {
          display: block;
          font-size: 10px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .dashboard-empty {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #64748b;
          gap: 9px;
          padding: 20px;
        }

        .dashboard-empty strong {
          color: #334155;
          font-size: 14px;
        }

        .dashboard-empty span {
          font-size: 12px;
        }

        .dashboard-loading {
          color: #64748b;
          font-size: 13px;
          padding: 20px 0;
        }

        @media (max-width: 600px) {
          .dashboard-chart {
            gap: 5px;
          }

          .dashboard-stat-value {
            font-size: 21px;
          }

          .dashboard-activity-info strong {
            max-width: 125px;
          }
        }
      `}</style>

      <div className="page-heading">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome to BizTrack. Here's your business overview.</p>
        </div>

        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <button
            className="dashboard-refresh"
            onClick={() => setRefreshKey((previous) => previous + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button className="primary-button" onClick={onManageProducts}>
            <Plus size={18} />
            Manage Products
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <AlertTriangle size={19} />
          <div>
            <strong>Some dashboard data could not be loaded</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="section-heading">
        <h2>Business Summary</h2>
        <span>Live business data</span>
      </div>

      {loading ? (
        <div className="dashboard-loading">
          Loading your business summary...
        </div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon">
                <Boxes size={21} />
              </div>
              <span className="stat-empty">Products</span>
            </div>
            <h3>Total Products</h3>
            <div className="dashboard-stat-value">{products.length}</div>
            <p className="dashboard-stat-description">
              Product records loaded
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon">
                <CircleDollarSign size={21} />
              </div>
              <span className="stat-empty">Completed</span>
            </div>
            <h3>Total Sales</h3>
            <div className="dashboard-stat-value">
              {getCurrency(totalSales)}
            </div>
            <p className="dashboard-stat-description">
              {completedSales.length} completed transactions
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon">
                <Warehouse size={21} />
              </div>
              <span className="stat-empty">Stock value</span>
            </div>
            <h3>Inventory Value</h3>
            <div className="dashboard-stat-value">
              {getCurrency(inventoryValue)}
            </div>
            <p className="dashboard-stat-description">
              Cost price × current stock quantity
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon">
                <TrendingUp size={21} />
              </div>
              <span className="stat-empty">This month</span>
            </div>
            <h3>Sales Performance</h3>
            <div className="dashboard-stat-value">
              {getCurrency(currentMonthSales)}
            </div>
            <p className="dashboard-stat-description">
              {performanceText}
            </p>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="content-card">
          <div className="card-heading">
            <div>
              <h2>Sales Overview</h2>
              <p>Monthly completed sales for the last six months</p>
            </div>

            <button
              className="more-button"
              onClick={() => setRefreshKey((previous) => previous + 1)}
              aria-label="Refresh sales overview"
              disabled={loading}
            >
              <ArrowUpRight size={19} />
            </button>
          </div>

          {loading ? (
            <div className="dashboard-empty">
              <span>Loading sales chart...</span>
            </div>
          ) : monthlySales.some((month) => month.amount > 0) ? (
            <div className="dashboard-chart">
              {monthlySales.map((month) => (
                <div className="dashboard-chart-column" key={month.label}>
                  <div className="dashboard-chart-bar-area">
                    <div
                      className="dashboard-chart-bar"
                      style={{
                        height: `${Math.max(
                          month.amount > 0
                            ? (month.amount / maxMonthlySales) * 100
                            : 0,
                          month.amount > 0 ? 4 : 0,
                        )}%`,
                      }}
                      title={getCurrency(month.amount)}
                    />
                  </div>

                  <span className="dashboard-chart-amount">
                    {month.amount > 0
                      ? getCurrency(month.amount)
                      : '—'}
                  </span>

                  <span className="dashboard-chart-label">
                    {month.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <div className="empty-icon">
                <ChartNoAxesCombined size={30} />
              </div>
              <strong>No completed sales data</strong>
              <span>
                Completed sales will appear here once transactions are recorded.
              </span>
            </div>
          )}
        </section>

        <section className="content-card">
          <div className="card-heading">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest sales and expenses</p>
            </div>
            <CalendarDays size={19} color="#64748b" />
          </div>

          {loading ? (
            <div className="dashboard-empty">
              <span>Loading recent activity...</span>
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="dashboard-activity-list">
              {recentActivities.map((activity) => (
                <div className="dashboard-activity-item" key={activity.id}>
                  <div className="dashboard-activity-left">
                    <div
                      className={`dashboard-activity-icon ${activity.type === 'expense' ? 'expense' : ''
                        }`}
                    >
                      {activity.type === 'sale' ? (
                        <ShoppingCart size={18} />
                      ) : (
                        <Receipt size={18} />
                      )}
                    </div>

                    <div className="dashboard-activity-info">
                      <strong title={activity.title}>
                        {activity.title}
                      </strong>
                      <span>{activity.subtitle}</span>
                    </div>
                  </div>

                  <div className="dashboard-activity-right">
                    <strong>
                      {activity.type === 'expense' ? '−' : '+'}
                      {getCurrency(activity.amount)}
                    </strong>
                    <span>{formatDate(activity.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <div className="empty-icon">
                <Receipt size={30} />
              </div>
              <strong>No recent activity</strong>
              <span>
                Sales and expense records will appear here when available.
              </span>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const isDashboard = activePage === 'Dashboard'

  useEffect(() => {
    const token = localStorage.getItem('biztrack_token')

    if (!token) {
      setCheckingAuth(false)
      return
    }

    api.get('/user')
      .then((response) => {
        setUser(response.data.user)
      })
      .catch(() => {
        localStorage.removeItem('biztrack_token')
        setUser(null)
      })
      .finally(() => {
        setCheckingAuth(false)
      })
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/logout')
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      localStorage.removeItem('biztrack_token')
      setUser(null)
      setActivePage('Dashboard')
      setSidebarOpen(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="auth-loading">
        <div className="login-brand-icon">
          <Store size={28} />
        </div>
        <p>Checking your account...</p>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <div className="app-container">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <Store size={23} />
          </div>

          <div>
            <h2>BizTrack</h2>
            <span>BUSINESS MANAGEMENT</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-label">MAIN MENU</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.name}
                className={`nav-item ${activePage === item.name ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(item.name)
                  setSidebarOpen(false)
                }}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {activePage === item.name && (
                  <ChevronRight size={16} className="nav-arrow" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`}
            onClick={() => {
              setActivePage('Settings')
              setSidebarOpen(false)
            }}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="sidebar-profile">
            <div className="profile-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <span className="breadcrumb">Pages / </span>
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search anything..." />
              <span>Ctrl K</span>
            </div>

            <button
              className="notification-button"
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>

            <div className="top-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="page-content">
          {isDashboard ? (
            <Dashboard
              onManageProducts={() => setActivePage('Products')}
            />
          ) : activePage === 'Products' ? (
            <Products />
          ) : activePage === 'Categories' ? (
            <Categories />
          ) : activePage === 'Inventory' ? (
            <Inventory />
          ) : activePage === 'Sales' ? (
            <Sales />
          ) : activePage === 'Expenses' ? (
            <Expenses />
          ) : activePage === 'Analytics & Reports' ? (
            <Analytics />
          ) : activePage === 'User Management' ? (
            <UserManagement />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h1>{activePage}</h1>
                  <p>Manage your business through BizTrack.</p>
                </div>
              </div>

              <section className="content-card module-card">
                <div className="empty-chart">
                  <div className="empty-icon">
                    <Package size={30} />
                  </div>
                  <strong>{activePage} module</strong>
                  <span>
                    This module is ready for development and API integration.
                  </span>
                </div>
              </section>
            </>
          )}

          <footer className="footer">
            <span>© 2026 BizTrack. All rights reserved.</span>
            <span>Business Management System</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
