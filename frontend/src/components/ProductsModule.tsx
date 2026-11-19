import { useState } from 'react'
import { Package, Tags } from 'lucide-react'
import Products from '../pages/Products'
import Categories from '../pages/Categories'

export default function ProductsModule() {
  const [section, setSection] = useState<'products' | 'categories'>('products')

  return (
    <div className="simple-module">
      <div className="simple-module-tabs" role="tablist" aria-label="Product sections">
        <button className={section === 'products' ? 'selected' : ''} onClick={() => setSection('products')}>
          <Package size={16} /> Products
        </button>
        <button className={section === 'categories' ? 'selected' : ''} onClick={() => setSection('categories')}>
          <Tags size={16} /> Categories
        </button>
      </div>
      {section === 'products' ? <Products /> : <Categories />}
    </div>
  )
}
