import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const COLLECTION = 'logs';

export interface LogSheet {
  id?: string;
  logSheetCode: string;
  date: string;
  endDate?: string;
  customerId: string;
  vehicleId: string;
  driverId: string;
  helperId?: string;
  representative?: string;
  temporaryDriverName?: string;
  temporaryHelperName?: string;
  additionalHelpers?: string;

  // Meter Reading
  meterStatus: 'Working' | 'Not Working';
  startMileage?: number; // Odometer reading at departure (km)
  endMileage?: number;   // Odometer reading at return (km)
  totalKm: number;       // Manual or auto-calculated
  outTime: string;       // Departure time
  inTime?: string;       // Return time
  meterNonWorkingReason?: string;
  googleMapsKm?: number;
  totalHours?: number;

  // Freezer Section
  vehicleHasFreezer: boolean;
  freezerOnTime?: string;
  freezerOffTime?: string;
  freezerTotalHours?: string;
  freezerRemarks?: string;
  freezerStatus?: 'ON' | 'OFF';
  freezerMode?: 'Plus Cool' | 'Negative Temp' | 'Ambient' | 'Not Mentioned';

  // Status & Approval
  status: 'On Trip' | 'Completed' | 'Breakdown' | 'Cancelled';
  remarks?: string;
  breakdownReason?: string;
  cancelReason?: string;
  isApproved?: boolean;
  approvedBy?: string;
  enteredBy: string;

  createdAt?: any;
  updatedAt?: any;
}

export const getLogSheets = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogSheet));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const getLogSheet = async (id: string) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as LogSheet;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
  }
};

export const createLogSheet = async (data: Omit<LogSheet, 'id'>) => {
  try {
    const logSheetCode = data.logSheetCode || `LS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      logSheetCode,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateLogSheet = async (id: string, data: Partial<LogSheet>) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteLogSheet = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
