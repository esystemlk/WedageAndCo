import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'daily_updates';

/**
 * Firestore rejects any `undefined` field value. The daily-update form leaves
 * optional fields (helper ids, reasons, temporary names) as `undefined`/blank,
 * which would throw on save — so strip them out recursively before writing.
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

export interface DailyVehicleUpdate {
  id?: string;
  date: string;
  dayOfWeek: string;
  vehicleId: string;
  vehicleNo: string;
  permanentCrew?: string;
  actualDriverId: string;
  actualDriverName: string;
  actualHelperId?: string;
  actualHelperName?: string;
  temporaryDriverName?: string;
  temporaryHelperName?: string;
  additionalHelpers?: string;
  customerId?: string;
  customerName?: string;
  status: 'On Trip' | 'Breakdown' | 'Yard Parking' | 'Under Repair' | 'Personal Use' | 'Other';
  customerRoute?: string;
  meterReading?: number;
  fuelPumped?: number;
  breakdownReason?: string;
  vehicleSpecs?: string;
  remarks?: string;
  enteredBy: string;
  entryTime: any;
  createdAt: any;
}

export const getDailyUpdates = async (date?: string) => {
  try {
    // When filtering by date we use an equality-only query (auto-indexed) and
    // sort by entryTime in JS. Combining where('date','==') with
    // orderBy('entryTime') would require a composite index; sorting client-side
    // keeps this working without one.
    const q = date
      ? query(collection(db, COLLECTION), where('date', '==', date))
      : query(collection(db, COLLECTION), orderBy('entryTime', 'desc'));
    const snapshot = await getDocs(q);
    const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyVehicleUpdate));
    if (date) {
      rows.sort((a, b) => {
        const ta = (a.entryTime?.toMillis?.() ?? 0);
        const tb = (b.entryTime?.toMillis?.() ?? 0);
        return tb - ta;
      });
    }
    return rows;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const createDailyUpdate = async (data: Omit<DailyVehicleUpdate, 'id' | 'createdAt' | 'entryTime'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...stripUndefined(data),
      entryTime: Timestamp.now(),
      createdAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created daily update for ${data.vehicleNo}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

// Bulk-create daily updates (used to place many not-updated vehicles as Yard Parking at once)
export const createDailyUpdatesBulk = async (
  updates: Omit<DailyVehicleUpdate, 'id' | 'createdAt' | 'entryTime'>[]
) => {
  try {
    const now = Timestamp.now();
    const ids: string[] = [];
    for (const data of updates) {
      const docRef = await addDoc(collection(db, COLLECTION), {
        ...stripUndefined(data),
        entryTime: now,
        createdAt: now
      });
      ids.push(docRef.id);
    }
    await recordChange(
      OperationType.CREATE,
      COLLECTION,
      ids[0] || 'bulk',
      `Bulk-logged ${updates.length} vehicle(s) as ${updates[0]?.status || 'status'}`
    );
    return ids;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
    return [];
  }
};

export const deleteDailyUpdate = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted daily update`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};

