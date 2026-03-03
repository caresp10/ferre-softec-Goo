import { auth, db, firebaseConfig } from "../firebaseConfig";
import { initializeApp, deleteApp } from "firebase/app";
import { 
  getAuth,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
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
  where,
  runTransaction,
  writeBatch
} from "firebase/firestore";
import { Tenant, Product, Customer, Sale, Category, SubscriptionPlan, SUBSCRIPTION_PLANS, InvoiceConfig, AppUser, UserPermissions } from "../types";

// --- CONSTANTS & HELPERS ---
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();

const getSuperAdminTenant = (user: User): { tenant: Tenant, user: AppUser } => {
  const adminTenant: Tenant = {
    id: user.uid,
    name: 'Super Administrator',
    email: SUPER_ADMIN_EMAIL,
    password: '', // No almacenar passwords en Firestore
    plan: 'ENTERPRISE',
    createdAt: new Date().toISOString(),
    isActive: true,
    isAdmin: true 
  };
  const adminUser: AppUser = { uid: user.uid, email: SUPER_ADMIN_EMAIL, name: 'Super Admin', role: 'OWNER', tenantId: 'admin' };
  return { tenant: adminTenant, user: adminUser };
};

// --- AUTHENTICATION & USERS ---

export const observeAuthState = (callback: (tenant: Tenant | null, userRole?: AppUser | null) => void) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // 1. SUPER ADMIN CHECK
      if (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
        const { tenant, user: appUser } = getSuperAdminTenant(user);
        callback(tenant, appUser);
        return;
      }

      // 2. Check App Users Collection
      const userDocRef = doc(db, "app_users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const appUser = userDocSnap.data() as AppUser;
        const tenantDocRef = doc(db, "tenants", appUser.tenantId);
        const tenantDocSnap = await getDoc(tenantDocRef);

        if (tenantDocSnap.exists()) {
          callback({ id: tenantDocSnap.id, ...tenantDocSnap.data() } as Tenant, appUser);
        } else {
           callback(null);
        }
      } else {
        // 3. Legacy/Owner Fallback
        const docRef = doc(db, "tenants", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const tenantData = { id: docSnap.id, ...docSnap.data() } as Tenant;
          const implicitOwnerUser: AppUser = {
             uid: user.uid,
             email: user.email!,
             name: tenantData.name,
             role: 'OWNER',
             tenantId: user.uid,
             // Permisos por defecto para el dueño (todo habilitado)
             permissions: {
                canSell: true, canManageInventory: true, canAdjustStock: true, 
                canTransferStock: true, canSeeReports: true, canManageClients: true
             }
          };
          // Auto-heal: Create the missing user doc for future logins
          // Nota: Esto puede fallar si las reglas son muy estrictas, pero intentamos
          try {
             await setDoc(doc(db, "app_users", user.uid), implicitOwnerUser);
          } catch (e) {
             console.warn("Could not auto-create app_user doc", e);
          }
          
          callback(tenantData, implicitOwnerUser);
        } else {
          callback(null);
        }
      }
    } else {
      callback(null);
    }
  });
};

export const loginUser = async (email: string, pass: string): Promise<{tenant: Tenant, user: AppUser}> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  // 1. SUPER ADMIN CHECK (usando la variable de entorno)
  if (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return getSuperAdminTenant(user);
  }

  // 2. Normal User Logic
  const userDocRef = doc(db, "app_users", user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
     const appUser = userDocSnap.data() as AppUser;
     const tenantRef = doc(db, "tenants", appUser.tenantId);
     const tenantSnap = await getDoc(tenantRef);
     if (!tenantSnap.exists()) throw new Error("Error de integridad: Empresa no encontrada");
     return { tenant: { id: tenantSnap.id, ...tenantSnap.data() } as Tenant, user: appUser };
  }

  // 3. Legacy/Owner Fallback con Auto-Heal (consistente con observeAuthState)
  const docRef = doc(db, "tenants", user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
     const tenant = { id: docSnap.id, ...docSnap.data() } as Tenant;
     const ownerUser: AppUser = { uid: user.uid, email: user.email!, name: tenant.name, role: 'OWNER', tenantId: tenant.id, permissions: { canSell: true, canManageInventory: true, canAdjustStock: true, canTransferStock: true, canSeeReports: true, canManageClients: true } };
     // Auto-heal: Crea el documento de usuario que falta para futuros inicios de sesión
     await setDoc(doc(db, "app_users", user.uid), ownerUser).catch(e => console.warn("Could not auto-create app_user doc on login", e));
     return { tenant, user: ownerUser };
  }

  throw new Error("Usuario no encontrado");
};

// --- STAFF MANAGEMENT ---

export const createStaffUser = async (tenantId: string, userData: { email: string, password: string, name: string, role: 'MANAGER' | 'CASHIER', branchId?: string, permissions?: UserPermissions }) => {
  // 1. Crear app secundaria para crear usuario Auth sin desloguear al actual
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // 2. Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, userData.password);
    const uid = userCredential.user.uid;
    
    const appUser: AppUser = {
      uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      tenantId: tenantId, // Vinculamos al tenant del dueño
      branchId: userData.branchId,
      permissions: userData.permissions
    };

    // 3. Guardar en Firestore (Usando la instancia 'db' principal, que tiene la sesión del Dueño autenticado)
    // Las reglas de seguridad deben permitir esto.
    await setDoc(doc(db, "app_users", uid), appUser);

    await signOut(secondaryAuth);
    return appUser;
  } catch (error: any) {
    console.error("Error creando staff:", error);
    if (error.code === 'permission-denied') {
      throw new Error("No tienes permisos para crear usuarios. Contacta al soporte.");
    }
    throw error;
  } finally {
    await deleteApp(secondaryApp);
  }
};

