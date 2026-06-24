import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseReady = Object.values(firebaseConfig).every(Boolean)

const app = firebaseReady ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
const googleProvider = new GoogleAuthProvider()

function requireFirebase() {
  if (!firebaseReady || !auth || !db) {
    throw new Error('Firebase is not configured yet. Add your VITE_FIREBASE_* values to .env.local.')
  }
}

export function subscribeToUser(callback) {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  requireFirebase()
  return signInWithPopup(auth, googleProvider)
}

export async function signInWithEmail(email, password) {
  requireFirebase()
  return signInWithEmailAndPassword(auth, email, password)
}

export async function createAccount(email, password) {
  requireFirebase()
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function signOutUser() {
  requireFirebase()
  return signOut(auth)
}

export async function saveOrder(order) {
  requireFirebase()
  return addDoc(collection(db, 'orders'), {
    ...order,
    status: 'demo-reserved',
    createdAt: serverTimestamp(),
  })
}
