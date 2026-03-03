import React, { useState, useMemo, useEffect } from 'react';
import { Product, Customer, CartItem, Sale, InvoiceConfig, SessionContext } from '../types';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, User, Barcode, Grid, Store, AlertTriangle } from 'lucide-react';
import ReceiptModal from './ReceiptModal';

interface POSProps {
  products: Product[];
  customers: Customer[];
  invoiceConfig: InvoiceConfig | null;
  onCompleteSale: (sale: Sale) => void;
  sessionContext: SessionContext | null; // Nuevo prop
}

type PosTab = 'CATALOG' | 'CART';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(amount);
};

const POS: React.FC<POSProps> = ({ products, customers, invoiceConfig, onCompleteSale, sessionContext }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('1');
  const [showReceipt, setShowReceipt] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState<PosTab>('CATALOG');

  // Filtrar productos que tengan stock EN LA SUCURSAL ACTUAL
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Determinar stock disponible en la sucursal actual
      const currentBranchId = sessionContext?.branchId || 'default';
      const stock = p.stocks?.[currentBranchId] ?? (p as any).stock ?? 0;

      return stock > 0 && 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    });
  }, [products, searchTerm, sessionContext]);

  // Si no hay contexto seleccionado (Caja/Sucursal), bloqueamos el POS
  if (!sessionContext && invoiceConfig?.branches && invoiceConfig.branches.length > 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <Store className="w-16 h-16 text-orange-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Caja Cerrada</h2>
        <p className="max-w-md text-center mt-2">Por favor seleccione una <strong>Sucursal</strong> y <strong>Punto de Expedición (Caja)</strong> en la barra superior para comenzar a facturar.</p>
      </div>
    );
  }

  const addToCart = (product: Product) => {
    const currentBranchId = sessionContext?.branchId || 'default';
    const realStock = product.stocks?.[currentBranchId] ?? 0;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= realStock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    
    // Check stock again
    const product = products.find(p => p.id === id);
    const currentBranchId = sessionContext?.branchId || 'default';
    const realStock = product?.stocks?.[currentBranchId] ?? 0;

    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= realStock) return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Logic for barcode scanning (matches only available products in this branch)
      const exactSkuMatch = filteredProducts.find(p => p.sku === searchTerm);
      if (exactSkuMatch) {
        addToCart(exactSkuMatch);
        setSearchTerm('');
      }
    }
  };

  const totals = useMemo(() => {
    let total = 0;
    let tax10 = 0;
    let tax5 = 0;
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      if (item.taxRate === 10) tax10 += itemTotal / 11;
      else if (item.taxRate === 5) tax5 += itemTotal / 21;
    });
    return { subtotal: total - tax10 - tax5, tax10, tax5, total };
  }, [cart]);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const customer = customers.find(c => c.id === selectedCustomerId) || customers[0];
    
    // Generar Número de Factura usando el contexto
    // Formato: SSS-PPP-NNNNNNN
    const branchCode = sessionContext?.emissionPointCode ? invoiceConfig?.branches.find(b => b.id === sessionContext.branchId)?.code : '001';
    const pointCode = sessionContext?.emissionPointCode || '001';
    
    // Obtener el siguiente número. Lo ideal es leerlo de la config, pero aquí lo pasamos por el contexto o lo inferimos
    // Para simplificar, asumiremos que se actualiza en App.tsx al guardar
    
    const currentBranch = invoiceConfig?.branches.find(b => b.id === sessionContext?.branchId);
    const currentPoint = currentBranch?.emissionPoints.find(p => p.id === sessionContext?.emissionPointId);
    const nextNum = (currentPoint?.currentInvoiceNumber || 1);
    
    const invoiceNumber = `${branchCode}-${pointCode}-${nextNum.toString().padStart(7, '0')}`;

    const newSale: Sale = {
      id: crypto.randomUUID(),
      invoiceNumber,
      date: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: customer.name,
      customerTaxId: customer.taxId,
      items: [...cart],
      ...totals,
      branchSnapshot: currentBranch,
      emissionPointSnapshot: currentPoint,
      commerceSnapshot: invoiceConfig ? { ...invoiceConfig } : undefined
    };

    onCompleteSale(newSale);
    setShowReceipt(newSale);
    setCart([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-2rem)]">
      {/* ... (Mobile Tabs remain similar) ... */}
      <div className="flex lg:hidden bg-white border-b border-slate-200 mb-2">
        <button onClick={() => setActiveTab('CATALOG')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'CATALOG' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}>
          <Grid className="w-4 h-4" /> Catálogo
        </button>
        <button onClick={() => setActiveTab('CART')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${activeTab === 'CART' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}>
          <ShoppingCart className="w-4 h-4" /> Carrito ({cart.reduce((a,b)=>a+b.quantity,0)})
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Catalog */}
        <div className={`${activeTab === 'CATALOG' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden`}>
          <div className="p-4 border-b border-slate-100 flex gap-4 items-center">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5"/>
               <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown} />
             </div>
             {sessionContext && (
               <div className="text-xs text-right hidden md:block">
                 <p className="font-bold text-slate-700">{sessionContext.branchName}</p>
                 <p className="text-slate-500">{sessionContext.emissionPointName} ({sessionContext.emissionPointCode})</p>
               </div>
             )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start bg-slate-50">
            {filteredProducts.map(product => {
               // Mostrar stock de la sucursal actual
               const currentStock = product.stocks?.[sessionContext?.branchId || 'default'] || 0;
               return (
                <button key={product.id} onClick={() => addToCart(product)} className="bg-white p-3 rounded-xl shadow-sm border hover:border-orange-400 text-left flex flex-col justify-between h-36">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block mb-1">{product.sku}</span>
                    <h3 className="font-semibold text-slate-800 text-sm line-clamp-2">{product.name}</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-orange-600">{formatCurrency(product.price)}</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600">Stock: {currentStock}</span>
                  </div>
                </button>
            )})}
          </div>
        </div>

        {/* Cart */}
        <div className={`${activeTab === 'CART' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex-col`}>
           <div className="p-4 bg-slate-50 border-b">
             <div className="flex items-center gap-2 mb-2 text-sm font-medium"><User className="w-4 h-4"/> Cliente</div>
             <select className="w-full border rounded p-2" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
               {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {cart.map(item => (
               <div key={item.id} className="flex justify-between items-center">
                 <div className="flex-1">
                   <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                   <p className="text-xs text-slate-500">{formatCurrency(item.price)}</p>
                 </div>
                 <div className="flex items-center gap-2">
                   <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-slate-100 rounded"><Minus className="w-3 h-3"/></button>
                   <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                   <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-slate-100 rounded"><Plus className="w-3 h-3"/></button>
                   <button onClick={() => removeFromCart(item.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                 </div>
               </div>
             ))}
           </div>
           <div className="p-6 border-t bg-slate-50">
             <div className="flex justify-between font-bold text-xl mb-4">
               <span>Total</span>
               <span>{formatCurrency(totals.total)}</span>
             </div>
             <button disabled={cart.length === 0} onClick={handleCheckout} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 disabled:bg-slate-300 flex items-center justify-center gap-2">
               <CreditCard className="w-5 h-5"/> Cobrar
             </button>
           </div>
        </div>
      </div>

      {showReceipt && <ReceiptModal sale={showReceipt} onClose={() => setShowReceipt(null)} config={invoiceConfig} />}
    </div>
  );
};

export default POS;