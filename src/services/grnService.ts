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

const COLLECTION = 'grns';

export interface GRNItem {
  description: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  variance: number;
  unitPrice?: number;
  totalValue?: number;
}

export interface GRN {
  id?: string;
  grnNo: string;
  date: string;
  supplierName: string;
  supplierInvoiceNo?: string;
  purchaseOrderRef?: string; // Po number or ID
  deliveryNoteNo?: string;
  receivedBy: string;
  vehicleUsed?: string;
  warehouseLocation?: string;
  deliveryAddress?: string;
  items: GRNItem[];
  conditionOfGoods?: 'Good' | 'Damaged' | 'Partial' | 'Rejected';
  voucherNo?: string;
  invoiceNo?: string;
  remarks?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const getGRNs = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GRN));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const createGRN = async (data: Omit<GRN, 'id'>) => {
  try {
    const grnNo = `GRN-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      grnNo,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created GRN ${grnNo}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateGRN = async (id: string, data: Partial<GRN>) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated GRN fields: ${Object.keys(data).join(', ')}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteGRN = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted GRN`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
