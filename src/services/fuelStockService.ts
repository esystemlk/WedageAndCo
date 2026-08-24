import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';
import { adjustInventoryStock } from './inventoryService';
import type { FuelType } from '../config/fuelTypes';

/**
 * Firestore rejects any `undefined` field value. The fuel form leaves several
 * optional fields undefined (litresPerKm, fuelCostPerL, quantityIssuedUnits on
 * outside purchases, etc.) — writing them directly throws
 * "Unsupported field value: undefined". Strip them out recursively.
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

export interface FuelTransaction {
  id?: string;
  date: string;
  time: string;
  vehicleNo: string;
  driverName: string;
  location: string;
  issuingOfficer: string;
  fuelType: FuelType;
  vehiclePrevMeterReading: number;
  vehicleCurrentMeterReading: number;
  kmDriven: number;
  tankMeterReadingBefore: number;
  quantityIssuedL: number;
  quantityIssuedUnits?: number;
  unitType?: string;
  litresPerUnit?: number;
  tankBalanceAfterL: number;
  litresPerKm?: number;
  stockItemId: string;
  itemName: string;
  notes?: string;
  createdAt?: any;
}

const COLLECTION = 'fuel_transactions';

export const createFuelTransaction = async (
  data: Omit<FuelTransaction, 'id' | 'createdAt'>,
  updatedBy: string
) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...stripUndefined(data),
      createdAt: serverTimestamp()
    });
    // Inventory is tracked in stock units; deduct in units (fall back to litres for legacy/plain-litre tanks).
    const deductUnits = data.quantityIssuedUnits ?? data.quantityIssuedL;
    if (data.stockItemId && deductUnits > 0) {
      await adjustInventoryStock(data.stockItemId, -deductUnits, updatedBy, data.date);
    }
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id,
      `Fuel issued to ${data.vehicleNo}: ${data.quantityIssuedL}L (${data.fuelType})`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const getFuelTransactions = async (): Promise<FuelTransaction[]> => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FuelTransaction[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const getFuelTransaction = async (id: string): Promise<FuelTransaction | null> => {
  try {
    const snapshot = await getDoc(doc(db, COLLECTION, id));
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as FuelTransaction;
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
    return null;
  }
};

export const updateFuelTransaction = async (id: string, data: Partial<FuelTransaction>) => {
  try {
    await updateDoc(doc(db, COLLECTION, id), { ...stripUndefined(data) });
    await recordChange(OperationType.UPDATE, COLLECTION, id, 'Updated fuel transaction');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteFuelTransaction = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, 'Deleted fuel transaction');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
