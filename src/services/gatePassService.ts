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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

export interface GatePass {
  id: string;
  gatePassNo: string;
  linkedLogSheetNo: string;
  date: string;
  vehicleNo: string;
  driverName: string;
  passengers?: string;
  timeOut: string;
  timeIn?: string;
  meterOut?: number;
  meterIn?: number;
  totalKm?: number;
  reason: string;
  securityOfficer: string;
  remarks?: string;
  status: 'Open' | 'Returned' | 'Cancelled';
  createdAt: Timestamp;
}

const COLLECTION_NAME = 'gate_passes';

export const createGatePass = async (data: Omit<GatePass, 'id' | 'createdAt' | 'gatePassNo'>) => {
  try {
    const gatePassNo = `GP-${Math.floor(1000 + Math.random() * 9000)}`; // Simple sequential-like ID for demo
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      gatePassNo,
      createdAt: serverTimestamp()
    });
    await recordChange(OperationType.CREATE, COLLECTION_NAME, docRef.id, `Created gate pass ${gatePassNo}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

export const getGatePasses = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GatePass[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
};

export const getGatePass = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as GatePass;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
  }
};

export const updateGatePass = async (id: string, data: Partial<GatePass>) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
    await recordChange(OperationType.UPDATE, COLLECTION_NAME, id, `Updated gate pass fields: ${Object.keys(data).join(', ')}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
};

export const deleteGatePass = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    await recordChange(OperationType.DELETE, COLLECTION_NAME, id, `Deleted gate pass`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};
