import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'suppliers';

export interface AdditionalContact {
  name: string;
  phone: string;
  email?: string;
  role?: string;
}

export interface Supplier {
  id?: string;
  name: string;
  nickname?: string;
  contactName?: string;
  email: string;
  phone: string;
  additionalPhones?: string[];
  businessEmails?: string[];
  brNo?: string;
  vatNo?: string;
  supplyCategories?: string[];
  description?: string;
  additionalContacts?: AdditionalContact[];

  // Extended vendor management fields
  status?: 'active' | 'pending' | 'blacklisted' | 'inactive';
  rating?: number;           // 1–5
  contractStart?: string;    // YYYY-MM-DD
  contractExpiry?: string;   // YYYY-MM-DD
  paymentTerms?: string;     // e.g. Net 30
  creditLimit?: number;      // LKR
  address?: string;
  website?: string;
  taxId?: string;
  onTimeDeliveryRate?: number; // 0–100
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const getSuppliers = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const getSupplier = async (id: string) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Supplier;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
  }
};

export const createSupplier = async (data: Omit<Supplier, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created supplier: ${data.name}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateSupplier = async (id: string, data: Partial<Supplier>) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated supplier: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteSupplier = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted supplier`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
