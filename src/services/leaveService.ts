import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';
import { createCalendarEvent } from './calendarService';

const COLLECTION = 'leave_requests';

export interface LeaveRequest {
  id?: string;
  staffId: string;
  staffName: string;
  staffCategory: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveType: 'Holiday' | 'Sick Leave' | 'Half Day' | 'Casual' | 'Other';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export const getLeaveRequests = async () => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const getLeaveRequestsByStaff = async (staffId: string) => {
  try {
    const q = query(collection(db, COLLECTION), where('staffId', '==', staffId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${COLLECTION}/${staffId}`);
    return [];
  }
};

export const createLeaveRequest = async (data: Omit<LeaveRequest, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Created leave request for ${data.staffName}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
};

export const updateLeaveRequest = async (id: string, data: Partial<LeaveRequest>) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Updated leave request: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const approveLeaveRequest = async (id: string, approvedBy: string) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Request not found');
    
    const request = snap.data() as LeaveRequest;
    
    await updateDoc(docRef, {
      status: 'Approved',
      approvedBy,
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Approved leave request for ${request.staffName}`);
    
    // Auto-create calendar events for each day of the leave
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    
    const current = new Date(start);
    while (current <= end) {
      await createCalendarEvent({
        title: `Leave: ${request.staffName} (${request.leaveType})`,
        description: `Approved leave for ${request.staffName} (${request.staffCategory}). Reason: ${request.reason}`,
        type: 'holiday',
        date: new Date(current),
        startTime: request.leaveType === 'Half Day' ? '08:00' : '00:00',
        endTime: request.leaveType === 'Half Day' ? '12:00' : '23:59',
        driverId: request.staffCategory === 'Driver' ? request.staffId : undefined
      });
      current.setDate(current.getDate() + 1);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};

export const rejectLeaveRequest = async (id: string, rejectedBy: string) => {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      status: 'Rejected',
      approvedBy: rejectedBy,
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    await recordChange(OperationType.UPDATE, COLLECTION, id, `Rejected leave request: ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${id}`);
  }
};
