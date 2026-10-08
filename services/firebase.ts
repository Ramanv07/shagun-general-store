import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  GoogleAuthProvider, 
  signInWithPopup, 
  ConfirmationResult 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCikxkLsxuSjc9QR_bnCBRImG8Ek8K_2sA",
  authDomain: "shagunmart-29a7d.firebaseapp.com",
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
