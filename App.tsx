import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Customers from './components/Customers';
import { ViewState, Product, Customer, Sale, Category, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_CATEGORIES } from './types';
import { History, Menu, Wrench } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // App State - In a real app, this would be in Context or Redux
  // Initialize from LocalStorage or Fallback to Constants
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pos_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('pos_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('pos_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('pos_sales');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence Effects
  useEffect(() => { localStorage.setItem('pos_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('pos_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('pos_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('pos_sales', JSON.stringify(sales)); }, [sales]);

  // Handlers
  const handleAddProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const handleUpdateProduct = (product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleAddCategory = (name: string) => {
    if (!categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      setCategories(prev => [...prev, { id: crypto.randomUUID(), name }]);
    }
  };

  const handleAddCustomer = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
  };

  const handleCompleteSale = (sale: Sale) => {
    // Save Sale
    setSales(prev => [sale, ...prev]);
    // Update Stock
    setProducts(prev => prev.map(p => {
      const itemInCart = sale.items.find(i => i.id === p.id);
      if (itemInCart) {
        return { ...p, stock: p.stock - itemInCart.quantity };
      }
      return p;
    }));
  };

  // Render View Logic
  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard products={products} sales={sales} />;
      case ViewState.POS:
        return <POS products={products} customers={customers} onCompleteSale={handleCompleteSale} />;
      case ViewState.INVENTORY:
        return (
          <Inventory 
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct} 
            onUpdateProduct={handleUpdateProduct} 
            onDeleteProduct={handleDeleteProduct}
            onAddCategory={handleAddCategory}
          />
        );
      case ViewState.CUSTOMERS:
        return (
          <Customers 
            customers={customers} 
            onAddCustomer={handleAddCustomer} 
          />
        );
      case ViewState.HISTORY:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Historial de Ventas</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
               <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">ID Factura</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4 text-center">Items</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{sale.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{sale.customerName}</td>
                      <td className="px-6 py-4 text-center">{sale.items.length}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">${sale.total.toFixed(2)}</td>
                    </tr>
                  ))}
                   {sales.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400"><History className="w-8 h-8 mx-auto mb-2 opacity-20"/>Sin historial de ventas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return <div>Vista no encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <div className="flex items-center space-x-2">
           <div className="bg-orange-500 p-1.5 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Softec <span className="text-orange-500">PRO</span></h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className={`flex-1 lg:ml-64 p-4 lg:p-8 overflow-y-auto h-[calc(100vh-64px)] lg:h-screen bg-slate-50`}>
        <div className="max-w-7xl mx-auto h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;