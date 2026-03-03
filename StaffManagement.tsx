import React, { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { subscribeToStaff, createStaffUser, deleteStaffUser } from '../services/firebaseService';
import { Trash2, UserPlus, Shield, User } from 'lucide-react';

interface StaffManagementProps {
  tenantId: string;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ tenantId }) => {
  const [staff, setStaff] = useState<AppUser[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'CASHIER' as const });
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToStaff(tenantId, setStaff);
    return () => unsubscribe();
  }, [tenantId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createStaffUser(tenantId, {
        ...newUser,
        permissions: { 
            canSell: true, 
            canManageInventory: newUser.role === 'MANAGER',
            canAdjustStock: newUser.role === 'MANAGER',
            canTransferStock: newUser.role === 'MANAGER',
            canSeeReports: newUser.role === 'MANAGER',
            canManageClients: true
        }
      });
      setIsAdding(false);
      setNewUser({ name: '', email: '', password: '', role: 'CASHIER' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          Gestión de Personal
        </h2>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-200 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> {isAdding ? 'Cancelar' : 'Nuevo Usuario'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddUser} className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200 grid gap-4 md:grid-cols-2">
          <input required placeholder="Nombre" className="p-2 border rounded" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
          <input required type="email" placeholder="Email" className="p-2 border rounded" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
          <input required type="password" placeholder="Contraseña" className="p-2 border rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
          <select className="p-2 border rounded" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
            <option value="CASHIER">Cajero</option>
            <option value="MANAGER">Gerente</option>
          </select>
          {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
          <button type="submit" className="md:col-span-2 bg-orange-600 text-white py-2 rounded hover:bg-orange-700">Crear Usuario</button>
        </form>
      )}

      <div className="space-y-3">
        {staff.map(user => (
          <div key={user.uid} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="bg-slate-200 p-2 rounded-full"><User className="w-4 h-4 text-slate-600"/></div>
              <div>
                <p className="font-medium text-slate-800">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email} • <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold">{user.role}</span></p>
              </div>
            </div>
            {user.role !== 'OWNER' && (
              <button onClick={() => deleteStaffUser(user.uid)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors" title="Eliminar usuario">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {staff.length === 0 && <p className="text-center text-slate-400 py-4">No hay personal registrado.</p>}
      </div>
    </div>
  );
};

export default StaffManagement;