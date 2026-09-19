import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';
import { stripUndefined } from '../lib/utils';

const COLLECTION = 'maintenance';

export interface Maintenance {
  id?: string;
  vehicleId: string;
  supplierId?: string;
  date: string;
  description: string;
  cost: number;
  partsReplaced?: string;
  billUrl?: string;
}

export const getMaintenanceRecords = async (vehicleId?: string) => {
  try {
    // Equality-only query when filtering by vehicle (auto-indexed), then sort
    // by date in JS — avoids needing a (vehicleId, date) composite index.
    const q = vehicleId
      ? query(collection(db, COLLECTION), where('vehicleId', '==', vehicleId))
      : query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maintenance));
    if (vehicleId) rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return rows;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const getMaintenanceRecord = async (id: string) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Maintenance;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
  }
};

export const createMaintenanceRecord = async (data: Omit<Maintenance, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...stripUndefined(data),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created maintenance record for vehicle ${data.vehicleId}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateMaintenanceRecord = async (id: string, data: Partial<Maintenance>) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...stripUndefined(data),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated maintenance record fields: ${Object.keys(data).join(', ')}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteMaintenanceRecord = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted maintenance record`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
