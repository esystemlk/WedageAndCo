import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  getDoc,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserRole, Permission } from '../config/roles';

/** Per-user toggles for which alert categories generate notifications. */
export interface NotificationPrefs {
  document: boolean;     // licence / insurance / agreement expiry
  maintenance: boolean;  // service & maintenance reminders
  stock: boolean;        // inventory / low-stock alerts
  booking: boolean;      // vehicle booking alerts
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  document: true, maintenance: true, stock: true, booking: true,
};

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions?: Permission[];   // per-user override; when absent, role defaults apply
  photoURL?: string;            // avatar image
  notificationPrefs?: NotificationPrefs;
  createdAt?: any;
  lastLogin?: any;
}

/** localStorage key the NotificationProvider reads to filter alerts by category. */
export const NOTIFICATION_PREFS_KEY = 'wedage-notification-prefs';

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

/**
 * Set a per-user permission override. Pass `null` to remove the override and
 * fall back to the user's role defaults.
 */
export const updateUserPermissions = async (userId: string, permissions: Permission[] | null) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    permissions: permissions === null ? deleteField() : permissions,
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
