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
  subtotal: number;
  tax: number;
  total: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  HISTORY = 'HISTORY'
}

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
  { id: '1', sku: 'HAM-001', name: 'Martillo de Uña 16oz', category: 'Herramientas Manuales', price: 15.50, cost: 8.00, stock: 25, minStock: 5, description: 'Martillo resistente con mango de fibra de vidrio.' },
  { id: '2', sku: 'DRI-050', name: 'Taladro Percutor 650W', category: 'Herramientas Eléctricas', price: 85.00, cost: 55.00, stock: 8, minStock: 2, description: 'Taladro profesional con velocidad variable.' },
  { id: '3', sku: 'SCR-100', name: 'Tornillos para Madera 2"', category: 'Fijaciones', price: 0.10, cost: 0.02, stock: 5000, minStock: 1000, description: 'Caja a granel de tornillos autoperforantes.' },
  { id: '4', sku: 'PNT-WHT', name: 'Pintura Blanca Mate 1GL', category: 'Pinturas', price: 22.00, cost: 14.00, stock: 12, minStock: 4, description: 'Pintura látex lavable de alto rendimiento.' },
  { id: '5', sku: 'PLY-001', name: 'Alicate Universal 8"', category: 'Herramientas Manuales', price: 12.00, cost: 6.50, stock: 15, minStock: 3, description: 'Acero al cromo vanadio.' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Cliente General', email: 'ventas@ferreteria.com', phone: '000-0000', address: 'Local', taxId: '00000000' },
  { id: '2', name: 'Juan Pérez', email: 'juan@gmail.com', phone: '555-0123', address: 'Av. Principal 123', taxId: '12345678' },
  { id: '3', name: 'Constructora S.A.', email: 'compras@constructora.com', phone: '555-9876', address: 'Zona Industrial Lote 5', taxId: '87654321' },
];