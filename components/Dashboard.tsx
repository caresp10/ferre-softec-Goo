import React, { useEffect, useState } from 'react';
import { Product, Sale } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Package, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { analyzeSalesTrends } from '../services/geminiService';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, sales }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // KPIs
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSalesCount = sales.length;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  
  // Chart Data Preparation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const salesData = last7Days.map(date => {
    const daySales = sales.filter(s => s.date.startsWith(date));
    return {
      name: date.slice(5), // MM-DD
      total: daySales.reduce((sum, s) => sum + s.total, 0)
    };
  });

  const getAiInsights = async () => {
    if (sales.length === 0) return;
    setLoadingAi(true);
    const summary = `Total ventas: $${totalRevenue}. Productos bajo stock: ${lowStockCount}. Ventas totales conteo: ${totalSalesCount}.`;
    const analysis = await analyzeSalesTrends(summary);
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  useEffect(() => {
    // Auto-load AI analysis on mount if data exists
    if (sales.length > 0 && !aiAnalysis) {
      getAiInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Panel de Control</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Ingresos Totales</p>
            <p className="text-2xl font-bold text-slate-800">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Ventas Realizadas</p>
            <p className="text-2xl font-bold text-slate-800">{totalSalesCount}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Productos en Stock</p>
            <p className="text-2xl font-bold text-slate-800">{products.length}</p>
          </div>
          <div className="p-3 bg-indigo-100 rounded-full">
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Bajo Stock</p>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lowStockCount}</p>
          </div>
          <div className={`p-3 rounded-full ${lowStockCount > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
            <AlertTriangle className={`w-6 h-6 ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-500'}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Tendencia de Ventas (7 días)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl shadow-md text-white">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold">Gemini AI Insights</h3>
          </div>
          
          {loadingAi ? (
            <div className="animate-pulse space-y-3">
              <div className="h-2 bg-slate-600 rounded w-3/4"></div>
              <div className="h-2 bg-slate-600 rounded w-full"></div>
              <div className="h-2 bg-slate-600 rounded w-5/6"></div>
            </div>
          ) : aiAnalysis ? (
            <div className="text-sm text-slate-300 space-y-2 whitespace-pre-line leading-relaxed">
              {aiAnalysis}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No hay datos suficientes para análisis.</p>
          )}

          <button 
            onClick={getAiInsights}
            className="mt-6 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors border border-white/10"
          >
            Actualizar Análisis
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;