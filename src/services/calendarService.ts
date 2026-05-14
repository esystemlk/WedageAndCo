import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'calendar_events';

export type EventType = 'trip' | 'maintenance' | 'meeting' | 'holiday' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  date: any; // Firestore Timestamp or Date
  startTime: string;
  endTime: string;
  vehicleId?: string;
  driverId?: string;
  completed?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export const getCalendarEvents = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
      } as CalendarEvent;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const createCalendarEvent = async (data: Omit<CalendarEvent, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      date: data.date instanceof Date ? Timestamp.fromDate(data.date) : data.date,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created calendar event: ${data.title}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateCalendarEvent = async (id: string, data: Partial<CalendarEvent>) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const updateData = { ...data, updatedAt: Timestamp.now() };
    if (data.date instanceof Date) {
      updateData.date = Timestamp.fromDate(data.date);
    }
    await updateDoc(docRef, updateData);
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated calendar event: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const deleteCalendarEvent = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, `Deleted calendar event`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
