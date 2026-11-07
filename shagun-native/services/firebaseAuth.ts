import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const isBrowser = typeof window !== 'undefined';
const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const authDomain = (isBrowser && !isLocal && window.location.host) 
  ? window.location.host 
  : 'shagunmart-29a7d.firebaseapp.com';

const firebaseConfig = {
  apiKey: 'AIzaSyCikxkLsxuSjc9QR_bnCBRImG8Ek8K_2sA',
  authDomain: authDomain,
  projectId: 'shagunmart-29a7d',
  storageBucket: 'shagunmart-29a7d.firebasestorage.app',
  messagingSenderId: '156770476319',
  appId: '1:156770476319:web:24601a854d68d2a398902a',
  measurementId: 'G-BHHL60LXRP',
};

let authInstance: any = null;
let providerInstance: any = null;

if (Platform.OS === 'web') {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    providerInstance = new GoogleAuthProvider();
    providerInstance.setCustomParameters({ prompt: 'select_account' });
  } catch (e) {
    console.warn('Firebase initialization notice:', e);
  }
}

export const signInWithGoogleWeb = async () => {
  if (Platform.OS !== 'web') {
    throw new Error('Google Sign-In via popup is available in web mode.');
  }
  if (!authInstance || !providerInstance) {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    providerInstance = new GoogleAuthProvider();
    providerInstance.setCustomParameters({ prompt: 'select_account' });
  }
  const result = await signInWithPopup(authInstance, providerInstance);
  return result.user;
};

