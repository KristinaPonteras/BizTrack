import type { ReactNode } from 'react'
import Sidebar, { type User } from './Sidebar'
import Topbar from './Topbar'
interface AppLayoutProps {
  activePage: string; user: User; sidebarOpen: boolean
  onNavigate: (page: string) => void; onCloseSidebar: () => void
  onOpenSidebar: () => void; onLogout: () => void; children: ReactNode
}
export default function AppLayout({ activePage, user, sidebarOpen, onNavigate, onCloseSidebar, onOpenSidebar, onLogout, children }: AppLayoutProps) {
  return <div className="app-container">
    <Sidebar activePage={activePage} user={user} isOpen={sidebarOpen} onNavigate={onNavigate} onClose={onCloseSidebar} onLogout={onLogout} />
    <main className="main-content">
      <Topbar activePage={activePage} userName={user.name} onOpenMenu={onOpenSidebar} />
      <div className="page-content">{children}<footer className="footer"><span>© 2026 StoreFlow</span><span>Business Management System</span></footer></div>
    </main>
  </div>
}
