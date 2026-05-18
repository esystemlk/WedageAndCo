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
    let q = query(collection(db, COLLECTION), orderBy('entryTime', 'desc'));
    if (date) {
      q = query(collection(db, COLLECTION), where('date', '==', date), orderBy('entryTime', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyVehicleUpdate));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const createDailyUpdate = async (data: Omit<DailyVehicleUpdate, 'id' | 'createdAt' | 'entryTime'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      entryTime: Timestamp.now(),
      createdAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created daily update for ${data.vehicleNo}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
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

