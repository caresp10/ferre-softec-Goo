
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  description?: string;
  sku: string;
  taxRate: 10 | 5; // IVA 10% o 5%
}

export interface Category {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string; // RUC, DNI, CUIT, etc.
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  date: string; // ISO String
  customerId: string | null;
  customerName: string;
  items: CartItem[];
  subtotal: number; // Gravada (Base imponible)
  tax10: number; // Liquidación IVA 10%
  tax5: number; // Liquidación IVA 5%
  total: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface Tenant {
  id: string;
  name: string; // Nombre de la ferretería
  email: string;
  password: string; // En una app real, esto sería un hash
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  createdAt: string;
  isActive: boolean; // Control de acceso
  isAdmin?: boolean; // Super Admin flag
}

export interface SubscriptionPlan {
  id: 'FREE' | 'PRO' | 'ENTERPRISE';
  name: string;
  price: number;
  features: string[];
  maxProducts: number;
  supportLevel: string;
}

export interface TenantInvoice {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  HISTORY = 'HISTORY'
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Plan Inicial',
    price: 0,
    maxProducts: 50,
    supportLevel: 'Comunidad',
    features: ['Punto de Venta Básico', 'Control de Stock Limitado', '1 Usuario']
  },
  {
    id: 'PRO',
    name: 'Plan Profesional',
    price: 150000,
    maxProducts: 1000,
    supportLevel: 'Email Prioritario',
    features: ['Punto de Venta Avanzado', 'Facturación Electrónica', 'Reportes con IA', 'Multi-usuario (hasta 3)']
  },
  {
    id: 'ENTERPRISE',
    name: 'Plan Empresarial',
    price: 450000,
    maxProducts: 10000,
    supportLevel: '24/7 Dedicado',
    features: ['Todo ilimitado', 'API Access', 'Soporte Multi-sucursal', 'Personalización de Marca']
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Herramientas Manuales' },
  { id: '2', name: 'Herramientas Eléctricas' },
  { id: '3', name: 'Fijaciones' },
  { id: '4', name: 'Pinturas' },
  { id: '5', name: 'Plomería' },
  { id: '6', name: 'Electricidad' },
  { id: '7', name: 'Jardinería' },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', sku: 'HAM-001', name: 'Martillo de Uña 16oz', category: 'Herramientas Manuales', price: 45000, cost: 25000, stock: 25, minStock: 5, description: 'Martillo resistente con mango de fibra de vidrio.', taxRate: 10 },
  { id: '2', sku: 'DRI-050', name: 'Taladro Percutor 650W', category: 'Herramientas Eléctricas', price: 350000, cost: 210000, stock: 8, minStock: 2, description: 'Taladro profesional con velocidad variable.', taxRate: 10 },
  { id: '3', sku: 'SCR-100', name: 'Tornillos para Madera 2"', category: 'Fijaciones', price: 150, cost: 50, stock: 5000, minStock: 1000, description: 'Precio unitario. Tornillos autoperforantes.', taxRate: 10 },
  { id: '4', sku: 'PNT-WHT', name: 'Pintura Blanca Mate 1GL', category: 'Pinturas', price: 85000, cost: 55000, stock: 12, minStock: 4, description: 'Pintura látex lavable de alto rendimiento.', taxRate: 10 },
  { id: '5', sku: 'SEM-001', name: 'Semillas de Pasto 1kg', category: 'Jardinería', price: 25000, cost: 15000, stock: 15, minStock: 3, description: 'Semillas para césped de alto tráfico.', taxRate: 5 },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Cliente General', email: 'ventas@ferreteria.com', phone: '000-0000', address: 'Local', taxId: '44444401-7' },
  { id: '2', name: 'Juan Pérez', email: 'juan@gmail.com', phone: '0981-123456', address: 'Av. Principal 123', taxId: '1234567-8' },
];