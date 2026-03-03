import React from 'react';
import { Sale, InvoiceConfig } from '../types';
import { Printer } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
  config?: InvoiceConfig | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(amount);
};

const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, config }) => {
  const handlePrint = () => {
    window.print();
  };

  // Prioridad de datos: 
  // 1. Snapshot histórico (si es reimpresión de venta antigua, usa los datos de ese momento)
  // 2. Config actual (si es venta nueva)
  // 3. Datos por defecto
  const commerceData = sale.commerceSnapshot || config || {
    commerceName: 'Mi Ferretería',
    legalName: 'Sin Razón Social',
    ruc: '80000000-1',
    address: 'Dirección Local',
    phone: '000-000',
    timbrado: '00000000',
    validityStart: '2024-01-01',
    validityEnd: '2024-12-31'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white w-full max-w-sm rounded-none shadow-2xl overflow-hidden relative font-mono text-sm max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:w-full print:max-w-none">
        
        <style>
          {`
            @media print {
              @page { margin: 0; size: auto; }
              body { background: white; }
              .no-print { display: none !important; }
              .print-container { padding: 20px; width: 100%; max-width: 80mm; margin: 0 auto; }
            }
          `}
        </style>

        <div className="p-8 space-y-4 print-container">
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-4">
            <h2 className="text-xl font-bold uppercase tracking-widest">{commerceData.commerceName}</h2>
            <p className="text-xs mt-1 font-bold">{commerceData.legalName}</p>
            <p className="text-slate-500 text-xs">{commerceData.address}</p>
            <p className="text-slate-500 text-xs">Tel: {commerceData.phone}</p>
            <p className="text-slate-500 text-xs font-bold">RUC: {commerceData.ruc}</p>
            
            <div className="mt-2 border-t border-dashed pt-2">
               <p className="text-xs">Timbrado: {commerceData.timbrado}</p>
               <p className="text-[10px]">Vigencia: {commerceData.validityStart} al {commerceData.validityEnd}</p>
            </div>
          </div>

          <div className="text-center bg-slate-100 py-1 border border-slate-200">
             <p className="text-[10px] font-bold text-slate-600 uppercase">Documento no válido como comprobante fiscal</p>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
               <p>Factura Nro:</p>
               <span className="font-bold">{sale.invoiceNumber}</span>
            </div>
            <p>Fecha: {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString()}</p>
            <div className="border-t border-dashed my-1"></div>
            <p>Cliente: {sale.customerName}</p>
            <p>RUC/CI: {sale.customerTaxId || 'X'}</p>
          </div>

          <table className="w-full text-left text-xs mt-2">
            <thead>
              <tr className="border-b border-slate-300">
                <th className="py-2">Cant</th>
                <th className="py-2">Desc</th>
                <th className="py-2 text-center">IVA</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 align-top">{item.quantity}</td>
                  <td className="py-2 truncate max-w-[120px] align-top">{item.name}</td>
                  <td className="py-2 text-center align-top">{item.taxRate}%</td>
                  <td className="py-2 text-right align-top">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-dashed border-slate-300 pt-4 space-y-1">
             <div className="flex justify-between font-bold text-lg">
              <span>TOTAL Gs.</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 border-t border-slate-200 pt-2 mt-2">
            <p className="font-bold mb-1">Liquidación del IVA:</p>
            <div className="flex justify-between">
               <span>Gravada 10%:</span>
               <span>{formatCurrency(sale.tax10)}</span>
            </div>
            <div className="flex justify-between">
               <span>Gravada 5%:</span>
               <span>{formatCurrency(sale.tax5)}</span>
            </div>
            <div className="flex justify-between font-semibold mt-1">
               <span>Total IVA:</span>
               <span>{formatCurrency(sale.tax10 + sale.tax5)}</span>
            </div>
          </div>

          <div className="text-center pt-6 text-xs text-slate-400">
            <p>¡Gracias por su compra!</p>
            <p className="mt-1 text-[10px]">Sistema Softec SaaS</p>
          </div>
        </div>

        <div className="flex no-print sticky bottom-0 border-t border-slate-200">
           <button onClick={onClose} className="flex-1 bg-white text-slate-700 py-4 font-bold hover:bg-slate-50 transition-colors border-r">Cerrar</button>
          <button onClick={handlePrint} className="flex-1 bg-slate-800 text-white py-4 font-bold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"><Printer className="w-4 h-4"/> Imprimir</button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;