import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { 
  Truck, 
  LogIn, 
  AlertCircle, 
  ShieldCheck, 
  Globe, 
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)] font-sans transition-colors duration-300 overflow-hidden">
      
      {/* Left Panel: Branding & Features (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-16 bg-gray-50 overflow-hidden border-r border-gray-200">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 mb-12"
          >
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Truck className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic leading-none">Wedage & Co.</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Fleet Management Systems</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <h2 className="text-5xl font-light text-gray-900 font-serif italic leading-tight max-w-md">
              WEDAGE & COMPANY <br/> <span className="text-indigo-600 font-sans not-italic font-black uppercase text-3xl tracking-widest">PVT LTD</span>
            </h2>
            
            <div className="grid grid-cols-1 gap-6 max-w-xs">
              {[
                { icon: ShieldCheck, text: "Enterprise Grade Authorization" },
                { icon: Globe, text: "Real-time Fleet Telemetry" },
                { icon: LogIn, text: "Advanced CRM & Asset Tracking" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-gray-500 group">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-200 group-hover:border-indigo-500/30 transition-all shadow-sm">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10"
        >
          <a 
            href="https://www.esystemlk.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-2xl group hover:border-indigo-500/30 transition-all shadow-sm"
          >
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Powered by</span>
            <span className="text-xs font-black text-gray-700 uppercase tracking-widest border-l border-gray-100 pl-3">Esystemlk.com</span>
            <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 transform group-hover:translate-x-1 transition-all" />
          </a>
        </motion.div>
      </div>

      {/* Right Panel: Auth Container */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg-main)]">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left">
            <h3 className="text-3xl font-light text-[var(--text-main)] font-serif italic tracking-tight mb-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">
              Welcome to the Wedage & Co. CRM
            </p>
          </div>

          <div className="bg-[var(--bg-surface)] p-10 rounded-[2.5rem] shadow-2xl border border-[var(--border-main)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {!isLogin && (
                  <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start space-x-3 text-amber-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                    <span>Note: Access is restricted after registration. An administrator must approve your account and assign a role before you can use the system.</span>
                  </div>
                )}

                {error && (
                  <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-500 text-sm font-black">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleAuth} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@wedage.com"
                      className="w-full px-5 py-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-main)] text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Password</label>
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-5 py-4 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-main)] text-xs font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center space-x-3 disabled:opacity-50 mt-8 uppercase tracking-[0.2em] text-xs"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>{isLogin ? 'Login Now' : 'Join Team'}</span>
                        {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] hover:text-indigo-500 transition-colors"
            >
              {isLogin ? (
                <>New here? <span className="text-indigo-500 ml-1">Create an account</span></>
              ) : (
                <>Already have an account? <span className="text-indigo-500 ml-1">Sign In</span></>
              )}
            </button>
          </div>

          <div className="lg:hidden text-center pt-8 border-t border-[var(--border-main)]">
            <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest mb-1 italic">Wedage & Company Pvt Ltd</p>
            <a href="https://www.esystemlk.com" target="_blank" className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] hover:text-indigo-500">
              Powered by Esystemlk.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
