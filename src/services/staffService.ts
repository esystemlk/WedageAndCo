import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'staff';

export interface StaffMember {
  id?: string;
  fullName: string;
  category: 'Driver' | 'Helper' | 'Cleaner' | 'Office Staff' | 'Garage' | 'Security' | 'Management';
  phone: string;
  email?: string;
  nicNumber: string;
  licenseNo?: string;
  active: boolean;
  department: string;
  basicSalary?: number;
  bankAccountNo?: string;
  joinDate?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const getStaffMembers = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('fullName', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const getStaffMember = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) throw new Error('Staff member not found');
    return { id: snapshot.id, ...snapshot.data() } as StaffMember;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
  }
};

export const createStaffMember = async (data: Omit<StaffMember, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created staff: ${data.fullName}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateStaffMember = async (id: string, data: Partial<StaffMember>) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated staff: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteStaffMember = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted staff member`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
