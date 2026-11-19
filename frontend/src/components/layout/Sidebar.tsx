import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  ChartNoAxesCombined,
  ChevronRight,
  Store,
  LogOut,
  X,
} from 'lucide-react'

export interface User {
  id: number
  name: string
  email: string
  role: string
}

interface SidebarProps {
  activePage: string
  user: User
  isOpen: boolean
  onNavigate: (page: string) => void
  onClose: () => void
  onLogout: () => void
}

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Products', icon: Package },
  { name: 'Inventory', icon: Warehouse },
  { name: 'Sales', icon: ShoppingCart },
  { name: 'Analytics', icon: ChartNoAxesCombined },
]

export default function Sidebar({ activePage, user, isOpen, onNavigate, onClose, onLogout }: SidebarProps) {
  return <>
    {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-icon"><Store size={21} /></div>
        <div><h2>StoreFlow</h2><span>SMALL BUSINESS SYSTEM</span></div>
        <button className="mobile-close" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
      </div>

      <div className="nav-label">MAIN MENU</div>
      <nav className="navigation">
        {navigation.map(({ name, icon: Icon }) => <button
          key={name}
          className={`nav-item ${activePage === name ? 'active' : ''}`}
          onClick={() => onNavigate(name)}
        >
          <Icon size={18} />
          <span>{name}</span>
          {activePage === name && <ChevronRight size={15} className="nav-arrow" />}
        </button>)}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-profile">
          <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="profile-info"><strong>{user.name}</strong><span>{user.role}</span></div>
          <button className="logout-button" onClick={onLogout} title="Logout" aria-label="Logout"><LogOut size={17} /></button>
        </div>
      </div>
    </aside>
  </>
}
