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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

export interface VisitorLog {
  id?: string;
  logNo?: string;
  visitorName: string;
  organization?: string;
  visitorType: 'Business Partner' | 'Individual' | 'Vehicle Owner' | 'Other';
  nicNumber?: string;
  phone: string;
  vehicleNo?: string;
  vehicleType?: string;
  purpose: string;
  date: string;
  timeIn: string;
  timeOut?: string;
  hostName: string;
  status: 'On-site' | 'Checked Out';
  createdAt?: any;
}

const COLLECTION_NAME = 'visitor_logs';

export const createVisitorLog = async (data: Omit<VisitorLog, 'id' | 'logNo' | 'createdAt'>) => {
  try {
    const logNo = `VST-${Math.floor(10000 + Math.random() * 90000)}`;
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      logNo,
      createdAt: serverTimestamp()
    });
    await recordChange(OperationType.CREATE, COLLECTION_NAME, docRef.id, `Created visitor entry log ${logNo} for ${data.visitorName}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

export const getVisitorLogs = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VisitorLog[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
};

export const getVisitorLog = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as VisitorLog;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`);
  }
};

export const updateVisitorLog = async (id: string, data: Partial<VisitorLog>) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
    await recordChange(OperationType.UPDATE, COLLECTION_NAME, id, `Updated visitor log fields: ${Object.keys(data).join(', ')}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
};

export const deleteVisitorLog = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    await recordChange(OperationType.DELETE, COLLECTION_NAME, id, `Deleted visitor log`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};
