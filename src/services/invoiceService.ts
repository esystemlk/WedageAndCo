import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const COLLECTION = 'invoices';

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id?: string;
  customerId: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
}

export const getInvoices = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const createInvoice = async (data: Omit<Invoice, 'id'>) => {
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

export const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
  try {
    await updateDoc(doc(db, COLLECTION, id), { status, updatedAt: Timestamp.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};
