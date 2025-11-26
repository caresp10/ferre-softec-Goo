
import React, { useState, useEffect } from 'react';
import { Tenant, TenantInvoice, SUBSCRIPTION_PLANS } from '../types';
import { Shield, LogOut, CheckCircle, Ban, Search, Store, CreditCard, Plus, X, Save, Edit, Building2, Mail, Lock, Receipt, Ticket, Calendar } from 'lucide-react';
import { subscribeToAllTenants, updateTenantStatus } from '../services/firebaseService';

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminTab = 'TENANTS' | 'PLANS' | 'BILLING';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(amount);
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('TENANTS');
  
  // Data States
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invoices, setInvoices] = useState<TenantInvoice[]>([]);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: '',
    email: '',
    password: '',
    plan: 'FREE',
    isActive: true
  });
  const [formError, setFormError] = useState('');

  // Invoice Generation & Edit States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [invoiceTenantId, setInvoiceTenantId] = useState('');
  const [editingInvoice, setEditingInvoice] = useState<TenantInvoice | null>(null);
  const [invoiceFormData, setInvoiceFormData] = useState<Partial<TenantInvoice>>({});

  useEffect(() => {
    // Load Tenants from Firebase
    const unsub = subscribeToAllTenants((data) => {
      setTenants(data);
    });

    // Load Invoices (Local Storage for now as demo for SaaS billing)
    const storedInvoices = localStorage.getItem('saas_invoices');
    if (storedInvoices) {
      setInvoices(JSON.parse(storedInvoices));
    }
    
    return () => unsub();
  }, []);

  const saveInvoicesToStorage = (updatedInvoices: TenantInvoice[]) => {
    setInvoices(updatedInvoices);
    localStorage.setItem('saas_invoices', JSON.stringify(updatedInvoices));
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateTenantStatus(id, !currentStatus);
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  const deleteTenant = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta organización? Nota: En esta demo esto solo ocultará el acceso.')) {
       // In a real app, calling a cloud function to recursively delete subcollections
       updateTenantStatus(id, false);
    }
  };

  const markInvoiceAsPaid = (id: string) => {
    const updated = invoices.map(inv => inv.id === id ? { ...inv, status: 'PAID' as const } : inv);
    saveInvoicesToStorage(updated);
  };

  const handleGenerateInvoice = () => {
    const tenant = tenants.find(t => t.id === invoiceTenantId);
    if (!tenant) return;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === tenant.plan);
    if (!plan) return;

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10); // 10 days to pay

    const newInvoice: TenantInvoice = {
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      planId: plan.name,
      amount: plan.price,
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      status: 'PENDING'
    };

    saveInvoicesToStorage([newInvoice, ...invoices]);
    setIsInvoiceModalOpen(false);
    setInvoiceTenantId('');
  };

  // --- CRUD Handlers for Tenant ---

  const handleOpenTenantModal = (tenant?: Tenant) => {
    setFormError('');
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        email: tenant.email,
        password: tenant.password,
        plan: tenant.plan,
        isActive: tenant.isActive
      });
    } else {
      setEditingTenant(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        plan: 'FREE',
        isActive: true
      });
    }
    setIsTenantModalOpen(true);
  };

  const handleTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('La creación manual de tenants está deshabilitada en esta vista. Por favor regístrese desde la pantalla de Login.');
    // In a real app, this would call an Admin Cloud Function to create a user.
  };

  // --- Edit Invoice Handlers ---

  const handleOpenEditInvoice = (invoice: TenantInvoice) => {
    setEditingInvoice(invoice);
    setInvoiceFormData({
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status
    });
    setIsEditInvoiceModalOpen(true);
  };

  const handleEditInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const updatedInvoices = invoices.map(inv => {
      if (inv.id === editingInvoice.id) {
        return {
          ...inv,
          amount: invoiceFormData.amount || inv.amount,
          dueDate: invoiceFormData.dueDate || inv.dueDate,
          status: invoiceFormData.status || inv.status
        };
      }
      return inv;
    });

    saveInvoicesToStorage(updatedInvoices);
    setIsEditInvoiceModalOpen(false);
    setEditingInvoice(null);
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col h-auto md:h-screen sticky top-0">
         <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Panel</h1>
              <p className="text-xs text-slate-400">SaaS Manager</p>
            </div>
         </div>
         <nav className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('TENANTS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'TENANTS' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Store className="w-5 h-5" />
              <span className="font-medium">Empresas</span>
            </button>
            <button 
              onClick={() => setActiveTab('BILLING')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'BILLING' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Receipt className="w-5 h-5" />
              <span className="font-medium">Facturación</span>
            </button>
            <button 
              onClick={() => setActiveTab('PLANS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'PLANS' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Ticket className="w-5 h-5" />
              <span className="font-medium">Planes</span>
            </button>
         </nav>
         <div className="p-4 border-t border-slate-800">
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
        
        {/* --- VIEW: TENANTS --- */}
        {activeTab === 'TENANTS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Directorio de Clientes</h2>
              <div className="flex gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Buscar empresa..." 
                      className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
                 {/* 
                 <button 
                  onClick={() => handleOpenTenantModal()}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nuevo Cliente
                </button>
                */}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Ferretería</th>
                    <th className="px-6 py-4">Plan Actual</th>
                    <th className="px-6 py-4">Miembro Desde</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{tenant.name}</div>
                        <div className="text-slate-500 text-xs">{tenant.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium gap-1
                          ${tenant.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' : 
                            tenant.plan === 'PRO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`px-2 py-1 rounded-full text-xs font-bold ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {tenant.isActive ? 'ACTIVO' : 'SUSPENDIDO'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* <button onClick={() => handleOpenTenantModal(tenant)} className="text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button> */}
                        <button onClick={() => toggleStatus(tenant.id, tenant.isActive)} className="text-slate-400 hover:text-orange-600"><Ban className="w-4 h-4" /></button>
                        <button onClick={() => deleteTenant(tenant.id)} className="text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW: BILLING --- */}
        {activeTab === 'BILLING' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Facturación y Cobranzas</h2>
              <button 
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Generar Factura
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold">Ingresos Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {formatCurrency(invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0))}
                  </p>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold">Cobrado este mes</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                     {formatCurrency(invoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0))}
                  </p>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold">Facturas Vencidas</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {invoices.filter(i => i.status === 'OVERDUE').length}
                  </p>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">ID Factura</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Concepto</th>
                    <th className="px-6 py-4">Monto</th>
                    <th className="px-6 py-4">Vencimiento</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">No hay facturas generadas.</td></tr>
                  ) : (
                    invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-xs">{inv.id.slice(0, 8)}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{inv.tenantName}</td>
                        <td className="px-6 py-4">{inv.planId}</td>
                        <td className="px-6 py-4 font-bold">{formatCurrency(inv.amount)}</td>
                        <td className="px-6 py-4">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold 
                            ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                              inv.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            {inv.status === 'PAID' ? 'PAGADO' : inv.status === 'PENDING' ? 'PENDIENTE' : 'VENCIDO'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={() => handleOpenEditInvoice(inv)}
                               className="text-slate-400 hover:text-blue-600 p-1"
                               title="Editar Factura"
                             >
                               <Edit className="w-4 h-4" />
                             </button>
                             {inv.status !== 'PAID' && (
                               <button 
                                onClick={() => markInvoiceAsPaid(inv.id)}
                                className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-2 py-1 rounded border border-green-200 whitespace-nowrap"
                              >
                                 Marcar Pagado
                               </button>
                             )}
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW: PLANS --- */}
        {activeTab === 'PLANS' && (
          <div className="space-y-6">
             <h2 className="text-2xl font-bold text-slate-800">Planes de Suscripción</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SUBSCRIPTION_PLANS.map(plan => (
                  <div key={plan.id} className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col ${plan.id === 'PRO' ? 'border-orange-500 ring-1 ring-orange-500 relative' : 'border-slate-200'}`}>
                    {plan.id === 'PRO' && <span className="absolute top-0 right-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg font-bold">POPULAR</span>}
                    <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                    <div className="mt-4 mb-6">
                      <span className="text-4xl font-bold text-slate-900">{formatCurrency(plan.price)}</span>
                      <span className="text-slate-500">/mes</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feat}
                        </li>
                      ))}
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          Hasta {plan.maxProducts} productos
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          Soporte: {plan.supportLevel}
                      </li>
                    </ul>
                    <button className="w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                      Editar Detalles
                    </button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- MODALS --- */}

        {/* Tenant Modal */}
        {isTenantModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">
                  {editingTenant ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
                <button onClick={() => setIsTenantModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleTenantSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Ferretería</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input 
                      required 
                      type="text" 
                      className="w-full pl-9 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Ej. Ferretería El Tornillo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email de Acceso</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input 
                      required 
                      type="email" 
                      className="w-full pl-9 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="cliente@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input 
                      required={!editingTenant} 
                      type="text" 
                      className="w-full pl-9 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono text-sm" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder={editingTenant ? "Dejar igual para no cambiar" : "Contraseña segura"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                      value={formData.plan}
                      onChange={e => setFormData({...formData, plan: e.target.value as any})}
                    >
                      <option value="FREE">Gratis (Free)</option>
                      <option value="PRO">Profesional</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                      value={formData.isActive ? 'true' : 'false'}
                      onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Suspendido</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <div className="text-red-500 text-xs bg-red-50 p-2 rounded border border-red-100">
                    {formError}
                  </div>
                )}

                <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsTenantModalOpen(false)} 
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors font-medium text-sm shadow-sm hover:shadow"
                  >
                    <Save className="w-4 h-4" /> {editingTenant ? 'Guardar Cambios' : 'Crear Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoice Generator Modal */}
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-lg text-slate-800">Generar Factura</h3>
                 <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6">
                 <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Cliente a Facturar</label>
                 <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 mb-4 bg-white"
                  value={invoiceTenantId}
                  onChange={(e) => setInvoiceTenantId(e.target.value)}
                 >
                   <option value="">Seleccione una empresa...</option>
                   {tenants.filter(t => t.plan !== 'FREE').map(t => (
                     <option key={t.id} value={t.id}>{t.name} ({t.plan})</option>
                   ))}
                 </select>
                 
                 {invoiceTenantId && (
                   <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 mb-4 border border-slate-200">
                      <p>Plan: <strong>{tenants.find(t => t.id === invoiceTenantId)?.plan}</strong></p>
                      <p>Monto: <strong>{formatCurrency(SUBSCRIPTION_PLANS.find(p => p.id === tenants.find(t => t.id === invoiceTenantId)?.plan)?.price || 0)}</strong></p>
                      <p className="text-xs text-slate-400 mt-1">Se generará con fecha de hoy + 10 días de vencimiento.</p>
                   </div>
                 )}

                 <button 
                  onClick={handleGenerateInvoice}
                  disabled={!invoiceTenantId}
                  className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
                 >
                   Confirmar y Generar
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Invoice Modal */}
        {isEditInvoiceModalOpen && editingInvoice && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-lg text-slate-800">Editar Factura</h3>
                 <button onClick={() => setIsEditInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleEditInvoiceSubmit} className="p-6 space-y-4">
                 
                 <div>
                   <p className="text-xs text-slate-500 mb-1">Empresa</p>
                   <p className="font-medium text-slate-900">{editingInvoice.tenantName}</p>
                   <p className="text-xs text-slate-400 mt-1">Factura #{editingInvoice.id.slice(0,8)}</p>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Monto (Gs)</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        step="1"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        value={invoiceFormData.amount}
                        onChange={e => setInvoiceFormData({...invoiceFormData, amount: parseFloat(e.target.value)})}
                      />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Vencimiento</label>
                   <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                         <Calendar className="w-4 h-4"/>
                      </div>
                      <input 
                        type="date"
                        className="w-full pl-9 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        value={invoiceFormData.dueDate ? new Date(invoiceFormData.dueDate).toISOString().split('T')[0] : ''}
                        onChange={e => setInvoiceFormData({...invoiceFormData, dueDate: new Date(e.target.value).toISOString()})}
                      />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                   <select 
                     className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                     value={invoiceFormData.status}
                     onChange={e => setInvoiceFormData({...invoiceFormData, status: e.target.value as any})}
                   >
                     <option value="PENDING">Pendiente</option>
                     <option value="PAID">Pagado</option>
                     <option value="OVERDUE">Vencido</option>
                   </select>
                 </div>

                 <div className="pt-2 flex gap-3">
                   <button 
                    type="button"
                    onClick={() => setIsEditInvoiceModalOpen(false)}
                    className="flex-1 text-slate-600 hover:bg-slate-100 py-2 rounded-lg font-medium transition-colors border border-slate-200"
                   >
                     Cancelar
                   </button>
                   <button 
                    type="submit"
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 font-medium shadow-sm"
                   >
                     Guardar
                   </button>
                 </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;