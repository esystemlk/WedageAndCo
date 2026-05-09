import { collection, addDoc, Timestamp, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { OperationType } from '../firebase/errorHandler';

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  action: OperationType;
  collection: string;
  entityId: string;
  details?: string;
  timestamp: any;
}

const COLLECTION = 'audit_logs';

export const recordChange = async (
  action: OperationType,
  collectionName: string,
  entityId: string,
  details?: string
) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, COLLECTION), {
      userId: user.uid,
      userEmail: user.email || 'unknown',
      action,
      collection: collectionName,
      entityId,
      details: details || '',
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
};

export const getAuditLogs = async (maxLogs = 100) => {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
};
