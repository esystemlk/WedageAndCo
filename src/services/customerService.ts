import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const COLLECTION = 'customers';

export interface Customer {
  id?: string;
  name: string;
  nickname?: string;
  brNo: string;
  brImage?: string;
  officialContact: string;
  vatNo?: string;
  opsContactName?: string;
  opsContactNumber?: string;
  billingContactName?: string;
  billingContactNumber?: string;
  agreementUrl?: string;
  agreementStart: string;
  agreementEnd: string;
}

export const getCustomers = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const getCustomer = async (id: string) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Customer;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
  }
};

export const createCustomer = async (data: Omit<Customer, 'id'>) => {
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

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
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

export const deleteCustomer = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
