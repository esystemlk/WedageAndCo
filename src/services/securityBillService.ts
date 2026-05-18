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

export interface SecurityBillCheck {
  id: string;
  date: string;
  targetType: 'Vehicle' | 'Stores';
  vehicleNo?: string;
  supplierName: string;
  description: string;
  units: number;
  invoiceNo: string;
  price: number;
  totalAmount?: number;
  enteredBy: string;
  createdAt: Timestamp;
}

const COLLECTION_NAME = 'security_bills';

export const createSecurityBillCheck = async (data: Omit<SecurityBillCheck, 'id' | 'createdAt'>) => {
  try {
    const totalAmount = data.units * data.price;
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      totalAmount,
      createdAt: serverTimestamp()
    });
    await recordChange(OperationType.CREATE, COLLECTION_NAME, docRef.id, `Created security bill check for invoice ${data.invoiceNo}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
  }
};

export const getSecurityBillChecks = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SecurityBillCheck[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
};

export const deleteSecurityBillCheck = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    await recordChange(OperationType.DELETE, COLLECTION_NAME, id, `Deleted security bill check`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};
