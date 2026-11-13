import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp, 
  where,
  doc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';
import { stripUndefined } from '../lib/utils';
import { adjustInventoryStock, updateInventoryItem } from './inventoryService';

const COLLECTION = 'grns';

export interface GRNItem {
  description: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  variance: number;
  unitPrice?: number;
  totalValue?: number;
  stockItemId?: string;
}

export interface GRN {
  id?: string;
  grnNo: string;
  date: string;
  supplierName: string;
  supplierInvoiceNo?: string;
  purchaseOrderRef?: string; // Po number or ID
  deliveryNoteNo?: string;
  receivedBy: string;
  vehicleUsed?: string;
  warehouseLocation?: string;
  deliveryAddress?: string;
  items: GRNItem[];
  conditionOfGoods?: 'Good' | 'Damaged' | 'Partial' | 'Rejected';
  voucherNo?: string;
  invoiceNo?: string;
  remarks?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const getGRNs = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GRN));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
};

export const getGRN = async (id: string) => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as GRN;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION}/${id}`);
  }
};

/** Receive each stock-linked item into inventory: bump current stock and record the
 *  latest purchase cost, since a restock's price can differ from what's on file. */
const receiveItemsIntoStock = async (items: GRNItem[], updatedBy: string, date: string) => {
  for (const item of items) {
    if (item.stockItemId && item.quantityReceived > 0) {
      await adjustInventoryStock(item.stockItemId, item.quantityReceived, updatedBy, date);
      if (item.unitPrice !== undefined) {
        await updateInventoryItem(item.stockItemId, { purchaseCost: item.unitPrice });
      }
    }
  }
};

export const createGRN = async (data: Omit<GRN, 'id'>) => {
  try {
    const grnNo = `GRN-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...stripUndefined(data),
      grnNo,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await receiveItemsIntoStock(data.items, data.receivedBy, data.date);
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created GRN ${grnNo}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateGRN = async (id: string, data: Partial<GRN>, updatedBy?: string) => {
  try {
    if (data.items && updatedBy) {
      const existing = await getGRN(id);
      const before: Record<string, number> = {};
      (existing?.items || []).forEach(item => {
        if (item.stockItemId) before[item.stockItemId] = (before[item.stockItemId] || 0) + (item.quantityReceived || 0);
      });
      const after: Record<string, number> = {};
      data.items.forEach(item => {
        if (item.stockItemId) after[item.stockItemId] = (after[item.stockItemId] || 0) + (item.quantityReceived || 0);
      });
      const stockItemIds = new Set([...Object.keys(before), ...Object.keys(after)]);
      for (const stockItemId of stockItemIds) {
        const delta = (after[stockItemId] || 0) - (before[stockItemId] || 0);
        if (delta !== 0) {
          await adjustInventoryStock(stockItemId, delta, updatedBy, data.date || existing?.date);
        }
      }
      for (const item of data.items) {
        if (item.stockItemId && item.unitPrice !== undefined) {
          await updateInventoryItem(item.stockItemId, { purchaseCost: item.unitPrice });
        }
      }
    }
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...stripUndefined(data),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated GRN fields: ${Object.keys(data).join(', ')}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteGRN = async (id: string, updatedBy?: string) => {
  try {
    if (updatedBy) {
      const existing = await getGRN(id);
      for (const item of existing?.items || []) {
        if (item.stockItemId && item.quantityReceived > 0) {
          await adjustInventoryStock(item.stockItemId, -item.quantityReceived, updatedBy, existing?.date);
        }
      }
    }
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted GRN`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
