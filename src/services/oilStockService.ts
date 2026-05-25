import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';
import { adjustInventoryStock } from './inventoryService';

export interface OilTransaction {
  id?: string;
  date: string;
  vehicleNo: string;
  driverName: string;
  issuingOfficer: string;
  oilType: string;
  oilGrade?: string;
  stockItemId: string;
  itemName: string;
  openingStockL: number;
  quantityIssuedMl: number;
  quantityIssuedL: number;
  closingStockL: number;
  meterReading: number;
  technicians: Array<{ name: string; staffId?: string }>;
  checkedByManager: boolean;
  managerName?: string;
  remarks?: string;
  createdAt?: any;
}

const COLLECTION = 'oil_transactions';

export const createOilTransaction = async (
  data: Omit<OilTransaction, 'id' | 'createdAt'>,
  updatedBy: string
) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: serverTimestamp()
    });
    if (data.stockItemId && data.quantityIssuedL > 0) {
      await adjustInventoryStock(data.stockItemId, -data.quantityIssuedL, updatedBy, data.date);
    }
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id,
      `Oil issued to ${data.vehicleNo}: ${data.quantityIssuedL}L ${data.oilType}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const getOilTransactions = async (): Promise<OilTransaction[]> => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as OilTransaction[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const getOilTransaction = async (id: string): Promise<OilTransaction | null> => {
  try {
    const snapshot = await getDoc(doc(db, COLLECTION, id));
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as OilTransaction;
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
    return null;
  }
};

export const updateOilTransaction = async (id: string, data: Partial<OilTransaction>) => {
  try {
    await updateDoc(doc(db, COLLECTION, id), { ...data });
    await recordChange(OperationType.UPDATE, COLLECTION, id, 'Updated oil transaction');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteOilTransaction = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, 'Deleted oil transaction');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
