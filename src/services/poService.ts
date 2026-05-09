import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp, 
  where,
  doc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'purchase_orders';

export interface POItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id?: string;
  poNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  supplierContact?: string;
  supplierAddress?: string;
  requestedBy: string;
  approvedBy?: string;
  approvalDate?: string;
  requiredDeliveryDate?: string;
  deliveryAddress: string;
  items: POItem[];
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  paymentTerms: string;
  status: 'Draft' | 'Sent' | 'Partially Received' | 'Fully Received' | 'Cancelled';
  linkedGRNs?: string[];
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const getPurchaseOrders = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const getPurchaseOrder = async (id: string) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PurchaseOrder;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
  }
};

export const createPurchaseOrder = async (data: Omit<PurchaseOrder, 'id'>) => {
  try {
    const poNumber = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      poNumber,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created PO ${poNumber}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updatePurchaseOrder = async (id: string, data: Partial<PurchaseOrder>) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated PO fields: ${Object.keys(data).join(', ')}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deletePurchaseOrder = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted Purchase Order`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
