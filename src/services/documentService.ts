import {
  collection, addDoc, deleteDoc, doc, getDocs,
  query, orderBy, Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { recordChange } from './auditService';

export type DocumentFileType = 'pdf' | 'image' | 'spreadsheet' | 'other';
export type DocumentCategory = 'vehicle' | 'invoice' | 'maintenance' | 'contract' | 'other';

export interface AppDocument {
  id?: string;
  name: string;
  type: DocumentFileType;
  category: DocumentCategory;
  fileSize: string;
  uploadedBy: string;
  uploadDate: Timestamp;
  description?: string;
  url: string;
  storagePath: string;
  tags: string[];
  createdAt?: Timestamp;
}

const COLLECTION = 'documents';

export const getDocuments = async (): Promise<AppDocument[]> => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as AppDocument[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
    return [];
  }
};

export const uploadAndCreateDocument = async (
  file: File,
  meta: {
    name: string;
    category: DocumentCategory;
    description?: string;
    tags: string[];
    uploadedBy: string;
  }
): Promise<AppDocument> => {
  // Upload file to Firebase Storage
  const storagePath = `documents/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  // Compute file size string
  const fileSize =
    file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

  // Detect file type
  const type: DocumentFileType = file.type.includes('pdf')
    ? 'pdf'
    : file.type.includes('image')
    ? 'image'
    : file.name.match(/\.(xlsx|xls|csv|ods)$/i)
    ? 'spreadsheet'
    : 'other';

  const docData: Omit<AppDocument, 'id'> = {
    name: meta.name || file.name,
    type,
    category: meta.category,
    fileSize,
    uploadedBy: meta.uploadedBy,
    uploadDate: Timestamp.now(),
    description: meta.description || '',
    url,
    storagePath,
    tags: meta.tags,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), docData);
  await recordChange(OperationType.CREATE, COLLECTION, docRef.id, `Uploaded: ${meta.name}`);
  return { id: docRef.id, ...docData };
};

export const deleteDocument = async (id: string, storagePath: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    try {
      await deleteObject(ref(storage, storagePath));
    } catch {
      // File may already be deleted or path may differ — ignore storage errors
    }
    await recordChange(OperationType.DELETE, COLLECTION, id, 'Deleted document');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${id}`);
  }
};
