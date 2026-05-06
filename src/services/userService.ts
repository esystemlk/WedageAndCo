import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserRole } from '../config/roles';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: any;
  lastLogin?: any;
}

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, 'users'), orderBy('email', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as UserProfile));
};

export const updateUserRole = async (userId: string, role: UserRole) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    role,
    updatedAt: new Date().toISOString()
  });
};

export const updateSelf = async (userId: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as UserProfile;
  }
  return null;
};
