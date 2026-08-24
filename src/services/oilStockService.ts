import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';
import { adjustInventoryStock } from './inventoryService';

/**
 * Firestore rejects any `undefined` field value. The oil form leaves optional
 * fields undefined (managerName when unchecked, remarks, meterReading, etc.) —
 * writing them directly throws "Unsupported field value: undefined".
 */
const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(v => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp) && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
};

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
  quantityIssuedUnits?: number;
  unitType?: string;
  litresPerUnit?: number;
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
      ...stripUndefined(data),
      createdAt: serverTimestamp()
    });
    // Inventory is tracked in pack units, so deduct in units (fall back to litres for legacy records).
    const deductUnits = data.quantityIssuedUnits ?? data.quantityIssuedL;
    if (data.stockItemId && deductUnits > 0) {
      await adjustInventoryStock(data.stockItemId, -deductUnits, updatedBy, data.date);
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
    await updateDoc(doc(db, COLLECTION, id), { ...stripUndefined(data) });
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
