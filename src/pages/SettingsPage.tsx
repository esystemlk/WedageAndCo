import React, { useState, useEffect, useRef } from 'react';
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
  Monitor,
  Database,
  Download,
  Upload,
  FileJson,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateSelf, getUserProfile, UserProfile } from '../services/userService';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserRole } from '../config/roles';
import { exportDatabase, importDatabase, ImportProgress } from '../services/backupService';
import PageHeader from '../components/shared/PageHeader';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const SettingsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { 
    theme, 
    setTheme, 
    primaryColor, 
    setPrimaryColor, 
    accentColor, 
    setAccentColor 
  } = useTheme();

  // Backup / Restore States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setBackupStatus(null);
    try {
      const jsonString = await exportDatabase();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wedage_backup_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupStatus({ type: 'success', msg: 'Database backup downloaded successfully!' });
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      console.error(err);
      setBackupStatus({ type: 'error', msg: 'Failed to export database.' });
      setTimeout(() => setBackupStatus(null), 4000);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      "CRITICAL ACTION REQUIRED!\n\nThis will restore and overwrite Firestore documents using the backup file data, matching original ID mappings.\n\nAre you sure you want to proceed?"
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    setBackupStatus(null);
    setImportProgress(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        await importDatabase(jsonContent, (progress) => {
          setImportProgress(progress);
        });
        setBackupStatus({ type: 'success', msg: 'Database imported and restored completely!' });
        setTimeout(() => setBackupStatus(null), 5000);
      } catch (err: any) {
        console.error(err);
        setBackupStatus({ type: 'error', msg: err.message || 'Import failed: Incorrect backup file structure.' });
        setTimeout(() => setBackupStatus(null), 5000);
      } finally {
        setImporting(false);
        setImportProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

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

      {/* Developer & Superadmin JSON Database Snapshot Utility */}
      {(role === UserRole.DEVELOPER || role === UserRole.SUPER_ADMIN) && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pt-10 border-t border-gray-150"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Database className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 opacity-80">Database Administration</h2>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">Role Authorization: Developer / Super Admin</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm space-y-8">
            <div className="max-w-2xl">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Unified JSON Database Backup & Restore Utility</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                As a designated system administrator, you can download a complete backup of the entire CRM platform (including all operational tables, configuration records, logs, and user profile parameters) to a single portable JSON file. You may also restore the database by uploading a previously exported snapshot.
              </p>
            </div>

            <AnimatePresence>
              {backupStatus && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "p-4 rounded-xl flex items-center gap-3 border text-xs font-bold shadow-inner",
                    backupStatus.type === 'success' 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                      : "bg-rose-50 border-rose-100 text-rose-600"
                  )}
                >
                  {backupStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{backupStatus.msg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress Log for Restoring */}
            <AnimatePresence>
              {importProgress && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl space-y-4 overflow-hidden"
                >
                  <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-indigo-600">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Importing: {importProgress.currentCollection}
                    </span>
                    <span>
                      {importProgress.processedCount} / {importProgress.totalCount} Documents
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-200" 
                      style={{ 
                        width: `${importProgress.totalCount > 0 ? (importProgress.processedCount / importProgress.totalCount) * 100 : 0}%` 
                      }} 
                    />
                  </div>

                  <div className="text-[10px] text-gray-500 font-medium">
                    <p className="font-bold mb-1">Restored Collections:</p>
                    <div className="flex flex-wrap gap-2">
                      {importProgress.collectionsDone.map((c) => (
                        <span key={c} className="bg-indigo-100/50 border border-indigo-200/50 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Export Panel */}
              <div className="border border-gray-100 p-6 rounded-2xl bg-gray-50/50 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-indigo-500" />
                    Export Full Snapshot
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    Download a secure JSON archive containing all user profile structures, business records, and log details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || importing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 text-[10px] font-black uppercase tracking-[0.25em] py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 mt-4"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Backing Up...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Export Data File</span>
                    </>
                  )}
                </button>
              </div>

              {/* Import Panel */}
              <div className="border border-gray-100 p-6 rounded-2xl bg-gray-50/50 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    Restore From Backup
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    Restore and replace Firestore collections using an existing JSON backup file. User directories and tables will be updated.
                  </p>
                </div>
                
                <div>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    disabled={exporting || importing}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={exporting || importing}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 text-[10px] font-black uppercase tracking-[0.25em] py-3.5 rounded-xl transition-all shadow-lg shadow-rose-100 flex items-center justify-center gap-2 mt-4"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Restoring...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Import Backup File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </div>
  );
};

export default SettingsPage;
