import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { addDoc, collection, doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'

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

async function ensureRoleProfile(user, role) {
  const profileRef = doc(db, 'profiles', user.uid)
  const profileSnap = await getDoc(profileRef)
  if (!profileSnap.exists()) {
    await setDoc(profileRef, {
      email: user.email,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { email: user.email, role }
  }

  const profile = profileSnap.data()
  if (profile.role !== role) {
    await signOut(auth)
    throw new Error(`This account is registered as ${profile.role === 'consignor' ? 'a consignor' : 'a collector'}. Choose the matching login role.`)
  }
  return profile
}

export async function getUserProfile(uid) {
  requireFirebase()
  const profileSnap = await getDoc(doc(db, 'profiles', uid))
  return profileSnap.exists() ? profileSnap.data() : null
}

export async function signInWithEmail(email, password, role) {
  requireFirebase()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  await ensureRoleProfile(credential.user, role)
  return credential
}

export async function createAccount(email, password, role) {
  requireFirebase()
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await ensureRoleProfile(credential.user, role)
  return credential
}

export async function signInWithGoogleRole(role) {
  requireFirebase()
  const credential = await signInWithPopup(auth, googleProvider)
  const isNewUser = getAdditionalUserInfo(credential)?.isNewUser
  await ensureRoleProfile(credential.user, role)
  return { credential, isNewUser }
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
