
import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { UserPlus, Users, X, Save, Mail, Phone, MapPin, CreditCard, FileText } from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
}

type DocumentType = 'CI' | 'RUC' | 'PAS' | 'EXT';

const Customers: React.FC<CustomersProps> = ({ customers, onAddCustomer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para el manejo específico del documento Paraguay
  const [docType, setDocType] = useState<DocumentType>('CI');
  const [docNumber, setDocNumber] = useState('');
  const [rucDV, setRucDV] = useState('');

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: ''
  });

  // Algoritmo de Módulo 11 para RUC Paraguay
  const calculateDV = (ruc: string): string => {
    if (!ruc) return '';
    const numericRuc = ruc.replace(/\D/g, ''); // Solo números
    if (numericRuc === '') return '';

    let total = 0;
    let k = 2;

    // Iterar de derecha a izquierda
    for (let i = numericRuc.length - 1; i >= 0; i--) {
      total += parseInt(numericRuc.charAt(i)) * k;
      k++;
    }

    const resto = total % 11;
    let dv = 11 - resto;

    if (dv === 11) dv = 0;
    if (dv === 10) dv = 1;

    return dv.toString();
  };

  // Efecto para actualizar el DV y el taxId final cuando cambia el número o tipo
  useEffect(() => {
    if (docType === 'RUC') {
      const dv = calculateDV(docNumber);
      setRucDV(dv);
      setFormData(prev => ({ ...prev, taxId: docNumber ? `${docNumber}-${dv}` : '' }));
    } else {
      setRucDV('');
      setFormData(prev => ({ ...prev, taxId: docNumber }));
    }
  }, [docNumber, docType]);

  const handleOpenModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      taxId: ''
    });
    setDocType('CI');
    setDocNumber('');
    setRucDV('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer({
      ...formData,
      id: crypto.randomUUID()
    } as Customer);
    setIsModalOpen(false);
  };

  const getDocLabel = () => {
    switch (docType) {
      case 'CI': return 'Nro. Cédula de Identidad';
      case 'RUC': return 'RUC (Sin dígito verificador)';
      case 'PAS': return 'Nro. de Pasaporte';
      case 'EXT': return 'Documento Extranjero';
      default: return 'Documento';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Cartera de Clientes</h2>
        <button 
          onClick={handleOpenModal}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 group hover:border-orange-200 transition-all">
            <div className="flex items-start space-x-4">
              <div className="bg-slate-100 p-3 rounded-full group-hover:bg-orange-50 transition-colors">
                <Users className="w-6 h-6 text-slate-600 group-hover:text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate">{c.name}</h3>
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center text-sm text-slate-500">
                    <Mail className="w-3.5 h-3.5 mr-2" />
                    <span className="truncate">{c.email || 'Sin email'}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-500">
                    <Phone className="w-3.5 h-3.5 mr-2" />
                    <span className="truncate">{c.phone || 'Sin teléfono'}</span>
                  </div>
                   <div className="flex items-center text-sm text-slate-500">
                    <MapPin className="w-3.5 h-3.5 mr-2" />
                    <span className="truncate">{c.address || 'Sin dirección'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    <CreditCard className="w-3 h-3 mr-1 text-orange-500" />
                    <span className="font-mono">{c.taxId || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Registrar Nuevo Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo / Razón Social</label>
                <input 
                  required 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-shadow" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej. Juan Pérez o Constructora S.A."
                />
              </div>

              {/* Bloque de Identificación Paraguay */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-bold text-slate-700">Documento de Identidad</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm bg-white"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocumentType)}
                    >
                      <option value="CI">Cédula (CI)</option>
                      <option value="RUC">RUC</option>
                      <option value="PAS">Pasaporte</option>
                      <option value="EXT">Extranjero</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">{getDocLabel()}</label>
                    <div className="flex items-center gap-2">
                      <input 
                        required 
                        type="text" 
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                        value={docNumber} 
                        onChange={e => setDocNumber(e.target.value)}
                        placeholder={docType === 'RUC' ? 'Ej. 3799439' : ''}
                      />
                      {docType === 'RUC' && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">-</span>
                          <div className="w-10 h-10 flex items-center justify-center bg-orange-100 border border-orange-200 text-orange-700 font-bold rounded-lg" title="Dígito Verificador">
                            {rucDV}
                          </div>
                        </div>
                      )}
                    </div>
                    {docType === 'RUC' && rucDV && (
                      <p className="text-xs text-orange-600 mt-1">Dígito verificador calculado automáticamente.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input 
                    required 
                    type="tel" 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-shadow" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="(09XX) 000-000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-shadow" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="cliente@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Física</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-shadow" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Ej. Av. Mariscal López 1234"
                />
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors font-medium shadow-sm hover:shadow"
                >
                  <Save className="w-4 h-4" /> Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;