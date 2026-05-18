import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const BACKUP_COLLECTIONS = [
  'users',
  'customers',
  'suppliers',
  'staff',
  'fleet',
  'logs',
  'maintenance',
  'purchase_orders',
  'grns',
  'invoices',
  'gate_passes',
  'visitor_logs',
  'security_bills',
  'leave_requests',
  'daily_updates',
  'calendar_events',
  'audit_logs'
];

/**
 * Helper to recursively search and convert serialized timestamp objects
 * back to native Firestore Timestamp instances.
 */
const restoreTimestamps = (val: any): any => {
  if (!val) return val;
  if (typeof val === 'object') {
    // Check if it's a serialized Firestore Timestamp
    if (typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
      return new Timestamp(val.seconds, val.nanoseconds);
    }
    if (Array.isArray(val)) {
      return val.map(restoreTimestamps);
    }
    const updated: any = {};
    for (const key of Object.keys(val)) {
      updated[key] = restoreTimestamps(val[key]);
    }
    return updated;
  }
  return val;
};

/**
 * Exports all active database collections to a single formatted JSON string.
 */
export const exportDatabase = async (): Promise<string> => {
  const backupData: Record<string, any[]> = {};
  
  for (const collName of BACKUP_COLLECTIONS) {
    try {
      const querySnapshot = await getDocs(collection(db, collName));
      backupData[collName] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.warn(`Failed to export collection "${collName}":`, err);
      backupData[collName] = [];
    }
  }
  
  return JSON.stringify({
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      totalCollections: BACKUP_COLLECTIONS.length
    },
    data: backupData
  }, null, 2);
};

export interface ImportProgress {
  currentCollection: string;
  processedCount: number;
  totalCount: number;
  collectionsDone: string[];
}

/**
 * Imports a JSON database snapshot and restores/populates all documents
 * into their original Firestore paths, maintaining exact references.
 */
export const importDatabase = async (
  jsonString: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<void> => {
  const parsed = JSON.parse(jsonString);
  if (!parsed || !parsed.data) {
    throw new Error('Invalid backup schema: Envelope field "data" is missing.');
  }
  
  const collections = parsed.data;
  const collectionsDone: string[] = [];
  
  for (const collName of Object.keys(collections)) {
    const documents = collections[collName];
    if (!Array.isArray(documents)) continue;
    
    let processed = 0;
    const total = documents.length;
    
    if (onProgress) {
      onProgress({
        currentCollection: collName,
        processedCount: processed,
        totalCount: total,
        collectionsDone: [...collectionsDone]
      });
    }
    
    for (const docData of documents) {
      const { id, ...data } = docData;
      if (!id) continue;
      
      // Clean and map Timestamp classes
      const cleanedData = restoreTimestamps(data);
      
      const docRef = doc(db, collName, id);
      await setDoc(docRef, cleanedData);
      
      processed++;
      if (onProgress) {
        onProgress({
          currentCollection: collName,
          processedCount: processed,
          totalCount: total,
          collectionsDone: [...collectionsDone]
        });
      }
    }
    
    collectionsDone.push(collName);
  }
};
