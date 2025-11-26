
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Customers from './components/Customers';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { ViewState, Product, Customer, Sale, Category, Tenant, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_CATEGORIES } from './types';
import { History, Menu, Wrench } from 'lucide-react';
import { 
  subscribeToProducts, 
  subscribeToCategories, 
  subscribeToCustomers, 
  subscribeToSales, 
  addData, 
  updateData, 
  deleteData,
  logoutUser
} from './services/firebaseService';

const App: React.FC = () => {
  // Authentication State
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  
  // App State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Auth handled by Login component mostly

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // --- FIREBASE REAL-TIME SYNC ---
  useEffect(() => {
    if (!currentTenant || currentTenant.isAdmin) {
      // Clear data if no tenant or if admin
      setProducts([]);
      setCategories([]);
      setCustomers([]);
      setSales([]);
      return;
    }

    const tenantId = currentTenant.id;

    // Suscripciones a Firestore en tiempo real
    const unsubProducts = subscribeToProducts(tenantId, (data) => {
      if (data.length === 0) {
         // Si es una cuenta nueva, podríamos cargar datos iniciales aquí si quisiéramos
         // Pero mejor dejarlo vacío
      }
      setProducts(data);
    });

    const unsubCategories = subscribeToCategories(tenantId, (data) => setCategories(data));
    const unsubCustomers = subscribeToCustomers(tenantId, (data) => setCustomers(data));
    const unsubSales = subscribeToSales(tenantId, (data) => setSales(data));

    // Cleanup listeners on unmount or tenant change
    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
      unsubSales();
    };
  }, [currentTenant]);

  // Authentication Handlers
  const handleLogin = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    // Persist session if needed, but Firebase Auth has its own persistence.
    // We keep this for simple state management in the React tree.
    localStorage.setItem('pos_active_session', JSON.stringify(tenant));
    setCurrentView(ViewState.DASHBOARD);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentTenant(null);
    localStorage.removeItem('pos_active_session');
    setIsSidebarOpen(false);
  };

  // Business Logic Handlers (Now using Firebase)
  const handleAddProduct = (product: Product) => {
    // Optimistic update (optional, but Firestore is fast enough usually)
    if (currentTenant) addData(currentTenant.id, 'products', product);
  };

  const handleUpdateProduct = (product: Product) => {
    if (currentTenant) updateData(currentTenant.id, 'products', product);
  };

  const handleDeleteProduct = (id: string) => {
    if (currentTenant) deleteData(currentTenant.id, 'products', id);
  };

  const handleAddCategory = (name: string) => {
    // Prevent duplicates handled in UI, database just stores
    if (currentTenant) {
       const newCat = { id: crypto.randomUUID(), name };
       addData(currentTenant.id, 'categories', newCat);
    }
  };

  const handleAddCustomer = (customer: Customer) => {
    if (currentTenant) addData(currentTenant.id, 'customers', customer);
  };

  const handleCompleteSale = (sale: Sale) => {
    if (!currentTenant) return;

    // 1. Save Sale
    addData(currentTenant.id, 'sales', sale);

    // 2. Update Stock for each item
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        updateData(currentTenant.id, 'products', { 
          ...product, 
          stock: product.stock - item.quantity 
        });
      }
    });
  };

  // Main Render Logic
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando sistema...</div>;
  }

  if (!currentTenant) {
    return <Login onLogin={handleLogin} />;
  }

  // --- ADMIN VIEW ---
  if (currentTenant.isAdmin) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  // --- TENANT VIEW ---
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
        tenantName={currentTenant.name}
        onLogout={handleLogout}
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