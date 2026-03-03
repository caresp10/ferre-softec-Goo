import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Customers from './components/Customers';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import Settings from './components/Settings'; 
import ReceiptModal from './components/ReceiptModal'; 
import { ViewState, Product, Customer, Sale, Category, Tenant, InvoiceConfig, SessionContext, AppUser } from './types';
import { Menu, Wrench, Printer, History, MapPin, Monitor, Store, Lock } from 'lucide-react';
import { 
  subscribeToProducts, 
  subscribeToCategories, 
  subscribeToCustomers, 
  subscribeToSales, 
  addData, 
  updateData, 
  deleteData,
  logoutUser,
  subscribeToInvoiceConfig,
  saveInvoiceConfig,
  observeAuthState,
  transferStock
} from './services/firebaseService';

const App: React.FC = () => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig | null>(null);

  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [reprintSale, setReprintSale] = useState<Sale | null>(null);

  // 1. Auth Observer
  useEffect(() => {
    const unsubscribe = observeAuthState((tenant, userRole) => {
      setCurrentTenant(tenant);
      if (userRole) {
        setCurrentUser(userRole);
      } else if (tenant) {
         // Legacy Owner Fallback
         setCurrentUser({ 
           uid: tenant.id, 
           email: tenant.email, 
           name: tenant.name, 
           role: 'OWNER', 
           tenantId: tenant.id 
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Subscription
  useEffect(() => {
    if (!currentTenant || currentTenant.isAdmin) {
      setProducts([]);
      setCategories([]);
      setCustomers([]);
      setSales([]);
      setInvoiceConfig(null);
      setSessionContext(null);
      return;
    }

    const tenantId = currentTenant.id;
    const unsubProducts = subscribeToProducts(tenantId, (data) => setProducts(data));
    const unsubCategories = subscribeToCategories(tenantId, (data) => setCategories(data));
    const unsubCustomers = subscribeToCustomers(tenantId, (data) => setCustomers(data));
    const unsubSales = subscribeToSales(tenantId, (data) => setSales(data));
    
    const unsubConfig = subscribeToInvoiceConfig(tenantId, (data) => {
      setInvoiceConfig(data);
      
      // Lógica de Selección de Caja
      if (data?.branches && data.branches.length > 0) {
        // A. Si es EMPLEADO con Sucursal Asignada -> FORZAR CONTEXTO
        if (currentUser && currentUser.role !== 'OWNER' && currentUser.branchId) {
           const assignedBranch = data.branches.find(b => b.id === currentUser.branchId);
           // Si existe la sucursal y tiene al menos una caja
           if (assignedBranch && assignedBranch.emissionPoints.length > 0) {
              const defaultPoint = assignedBranch.emissionPoints[0];
              
              // Solo establecemos si no está ya establecido para evitar loops
              setSessionContext(prev => {
                if (prev?.branchId === assignedBranch.id) return prev;
                return {
                   branchId: assignedBranch.id,
                   branchName: assignedBranch.name,
                   emissionPointId: defaultPoint.id,
                   emissionPointCode: defaultPoint.code,
                   emissionPointName: defaultPoint.name
                };
              });
              return;
           }
        }

        // B. Si es DUEÑO o no tiene contexto -> Lógica normal
        if (!sessionContext) {
           // Si solo hay 1 opción global, autoseleccionar
           if (data.branches.length === 1 && data.branches[0].emissionPoints.length === 1) {
             const b = data.branches[0];
             const p = b.emissionPoints[0];
             setSessionContext({
               branchId: b.id,
               branchName: b.name,
               emissionPointId: p.id,
               emissionPointCode: p.code,
               emissionPointName: p.name
             });
           } else {
             // Si hay múltiples, abrir modal
             setIsContextModalOpen(true);
           }
        }
      }
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
      unsubSales();
      unsubConfig();
    };
  }, [currentTenant, currentUser]); // currentUser added to dependency

  const handleLogin = (tenant: Tenant) => {
    // Login handled by observer
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentTenant(null);
    setCurrentUser(null);
    setSessionContext(null);
    setIsSidebarOpen(false);
  };

  const handleAddProduct = (product: Product) => { if (currentTenant) addData(currentTenant.id, 'products', product); };
  const handleUpdateProduct = (product: Product) => { if (currentTenant) updateData(currentTenant.id, 'products', product); };
  const handleDeleteProduct = (id: string) => { if (currentTenant) deleteData(currentTenant.id, 'products', id); };
  
  const handleAddCategory = (name: string) => {
    if (currentTenant) {
       const newCat = { id: crypto.randomUUID(), name };
       addData(currentTenant.id, 'categories', newCat);
    }
  };

  const handleAddCustomer = (customer: Customer) => { if (currentTenant) addData(currentTenant.id, 'customers', customer); };
  
  const handleSaveSettings = (config: InvoiceConfig) => {
    if (currentTenant) saveInvoiceConfig(currentTenant.id, config);
  };

  const handleTransferStock = async (pId: string, from: string, to: string, qty: number) => {
    if (currentTenant) {
      await transferStock(currentTenant.id, pId, from, to, qty);
    }
  };

  const handleCompleteSale = (sale: Sale) => {
    if (!currentTenant) return;
    // Guardar quien vendió
    const saleWithUser = { ...sale, soldBy: currentUser?.email || 'Sistema' };
    addData(currentTenant.id, 'sales', saleWithUser);
    
    const branchId = sessionContext?.branchId || 'default';
    
    // Actualizar Stock
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        const currentStocks = product.stocks || {};
        const currentBranchStock = currentStocks[branchId] || 0;
        
        updateData(currentTenant.id, 'products', { 
          ...product, 
          stocks: {
            ...currentStocks,
            [branchId]: currentBranchStock - item.quantity
          }
        });
      }
    });

    // Incrementar numero factura
    if (invoiceConfig && sessionContext) {
      const updatedConfig = { ...invoiceConfig };
      const branchIndex = updatedConfig.branches.findIndex(b => b.id === sessionContext.branchId);
      
      if (branchIndex >= 0) {
        const pointIndex = updatedConfig.branches[branchIndex].emissionPoints.findIndex(p => p.id === sessionContext.emissionPointId);
        if (pointIndex >= 0) {
           updatedConfig.branches[branchIndex].emissionPoints[pointIndex].currentInvoiceNumber += 1;
           saveInvoiceConfig(currentTenant.id, updatedConfig);
        }
      }
    }
  };

  const handleContextSelect = (bId: string, pId: string) => {
    const branch = invoiceConfig?.branches.find(b => b.id === bId);
    const point = branch?.emissionPoints.find(p => p.id === pId);
    if (branch && point) {
      setSessionContext({
        branchId: branch.id,
        branchName: branch.name,
        emissionPointId: point.id,
        emissionPointCode: point.code,
        emissionPointName: point.name
      });
      setIsContextModalOpen(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando sistema...</div>;
  if (!currentTenant) return <Login onLogin={handleLogin} />;
  if (currentTenant.isAdmin) return <AdminDashboard onLogout={handleLogout} />;

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD: return <Dashboard products={products} sales={sales} />;
      case ViewState.POS: return <POS products={products} customers={customers} invoiceConfig={invoiceConfig} onCompleteSale={handleCompleteSale} sessionContext={sessionContext} />;
      case ViewState.INVENTORY: return <Inventory 
          products={products} 
          categories={categories} 
          branches={invoiceConfig?.branches || []} 
          onAddProduct={handleAddProduct} 
          onUpdateProduct={handleUpdateProduct} 
          onDeleteProduct={handleDeleteProduct} 
          onAddCategory={handleAddCategory} 
          onTransferStock={handleTransferStock} 
          currentUser={currentUser} // Pasamos el usuario
      />;
      case ViewState.CUSTOMERS: return <Customers customers={customers} onAddCustomer={handleAddCustomer} />;
      case ViewState.SETTINGS: return <Settings config={invoiceConfig} onSave={handleSaveSettings} tenant={currentTenant} />;
      case ViewState.HISTORY: return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Historial de Ventas</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
               <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Factura</th>
                    <th className="px-6 py-4">Sucursal</th>
                    <th className="px-6 py-4">Vendedor</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4 text-center">Items</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">{sale.invoiceNumber || sale.id.slice(0,8)}</td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-medium">{sale.branchSnapshot?.name || 'Central'}</div>
                        <div className="text-slate-400">{sale.emissionPointSnapshot?.name}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{sale.soldBy || '-'}</td>
                      <td className="px-6 py-4">{new Date(sale.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{sale.customerName}</td>
                      <td className="px-6 py-4 text-center">{sale.items.length}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">{sale.total.toLocaleString()} Gs</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setReprintSale(sale)} className="text-orange-600 hover:bg-orange-50 p-2 rounded-full transition-colors" title="Ver / Reimprimir">
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                   {sales.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400"><History className="w-8 h-8 mx-auto mb-2 opacity-20"/>Sin historial de ventas</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      default: return <div>Vista no encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <div className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <div className="flex items-center space-x-2"><div className="bg-orange-500 p-1.5 rounded-lg"><Wrench className="w-5 h-5 text-white" /></div><h1 className="text-lg font-bold tracking-tight">Softec <span className="text-orange-500">PRO</span></h1></div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><Menu className="w-6 h-6" /></button>
      </div>
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        tenantName={currentTenant.name} 
        onLogout={handleLogout}
        currentUser={currentUser} // Pasamos usuario a Sidebar
      />
      
      <main className={`flex-1 lg:ml-64 p-4 lg:p-8 overflow-y-auto h-[calc(100vh-64px)] lg:h-screen bg-slate-50 relative`}>
        {/* Context Header - Solo visible si el usuario puede cambiar (Owner o Manager con permiso) */}
        {!currentTenant.isAdmin && (
          <div className="flex justify-end mb-4">
            <button 
              // Solo permitir cambiar si es OWNER. Los empleados están fijos.
              onClick={() => currentUser?.role === 'OWNER' && setIsContextModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm border text-sm font-medium transition-colors 
                ${!sessionContext ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-white border-slate-200 text-slate-600'}
                ${currentUser?.role === 'OWNER' ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}
              `}
              title={currentUser?.role !== 'OWNER' ? 'Su usuario tiene asignada una caja fija' : 'Cambiar Caja'}
            >
              {currentUser?.role !== 'OWNER' && sessionContext && <Lock className="w-3 h-3 text-slate-400 mr-1"/>}
              <MapPin className="w-4 h-4 text-orange-500" />
              {sessionContext ? (
                <span>{sessionContext.branchName} <span className="text-slate-300">|</span> <span className="text-slate-800">{sessionContext.emissionPointName}</span></span>
              ) : (
                <span>Seleccionar Caja de Trabajo</span>
              )}
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto h-full">{renderContent()}</div>
      </main>
      
      {reprintSale && (
        <ReceiptModal sale={reprintSale} onClose={() => setReprintSale(null)} config={invoiceConfig} />
      )}

      {/* Context Selection Modal */}
      {isContextModalOpen && invoiceConfig && currentUser?.role === 'OWNER' && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="text-center mb-6">
               <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Store className="w-6 h-6 text-orange-600" />
               </div>
               <h3 className="font-bold text-xl text-slate-800">Apertura de Caja</h3>
               <p className="text-slate-500 text-sm">Seleccione dónde operará en esta sesión</p>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {invoiceConfig.branches.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-slate-50">
                   <p className="text-slate-500 font-medium">No hay sucursales configuradas</p>
                   <p className="text-xs text-slate-400 mt-1">Vaya a Configuración para crear la Matriz.</p>
                   <button onClick={() => { setIsContextModalOpen(false); setCurrentView(ViewState.SETTINGS); }} className="mt-3 text-orange-600 text-sm font-bold hover:underline">Ir a Configuración</button>
                </div>
              ) : (
                invoiceConfig.branches.map(branch => (
                  <div key={branch.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 text-sm">
                      {branch.name}
                    </div>
                    <div className="p-2 grid grid-cols-2 gap-2">
                      {branch.emissionPoints.map(point => (
                        <button 
                          key={point.id}
                          onClick={() => handleContextSelect(branch.id, point.id)}
                          className={`text-xs p-3 rounded border transition-all flex flex-col items-center gap-1 group
                            ${sessionContext?.emissionPointId === point.id 
                              ? 'bg-orange-600 border-orange-600 text-white shadow-md' 
                              : 'bg-white border-slate-100 text-slate-600 hover:border-orange-300 hover:shadow-sm'}`}
                        >
                          <span className="truncate w-full text-center font-bold text-sm">{point.name}</span>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${sessionContext?.emissionPointId === point.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            Exp: {point.code}
                          </span>
                        </button>
                      ))}
                      {branch.emissionPoints.length === 0 && <p className="text-xs text-slate-400 col-span-2 text-center py-2">Sin cajas habilitadas</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {sessionContext && (
              <button onClick={() => setIsContextModalOpen(false)} className="mt-6 w-full py-3 text-slate-500 hover:text-slate-800 text-sm font-medium">
                Cancelar Cambio
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;