import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs,
  query, orderBy, where, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

const COLLECTION = 'vehicle_bookings';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface VehicleBooking {
  id?: string;
  vehiclePlate: string;
  vehicleId?: string;
  requestedBy: string;       // staff name / email
  requestedByEmail?: string;
  purpose: string;
  fromDate: string;          // YYYY-MM-DD
  fromTime: string;          // HH:MM
  toDate: string;
  toTime: string;
  destination: string;
  passengerCount?: number;
  driverRequired: boolean;
  driverName?: string;
  status: BookingStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────
export const createBooking = async (
  data: Omit<VehicleBooking, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | undefined> => {
  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      ...data,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordChange(OperationType.CREATE, COLLECTION, ref.id,
      `Booking request for ${data.vehiclePlate} by ${data.requestedBy}`);
    return ref.id;
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, COLLECTION);
  }
};

export const getBookings = async (): Promise<VehicleBooking[]> => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as VehicleBooking[];
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const getBooking = async (id: string): Promise<VehicleBooking | null> => {
  try {
    const snap = await getDoc(doc(db, COLLECTION, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } as VehicleBooking : null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `${COLLECTION}/${id}`);
    return null;
  }
};

export const updateBooking = async (id: string, data: Partial<VehicleBooking>): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTION, id), { ...data, updatedAt: serverTimestamp() });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated booking: ${data.status || ''}`);
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const approveBooking = async (id: string, approvedBy: string): Promise<void> => {
  await updateBooking(id, {
    status: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString(),
  });
};

export const rejectBooking = async (id: string, reason: string, rejectedBy: string): Promise<void> => {
  await updateBooking(id, {
    status: 'rejected',
    rejectionReason: reason,
    approvedBy: rejectedBy,
    approvedAt: new Date().toISOString(),
  });
};

export const deleteBooking = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await recordChange(OperationType.DELETE, COLLECTION, id, 'Deleted booking');
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};

// Check if vehicle is already booked for a given time range
export const checkVehicleAvailability = async (
  vehiclePlate: string,
  fromDate: string,
  toDate: string,
  excludeId?: string
): Promise<VehicleBooking[]> => {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('vehiclePlate', '==', vehiclePlate),
      where('status', 'in', ['pending', 'approved'])
    );
    const snap = await getDocs(q);
    const bookings = snap.docs
      .map(d => ({ id: d.id, ...d.data() })) as VehicleBooking[];

    return bookings.filter(b => {
      if (excludeId && b.id === excludeId) return false;
      // Overlap check: b.fromDate <= toDate && b.toDate >= fromDate
      return b.fromDate <= toDate && b.toDate >= fromDate;
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, COLLECTION);
    return [];
  }
};
