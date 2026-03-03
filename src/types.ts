export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stocks: { [branchId: string]: number };
  minStock: number;
  description?: string;
  sku: string;
  taxRate: 10 | 5;
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
  taxId: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface EmissionPoint {
  id: string;
  code: string;
  name: string;
  currentInvoiceNumber: number;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  emissionPoints: EmissionPoint[];
}

export interface InvoiceConfig {
  commerceName: string;
  legalName: string;
  ruc: string;
  address: string;
  phone: string;
  timbrado: string;
  validityStart: string;
  validityEnd: string;
  branchCode: string;
  expeditionPoint: string;
  currentInvoiceNumber: number;
  branches: Branch[];
}

export interface SessionContext {
  branchId: string;
  branchName: string;
  emissionPointId: string;
  emissionPointCode: string;
  emissionPointName: string;
}

export interface Sale {
  id: string;
  invoiceNumber?: string;
  date: string;
  customerId: string | null;
  customerName: string;
  customerTaxId?: string;
  items: CartItem[];
  subtotal: number;
  tax10: number;
  tax5: number;
  total: number;
  commerceSnapshot?: InvoiceConfig;
  branchSnapshot?: Branch;
  emissionPointSnapshot?: EmissionPoint;
  soldBy?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
}

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

// NUEVO: Permisos granulares
export interface UserPermissions {
  canSell: boolean;          // Acceso al POS
  canManageInventory: boolean; // Crear/Editar productos
  canAdjustStock: boolean;   // Cargar stock manual
  canTransferStock: boolean; // Mover entre depósitos
  canSeeReports: boolean;    // Ver Dashboard
  canManageClients: boolean; // Crear clientes
}

export interface AppUser {
  uid: string;
  email: string;
  tenantId: string;
  role: UserRole;
  branchId?: string; // Sucursal asignada (Obligatorio si no es Owner)
  name: string;
  permissions?: UserPermissions; // Permisos específicos
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  password: string;
  plan: string; // Permitir cualquier ID de plan
  createdAt: string;
  isActive: boolean;
  isAdmin?: boolean;
}

export interface SubscriptionPlan {
  id: string; // Permitir cualquier ID de plan
  name: string;
  price: number;
  features: string[];
  maxProducts: number;
  maxBranches: number;
  maxPointsPerBranch: number;
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
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS'
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Plan Inicial',
    price: 0,
    maxProducts: 50,
    maxBranches: 1,
    maxPointsPerBranch: 1,
    supportLevel: 'Comunidad',
    features: ['Punto de Venta Básico', 'Control de Stock Limitado', '1 Usuario', 'Solo Casa Central']
  },
  {
    id: 'PRO',
    name: 'Plan Profesional',
    price: 150000,
    maxProducts: 1000,
    maxBranches: 1,
    maxPointsPerBranch: 2,
    supportLevel: 'Email Prioritario',
    features: ['Punto de Venta Avanzado', 'Facturación Electrónica', 'Reportes con IA', 'Multi-usuario', 'Hasta 2 Cajas']
  },
  {
    id: 'ENTERPRISE',
    name: 'Plan Empresarial',
    price: 450000,
    maxProducts: 10000,
    maxBranches: 999,
    maxPointsPerBranch: 999,
    supportLevel: '24/7 Dedicado',
    features: ['Todo ilimitado', 'API Access', 'Soporte Multi-sucursal', 'Personalización de Marca', 'Sucursales Ilimitadas']
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

export const calculateTotalStock = (product: Product): number => {
  if (!product.stocks) return (product as any).stock || 0;
  return Object.values(product.stocks).reduce((a, b) => a + b, 0);
};

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', sku: 'HAM-001', name: 'Martillo de Uña 16oz', category: 'Herramientas Manuales', price: 45000, cost: 25000, stocks: {'default': 25}, minStock: 5, description: 'Martillo resistente con mango de fibra de vidrio.', taxRate: 10 },
  { id: '2', sku: 'DRI-050', name: 'Taladro Percutor 650W', category: 'Herramientas Eléctricas', price: 350000, cost: 210000, stocks: {'default': 8}, minStock: 2, description: 'Taladro profesional con velocidad variable.', taxRate: 10 },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Cliente General', email: 'ventas@ferreteria.com', phone: '000-0000', address: 'Local', taxId: '44444401-7' },
];