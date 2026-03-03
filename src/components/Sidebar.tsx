import React from 'react';
import { ViewState, AppUser } from '../types';
import { LayoutDashboard, ShoppingCart, Package, Users, History, Wrench, X, LogOut, Building, Settings } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
  onLogout: () => void;
  currentUser: AppUser | null; // Need user to check permissions
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose, tenantName, onLogout, currentUser }) => {
  
  // Determinar si tiene permiso
  const can = (perm: keyof typeof currentUser.permissions) => {
    if (currentUser?.role === 'OWNER') return true;
    return currentUser?.permissions?.[perm] === true;
  };

  const menuItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, visible: can('canSeeReports') },
    { id: ViewState.POS, label: 'Punto de Venta', icon: ShoppingCart, visible: can('canSell') },
    { id: ViewState.INVENTORY, label: 'Inventario', icon: Package, visible: can('canManageInventory') || can('canAdjustStock') },
    { id: ViewState.CUSTOMERS, label: 'Clientes', icon: Users, visible: can('canManageClients') },
    { id: ViewState.HISTORY, label: 'Historial Ventas', icon: History, visible: can('canSeeReports') }, // Usually reports permission
    { id: ViewState.SETTINGS, label: 'Configuración', icon: Settings, visible: currentUser?.role === 'OWNER' }, // Only owner
  ];

  const handleNavigation = (view: ViewState) => {
    onChangeView(view);
    onClose();
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity" onClick={onClose} />}
      <div className={`fixed top-0 left-0 z-40 h-full w-64 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:shadow-xl flex flex-col`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3"><div className="bg-orange-500 p-2 rounded-lg"><Wrench className="w-6 h-6 text-white" /></div><h1 className="text-xl font-bold tracking-tight">Softec <span className="text-orange-500">PRO</span></h1></div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <div className="px-4 py-4 bg-slate-800/50">
          <div className="flex items-center space-x-3 px-2">
             <div className="bg-slate-700 p-1.5 rounded-md"><Building className="w-4 h-4 text-slate-300" /></div>
             <div className="overflow-hidden">
               <p className="text-xs text-slate-400">Organización</p>
               <p className="text-sm font-semibold truncate text-white" title={tenantName}>{tenantName}</p>
               {currentUser && <p className="text-[10px] text-orange-400 uppercase tracking-wider mt-0.5">{currentUser.role}</p>}
             </div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
          {menuItems.filter(i => i.visible).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button key={item.id} onClick={() => handleNavigation(item.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-orange-600 text-white shadow-md transform scale-[1.02]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} /><span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 mt-auto space-y-4">
           <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"><LogOut className="w-5 h-5" /><span className="font-medium">Cerrar Sesión</span></button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;