// ... (Resto del archivo idéntico, solo asegúrate de copiar las funciones de admin y planes) ...

export const subscribeToStaff = (tenantId: string, callback: (users: AppUser[]) => void) => {
  const q = query(collection(db, "app_users"), where("tenantId", "==", tenantId));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data() as AppUser);
    callback(users);
  });
};

export const deleteStaffUser = async (uid: string) => {
   // TODO: Esto solo borra el documento de Firestore. El usuario de Firebase Auth sigue existiendo.
   // Para una eliminación completa, se necesita una Cloud Function que elimine el usuario de Auth.
   await deleteDoc(doc(db, "app_users", uid));
};

export const subscribeToAllTenants = (callback: (data: Tenant[]) => void) => {
  return onSnapshot(collection(db, "tenants"), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
    callback(data);
  }, (error) => {
    console.error("Error al suscribirse a tenants:", error);
  });
};

export const updateTenantStatus = async (tenantId: string, isActive: boolean) => {
  await updateDoc(doc(db, "tenants", tenantId), { isActive });
};

export const subscribeToPlans = (callback: (plans: SubscriptionPlan[]) => void) => {
  const q = query(collection(db, "plans"));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      const batch = writeBatch(db);
      SUBSCRIPTION_PLANS.forEach(plan => {
        const docRef = doc(db, "plans", plan.id);
        batch.set(docRef, plan);
      });
      batch.commit().catch(console.error);
      return;
    }
    const plans = snapshot.docs.map(doc => doc.data() as SubscriptionPlan);
    plans.sort((a, b) => {
      if (a.id === 'FREE') return -1;
      if (b.id === 'FREE') return 1;
      return a.price - b.price;
    });
    callback(plans);
  });
};

export const updatePlan = async (plan: SubscriptionPlan) => {
  await setDoc(doc(db, "plans", plan.id), plan);
};

export const createPlan = async (plan: Omit<SubscriptionPlan, 'id'>) => {
  const id = plan.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  await setDoc(doc(db, "plans", id), { ...plan, id });
};

export const deletePlan = async (planId: string) => {
  await deleteDoc(doc(db, "plans", planId));
};

// ... (Resto de funciones CRUD de productos, ventas, etc.)
// Re-exportamos todo para que no falte nada

export const getInvoiceConfig = async (tenantId: string): Promise<InvoiceConfig | null> => {
  const docRef = doc(db, "tenants", tenantId, "settings", "invoice");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as InvoiceConfig;
  }
  return null;
};

export const saveInvoiceConfig = async (tenantId: string, config: InvoiceConfig) => {
  const docRef = doc(db, "tenants", tenantId, "settings", "invoice");
  await setDoc(docRef, config);
};

export const subscribeToInvoiceConfig = (tenantId: string, callback: (config: InvoiceConfig | null) => void) => {
  const docRef = doc(db, "tenants", tenantId, "settings", "invoice");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as InvoiceConfig);
    } else {
      callback(null);
    }
  });
};

const getCollectionRef = (tenantId: string, collectionName: string) => {
  return collection(db, "tenants", tenantId, collectionName);
};

export const subscribeToProducts = (tenantId: string, callback: (data: Product[]) => void) => {
  const q = query(getCollectionRef(tenantId, "products"));
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      if (data.stock !== undefined && !data.stocks) {
        data.stocks = { 'default': data.stock };
      }
      return { id: doc.id, ...data } as Product;
    });
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
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(data);
  });
};

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

export const adminCreateTenant = async (tenant: Tenant): Promise<void> => {
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, tenant.email, tenant.password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "tenants", uid), {
      name: tenant.name,
      email: tenant.email,
      plan: tenant.plan,
      createdAt: tenant.createdAt,
      isActive: tenant.isActive,
      password: tenant.password
    });

    const appUser: AppUser = {
      uid,
      email: tenant.email,
      name: tenant.name,
      role: 'OWNER',
      tenantId: uid
    };
    await setDoc(doc(db, "app_users", uid), appUser);

    await signOut(secondaryAuth);
  } catch (error) {
    throw error;
  } finally {
    await deleteApp(secondaryApp);
  }
};

export const updateTenant = async (tenantId: string, data: Partial<Tenant>) => {
  const docRef = doc(db, "tenants", tenantId);
  const { id, isAdmin, ...updateData } = data as any;
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
  await updateDoc(docRef, updateData);
};

export const transferStock = async (tenantId: string, productId: string, fromBranch: string, toBranch: string, quantity: number) => {
    const productRef = doc(db, "tenants", tenantId, "products", productId);
    await runTransaction(db, async (transaction) => {
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists()) throw new Error("Producto no encontrado");
      const product = productSnap.data() as Product;
      const stocks = product.stocks || {};
      const currentSourceStock = stocks[fromBranch] || 0;
      if (currentSourceStock < quantity) throw new Error("Stock insuficiente");
      const newStocks = { ...stocks };
      newStocks[fromBranch] = currentSourceStock - quantity;
      newStocks[toBranch] = (newStocks[toBranch] || 0) + quantity;
      transaction.update(productRef, { stocks: newStocks });
    });
};