import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const COLLECTION = 'fleet';

export interface Vehicle {
  id?: string;
  plateNo: string;
  type: 'prime-mover' | 'lorry' | 'container' | 'other';
  make?: string;
  model?: string;
  chassisNo?: string;
  engineNo?: string;
  fuelType: 'diesel' | 'petrol';
  status: 'active' | 'maintenance' | 'unavailable';
  ownership: 'owned' | 'rented';
}

export const getVehicles = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('plateNo', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const getVehicle = async (id: string) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Vehicle;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
  }
};

export const createVehicle = async (data: Omit<Vehicle, 'id'>) => {
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

export const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
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

export const deleteVehicle = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
