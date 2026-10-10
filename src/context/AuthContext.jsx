import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, syncUserProfile } from '../lib/supabase';
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn("Google OAuth warning:", err);
      // If Google OAuth isn't enabled in user's Supabase dashboard yet, offer graceful demo fallback
      toast.error(err.message || 'Google Auth is initializing. Check Supabase OAuth provider settings.');
      throw err;
    }
  };

  const sendPhoneOtp = async (phone) => {
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone
      });
      if (error) {
        // If SMS provider (Twilio/MessageBird) is not configured in Supabase, provide fallback test OTP
        console.warn("Supabase Phone OTP note:", error.message);
        if (error.message.includes('SMS provider') || error.message.includes('not configured') || error.message.includes('provider')) {
          // Generate a local mock OTP for frictionless hackathon demonstration
          const mockOtp = '123456';
          sessionStorage.setItem('classmind_mock_phone', formattedPhone);
          sessionStorage.setItem('classmind_mock_otp', mockOtp);
          toast.success(`OTP Sent to ${formattedPhone}! (Demo Mode: Use code 123456)`, { duration: 6000 });
          return { success: true, mock: true, code: mockOtp };
        }
        throw error;
      }
      toast.success(`6-digit OTP sent to ${formattedPhone}!`);
      return { success: true, data };
    } catch (err) {
      // If Supabase throws error because SMS gateway isn't connected
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
      const mockOtp = '123456';
      sessionStorage.setItem('classmind_mock_phone', formattedPhone);
      sessionStorage.setItem('classmind_mock_otp', mockOtp);
      toast.success(`SMS Gateway Simulated! Enter code 123456 to verify.`, { duration: 6000 });
      return { success: true, mock: true, code: mockOtp };
    }
  };

  const verifyPhoneOtp = async (phone, token) => {
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
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

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token,
        type: 'sms'
      });
      if (error) throw error;
      if (data?.user) {
        setUser(data.user);
        syncUserProfile(data.user);
      }
      toast.success('Phone verified successfully!');
      return data;
    } catch (err) {
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
