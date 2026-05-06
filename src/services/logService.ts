import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const COLLECTION = 'logs';

export interface LogSheet {
  id?: string;
  vehicleId: string;
  driverId: string;
  helperId?: string;
  customerId: string;
  startMileage: number;
  endMileage?: number;
  startTime: string;
  endTime?: string;
  purpose?: string;
  status: 'on-trip' | 'completed';
  authorisedBy: string;
  createdAt?: any;
}

export const getLogSheets = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('startTime', 'desc'));
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
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
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
