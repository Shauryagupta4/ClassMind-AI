import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { signIn, signUp, signInAsDemo } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
      } else {
        await signIn(email, password);
      }
      onClose();
    } catch (err) {
      // toast already shown in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    signInAsDemo();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#FFF9F5] border-4 border-black rounded-3xl p-6 md:p-8 shadow-[8px_8px_0px_#000]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFCCD5] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-black" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1C5] border-2 border-black text-xs font-mono font-bold mb-3 shadow-[2px_2px_0px_#000]">
              <ShieldCheck className="w-3.5 h-3.5 text-black" />
              <span>SUPABASE AUTH ENGINE</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-black tracking-tight">
              {isSignUp ? 'Create Scholar Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-zinc-600 font-bold mt-1">
              Save your high-yield lectures and sync revision quizzes across devices
            </p>
          </div>

          {/* 1-Click Demo Button for Judges */}
          <button
            type="button"
            onClick={handleDemoAccess}
            className="w-full mb-5 py-3 px-4 rounded-2xl bg-[#C7E9DE] text-black font-black text-xs md:text-sm uppercase tracking-wider border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#b2e0d3] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 fill-current animate-bounce" />
            <span>⚡ 1-Click Instant Demo Login (For Judges)</span>
          </button>

          <div className="flex items-center gap-2 mb-5">
            <div className="h-0.5 bg-black/20 flex-1" />
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">OR WITH EMAIL</span>
            <div className="h-0.5 bg-black/20 flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaurya Gupta"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#FFCCD5] text-black font-black text-xs md:text-sm uppercase tracking-wider border-3 border-black shadow-[4px_4px_0px_#000] hover:bg-[#ffb3c1] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle between Login and Signup */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-bold text-zinc-700 hover:text-black underline underline-offset-4 cursor-pointer"
            >
              {isSignUp 
                ? 'Already have an account? Sign in here' 
                : "Don't have an account? Sign up for free"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
