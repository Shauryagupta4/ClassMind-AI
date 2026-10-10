import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, syncUserProfile } from '../lib/supabase';
import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp, signInWithFirebaseGoogle } from '../lib/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const activeUser = session?.user || getDemoUser();
      setUser(activeUser);
      if (session?.user) {
        syncUserProfile(session.user);
      }
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        syncUserProfile(session.user);
        localStorage.removeItem('classmind_demo_user');
      } else {
        setUser(getDemoUser());
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  function getDemoUser() {
    try {
      const demo = localStorage.getItem('classmind_demo_user');
      return demo ? JSON.parse(demo) : null;
    } catch {
      return null;
    }
  }

  const signUp = async (email, password, fullName = '') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || email.split('@')[0] }
        }
      });
      if (error) throw error;
      toast.success('Account created! Welcome to ClassMind.');
      return data;
    } catch (err) {
      toast.error(err.message || 'Failed to sign up');
      throw err;
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      toast.success('Logged in successfully!');
      return data;
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const fbUser = await signInWithFirebaseGoogle();
      if (fbUser) {
        const userObj = {
          id: fbUser.uid,
          email: fbUser.email,
          user_metadata: {
            full_name: fbUser.displayName || fbUser.email?.split('@')[0],
            avatar_url: fbUser.photoURL
          }
        };
        setUser(userObj);
        syncUserProfile(userObj);
        toast.success(`Signed in as ${userObj.user_metadata.full_name || 'Scholar'}!`);
        return userObj;
      }
    } catch (fbErr) {
      console.error("Firebase Google Auth Error:", fbErr);
      if (fbErr.code === 'auth/popup-closed-by-user') {
        toast('Google sign-in popup was closed.', { icon: 'ℹ️' });
        return null;
      }
      if (fbErr.code === 'auth/popup-blocked') {
        toast.error('Browser blocked the Google popup window. Please allow popups for localhost!');
        return null;
      }
      if (fbErr.code === 'auth/configuration-not-found' || fbErr.code === 'auth/operation-not-allowed') {
        toast.error('Google provider is not enabled in your Firebase Console! Please enable Google under Authentication -> Sign-in method.', { duration: 8000 });
        return null;
      }
      toast.error(fbErr.message || 'Google Auth failed');
      throw fbErr;
    }
  };

  const sendPhoneOtp = async (phone, containerId = 'recaptcha-container') => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
    try {
      const confirmationResult = await sendFirebasePhoneOtp(formattedPhone, containerId);
      toast.success(`SMS OTP sent to ${formattedPhone}! Check your phone messages.`);
      return { success: true, confirmationResult };
    } catch (err) {
      console.warn("Firebase Phone Auth error:", err);
      // If project hits Firebase daily limit or SMS quota, provide smart fallback so presentation doesn't break
      if (err.code === 'auth/billing-not-enabled' || err.message?.includes('billing')) {
        toast.error("Firebase requires a billing card for real SMS to non-test numbers. Use your Test Number in Firebase (Code: 123456) or Email OTP!", { duration: 8000 });
      } else if (err.code === 'auth/quota-exceeded' || err.message?.includes('quota') || err.message?.includes('daily')) {
        toast.error("Firebase daily SMS limit reached. Demo test code 123456 ready to test.", { duration: 7000 });
      } else {
        toast.error(err.message || "Failed to send SMS via Firebase.");
      }
      const mockOtp = '123456';
      sessionStorage.setItem('classmind_mock_phone', formattedPhone);
      sessionStorage.setItem('classmind_mock_otp', mockOtp);
      return { success: true, mock: true, code: mockOtp };
    }
  };

  const verifyPhoneOtp = async (phone, token) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
    try {
      const mockPhone = sessionStorage.getItem('classmind_mock_phone');
      const mockOtp = sessionStorage.getItem('classmind_mock_otp');

      if (mockPhone && token === mockOtp) {
        const phoneUser = {
          id: `phone-${formattedPhone.replace(/\D/g, '')}`,
          phone: formattedPhone,
          user_metadata: { full_name: `Phone User (${formattedPhone})` }
        };
        localStorage.setItem('classmind_demo_user', JSON.stringify(phoneUser));
        setUser(phoneUser);
        syncUserProfile(phoneUser);
        sessionStorage.removeItem('classmind_mock_phone');
        sessionStorage.removeItem('classmind_mock_otp');
        toast.success('Phone verified successfully! Logged in.');
        return { user: phoneUser };
      }

      // Real Firebase OTP verification
      const fbUser = await verifyFirebasePhoneOtp(token.trim());
      const userObj = {
        id: fbUser.uid,
        phone: fbUser.phoneNumber || formattedPhone,
        user_metadata: { full_name: `Phone User (${fbUser.phoneNumber || formattedPhone})` }
      };
      setUser(userObj);
      syncUserProfile(userObj);
      toast.success('Phone verified successfully via Firebase! Logged in.');
      return { user: userObj };
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Invalid or expired OTP code');
      throw err;
    }
  };

  const sendEmailOtp = async (email) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true
        }
      });
      if (error) throw error;
      toast.success(`6-digit code sent to ${email}! Check your inbox.`, { duration: 6000 });
      return { success: true, data };
    } catch (err) {
      toast.error(err.message || 'Failed to send Email OTP');
      throw err;
    }
  };

  const verifyEmailOtp = async (email, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: 'email'
      });
      if (error) throw error;
      if (data?.user) {
        setUser(data.user);
        syncUserProfile(data.user);
      }
      toast.success('Email verified successfully! Welcome to ClassMind.');
      return data;
    } catch (err) {
      toast.error(err.message || 'Invalid or expired OTP code');
      throw err;
    }
  };

  const signInAsDemo = () => {
    const demo = {
      id: 'demo-student-id',
      email: 'scholar@classmind.ai',
      user_metadata: { full_name: 'Scholar Student' },
      isDemo: true
    };
    localStorage.setItem('classmind_demo_user', JSON.stringify(demo));
    setUser(demo);
    toast.success('Signed in as Demo Student! (Instant Hackathon Access)');
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('classmind_demo_user');
    setUser(null);
    setSession(null);
    toast('Logged out', { icon: '👋' });
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      sendEmailOtp,
      verifyEmailOtp,
      sendPhoneOtp,
      verifyPhoneOtp,
      signInAsDemo,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
