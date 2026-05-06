import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserRole, Permission, hasPermission } from '../config/roles';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clear previous Firestore listener
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Immediate priority: Hardcoded developer override for the system owner
        if (firebaseUser.email === 'thimira.vishwa2003@gmail.com') {
          setRole(UserRole.DEVELOPER);
          setLoading(false);
          return;
        }

        // Start listening to the Firestore user document for role changes
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        userDocUnsubscribe = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            setRole(snapshot.data().role as UserRole);
            setLoading(false);
          } else {
            // New user registration in Firestore
            const defaultRole = UserRole.PENDING;
            await setDoc(userDocRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              role: defaultRole,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isApproved: false
            });
            setRole(defaultRole);
            setLoading(false);
          }
        }, (error) => {
          console.error("User doc listener error:", error);
          setLoading(false);
        });

      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userDocUnsubscribe) userDocUnsubscribe();
    };
  }, []);

  const can = (permission: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
