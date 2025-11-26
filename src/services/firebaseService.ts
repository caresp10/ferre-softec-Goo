
import { auth, db } from "../firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  UserCredential 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from "firebase/firestore";
import { Tenant, Product, Customer, Sale, Category, TenantInvoice } from "../types";

// --- AUTHENTICATION ---

export const loginUser = async (email: string, pass: string): Promise<Tenant> => {
  // Check for hardcoded super admin first (optional, or move admin to firebase too)
  if (email === 'admin@softec.com' && pass === 'admin123') {
     return {
        id: 'admin-master',
        name: 'Super Administrator',
        email: 'admin@softec.com',
        password: '',
        plan: 'ENTERPRISE',
        createdAt: new Date().toISOString(),
        isActive: true,
        isAdmin: true
      };
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  // Get extra user details from 'tenants' collection
  const docRef = doc(db, "tenants", userCredential.user.uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Tenant;
  } else {
    throw new Error("Usuario no encontrado en la base de datos.");
  }
};

export const registerTenant = async (tenant: Tenant): Promise<Tenant> => {
  const userCredential = await createUserWithEmailAndPassword(auth, tenant.email, tenant.password);
  const uid = userCredential.user.uid;
  
  const newTenant = { ...tenant, id: uid };
  // Save extra data to Firestore
  await setDoc(doc(db, "tenants", uid), {
    name: tenant.name,
    email: tenant.email,
    plan: tenant.plan,
    createdAt: tenant.createdAt,
    isActive: tenant.isActive
  });
  
  return newTenant;
};

export const logoutUser = async () => {
  await signOut(auth);
};

// --- FIRESTORE REAL-TIME SUBSCRIPTIONS ---

// Helper to get subcollection ref: tenants/{tenantId}/{collectionName}
const getCollectionRef = (tenantId: string, collectionName: string) => {
  return collection(db, "tenants", tenantId, collectionName);
};

export const subscribeToProducts = (tenantId: string, callback: (data: Product[]) => void) => {
  const q = query(getCollectionRef(tenantId, "products"));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    callback(products);
  });
};

export const subscribeToCategories = (tenantId: string, callback: (data: Category[]) => void) => {
  const q = query(getCollectionRef(tenantId, "categories"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    callback(data);
  });
};

export const subscribeToCustomers = (tenantId: string, callback: (data: Customer[]) => void) => {
  const q = query(getCollectionRef(tenantId, "customers"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    callback(data);
  });
};

export const subscribeToSales = (tenantId: string, callback: (data: Sale[]) => void) => {
  const q = query(getCollectionRef(tenantId, "sales"));
  return onSnapshot(q, (snapshot) => {
    // Sort by date desc in JS (or add index in Firebase)
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(data);
  });
};

// --- DATA MANIPULATION ---

export const addData = async (tenantId: string, collectionName: string, data: any) => {
  const id = data.id || crypto.randomUUID();
  await setDoc(doc(db, "tenants", tenantId, collectionName, id), { ...data, id });
};

export const updateData = async (tenantId: string, collectionName: string, data: any) => {
  if (!data.id) return;
  const docRef = doc(db, "tenants", tenantId, collectionName, data.id);
  await updateDoc(docRef, data);
};

export const deleteData = async (tenantId: string, collectionName: string, id: string) => {
  await deleteDoc(doc(db, "tenants", tenantId, collectionName, id));
};

// --- ADMIN FUNCTIONS ---
export const subscribeToAllTenants = (callback: (data: Tenant[]) => void) => {
  return onSnapshot(collection(db, "tenants"), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
    callback(data);
  });
};

export const updateTenantStatus = async (tenantId: string, isActive: boolean) => {
  await updateDoc(doc(db, "tenants", tenantId), { isActive });
};