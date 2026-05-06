import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

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
    let q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    if (vehicleId) {
      q = query(collection(db, COLLECTION), where('vehicleId', '==', vehicleId), orderBy('date', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maintenance));
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
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateMaintenanceRecord = async (id: string, data: Partial<Maintenance>) => {
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

export const deleteMaintenanceRecord = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
