import React, { useState } from 'react';
import { Tenant } from '../types';
import { Wrench, ArrowRight, Lock, Mail, Building2, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (tenant: Tenant) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Check for Super Admin Credential (Hardcoded for demo purposes)
    if (email === 'admin@softec.com' && password === 'admin123') {
      const adminUser: Tenant = {
        id: 'admin-master',
        name: 'Super Administrator',
        email: 'admin@softec.com',
        password: '',
        plan: 'ENTERPRISE',
        createdAt: new Date().toISOString(),
        isActive: true,
        isAdmin: true
      };
      onLogin(adminUser);
      return;
    }

    // 2. Regular Tenant Login
    const storedTenants = localStorage.getItem('saas_tenants');
    const tenants: Tenant[] = storedTenants ? JSON.parse(storedTenants) : [];

    const tenant = tenants.find(t => t.email.toLowerCase() === email.toLowerCase() && t.password === password);

    if (tenant) {
      if (tenant.isActive === false) {
        setError('Acceso denegado. Su suscripción ha sido suspendida. Contacte a soporte.');
      } else {
        onLogin(tenant);
      }
    } else {
      setError('Credenciales inválidas. Verifique su correo y contraseña.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const storedTenants = localStorage.getItem('saas_tenants');
    const tenants: Tenant[] = storedTenants ? JSON.parse(storedTenants) : [];

    if (tenants.find(t => t.email.toLowerCase() === email.toLowerCase())) {
      setError('Este correo electrónico ya está registrado.');
      return;
    }

    const newTenant: Tenant = {
      id: crypto.randomUUID(),
      name: storeName,
      email: email,
      password: password, // In a real app, hash this!
      plan: 'FREE',
      createdAt: new Date().toISOString(),
      isActive: true // Active by default on registration
    };

    const updatedTenants = [...tenants, newTenant];
    localStorage.setItem('saas_tenants', JSON.stringify(updatedTenants));

    onLogin(newTenant);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side - Brand & Info */}
        <div className="md:w-1/2 bg-slate-900 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Softec <span className="text-orange-500">SaaS</span></h1>
            </div>
            <h2 className="text-3xl font-bold leading-tight mb-4">
              Gestiona tu Ferretería de manera inteligente.
            </h2>
            <p className="text-slate-400 text-lg">
              Sistema integral de punto de venta, control de inventario y facturación diseñado para crecer con tu negocio.
            </p>
          </div>

          <div className="relative z-10 space-y-4 mt-8">
            <div className="flex items-center space-x-3 text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Multi-usuario y Multi-sucursal</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Facturación Electrónica Ready</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Análisis de ventas con IA</span>
            </div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-orange-600 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-8 text-center md:text-left">
            <h3 className="text-2xl font-bold text-slate-800">
              {isRegistering ? 'Crear Nueva Cuenta' : 'Bienvenido de nuevo'}
            </h3>
            <p className="text-slate-500 mt-2">
              {isRegistering 
                ? 'Comienza a gestionar tu negocio en minutos.' 
                : 'Ingresa tus credenciales para acceder al panel.'}
            </p>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Ferretería</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <input 
                    required 
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="Ej. Ferretería Central"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  required 
                  type="email" 
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  required 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 group"
            >
              {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500">
              {isRegistering ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}
              <button 
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="ml-2 text-orange-600 font-bold hover:underline"
              >
                {isRegistering ? 'Inicia Sesión' : 'Regístrate Gratis'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;