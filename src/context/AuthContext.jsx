import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
      setUser(session?.user || getDemoUser());
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
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
      signInAsDemo,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
