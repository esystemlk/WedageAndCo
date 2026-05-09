import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings as SettingsIcon, 
  Palette, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateSelf, getUserProfile, UserProfile } from '../services/userService';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase/config';
import PageHeader from '../components/shared/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    theme, 
    setTheme, 
    primaryColor, 
    setPrimaryColor, 
    accentColor, 
    setAccentColor 
  } = useTheme();

  const PRESET_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Rose', value: '#fb7185' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Violet', value: '#8b5cf6' },
  ];
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Profile Form
  const [displayName, setDisplayName] = useState('');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const data = await getUserProfile(user.uid);
        if (data) {
          setProfile(data);
          setDisplayName(data.displayName || '');
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setUpdating(true);
    try {
      await updateSelf(user.uid, { displayName });
      setStatus({ type: 'success', msg: 'Profile updated successfully.' });
      setProfile(prev => prev ? { ...prev, displayName } : null);
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Failed to update profile.' });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }

    setUpdating(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setStatus({ type: 'success', msg: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', msg: err.message || 'Verification failed.' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 group/page">
      <PageHeader 
        title="Settings" 
        subtitle="Manage your profile, theme, and security settings."
      />

      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3 border text-xs font-black uppercase tracking-widest shadow-sm",
              status.type === 'success' 
                ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                : "bg-rose-50 border-rose-100 text-rose-600"
            )}
          >
            {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Profile Details */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 opacity-80">Profile Info</h2>
          </div>

          <form onSubmit={handleProfileUpdate} className="bg-white border border-gray-100 p-8 rounded-[2rem] space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Email Address</label>
                <div className="bg-gray-50 border border-gray-100 px-5 py-3 rounded-xl text-[11px] font-mono text-gray-400 cursor-not-allowed">
                  {user?.email}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Display Name</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 focus:border-indigo-500/50 focus:bg-white transition-all outline-none px-5 py-3 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-300 mt-1 shadow-sm"
                  placeholder="Enter your display name..."
                />
              </div>
            </div>

            <button 
              disabled={updating || displayName === profile?.displayName}
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-[0.2em] py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-100"
            >
              {updating ? 'Updating...' : 'Save Profile'}
            </button>
          </form>
        </section>

        {/* Security / Password */}
        <section className="space-y-6">
          {/* Theme Colors */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 opacity-80">Interface Branding</h2>
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-[2rem] space-y-8 shadow-sm">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Primary Theme Color</label>
              <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setPrimaryColor(c.value)}
                    className={cn(
                      "w-10 h-10 rounded-xl border-4 transition-all transform hover:scale-110 shadow-sm",
                      primaryColor === c.value ? "border-gray-100 shadow-xl scale-110" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
                <div className="relative group">
                  <input 
                    type="color" 
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer opacity-0 absolute inset-0 z-10"
                  />
                  <div 
                    className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center bg-gray-50 group-hover:scale-110 transition-all overflow-hidden"
                  >
                    <div className="w-full h-full" style={{ backgroundColor: primaryColor, opacity: 0.5 }} />
                    <span className="absolute text-[10px] font-black text-gray-900 mix-blend-difference">Custom</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Accent Highlight Color</label>
              <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setAccentColor(c.value)}
                    className={cn(
                      "w-10 h-10 rounded-xl border-4 transition-all transform hover:scale-110 shadow-sm",
                      accentColor === c.value ? "border-gray-100 shadow-xl scale-110" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
                <div className="relative group">
                  <input 
                    type="color" 
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer opacity-0 absolute inset-0 z-10"
                  />
                  <div 
                    className="w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center bg-gray-50 group-hover:scale-110 transition-all overflow-hidden"
                  >
                    <div className="w-full h-full" style={{ backgroundColor: accentColor, opacity: 0.5 }} />
                    <span className="absolute text-[10px] font-black text-gray-900 mix-blend-difference">Custom</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2 mt-10">
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 opacity-80">Change Password</h2>
          </div>

          <form onSubmit={handlePasswordUpdate} className="bg-white border border-gray-100 p-8 rounded-[2rem] space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 focus:border-indigo-500/50 focus:bg-white transition-all outline-none px-5 py-3 rounded-xl text-xs font-bold text-gray-900 shadow-sm shadow-inner"
                  />
                  <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600">
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-gray-50 border border-gray-100 focus:border-indigo-500/50 focus:bg-white transition-all outline-none px-5 py-3 rounded-xl text-xs font-bold text-gray-900 shadow-sm shadow-inner"
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600">
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Confirm New Password</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-100 focus:border-indigo-500/50 focus:bg-white transition-all outline-none px-5 py-3 rounded-xl text-xs font-bold text-gray-900 shadow-sm shadow-inner"
                />
              </div>
            </div>

            <button 
              disabled={updating || !currentPassword || !newPassword}
              type="submit"
              className="w-full bg-gray-900 text-white hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-[0.2em] py-3.5 rounded-xl transition-all shadow-xl shadow-gray-200"
            >
              {updating ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
