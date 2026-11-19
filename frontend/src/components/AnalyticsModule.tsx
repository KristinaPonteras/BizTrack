import { useState } from 'react'
import { ChartNoAxesCombined, Receipt } from 'lucide-react'
import Analytics from '../pages/Analytics'
import Expenses from '../pages/Expenses'

export default function AnalyticsModule() {
  const [section, setSection] = useState<'analytics' | 'expenses'>('analytics')

  return (
    <div className="simple-module">
      <div className="simple-module-tabs" role="tablist" aria-label="Analytics sections">
        <button className={section === 'analytics' ? 'selected' : ''} onClick={() => setSection('analytics')}>
          <ChartNoAxesCombined size={16} /> Analytics
        </button>
        <button className={section === 'expenses' ? 'selected' : ''} onClick={() => setSection('expenses')}>
          <Receipt size={16} /> Expenses
        </button>
      </div>
      {section === 'analytics' ? <Analytics /> : <Expenses />}
    </div>
  )
}
