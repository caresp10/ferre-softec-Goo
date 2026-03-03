import React, { useState, useEffect } from 'react';
import { InvoiceConfig, Branch, Tenant, SUBSCRIPTION_PLANS, SubscriptionPlan, EmissionPoint, AppUser, UserPermissions } from '../types';
import { Save, Building, FileText, MapPin, Hash, Calendar, Loader2, Store, Plus, Trash2, Crown, Ban, Monitor, X, Users, UserPlus, MessageCircle, ShieldCheck } from 'lucide-react';
import { subscribeToPlans, createStaffUser, subscribeToStaff, deleteStaffUser, sendTenantPasswordReset } from '../services/firebaseService';

interface SettingsProps {
  config: InvoiceConfig | null;
  onSave: (config: InvoiceConfig) => void;
  tenant: Tenant | null;
}

const Settings: React.FC<SettingsProps> = ({ config, onSave, tenant }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'USERS'>('GENERAL');
  
  const [formData, setFormData] = useState<InvoiceConfig>({
    commerceName: '',
    legalName: '',
    ruc: '',
    address: '',
    phone: '',
    timbrado: '',
    validityStart: '',
    validityEnd: '',
    branchCode: '001',
    expeditionPoint: '001',
    currentInvoiceNumber: 1,
    branches: [] 
  });
  
  const [newBranch, setNewBranch] = useState<Partial<Branch>>({});
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedBranchIdForPoints, setSelectedBranchIdForPoints] = useState<string | null>(null);
  const [newPoint, setNewPoint] = useState<Partial<EmissionPoint>>({});
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_PLANS);

  // --- USERS MANAGEMENT STATES ---
  const [staffUsers, setStaffUsers] = useState<AppUser[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER' as 'CASHIER' | 'MANAGER',
    branchId: ''
  });
  
  // Default permissions based on role
  const [newPermissions, setNewPermissions] = useState<UserPermissions>({
    canSell: true,
    canManageInventory: false,
    canAdjustStock: false,
    canTransferStock: false,
    canSeeReports: false,
    canManageClients: true
  });

  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    const unsubPlans = subscribeToPlans((plans) => {
       if (plans.length > 0) setAvailablePlans(plans);
    });

    let unsubStaff: any;
    if (tenant) {
      unsubStaff = subscribeToStaff(tenant.id, (users) => {
        setStaffUsers(users.filter(u => u.role !== 'OWNER'));
      });
    }

    return () => {
      unsubPlans();
      if (unsubStaff) unsubStaff();
    };
  }, [tenant]);

  const currentPlan = availablePlans.find(p => p.id === tenant?.plan) || SUBSCRIPTION_PLANS[0];
  const currentTotalBranches = (formData.branches?.length || 0); 
  const branchLimit = currentPlan.maxBranches || 1;
  const canAddBranch = currentTotalBranches < branchLimit;
  
  const getBranchLimitText = () => {
    if (branchLimit === 1) return "Solo Casa Central";
    if (branchLimit > 100) return "Sucursales Ilimitadas";
    return `Casa Central + ${branchLimit - 1} Sucursales`;
  };

  // Auto-set permissions based on role selection
  useEffect(() => {
    if (newUser.role === 'MANAGER') {
      setNewPermissions({
        canSell: true,
        canManageInventory: true,
        canAdjustStock: true,
        canTransferStock: true,
        canSeeReports: true,
        canManageClients: true
      });
    } else {
       setNewPermissions({
        canSell: true,
        canManageInventory: false,
        canAdjustStock: false,
        canTransferStock: false,
        canSeeReports: false,
        canManageClients: true
      });
    }
  }, [newUser.role]);

  useEffect(() => {
    if (config) {
      setFormData({
        ...config,
        branches: config.branches || []
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    alert('Configuración guardada correctamente');
  };

  const handleAddBranch = () => {
    if (!canAddBranch) {
        alert(`Ha alcanzado el límite de sucursales (${branchLimit}) para su plan actual.`);
        return;
    }
    if (!newBranch.name || !newBranch.code) {
      alert("Nombre y Código de Establecimiento son requeridos");
      return;
    }
    
    const defaultPoint: EmissionPoint = {
      id: crypto.randomUUID(),
      name: 'Caja 1',
      code: '001',
      currentInvoiceNumber: 1
    };

    const branch: Branch = {
      id: crypto.randomUUID(),
      name: newBranch.name!,
      code: newBranch.code!,
      address: newBranch.address || formData.address,
      phone: newBranch.phone || formData.phone,
      emissionPoints: [defaultPoint]
    };
    setFormData(prev => ({ ...prev, branches: [...prev.branches, branch] }));
    setNewBranch({});
    setIsAddingBranch(false);
  };

  const handleDeleteBranch = (id: string) => {
    if (confirm("¿Eliminar esta sucursal? Esto no se puede deshacer.")) {
      setFormData(prev => ({ ...prev, branches: prev.branches.filter(b => b.id !== id) }));
    }
  };

  const handleAddPoint = (branchId: string) => {
    const branch = formData.branches.find(b => b.id === branchId);
    if (!branch) return;
    if (branch.emissionPoints.length >= (currentPlan.maxPointsPerBranch || 1)) {
      alert(`Límite de cajas por sucursal alcanzado (${currentPlan.maxPointsPerBranch || 1})`);
      return;
    }
    if (!newPoint.name || !newPoint.code) return;
    const point: EmissionPoint = {
      id: crypto.randomUUID(),
      name: newPoint.name!,
      code: newPoint.code!,
      currentInvoiceNumber: 1
    };
    const updatedBranches = formData.branches.map(b => {
      if (b.id === branchId) {
        return { ...b, emissionPoints: [...b.emissionPoints, point] };
      }
      return b;
    });
    setFormData({ ...formData, branches: updatedBranches });
    setNewPoint({});
  };

  const handleDeletePoint = (branchId: string, pointId: string) => {
    const updatedBranches = formData.branches.map(b => {
      if (b.id === branchId) {
        return { ...b, emissionPoints: b.emissionPoints.filter(p => p.id !== pointId) };
      }
      return b;
    });
    setFormData({ ...formData, branches: updatedBranches });
  };

  // --- USER FUNCTIONS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    
    setIsCreatingUser(true);
    try {
      await createStaffUser(tenant.id, {
        ...newUser,
        branchId: newUser.branchId || 'default',
        permissions: newPermissions
      });
      alert("Usuario creado exitosamente");
      setIsAddingUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'CASHIER', branchId: '' });
    } catch (error: any) {
      alert("Error al crear usuario: " + error.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (confirm("¿Eliminar este usuario? Ya no podrá acceder al sistema.")) {
      await deleteStaffUser(uid);
    }
  };

  const handleResetPass = async (email: string) => {
    await sendTenantPasswordReset(email);
    alert("Correo de restablecimiento enviado.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
         <div className="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200 w-full md:w-auto">
            <button onClick={() => setActiveTab('GENERAL')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'GENERAL' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>Datos y Sucursales</button>
            <button onClick={() => setActiveTab('USERS')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'USERS' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}><Users className="w-4 h-4" /> Personal</button>
         </div>
      </div>
      
      {/* Plan Info & Upgrade CTA */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl flex flex-col md:flex-row justify-between items-center shadow-md gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg"><Crown className="w-6 h-6 text-white" /></div>
          <div>
            <p className="text-xs text-slate-400">Plan Actual</p>
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg">{currentPlan.name}</p>
              {tenant?.plan === 'FREE' && <span className="text-[10px] bg-orange-500 px-2 rounded">Prueba</span>}
            </div>
            <p className="text-xs text-orange-400 font-medium">{getBranchLimitText()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="text-right hidden md:block">
             <p className="text-xs text-slate-300">Sucursales</p>
             <p className="font-bold">{currentTotalBranches} / {branchLimit > 100 ? '∞' : branchLimit}</p>
           </div>
           
           {/* WhatsApp Upgrade Button */}
           {tenant?.plan !== 'ENTERPRISE' && (
             <a 
               href={`https://wa.me/595984657384?text=Hola,%20soy%20la%20empresa%20${tenant?.name}.%20Quiero%20mejorar%20mi%20plan%20a%20Profesional/Empresarial.`}
               target="_blank"
               rel="noopener noreferrer"
               className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors shadow-lg animate-pulse"
             >
               <MessageCircle className="w-4 h-4" /> Mejorar Plan
             </a>
           )}
        </div>
      </div>

      {activeTab === 'GENERAL' ? (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ... (Formulario de datos fiscales igual) ... */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           {/* ... Inputs de Nombre, RUC, etc ... */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Fantasía</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.commerceName} onChange={e => setFormData({...formData, commerceName: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Razón Social</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.legalName} onChange={e => setFormData({...formData, legalName: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">RUC</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.ruc} onChange={e => setFormData({...formData, ruc: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Timbrado Vigente</label><input required type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.timbrado} onChange={e => setFormData({...formData, timbrado: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Vigencia Inicio</label><input required type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.validityStart} onChange={e => setFormData({...formData, validityStart: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Vigencia Fin</label><input required type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={formData.validityEnd} onChange={e => setFormData({...formData, validityEnd: e.target.value})} /></div>
          </div>
          <div className="mt-4"><label className="block text-sm font-medium text-slate-700 mb-1">Dirección Matriz</label><input required type="text" className="w-full pl-9 border border-slate-300 rounded-lg px-3 py-2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
        </div>

        {/* Gestión de Sucursales */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <div className="flex items-center gap-2 text-slate-800">
              <Store className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-lg">Estructura de Sucursales</h3>
            </div>
            {canAddBranch ? (
              <button type="button" onClick={() => setIsAddingBranch(true)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-full flex items-center gap-1 transition-colors"><Plus className="w-3 h-3" /> Nueva Sucursal</button>
            ) : (
              <span className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full font-medium border border-orange-100 flex items-center gap-1"><Ban className="w-3 h-3"/> Límite alcanzado</span>
            )}
          </div>

          <div className="space-y-4">
            {/* ... (Lista de sucursales igual) ... */}
            {formData.branches.map(branch => (
              <div key={branch.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800">{branch.name}</p>
                      <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">Est: {branch.code}</span>
                    </div>
                    <p className="text-xs text-slate-500">{branch.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSelectedBranchIdForPoints(selectedBranchIdForPoints === branch.id ? null : branch.id)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Monitor className="w-3 h-3" /> {selectedBranchIdForPoints === branch.id ? 'Ocultar Cajas' : `Gestionar Cajas (${branch.emissionPoints.length})`}</button>
                    <button type="button" onClick={() => handleDeleteBranch(branch.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {selectedBranchIdForPoints === branch.id && (
                  <div className="p-3 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {branch.emissionPoints.map(point => (
                        <div key={point.id} className="flex items-center justify-between border border-slate-100 p-2 rounded text-sm">
                          <div><span className="font-bold text-slate-700">{point.name}</span><span className="text-xs text-slate-400 ml-2 font-mono">Exp: {point.code}</span></div>
                          <button type="button" onClick={() => handleDeletePoint(branch.id, point.id)} className="text-red-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-100">
                      <input type="text" placeholder="Caja 2" className="text-sm px-2 py-1 border rounded w-1/3" value={newPoint.name || ''} onChange={e => setNewPoint({...newPoint, name: e.target.value})} />
                      <input type="text" placeholder="002" className="text-sm px-2 py-1 border rounded w-1/4 font-mono" value={newPoint.code || ''} onChange={e => setNewPoint({...newPoint, code: e.target.value})} maxLength={3} />
                      <button type="button" onClick={() => handleAddPoint(branch.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 ml-auto">Crear Caja</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isAddingBranch && (
              <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-orange-800 mb-3">Nueva Sucursal</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input type="text" placeholder="Nombre" className="border rounded px-2 py-1 text-sm" value={newBranch.name || ''} onChange={e => setNewBranch({...newBranch, name: e.target.value})} />
                  <input type="text" placeholder="Dirección" className="border rounded px-2 py-1 text-sm" value={newBranch.address || ''} onChange={e => setNewBranch({...newBranch, address: e.target.value})} />
                  <div className="flex gap-2">
                     <input type="text" placeholder="Cod Est (002)" className="border rounded px-2 py-1 text-sm w-1/2" value={newBranch.code || ''} onChange={e => setNewBranch({...newBranch, code: e.target.value})} maxLength={3} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end"><button type="button" onClick={() => setIsAddingBranch(false)} className="text-xs text-slate-500">Cancelar</button><button type="button" onClick={handleAddBranch} className="text-xs bg-orange-600 text-white px-3 py-1 rounded">Guardar</button></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSaving} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-sm transition-colors font-medium disabled:bg-slate-400">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar Todo
          </button>
        </div>
      </form>
      ) : (
        <div className="space-y-6">
          {/* USERS MANAGEMENT TAB */}
          <div className="flex justify-between items-center mb-4">
            <div>
               <h3 className="text-lg font-bold text-slate-700">Personal y Accesos</h3>
               <p className="text-xs text-slate-500">Crea usuarios para tus empleados y asigna permisos.</p>
            </div>
            <button onClick={() => setIsAddingUser(true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-slate-700"><UserPlus className="w-4 h-4"/> Agregar Usuario</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {staffUsers.map(user => (
               <div key={user.uid} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 relative">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <div className="flex gap-1 mt-2">
                            <span className={`text-[10px] px-2 py-1 rounded font-bold ${user.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {user.role === 'MANAGER' ? 'ENCARGADO' : 'CAJERO'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            <Store className="w-3 h-3 inline mr-1"/>
                            {user.branchId ? formData.branches.find(b => b.id === user.branchId)?.name || 'Sucursal Eliminada' : 'Todas las sucursales'}
                        </p>
                     </div>
                     <button onClick={() => handleDeleteUser(user.uid)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  
                  {/* Visualización de permisos */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                     <span className={user.permissions?.canSell ? 'text-green-600' : 'text-slate-300'}>• Ventas</span>
                     <span className={user.permissions?.canManageInventory ? 'text-green-600' : 'text-slate-300'}>• Inventario</span>
                     <span className={user.permissions?.canTransferStock ? 'text-green-600' : 'text-slate-300'}>• Transferencias</span>
                     <span className={user.permissions?.canSeeReports ? 'text-green-600' : 'text-slate-300'}>• Reportes</span>
                  </div>

                  <button onClick={() => handleResetPass(user.email)} className="w-full mt-3 text-xs text-center border border-slate-200 py-1.5 rounded text-slate-600 hover:bg-slate-50">Resetear Clave</button>
               </div>
             ))}
          </div>

          {isAddingUser && (
            <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                  <h3 className="font-bold text-lg mb-4">Nuevo Usuario</h3>
                  <form onSubmit={handleCreateUser} className="space-y-3">
                     <input required type="text" placeholder="Nombre Completo" className="w-full border rounded p-2" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                     <input required type="email" placeholder="Correo electrónico" className="w-full border rounded p-2" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                     <input required type="password" placeholder="Contraseña" className="w-full border rounded p-2" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                     
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Rol</label>
                          <select className="w-full border rounded p-2 text-sm bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                            <option value="CASHIER">Cajero</option>
                            <option value="MANAGER">Encargado</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Sucursal Asignada</label>
                          <select className="w-full border rounded p-2 text-sm bg-white" value={newUser.branchId} onChange={e => setNewUser({...newUser, branchId: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {formData.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <p className="text-[10px] text-slate-400 mt-1">Si deja vacío, tendrá acceso a todas (Solo Managers).</p>
                        </div>
                     </div>
                     
                     {/* PERMISOS CHECKBOXES */}
                     <div className="mt-4 border rounded-lg p-3 bg-slate-50">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                           <ShieldCheck className="w-4 h-4 text-orange-600"/> Permisos
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                           <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={newPermissions.canSell} onChange={e => setNewPermissions({...newPermissions, canSell: e.target.checked})} />
                              Vender (POS)
                           </label>
                           <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={newPermissions.canManageInventory} onChange={e => setNewPermissions({...newPermissions, canManageInventory: e.target.checked})} />
                              Editar Inventario
                           </label>
                           <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={newPermissions.canTransferStock} onChange={e => setNewPermissions({...newPermissions, canTransferStock: e.target.checked})} />
                              Transferir Stock
                           </label>
                           <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={newPermissions.canManageClients} onChange={e => setNewPermissions({...newPermissions, canManageClients: e.target.checked})} />
                              Crear Clientes
                           </label>
                           <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={newPermissions.canSeeReports} onChange={e => setNewPermissions({...newPermissions, canSeeReports: e.target.checked})} />
                              Ver Reportes
                           </label>
                           <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={newPermissions.canAdjustStock} onChange={e => setNewPermissions({...newPermissions, canAdjustStock: e.target.checked})} />
                              Ajustar Stock (Manual)
                           </label>
                        </div>
                     </div>

                     <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsAddingUser(false)} className="text-slate-500 hover:text-slate-800">Cancelar</button>
                        <button type="submit" disabled={isCreatingUser} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-slate-400">
                          {isCreatingUser ? 'Creando...' : 'Crear Usuario'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;