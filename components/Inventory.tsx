import React, { useState } from 'react';
import { Product, Category } from '../types';
import { Search, Plus, Edit2, Trash2, Wand2, Save, X, Barcode, RefreshCw, Check } from 'lucide-react';
import { generateProductDescription } from '../services/geminiService';

interface InventoryProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (name: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  categories, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  onAddCategory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Estados para creación rápida de categorías
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    category: '',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 0,
    description: ''
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    setIsAddingCategory(false);
    setNewCategoryName('');
    
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        category: categories.length > 0 ? categories[0].name : '',
        price: 0,
        cost: 0,
        stock: 0,
        minStock: 5,
        description: ''
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
    // Genera un código de 8 dígitos simulando EAN-8 interno
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
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
                <th className="px-6 py-4">Código / SKU</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-right">Costo</th>
                <th className="px-6 py-4 text-right">Precio</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-xs bg-slate-100 px-2 py-1 rounded w-fit">
                      <Barcode className="w-3 h-3 text-slate-400" />
                      {product.sku}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    <div>{product.name}</div>
                    {product.description && <div className="text-xs text-slate-400 font-normal truncate max-w-[200px]">{product.description}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">${product.cost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${product.stock <= product.minStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button onClick={() => handleOpenModal(product)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDeleteProduct(product.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No se encontraron productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-6">
              <div className="col-span-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Producto</label>
                  <input required type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ej. Martillo..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código de Barras / SKU</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                       <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                       <input 
                        required 
                        type="text" 
                        className="w-full pl-9 border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono" 
                        value={formData.sku} 
                        onChange={e => setFormData({...formData, sku: e.target.value})}
                        placeholder="Escanear..."
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={generateRandomSku}
                      className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md border border-slate-200 transition-colors"
                      title="Generar código aleatorio"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  {isAddingCategory ? (
                     <div className="flex gap-2">
                       <input 
                        autoFocus
                        type="text" 
                        className="flex-1 border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                        value={newCategoryName} 
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="Nueva categoría..."
                      />
                      <button 
                        type="button"
                        onClick={handleSaveCategory}
                        className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                        title="Guardar Categoría"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="p-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                     </div>
                  ) : (
                    <div className="flex gap-2">
                      <select 
                        required 
                        className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="" disabled>Seleccionar...</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md border border-slate-200 transition-colors"
                        title="Nueva Categoría"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Costo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400">$</span>
                      <input required type="number" step="0.01" className="w-full pl-6 border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                        value={formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400">$</span>
                      <input required type="number" step="0.01" className="w-full pl-6 border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                        value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Stock Actual</label>
                    <input required type="number" className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                      value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min. Stock</label>
                    <input required type="number" className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                      value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} />
                  </div>
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
    </div>
  );
};

export default Inventory;