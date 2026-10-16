import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';
import { adjustInventoryStock } from './inventoryService';
import { stripUndefined } from '../lib/utils';

export interface ItemIssue {
  id?: string;
  date: string;
  stockItemId: string;
  itemName: string;
  category: string;
  unitType: string;
  quantityIssued: number;
  issuedTo: string;
  vehicleNo?: string;
  issuingOfficer: string;
  notes?: string;
  createdAt?: any;
}

const COLLECTION = 'item_issues';

export const createItemIssue = async (data: Omit<ItemIssue, 'id' | 'createdAt'>, updatedBy: string) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...stripUndefined(data),
      createdAt: serverTimestamp()
    });
    if (data.stockItemId && data.quantityIssued > 0) {
      await adjustInventoryStock(data.stockItemId, -data.quantityIssued, updatedBy, data.date);
    }
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id,
      `Issued ${data.quantityIssued} ${data.unitType} of ${data.itemName} to ${data.issuedTo}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const getItemIssues = async (): Promise<ItemIssue[]> => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ItemIssue[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const getItemIssue = async (id: string): Promise<ItemIssue | null> => {
  try {
    const snapshot = await getDoc(doc(db, COLLECTION, id));
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as ItemIssue;
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
    return null;
  }
};

export const deleteItemIssue = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, 'Deleted item issue record');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
