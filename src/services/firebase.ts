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
import { getDatabase, ref, set, update, get, child, remove } from 'firebase/database';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Real Firebase Web App Configuration for project "hishab-ai"
const firebaseConfig = {
  apiKey: "AIzaSyBHN3fd230CFP2fzxfm2i1jbRCqRoXEc2A",
  authDomain: "hishab-ai.firebaseapp.com",
  databaseURL: "https://hishab-ai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hishab-ai",
  storageBucket: "hishab-ai.firebasestorage.app",
  messagingSenderId: "254866158438",
  appId: "1:254866158438:web:6098db3b66d2c1e5a88ea7",
};

export const isFirebaseConfigured = true;

// Initialize Firebase (only once)
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp);
const rtdb = getDatabase(firebaseApp);


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
      const uid = currentUser.uid;
      // Start background data purge without blocking user deletion
      FirebaseService.deleteAllUserData(uid).catch((err) =>
        console.warn('Cloud data purge notice:', err)
      );
      // Immediately delete user authentication record in Firebase Auth
      await deleteUser(currentUser);
    }
  },



  async linkAnonymousAccount(email: string, pass: string) {
    if (!auth.currentUser) throw new Error("No active user session.");
    const credential = EmailAuthProvider.credential(email, pass);
    const result = await linkWithCredential(auth.currentUser, credential);
    return result.user;
  }
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs)),
  ]);
}

