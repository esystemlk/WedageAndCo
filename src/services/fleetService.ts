import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'fleet';

export interface VehicleOwnerDetails {
  ownerName: string;
  ownerAddress: string;
  ownerNicBr: string;
  ownershipType: string;
  paymentModel: string;
  agreementStart: string;
  agreementEnd: string;
  paymentRate: number;
  bankDetails: string;
  contractPdfUrl?: string;
  handoverConditionReport?: string;
}

export interface Vehicle {
  id?: string;
  plateNo: string;
  type: 'freezer-truck' | 'dry-truck' | 'lorry' | 'other';
  make?: string;
  model?: string;
  chassisNo?: string;
  engineNo?: string;
  fuelType: 'diesel' | 'petrol';
  status: 'active' | 'maintenance' | 'unavailable';
  ownership: 'owned' | 'rented';

  // New fields
  dateOfManufacture?: string;
  dateOfRegistration?: string;
  countryOfOrigin?: string;

  // Vehicle images
  vehicleImages?: string[];

  // Dimensions
  length?: number;
  width?: number;
  height?: number;
  weightCapacity?: number;

  // Owner details (when rented)
  ownerDetails?: VehicleOwnerDetails;
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
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created vehicle: ${data.plateNo}`);
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
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated vehicle: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteVehicle = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted vehicle`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
