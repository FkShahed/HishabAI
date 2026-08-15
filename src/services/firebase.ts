import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { 
  initializeAuth,
  // @ts-ignore - TypeScript often struggles to find React Native exports in Firebase
  getReactNativePersistence,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  linkWithCredential,
  getAdditionalUserInfo,
  User
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Real Firebase Web App Configuration for project "hishab-ai"
const firebaseConfig = {
  apiKey: "AIzaSyBHN3fd230CFP2fzxfm2i1jbRCqRoXEc2A",
  authDomain: "hishab-ai.firebaseapp.com",
  projectId: "hishab-ai",
  storageBucket: "hishab-ai.firebasestorage.app",
  messagingSenderId: "254866158438",
  appId: "1:254866158438:web:6098db3b66d2c1e5a88ea7",
};

export const isFirebaseConfigured = true;

// Initialize Firebase (only once)
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp);

// Explicitly initialize Auth with AsyncStorage persistence
let auth: any;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(firebaseApp);
  } else {
    auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (error: any) {
  try {
    auth = getAuth(firebaseApp);
  } catch (fallbackErr) {
    console.warn('[Firebase Auth] Fallback initialization warning:', fallbackErr);
  }
}

export { firebaseApp as app, db, auth };

/**
 * Ensures the user is logged in. Uses anonymous auth for frictionless onboarding.
 */
export const ensureAuthenticated = (): Promise<{ uid: string; email?: string | null } | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      unsubscribe();
      if (user) {
        resolve({ uid: user.uid, email: user.email });
      } else {
        resolve(null); // No longer signing in anonymously!
      }
    });
  });
};

export const AuthService = {
  async signUp(email: string, pass: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    return credential.user;
  },

  async signIn(email: string, pass: string) {
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    return credential.user;
  },

  async signInWithGoogle() {
    if (Platform.OS !== 'web' || typeof signInWithPopup !== 'function') {
      throw new Error(
        "Google Sign-In popup is available in the Web browser. For mobile Expo testing, please use Email & Password sign in."
      );
    }
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, provider);
    const info = typeof getAdditionalUserInfo === 'function' ? getAdditionalUserInfo(result) : null;
    const photo = result.user.photoURL || 
                  result.user.providerData?.[0]?.photoURL || 
                  (info?.profile as any)?.picture || 
                  (info?.profile as any)?.avatar_url;
                  
    if (photo) {
      (result.user as any).customPhotoURL = photo;
      try {
        const { useUIStore } = require('../store');
        useUIStore.getState().setUserPhotoUrl(photo);
      } catch (e) {}
    }
    return result.user;
  },

  async signOut() {
    await firebaseSignOut(auth);
  },

  async deleteAccount() {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await FirebaseService.deleteAllUserData(currentUser.uid);
      } catch (e) {
        console.warn("Cloud data purge warning during account deletion:", e);
      }
      try {
        await deleteUser(currentUser);
      } catch (e: any) {
        console.warn("Firebase deleteUser exception:", e);
        // Sign out if token expired or requires-recent-login
        await firebaseSignOut(auth).catch(() => {});
      }
    }
  },

  async linkAnonymousAccount(email: string, pass: string) {
    if (!auth.currentUser) throw new Error("No active user session.");
    const credential = EmailAuthProvider.credential(email, pass);
    const result = await linkWithCredential(auth.currentUser, credential);
    return result.user;
  }
};

export const FirebaseService = {
  async saveTransaction(userId: string, transaction: any) {
    if (userId === 'mock-local-user') return true;
    try {
      const docRef = doc(db, 'users', userId, 'transactions', transaction.id);
      await setDoc(docRef, transaction);
      return true;
    } catch (error) {
      console.error('Error saving transaction:', error);
      return false;
    }
  },

  async deleteTransaction(userId: string, transactionId: string) {
    if (userId === 'mock-local-user') return true;
    try {
      const docRef = doc(db, 'users', userId, 'transactions', transactionId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  },

  async fetchTransactions(userId: string) {
    if (userId === 'mock-local-user') return [];
    try {
      const q = query(
        collection(db, 'users', userId, 'transactions'),
        orderBy('transactionDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const transactions: any[] = [];
      querySnapshot.forEach((d) => transactions.push(d.data()));
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  },

  async saveCategory(userId: string, category: any) {
    if (userId === 'mock-local-user') return true;
    try {
      const docRef = doc(db, 'users', userId, 'categories', category.id);
      await setDoc(docRef, category);
      return true;
    } catch (error) {
      console.error('Error saving category:', error);
      return false;
    }
  },

  async fetchCategories(userId: string) {
    if (userId === 'mock-local-user') return [];
    try {
      const q = query(collection(db, 'users', userId, 'categories'));
      const querySnapshot = await getDocs(q);
      const categories: any[] = [];
      querySnapshot.forEach((d) => categories.push(d.data()));
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async deleteAllUserData(userId: string) {
    if (userId === 'mock-local-user') return true;
    try {
      // Fetch and delete all transactions
      const txQuery = query(collection(db, 'users', userId, 'transactions'));
      const txSnapshot = await getDocs(txQuery);
      const txPromises = txSnapshot.docs.map(d => deleteDoc(doc(db, 'users', userId, 'transactions', d.id)));
      
      // Fetch and delete all categories
      const catQuery = query(collection(db, 'users', userId, 'categories'));
      const catSnapshot = await getDocs(catQuery);
      const catPromises = catSnapshot.docs.map(d => deleteDoc(doc(db, 'users', userId, 'categories', d.id)));
      
      await Promise.all([...txPromises, ...catPromises]);

      // Delete the main user document
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (e) {
        // Document might not exist
      }
      return true;
    } catch (error) {
      console.error('Error deleting all user data:', error);
      return false;
    }
  },
};
