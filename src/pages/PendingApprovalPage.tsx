import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Clock, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { motion } from 'motion/react';

const PendingApprovalPage: React.FC = () => {
  const { user } = useAuth();

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-rose-500/5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-gray-100 rounded-[2.5rem] p-10 text-center shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        
        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-100 group shadow-sm">
          <Clock className="w-10 h-10 text-indigo-600 animate-pulse" />
        </div>

        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4">
          Access Requested
        </h1>
        
        <div className="space-y-4 text-gray-500 text-sm leading-relaxed mb-10">
          <p>
            Hello, <span className="text-gray-900 font-bold">{user?.displayName || 'Operator'}</span>. 
            Your request to join the Wedage & Co. Fleet System has been received.
          </p>
          <p className="bg-gray-50 p-4 rounded-2xl border border-gray-100 italic font-medium">
            "Security is our priority. An administrator must verify your credentials and assign an operational role before you can proceed."
          </p>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-left shadow-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-tight">
              Our team will review your account shortly. Please check back later.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full py-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-2xl text-xs font-black text-gray-900 uppercase tracking-widest transition-all group shadow-sm"
          >
            <LogOut className="w-4 h-4 text-gray-400 group-hover:text-rose-600 transition-colors" />
            Sign Out
          </button>
        </div>
        
        <p className="mt-8 text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">
          Wedage & Company PVT LTD
        </p>
      </motion.div>
    </div>
  );
};

export default PendingApprovalPage;
