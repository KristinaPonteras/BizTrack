import { Menu } from 'lucide-react'

interface TopbarProps {
  activePage: string
  userName: string
  onOpenMenu: () => void
}

export default function Topbar({ activePage, userName, onOpenMenu }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-button" onClick={onOpenMenu} aria-label="Open menu"><Menu size={21} /></button>
        <div><span className="breadcrumb">STOREFLOW / </span><strong>{activePage}</strong></div>
      </div>
      <div className="topbar-right">
        <span className="topbar-greeting">Business workspace</span>
        <div className="top-avatar">{userName.charAt(0).toUpperCase()}</div>
      </div>
    </header>
  )
}
