import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

export const uploadFile = async (path: string, file: File): Promise<string> => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

export const deleteFile = async (url: string): Promise<void> => {
  const storageRef = ref(storage, url);
  await deleteObject(storageRef);
};
