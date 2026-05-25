import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'job_cards';

export type JobCardStatus = 'open' | 'in-progress' | 'completed';

export interface JobCardStockItem {
  stockItemId?: string;
  itemName: string;
  quantity: number;
  unit?: string;
}

export interface JobCardOutsideItem {
  description: string;
  quantity: number;
  unit?: string;
  unitCost?: number;
}

export interface JobCard {
  id?: string;
  workOrderNo: string;
  date: string;
  time: string;
  vehicleId: string;
  vehicleNo: string;
  meterReading?: number;
  technicianName: string;
  estimatedHrs?: number;
  recentDriverName?: string;
  problemDescription: Array<{ text: string }>;
  itemsFromStock: JobCardStockItem[];
  itemsFromOutside: JobCardOutsideItem[];
  solutionDescription: Array<{ text: string }>;
  notes?: string;
  completeDate?: string;
  completeTime?: string;
  actualHrs?: number;
  preparedBy?: string;
  authorizedTechnician?: string;
  yardSupervisor?: string;
  headOfLogistic?: string;
  status: JobCardStatus;
  createdAt?: any;
}

export function generateWorkOrderNo(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `JC-${year}-${random}`;
}

export const createJobCard = async (data: Omit<JobCard, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: serverTimestamp()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id,
      `Job card ${data.workOrderNo} created for ${data.vehicleNo}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const getJobCards = async (): Promise<JobCard[]> => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as JobCard[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const getJobCard = async (id: string): Promise<JobCard | null> => {
  try {
    const snapshot = await getDoc(doc(db, COLLECTION, id));
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as JobCard;
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
    return null;
  }
};

export const updateJobCard = async (id: string, data: Partial<JobCard>) => {
  try {
    await updateDoc(doc(db, COLLECTION, id), { ...data });
    await recordChange(OperationType.UPDATE, COLLECTION, id, 'Updated job card');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteJobCard = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, 'Deleted job card');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
