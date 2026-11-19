
import { useEffect, useState } from 'react'
import { Store } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Login from './pages/Login'
import AppLayout from './components/layout/AppLayout'
import ProductsModule from './components/ProductsModule'
import AnalyticsModule from './components/AnalyticsModule'
import type { User } from './components/layout/Sidebar'
import api from './services/api'
import './App.css'
import './theme.css'

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('biztrack_token')

    if (!token) {
      setCheckingAuth(false)
      return
    }

    api.get('/user')
      .then((response) => setUser(response.data.user))
      .catch(() => {
        localStorage.removeItem('biztrack_token')
        setUser(null)
      })
      .finally(() => setCheckingAuth(false))
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

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard />

      case 'Products':
        return <ProductsModule />

      case 'Inventory':
        return <Inventory />

      case 'Sales':
        return <Sales />

      case 'Analytics':
        return <AnalyticsModule />

      default:
        return <Dashboard />
    }
  }

  if (checkingAuth) {
    return (
      <div className="auth-loading">
        <div className="login-brand-icon">
          <Store size={27} />
        </div>
        <p>Checking your account...</p>
      </div>
    )
  }

  if (!user) return <Login onLogin={setUser} />

  return (
    <AppLayout
      activePage={activePage}
      user={user}
      sidebarOpen={sidebarOpen}
      onNavigate={(page) => {
        setActivePage(page)
        setSidebarOpen(false)
      }}
      onCloseSidebar={() => setSidebarOpen(false)}
      onOpenSidebar={() => setSidebarOpen(true)}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  )
}

export default App