export const FirebaseService = {

  async saveTransaction(userId: string, transaction: any) {
    if (userId === 'mock-local-user') return true;
    try {
      // 🚀 Fast save to Realtime Database (asia-southeast1 node)
      set(ref(rtdb, `users/${userId}/transactions/${transaction.id}`), transaction).catch(() => {});
      // Backup save to Firestore
      const docRef = doc(db, 'users', userId, 'transactions', transaction.id);
      setDoc(docRef, transaction).catch(() => {});
      return true;
    } catch (error) {
      console.error('Error saving transaction:', error);
      return false;
    }
  },

  async deleteTransaction(userId: string, transactionId: string) {
    if (userId === 'mock-local-user') return true;
    try {
      remove(ref(rtdb, `users/${userId}/transactions/${transactionId}`)).catch(() => {});
      const docRef = doc(db, 'users', userId, 'transactions', transactionId);
      deleteDoc(docRef).catch(() => {});
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  },

  async fetchTransactions(userId: string) {
    if (userId === 'mock-local-user') return [];
    try {
      // 🚀 Ultra-fast Realtime Database read (<30ms from Singapore node)
      const dbRef = ref(rtdb);
      const snapshot = await withTimeout(get(child(dbRef, `users/${userId}/transactions`)), 1500, null);
      if (snapshot && snapshot.exists()) {
        const val = snapshot.val();
        const transactions = Object.values(val);
        return transactions.sort((a: any, b: any) =>
          new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime()
        );
      }

      // Non-blocking background sync from legacy Firestore without delaying RTDB return
      getDocs(query(collection(db, 'users', userId, 'transactions'), orderBy('transactionDate', 'desc')))
        .then((querySnapshot) => {
          if (!querySnapshot.empty) {
            const txns: any[] = [];
            querySnapshot.forEach((d) => txns.push(d.data()));
            txns.forEach((t) => set(ref(rtdb, `users/${userId}/transactions/${t.id}`), t).catch(() => {}));
          }
        })
        .catch(() => {});

      return [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  },

  async saveCategory(userId: string, category: any) {
    if (userId === 'mock-local-user') return true;
    try {
      set(ref(rtdb, `users/${userId}/categories/${category.id}`), category).catch(() => {});
      const docRef = doc(db, 'users', userId, 'categories', category.id);
      setDoc(docRef, category).catch(() => {});
      return true;
    } catch (error) {
      console.error('Error saving category:', error);
      return false;
    }
  },

  async fetchCategories(userId: string) {
    if (userId === 'mock-local-user') return [];
    try {
      const dbRef = ref(rtdb);
      const snapshot = await withTimeout(get(child(dbRef, `users/${userId}/categories`)), 1500, null);
      if (snapshot && snapshot.exists()) {
        return Object.values(snapshot.val());
      }
      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async deleteCategory(userId: string, categoryId: string) {

    if (userId === 'mock-local-user') return true;
    try {
      remove(ref(rtdb, `users/${userId}/categories/${categoryId}`)).catch(() => {});
      const docRef = doc(db, 'users', userId, 'categories', categoryId);
      deleteDoc(docRef).catch(() => {});
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  },


  async saveBudget(userId: string, budget: any) {
    if (userId === 'mock-local-user') return true;
    try {
      const budgetKey = `${budget.year}-${budget.month}`;
      set(ref(rtdb, `users/${userId}/budgets/${budgetKey}`), budget).catch(() => {});
      const docRef = doc(db, 'users', userId, 'budgets', budgetKey);
      setDoc(docRef, budget).catch(() => {});
      return true;
    } catch (error) {
      console.error('Error saving budget:', error);
      return false;
    }
  },

  async fetchBudgets(userId: string) {
    if (userId === 'mock-local-user') return [];
    try {
      const dbRef = ref(rtdb);
      const snapshot = await withTimeout(get(child(dbRef, `users/${userId}/budgets`)), 1500, null);
      if (snapshot && snapshot.exists()) {
        const val = snapshot.val();
        return Object.values(val) as any[];
      }

      // Non-blocking background sync from legacy Firestore
      getDocs(query(collection(db, 'users', userId, 'budgets')))
        .then((querySnapshot) => {
          if (!querySnapshot.empty) {
            const budgets: any[] = [];
            querySnapshot.forEach((d) => budgets.push(d.data()));
            budgets.forEach((b) => {
              const key = `${b.year}-${b.month}`;
              set(ref(rtdb, `users/${userId}/budgets/${key}`), b).catch(() => {});
            });
          }
        })
        .catch(() => {});


      return [];
    } catch (error) {
      console.error('Error fetching budgets:', error);
      return [];
    }
  },

  async saveUserProfile(userId: string, profile: { userName?: string; userPhotoUrl?: string | null; currency?: string; theme?: string; dailyReminderEnabled?: boolean; backgroundPreset?: string }) {
    if (userId === 'mock-local-user') return true;
    try {
      const cleanProfile: any = {};
      Object.keys(profile).forEach((key) => {
        const val = (profile as any)[key];
        if (val !== undefined) {
          cleanProfile[key] = val;
        }
      });
      update(ref(rtdb, `users/${userId}/profile`), cleanProfile).catch(() => {});
      const docRef = doc(db, 'users', userId, 'profile', 'data');
      setDoc(docRef, cleanProfile, { merge: true }).catch(() => {});
      return true;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  },


  async fetchUserProfile(userId: string) {
    if (userId === 'mock-local-user') return null;
    try {
      const dbRef = ref(rtdb);
      const snapshot = await withTimeout(get(child(dbRef, `users/${userId}/profile`)), 1500, null);
      if (snapshot && snapshot.exists()) {
        return snapshot.val();
      }

      // Backup read from Firestore if RTDB returns null
      const docRef = doc(db, 'users', userId, 'profile', 'data');
      const docSnap = await getDoc(docRef).catch(() => null);
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        set(ref(rtdb, `users/${userId}/profile`), data).catch(() => {});
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },




  async deleteAllUserData(userId: string) {
    if (userId === 'mock-local-user') return true;
    try {
      // Purge Realtime Database user node
      remove(ref(rtdb, `users/${userId}`)).catch(() => {});

      // Purge Firestore user documents
      try {
        const txQuery = query(collection(db, 'users', userId, 'transactions'));
        const txSnapshot = await getDocs(txQuery);
        txSnapshot.docs.forEach(d => deleteDoc(doc(db, 'users', userId, 'transactions', d.id)));
        deleteDoc(doc(db, 'users', userId)).catch(() => {});
      } catch (e) {}

      return true;
    } catch (error) {
      console.error('Error deleting all user data:', error);
      return false;
    }
  },
};

