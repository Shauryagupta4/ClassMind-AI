import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCz-IZOs33oLMyugCAr9C1yEunms0JjdBg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "classmind-ai-c076c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "classmind-ai-c076c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "classmind-ai-c076c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "422367847258",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:422367847258:web:fe06a3b3869367c79a0963",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XCT22N2DKH"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Direct 1-Click Google Popup Sign In via Firebase
 */
export const signInWithFirebaseGoogle = async () => {
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return result.user;
};

/**
 * Setup Invisible or Visible reCAPTCHA verifier for Firebase Phone Auth
 */
export const setupRecaptcha = (containerId = 'recaptcha-container') => {
  if (typeof window === 'undefined') return null;
  
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      // ignore
    }
  }

  window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn("reCAPTCHA expired");
    }
  });

  return window.recaptchaVerifier;
};

/**
 * Send SMS OTP using Firebase Phone Auth
 */
export const sendFirebasePhoneOtp = async (phoneNumber, containerId = 'recaptcha-container') => {
  const verifier = setupRecaptcha(containerId);
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/\D/g, '')}`;
  const confirmationResult = await signInWithPhoneNumber(firebaseAuth, formattedPhone, verifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
};

/**
 * Verify SMS OTP using Firebase Phone Auth confirmation result
 */
export const verifyFirebasePhoneOtp = async (verificationCode) => {
  if (!window.confirmationResult) {
    throw new Error('No active verification session found. Please request a new OTP code.');
  }
  const result = await window.confirmationResult.confirm(verificationCode);
  return result.user;
};
