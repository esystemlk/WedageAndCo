import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  Truck, LogIn, AlertCircle, ShieldCheck, Globe, ArrowRight,
  UserPlus, Eye, EyeOff, Mail, Lock, KeyRound, CheckCircle2,
  ChevronLeft, Zap, BarChart3, Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

type AuthMode = 'login' | 'signup' | 'reset';

const FEATURES = [
  { icon: Truck,      label: 'Fleet & Driver Management' },
  { icon: Package,    label: 'Real-time Inventory Control' },
  { icon: BarChart3,  label: 'Financial & Cost Analytics' },
  { icon: ShieldCheck,label: 'Enterprise-grade Security' },
];

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const clearState = (next: AuthMode) => {
    setError('');
    setResetSent(false);
    setPassword('');
    setShowPassword(false);
    setMode(next);
  };

  // ── Sign in / Sign up ────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/invalid-credential':      'Invalid email or password.',
        'auth/user-not-found':          'No account found with that email.',
        'auth/wrong-password':          'Incorrect password. Try again.',
        'auth/email-already-in-use':    'An account already exists for this email.',
        'auth/weak-password':           'Password must be at least 6 characters.',
        'auth/invalid-email':           'Please enter a valid email address.',
        'auth/too-many-requests':       'Too many attempts. Please try again later.',
      };
      setError(msg[err.code] ?? err.message ?? 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Password reset ───────────────────────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'No account found with that email address.',
        'auth/invalid-email':  'Please enter a valid email address.',
      };
      setError(msg[err.code] ?? 'Failed to send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)] font-sans overflow-hidden">

      {/* ── Left branding panel ──────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[46%] xl:w-1/2 relative flex-col justify-between p-14 xl:p-16 overflow-hidden bg-gray-950">

        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-indigo-600/20 blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-violet-600/15 blur-[100px] animate-pulse [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-indigo-400/5 blur-[80px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        {/* Logo */}
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden shadow-xl">
            <img src="/logo.png.JPEG" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-black text-xl uppercase italic tracking-tight leading-none">Wedage & Company</p>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.35em] mt-1">Fleet Management System</p>
          </div>
        </motion.div>

        {/* Hero text */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative z-10 space-y-10"
        >
          <div>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Enterprise Platform</p>
            <h2 className="text-white font-light text-5xl xl:text-6xl font-serif italic leading-[1.1]">
              Manage.<br/>
              <span className="font-black not-italic bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Track. Grow.
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.label}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-600/20 group-hover:border-indigo-500/40 transition-all">
                  <f.icon className="w-3.5 h-3.5 text-white/50 group-hover:text-indigo-400 transition-colors" />
                </div>
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest group-hover:text-white/60 transition-colors">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer link */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="relative z-10"
        >
          <a href="https://www.esystemlk.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Powered by</span>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest border-l border-white/10 pl-3 group-hover:text-white/70 transition-colors">Esystemlk.com</span>
            <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
          </a>
        </motion.div>
      </div>

      {/* ── Right auth panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px] space-y-8">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center">
            <div className="w-10 h-10 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <img src="/logo.png.JPEG" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <p className="text-[var(--text-main)] font-black text-base uppercase italic">Wedage & Company</p>
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div key={mode}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {mode === 'reset' ? (
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] mb-1.5">Account Recovery</p>
                  <h3 className="text-3xl font-light text-[var(--text-main)] font-serif italic">Reset Password</h3>
                </div>
              ) : mode === 'login' ? (
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] mb-1.5">Welcome back</p>
                  <h3 className="text-3xl font-light text-[var(--text-main)] font-serif italic">Sign In</h3>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.25em] mb-1.5">Join the platform</p>
                  <h3 className="text-3xl font-light text-[var(--text-main)] font-serif italic">Create Account</h3>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Card */}
          <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border-main)] shadow-2xl relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

            <div className="p-8 sm:p-10">
              <AnimatePresence mode="wait">
                <motion.div key={mode}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >

                  {/* ── RESET: success state ── */}
                  {mode === 'reset' && resetSent ? (
                    <div className="text-center space-y-6 py-4">
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[var(--text-main)] font-black text-base mb-2">Reset Email Sent</p>
                        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                          We've sent password reset instructions to<br/>
                          <span className="text-indigo-500 font-bold">{email}</span>.<br/>
                          Check your inbox (and spam folder).
                        </p>
                      </div>
                      <button onClick={() => clearState('login')}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Back to Sign In
                      </button>
                    </div>
                  ) : (

                    // ── Auth form ──
                    <div className="space-y-6">

                      {/* Signup notice */}
                      {mode === 'signup' && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-600 dark:text-amber-400">
                          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] font-black uppercase tracking-wide leading-relaxed">
                            Access is restricted after registration. An admin must approve your account and assign a role.
                          </p>
                        </div>
                      )}

                      {/* Reset info */}
                      {mode === 'reset' && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3 text-indigo-600 dark:text-indigo-400">
                          <KeyRound className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] font-black uppercase tracking-wide leading-relaxed">
                            Enter the email address linked to your account. We'll send a reset link right away.
                          </p>
                        </div>
                      )}

                      {/* Error */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"
                          >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs font-bold">{error}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <form onSubmit={mode === 'reset' ? handleReset : handleAuth} className="space-y-5">

                        {/* Email field */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">
                            Email Address
                          </label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder="name@wedage.com"
                              className="w-full pl-11 pr-5 py-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-main)] text-sm font-bold"
                            />
                          </div>
                        </div>

                        {/* Password field (hidden on reset mode) */}
                        {mode !== 'reset' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                Password
                              </label>
                              {mode === 'login' && (
                                <button
                                  type="button"
                                  onClick={() => clearState('reset')}
                                  className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                                >
                                  Forgot password?
                                </button>
                              )}
                            </div>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={showPassword ? 'Enter your password' : '••••••••••••'}
                                className="w-full pl-11 pr-12 py-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-main)] text-sm font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-indigo-500 transition-colors p-0.5 rounded"
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword
                                  ? <EyeOff className="w-4 h-4" />
                                  : <Eye className="w-4 h-4" />
                                }
                              </button>
                            </div>
                            {mode === 'signup' && (
                              <p className="text-[9px] text-[var(--text-muted)] px-1 font-bold">Minimum 6 characters required.</p>
                            )}
                          </div>
                        )}

                        {/* Submit button */}
                        <button
                          type="submit"
                          disabled={loading}
                          className={cn(
                            "w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2 shadow-xl",
                            mode === 'reset'
                              ? "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                          )}
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : mode === 'login' ? (
                            <><LogIn className="w-4 h-4" /><span>Sign In</span></>
                          ) : mode === 'signup' ? (
                            <><UserPlus className="w-4 h-4" /><span>Create Account</span></>
                          ) : (
                            <><KeyRound className="w-4 h-4" /><span>Send Reset Link</span></>
                          )}
                        </button>
                      </form>

                      {/* Back to login (from reset) */}
                      {mode === 'reset' && (
                        <button onClick={() => clearState('login')}
                          className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-indigo-500 transition-colors mt-2"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Back to Sign In
                        </button>
                      )}
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Toggle login / signup */}
          {mode !== 'reset' && (
            <p className="text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
              {mode === 'login' ? (
                <>New here?{' '}
                  <button onClick={() => clearState('signup')} className="text-indigo-500 hover:text-indigo-600 transition-colors ml-1">
                    Create an account
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => clearState('login')} className="text-indigo-500 hover:text-indigo-600 transition-colors ml-1">
                    Sign In
                  </button>
                </>
              )}
            </p>
          )}

          {/* Mobile footer */}
          <div className="lg:hidden text-center pt-4 border-t border-[var(--border-main)]">
            <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest mb-1 italic">Wedage & Company Pvt Ltd</p>
            <a href="https://www.esystemlk.com" target="_blank" rel="noopener noreferrer"
              className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] hover:text-indigo-500 transition-colors"
            >
              Powered by Esystemlk.com
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
