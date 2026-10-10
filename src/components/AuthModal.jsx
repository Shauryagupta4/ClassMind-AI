import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Lock, Mail, User, Sparkles, ArrowRight, ShieldCheck, 
  Phone, KeyRound, CheckCircle2, RotateCw, Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AuthModal({ isOpen, onClose }) {
  const { 
    signIn, 
    signUp, 
    signInWithGoogle, 
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp, 
    verifyPhoneOtp, 
    signInAsDemo 
  } = useAuth();

  // Mode: 'email-otp' | 'email-password' | 'phone-otp'
  const [authMethod, setAuthMethod] = useState('email-otp');
  const [isSignUp, setIsSignUp] = useState(false);

  // Email OTP states
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpStep, setEmailOtpStep] = useState('email'); // 'email' | 'verify'
  const [emailCode, setEmailCode] = useState('');

  // Email & Password form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Phone OTP states
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'otp'
  const [otp, setOtp] = useState('');
  const [generatedDemoOtp, setGeneratedDemoOtp] = useState('');

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Real Email OTP Send
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!emailOtp || !emailOtp.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const res = await sendEmailOtp(emailOtp.trim());
      if (res?.success) {
        setEmailOtpStep('verify');
      }
    } catch (err) {
      // toast shown in context
    } finally {
      setLoading(false);
    }
  };

  // Handle Real Email OTP Verify
  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    if (!emailCode || emailCode.trim().length < 6) {
      toast.error('Please enter the 6-digit OTP code sent to your email');
      return;
    }
    setLoading(true);
    try {
      await verifyEmailOtp(emailOtp.trim(), emailCode.trim());
      onClose();
    } catch (err) {
      // toast shown in context
    } finally {
      setLoading(false);
    }
  };

  // Handle Email & Password Submit
  const handleEmailSubmit = async (e) => {
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
      // toast shown in context
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone Send OTP
  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await sendPhoneOtp(cleanPhone);
      if (res?.success) {
        setOtpStep('otp');
        if (res.code) {
          setGeneratedDemoOtp(res.code);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone Verify OTP
  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      toast.error('Please enter the verification code');
      return;
    }
    setLoading(true);
    try {
      await verifyPhoneOtp(phone, otp);
      onClose();
    } catch (err) {
      // toast shown in context
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
          className="relative w-full max-w-md bg-[#FFF9F5] border-4 border-black rounded-3xl p-6 md:p-8 shadow-[8px_8px_0px_#000] max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFCCD5] hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
          >
            <X className="w-4 h-4 text-black" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1C5] border-2 border-black text-xs font-mono font-bold mb-2.5 shadow-[2px_2px_0px_#000]">
              <ShieldCheck className="w-3.5 h-3.5 text-black" />
              <span>SUPABASE + FIREBASE AUTH</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-black tracking-tight">
              {authMethod === 'email-otp' && (emailOtpStep === 'verify' ? 'Enter Email OTP' : 'Real Email OTP')}
              {authMethod === 'phone-otp' && (otpStep === 'otp' ? 'Enter Mobile OTP' : 'Phone Login')}
              {authMethod === 'email-password' && (isSignUp ? 'Create Scholar Account' : 'Welcome Back')}
            </h2>
            <p className="text-xs text-zinc-600 font-bold mt-1">
              Sign in to unlock unlimited lecture processing, exam radars & revision flashcards
            </p>
          </div>

          {/* 1-Click Demo Button for Judges */}
          <button
            type="button"
            onClick={handleDemoAccess}
            className="w-full mb-3.5 py-3 px-4 rounded-2xl bg-[#C7E9DE] text-black font-black text-xs md:text-sm uppercase tracking-wider border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-[#b2e0d3] hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 fill-current animate-bounce" />
            <span>⚡ 1-Click Instant Demo Login (For Judges)</span>
          </button>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mb-3.5 py-2.5 px-4 rounded-2xl bg-white text-black font-black text-xs md:text-sm border-3 border-black shadow-[3px_3px_0px_#000] hover:bg-zinc-50 hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Authentication Method Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1.5 mb-4 bg-zinc-200/80 p-1 rounded-2xl border-2 border-black">
            <button
              type="button"
              onClick={() => { setAuthMethod('email-otp'); setEmailOtpStep('email'); }}
              className={`py-2 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                authMethod === 'email-otp'
                  ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              <Mail className="w-3 h-3" />
              <span>Email OTP</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMethod('phone-otp'); setOtpStep('phone'); }}
              className={`py-2 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                authMethod === 'phone-otp'
                  ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              <Phone className="w-3 h-3" />
              <span>Mobile OTP</span>
            </button>

            <button
              type="button"
              onClick={() => { setAuthMethod('email-password'); }}
              className={`py-2 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                authMethod === 'email-password'
                  ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Password</span>
            </button>
          </div>

          {/* METHOD 1: REAL EMAIL OTP (Supabase Built-in Real Email Verification) */}
          {authMethod === 'email-otp' && (
            <div>
              {emailOtpStep === 'email' ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                      Enter Your Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        required
                        placeholder="you@gmail.com"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                      />
                    </div>
                    <p className="text-[11px] font-medium text-zinc-500 mt-1">
                      📬 We will send a real 6-digit verification code directly to your email inbox.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#FFCCD5] text-black font-black text-xs md:text-sm uppercase tracking-wider border-3 border-black shadow-[4px_4px_0px_#000] hover:bg-[#ffb3c1] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{loading ? 'Sending Code...' : 'Send Real 6-Digit Email OTP'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black uppercase tracking-wider text-black">
                        Enter 6-Digit Email Code
                      </label>
                      <button
                        type="button"
                        onClick={() => { setEmailOtpStep('email'); setEmailCode(''); }}
                        className="text-[11px] font-bold text-zinc-600 underline"
                      >
                        Change Email
                      </button>
                    </div>

                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        maxLength="6"
                        required
                        placeholder="••••••"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black rounded-xl text-xl font-mono font-black tracking-widest text-center text-black focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                      />
                    </div>

                    <p className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-300 p-2 rounded-xl mt-2 text-center">
                      ✉️ Code delivered to <b>{emailOtp}</b>. Check your Inbox (or Spam folder).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#C7E9DE] text-black font-black text-xs md:text-sm uppercase tracking-wider border-3 border-black shadow-[4px_4px_0px_#000] hover:bg-[#b2e0d3] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify OTP & Complete Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      className="text-xs font-bold text-zinc-700 hover:text-black flex items-center justify-center gap-1 mx-auto"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Didn't receive email? Resend Code</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* METHOD 2: MOBILE NUMBER & OTP (Firebase / Gateway) */}
          {authMethod === 'phone-otp' && (
            <div>
              {otpStep === 'phone' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <div className="px-3 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-black text-black shadow-[2px_2px_0px_#000] flex items-center">
                        🇮🇳 +91
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="tel"
                          required
                          placeholder="98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Firebase Invisible reCAPTCHA Anchor */}
                  <div id="recaptcha-container" className="my-1"></div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#FFF1C5] text-black font-black text-xs md:text-sm uppercase tracking-wider border-3 border-black shadow-[4px_4px_0px_#000] hover:bg-[#ffe8a3] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Sending OTP...' : 'Send Mobile OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black uppercase tracking-wider text-black">
                        Enter 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={() => { setOtpStep('phone'); setOtp(''); }}
                        className="text-[11px] font-bold text-zinc-600 underline"
                      >
                        Change Number
                      </button>
                    </div>

                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        maxLength="6"
                        required
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black rounded-xl text-lg font-mono font-black tracking-widest text-center text-black focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000]"
                      />
                    </div>

                    {generatedDemoOtp && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-100 border-2 border-black flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="text-xs font-bold text-emerald-950">
                            Demo Gateway OTP: <strong className="font-mono text-sm">{generatedDemoOtp}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOtp(generatedDemoOtp)}
                          className="px-2 py-0.5 bg-white border border-black rounded text-[11px] font-black uppercase shadow-[1px_1px_0px_#000]"
                        >
                          Auto-Fill
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-[#C7E9DE] text-black font-black text-xs md:text-sm uppercase tracking-wider border-3 border-black shadow-[4px_4px_0px_#000] hover:bg-[#b2e0d3] hover:-translate-y-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify OTP & Log In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      className="text-xs font-bold text-zinc-700 hover:text-black flex items-center justify-center gap-1 mx-auto"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Didn't receive SMS? Resend OTP</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* METHOD 3: EMAIL & PASSWORD FORM */}
          {authMethod === 'email-password' && (
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
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
                <span>{loading ? 'Processing...' : (isSignUp ? 'Create Scholar Account' : 'Sign In')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs font-bold text-zinc-700 hover:text-black underline underline-offset-4 cursor-pointer"
                >
                  {isSignUp 
                    ? 'Already registered? Sign in here' 
                    : "New to ClassMind? Create an account"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
