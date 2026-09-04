import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserDoc } from '../types';

interface AuthContextType {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userDoc: null,
  loading: true,
  signIn: async () => {},
  logOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log('Sign in popup was closed or cancelled.');
      } else {
        console.error("Sign in error:", error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const newUser: Partial<UserDoc> = {
              email: currentUser.email || '',
              // Give the very first created user admin access for the demo
              role: 'admin', 
              createdAt: serverTimestamp() as any
            };
            await setDoc(userRef, newUser);
            setUserDoc({ id: currentUser.uid, ...newUser } as UserDoc);
          } else {
            setUserDoc({ id: userSnap.id, ...userSnap.data() } as UserDoc);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUserDoc(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};
