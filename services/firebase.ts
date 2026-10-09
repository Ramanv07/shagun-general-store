import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  GoogleAuthProvider, 
  signInWithPopup, 
  ConfirmationResult 
} from 'firebase/auth';

const isBrowser = typeof window !== 'undefined';
const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// In production, using the same domain as authDomain (proxied via vercel.json)
// solves the "Unable to process request due to missing initial state" error in mobile browsers
const authDomain = (isBrowser && !isLocal && window.location.host) 
  ? window.location.host 
  : "shagunmart-29a7d.firebaseapp.com";

const firebaseConfig = {
  apiKey: "AIzaSyCikxkLsxuSjc9QR_bnCBRImG8Ek8K_2sA",
  authDomain: authDomain,
  projectId: "shagunmart-29a7d",
  storageBucket: "shagunmart-29a7d.firebasestorage.app",
  messagingSenderId: "156770476319",
  appId: "1:156770476319:web:24601a854d68d2a398902a",
  measurementId: "G-BHHL60LXRP"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup };
export type { ConfirmationResult };
