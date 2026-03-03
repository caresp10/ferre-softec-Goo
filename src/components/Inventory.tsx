import React, { useState } from 'react';
import { Product, Category, Branch, AppUser } from '../types';
import { Search, Plus, Edit2, Trash2, Wand2, Save, X, Barcode, RefreshCw, Check, ArrowRightLeft, Store } from 'lucide-react';
import { generateProductDescription } from '../services/geminiService';

// Helper local
const calcStock = (p: Product) => {
  if (!p.stocks) return (p as any).stock || 0;
  return Object.values(p.stocks).reduce((a, b) => a + b, 0);
};

interface InventoryProps {
  products: Product[];
  categories: Category[];
  branches: Branch[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (name: string) => void;
  onTransferStock: (productId: string, from: string, to: string, qty: number) => Promise<void>;
  currentUser: AppUser | null; // Necesario para verificar permisos
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(amount);
};

const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  categories, 
  branches,
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  onAddCategory,
  onTransferStock,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Transfer State
  const [transferData, setTransferData] = useState({
    productId: '',
    fromBranch: '',
    toBranch: '',
    quantity: 1
  });

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    category: '',
    price: 0,
    cost: 0,
    stocks: {}, // Start empty
    minStock: 0,
    description: '',
    taxRate: 10
  });

  // VERIFICACIÓN DE PERMISOS
  const canEdit = currentUser?.role === 'OWNER' || currentUser?.permissions?.canManageInventory;
  const canTransfer = currentUser?.role === 'OWNER' || currentUser?.permissions?.canTransferStock;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    setIsAddingCategory(false);
    setNewCategoryName('');
    
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product, stocks: product.stocks || { 'default': (product as any).stock || 0 } });
    } else {
      setEditingProduct(null);
      // Initialize stocks for all branches with 0
      const initialStocks: {[key:string]: number} = {};
      branches.forEach(b => initialStocks[b.id] = 0);
      // Fallback if no branches configured yet
      if (branches.length === 0) initialStocks['default'] = 0;

      setFormData({
        name: '',
        sku: '',
        category: categories.length > 0 ? categories[0].name : '',
        price: 0,
        cost: 0,
        stocks: initialStocks,
        minStock: 5,
        description: '',
        taxRate: 10
      });
    }
    setIsModalOpen(true);
  };

  const handleGenerateDescription = async () => {
    if (!formData.name || !formData.category) return;
    setIsGenerating(true);
    const desc = await generateProductDescription(formData.name, formData.category);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const generateRandomSku = () => {
    const randomSku = Math.floor(10000000 + Math.random() * 90000000).toString();
    setFormData(prev => ({ ...prev, sku: randomSku }));
  };

  const handleSaveCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      onUpdateProduct({ ...formData, id: editingProduct.id } as Product);
    } else {
      onAddProduct({ ...formData, id: crypto.randomUUID() } as Product);
    }
    setIsModalOpen(false);
  };

  const handleOpenTransfer = (product: Product) => {
    if (branches.length < 2) {
      alert("Necesita al menos 2 sucursales para realizar transferencias.");
      return;
    }
    setTransferData({
      productId: product.id,
      fromBranch: branches[0].id,
      toBranch: branches[1].id,
      quantity: 1
    });
    setEditingProduct(product); 
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.fromBranch === transferData.toBranch) {
      alert("La sucursal de origen y destino deben ser diferentes.");
      return;
    }
    try {
      await onTransferStock(transferData.productId, transferData.fromBranch, transferData.toBranch, transferData.quantity);
      alert("Transferencia exitosa.");
      setIsTransferModalOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o escanear código de barras..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4 text-center">IVA</th>
                <th className="px-6 py-4 text-right">Precio</th>
                <th className="px-6 py-4 text-center">Stock Total</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const totalStock = calcStock(product);
                return (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    <div>{product.name}</div>
                    <div className="text-xs text-slate-400">{product.category}</div>
                  </td>
                  <td className="px-6 py-4 text-center text-xs">{product.taxRate}%</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${totalStock <= product.minStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {totalStock}
                      </span>
                      {/* Tooltip-like breakdown */}
                      <div className="hidden group-hover:block absolute bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-10 mt-6">
                        {branches.length > 0 ? branches.map(b => (
                          <div key={b.id}>{b.name}: {product.stocks?.[b.id] || 0}</div>
                        )) : (
                          <div>Central: {product.stocks?.['default'] || 0}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center space-x-2">
                      {canTransfer && (
                        <button onClick={() => handleOpenTransfer(product)} className="p-1 text-slate-400 hover:text-orange-600 transition-colors" title="Transferir Stock">
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && (
                        <>
                          <button onClick={() => handleOpenModal(product)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteProduct(product.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-6">
              {/* Fields (Name, SKU, etc) */}
              <div className="col-span-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input required type="text" className="w-full border border-slate-300 rounded-md px-3 py-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
                  <div className="flex gap-2">
                    <input required type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 font-mono" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                    <button type="button" onClick={generateRandomSku} className="p-2 border rounded hover:bg-slate-50"><RefreshCw className="w-4 h-4"/></button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <select className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="col-span-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Costo</label>
                    <input required type="number" className="w-full border border-slate-300 rounded-md px-3 py-2" value={formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                    <input required type="number" className="w-full border border-slate-300 rounded-md px-3 py-2" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">IVA</label>
                   <div className="flex gap-4">
                     <label><input type="radio" name="tax" checked={formData.taxRate === 10} onChange={() => setFormData({...formData, taxRate: 10})} /> 10%</label>
                     <label><input type="radio" name="tax" checked={formData.taxRate === 5} onChange={() => setFormData({...formData, taxRate: 5})} /> 5%</label>
                   </div>
                </div>
              </div>

              {/* Stock Management Per Branch */}
              <div className="col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Store className="w-4 h-4"/> Stock por Sucursal</h4>
                <div className="grid grid-cols-2 gap-4">
                  {branches.length > 0 ? branches.map(branch => (
                    <div key={branch.id}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{branch.name}</label>
                      <input 
                        type="number" 
                        min="0"
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        value={formData.stocks?.[branch.id] || 0}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          stocks: {
                            ...prev.stocks,
                            [branch.id]: parseInt(e.target.value) || 0
                          }
                        }))}
                        // Disable stock editing per branch if not owner (must use transfer)
                        // Actually, let's allow editing if canAdjustStock is true
                        disabled={!canEdit}
                      />
                    </div>
                  )) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Stock General (Sin sucursales)</label>
                      <input 
                        type="number" 
                        className="w-full border border-slate-300 rounded-md px-3 py-2"
                        value={formData.stocks?.['default'] || 0}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          stocks: { 'default': parseInt(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                  Descripción
                  <button type="button" onClick={handleGenerateDescription} disabled={isGenerating || !formData.name} className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 disabled:opacity-50">
                    <Wand2 className="w-3 h-3" /> {isGenerating ? 'Generando...' : 'Generar con IA'}
                  </button>
                </label>
                <textarea className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none h-20 resize-none text-sm" 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descripción del producto..." />
              </div>

              <div className="col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors">
                  <Save className="w-4 h-4" /> Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-orange-600"/> Transferir Mercadería</h3>
            <p className="text-sm text-slate-500 mb-4">Producto: <strong>{editingProduct.name}</strong></p>
            
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Origen</label>
                <select className="w-full border rounded p-2" value={transferData.fromBranch} onChange={e => setTransferData({...transferData, fromBranch: e.target.value})}>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} (Stock: {editingProduct.stocks?.[b.id] || 0})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destino</label>
                <select className="w-full border rounded p-2" value={transferData.toBranch} onChange={e => setTransferData({...transferData, toBranch: e.target.value})}>
                  {branches.filter(b => b.id !== transferData.fromBranch).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                <input type="number" min="1" className="w-full border rounded p-2" value={transferData.quantity} onChange={e => setTransferData({...transferData, quantity: parseInt(e.target.value)})} />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded">Transferir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;