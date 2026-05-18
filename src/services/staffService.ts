import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'staff';

export interface StaffMember {
  id?: string;
  fullName: string;
  nickname?: string;
  category: 'Driver' | 'Helper' | 'Cleaner' | 'Office Staff' | 'Garage';
  phone: string;
  additionalPhones?: string[];
  email?: string;
  nicNumber: string;
  licenseNo?: string;
  active: boolean;
  department: string;
  basicSalary?: number;
  bankAccountNo?: string;
  joinDate?: string;

  // New HR / Identity fields
  staffId?: string; // EMP-001
  epfNo?: string;
  etfNo?: string;
  position?: string;
  uniformProvided?: boolean;

  // Offboarding / Exit Registry
  resignationDate?: string;
  leavingDate?: string;
  leavingReason?: string;
  resignationLetterUrl?: string;
  uniformReturned?: {
    shirts: boolean;
    trousers: boolean;
    boots: boolean;
    cap: boolean;
  };

  // New fields
  bloodType?: string;
  emergencyContacts?: {
    name: string;
    phone: string;
    relation: string;
  }[];

  // Document uploads
  profilePicture?: string;
  policeReportUrl?: string;
  policeReportAddLater?: boolean;
  policeReportDeadline?: string;

  gramaNiladariUrl?: string;
  gramaNiladariAddLater?: boolean;
  gramaNiladariDeadline?: string;

  birthCertificateUrl?: string;
  birthCertificateAddLater?: boolean;
  birthCertificateDeadline?: string;

  idCopyUrl?: string;

  cvUrl?: string;
  cvAddLater?: boolean;
  cvDeadline?: string;

  certificatesUrls?: string[];
  additionalCertificatesAddLater?: boolean;
  additionalCertificatesDeadline?: string;

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
