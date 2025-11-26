
import React, { useState, useMemo } from 'react';
import { Product, Customer, CartItem, Sale } from '../types';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, User, Barcode, Grid, ListOrdered } from 'lucide-react';

interface POSProps {
  products: Product[];
  customers: Customer[];
  onCompleteSale: (sale: Sale) => void;
}

type PosTab = 'CATALOG' | 'CART';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(amount);
};

const POS: React.FC<POSProps> = ({ products, customers, onCompleteSale }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('1');
  const [showReceipt, setShowReceipt] = useState<Sale | null>(null);
  
  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<PosTab>('CATALOG');

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.stock > 0 && 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= item.stock) return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const exactSkuMatch = products.find(p => p.sku === searchTerm && p.stock > 0);
      
      if (exactSkuMatch) {
        addToCart(exactSkuMatch);
        setSearchTerm('');
        return;
      }

      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchTerm('');
        return;
      }
    }
  };

  // Cálculo de totales con IVA Paraguay (Precio incluye IVA)
  // IVA 10% = Precio / 11
  // IVA 5% = Precio / 21
  const totals = useMemo(() => {
    let total = 0;
    let tax10 = 0;
    let tax5 = 0;

    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      
      if (item.taxRate === 10) {
        tax10 += itemTotal / 11;
      } else if (item.taxRate === 5) {
        tax5 += itemTotal / 21;
      }
    });

    const subtotal = total - tax10 - tax5; // Base imponible

    return { subtotal, tax10, tax5, total };
  }, [cart]);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const customer = customers.find(c => c.id === selectedCustomerId) || customers[0];
    const newSale: Sale = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: customer.name,
      items: [...cart],
      ...totals
    };

    onCompleteSale(newSale);
    setShowReceipt(newSale);
    setCart([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-2rem)]">
      
      {/* Mobile Tab Navigation */}
      <div className="flex lg:hidden bg-white border-b border-slate-200 mb-2">
        <button 
          onClick={() => setActiveTab('CATALOG')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'CATALOG' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}
        >
          <Grid className="w-4 h-4" /> Catálogo
        </button>
        <button 
          onClick={() => setActiveTab('CART')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${activeTab === 'CART' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}
        >
          <ShoppingCart className="w-4 h-4" /> Carrito
          {cartItemCount > 0 && (
            <span className="absolute top-2 right-8 lg:right-auto bg-orange-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* Product Catalog Area - Hidden on mobile if tab is CART */}
        <div className={`${activeTab === 'CATALOG' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 flex items-center gap-2">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                placeholder="Escanear o buscar..." 
                className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-base lg:text-lg transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-300">
                <Barcode className="w-6 h-6" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 bg-slate-50 content-start">
            {filteredProducts.map(product => (
              <button 
                key={product.id}
                onClick={() => {
                   addToCart(product);
                }}
                className="bg-white p-3 lg:p-4 rounded-xl shadow-sm border border-slate-100 hover:border-orange-400 hover:shadow-md transition-all text-left flex flex-col justify-between group h-36 lg:h-40 active:scale-95 duration-150"
              >
                <div>
                  <span className="text-[10px] lg:text-xs font-mono text-slate-400 block mb-1 flex items-center gap-1 truncate">
                    <Barcode className="w-3 h-3" /> {product.sku}
                  </span>
                  <h3 className="font-semibold text-slate-800 leading-tight line-clamp-2 mb-1 text-sm lg:text-base">{product.name}</h3>
                  <p className="text-[10px] lg:text-xs text-slate-500 truncate">{product.category}</p>
                </div>
                <div className="mt-2 flex justify-between items-end">
                  <span className="text-base lg:text-lg font-bold text-orange-600">{formatCurrency(product.price)}</span>
                  <span className="text-[10px] lg:text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md group-hover:bg-orange-50 group-hover:text-orange-600">
                    Stock: {product.stock}
                  </span>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center text-slate-400 py-12">
                <Search className="w-12 h-12 mb-2 opacity-20" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>

        {/* Cart Area - Hidden on mobile if tab is CATALOG */}
        <div className={`${activeTab === 'CART' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex-col h-full`}>
          {/* Customer Selection */}
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-600">
              <User className="w-4 h-4" /> Cliente
            </div>
            <select 
              className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <ShoppingCart className="w-16 h-16 opacity-20" />
                <p>El carrito está vacío</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center group">
                  <div className="flex-1 mr-2">
                    <h4 className="font-medium text-slate-800 text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-slate-500">{formatCurrency(item.price)} unit.</p>
                  </div>
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-100 w-7 h-7 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                      <span className="px-1 text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-100 w-7 h-7 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="text-right min-w-[70px]">
                      <p className="font-bold text-slate-800 text-sm lg:text-base">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Action */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 mt-auto">
            <div className="space-y-2 mb-4">
               {/* En Paraguay el precio suele ser IVA Incluido en la vista general, pero podemos mostrar el desglose */}
               <div className="flex justify-between text-slate-500 text-xs">
                <span>Total Gravada (Base)</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-xs">
                <span>Liquidación IVA 10%</span>
                <span>{formatCurrency(totals.tax10)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-xs">
                <span>Liquidación IVA 5%</span>
                <span>{formatCurrency(totals.tax5)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-bold text-xl pt-2 border-t border-slate-200">
                <span>Total Gs.</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
            
            <button 
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 lg:py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              <CreditCard className="w-5 h-5" />
              Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal Overlay */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-none shadow-2xl overflow-hidden relative font-mono text-sm max-h-[90vh] overflow-y-auto">
            <div className="p-8 space-y-4">
              <div className="text-center border-b-2 border-dashed border-slate-300 pb-4">
                <h2 className="text-xl font-bold uppercase tracking-widest">Ferretería Pro</h2>
                <p className="text-slate-500 text-xs mt-1">Av. Las Herramientas 123</p>
                <p className="text-slate-500 text-xs">Tel: (555) 123-4567</p>
                <p className="text-slate-500 text-xs">RUC: 80000000-1</p>
              </div>

              <div className="space-y-1 text-xs">
                <p>Factura #: <span className="font-bold">{showReceipt.id.slice(0, 8)}</span></p>
                <p>Fecha: {new Date(showReceipt.date).toLocaleString()}</p>
                <p>Cliente: {showReceipt.customerName}</p>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="py-2">Cant</th>
                    <th className="py-2">Desc</th>
                    <th className="py-2 text-center">IVA</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {showReceipt.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2">{item.quantity}</td>
                      <td className="py-2 truncate max-w-[120px]">{item.name}</td>
                      <td className="py-2 text-center">{item.taxRate}%</td>
                      <td className="py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t-2 border-dashed border-slate-300 pt-4 space-y-1">
                 <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL Gs.</span>
                  <span>{formatCurrency(showReceipt.total)}</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 border-t border-slate-200 pt-2 mt-2">
                <p className="font-bold mb-1">Liquidación del IVA:</p>
                <div className="flex justify-between">
                   <span>Gravada 10%:</span>
                   <span>{formatCurrency(showReceipt.tax10)}</span>
                </div>
                <div className="flex justify-between">
                   <span>Gravada 5%:</span>
                   <span>{formatCurrency(showReceipt.tax5)}</span>
                </div>
                <div className="flex justify-between font-semibold mt-1">
                   <span>Total IVA:</span>
                   <span>{formatCurrency(showReceipt.tax10 + showReceipt.tax5)}</span>
                </div>
              </div>

              <div className="text-center pt-6 text-xs text-slate-400">
                <p>¡Gracias por su compra!</p>
              </div>
            </div>

            <button 
              onClick={() => setShowReceipt(null)}
              className="w-full bg-slate-800 text-white py-4 font-sans font-bold hover:bg-slate-900 transition-colors sticky bottom-0"
            >
              Cerrar / Imprimir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;