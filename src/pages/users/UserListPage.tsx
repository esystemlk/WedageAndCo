import React, { useState } from 'react';
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  UserSquare2, 
  ChevronRight,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, ROLE_PERMISSIONS, Permission } from '../../config/roles';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const ROLE_DETAILS: Record<UserRole, { label: string; description: string; color: string; icon: any }> = {
  [UserRole.DEVELOPER]: { 
    label: 'System Architect', 
    description: 'Full infrastructure access and security bypass capability.', 
    color: 'text-rose-600 bg-rose-50 border-rose-100',
    icon: ShieldAlert
  },
  [UserRole.SUPER_ADMIN]: { 
    label: 'Owner / Director', 
    description: 'Complete organizational control and member management.', 
    color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    icon: ShieldCheck
  },
  [UserRole.ADMIN]: { 
    label: 'Fleet Manager', 
    description: 'Operational & Financial oversight without user management.', 
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    icon: UserSquare2
  },
  [UserRole.OPERATIONS]: { 
    label: 'Operations Coordinator', 
    description: 'Manages fleet assets and trip logs.', 
    color: 'text-amber-600 bg-amber-50 border-amber-100',
    icon: Key
  },
  [UserRole.ACCOUNTS]: { 
    label: 'Finance / Accounts', 
    description: 'Billing, invoicing, and financial reporting access.', 
    color: 'text-purple-600 bg-purple-50 border-purple-100',
    icon: Users
  },
  [UserRole.DRIVER]: { 
    label: 'Field Staff', 
    description: 'Basic log access for trip reporting.', 
    color: 'text-gray-500 bg-gray-50 border-gray-200',
    icon: Users
  },
  [UserRole.PENDING]: {
    label: 'Access Requested',
    description: 'Awaiting administrator verification and role assignment.',
    color: 'text-amber-600 bg-amber-50 border-amber-100',
    icon: Clock
  }
};

const UserListPage: React.FC = () => {
  const { users, loading, changeRole } = useUsers();
  const { user: currentUser, role: currentRole, can } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser?.uid && newRole !== UserRole.DEVELOPER && newRole !== UserRole.SUPER_ADMIN) {
      if (!window.confirm('Warning: You are about to demote yourself. You may lose access to this admin feature. Proceed?')) {
        return;
      }
    }

    try {
      setUpdatingId(userId);
      await changeRole(userId, newRole);
      setSuccessMsg(`Member role updated to ${newRole.toUpperCase()}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Operational failure: Unable to sync role changes.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  const allPermissions: Permission[] = [
    'view_users', 'manage_users', 'view_customers', 'edit_customers',
    'view_suppliers', 'edit_suppliers', 'view_staff', 'edit_staff',
    'view_fleet', 'edit_fleet', 'view_logs', 'edit_logs',
    'view_garage', 'edit_garage', 'view_reports', 'view_billing'
  ];

  return (
    <div className="space-y-10 group/page">
      <PageHeader 
        title="User Management" 
        subtitle="Manage team members and system permissions"
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
            activeTab === 'users' ? "bg-indigo-600 text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          Team Members
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={cn(
            "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
            activeTab === 'roles' ? "bg-indigo-600 text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
          )}
        >
          Role Permissions
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3 space-y-6">
             <AnimatePresence>
               {successMsg && (
                 <motion.div 
                   initial={{ opacity: 0, y: -10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0 }}
                   className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-black uppercase tracking-widest"
                 >
                   <CheckCircle2 className="w-4 h-4" />
                   {successMsg}
                 </motion.div>
               )}
             </AnimatePresence>

             <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5 flex-grow">
                <div className="overflow-x-auto relative z-10">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] border-b border-[var(--border-main)]">
                      <tr>
                        <th className="px-10 py-6 font-black text-[10px]">Member</th>
                        <th className="px-10 py-6 font-black text-[10px]">Role</th>
                        <th className="px-10 py-6 font-black text-[10px]">Permissions</th>
                        <th className="px-10 py-6 font-black text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-main)]">
                      {users.map((u, i) => {
                        const details = ROLE_DETAILS[u.role] || ROLE_DETAILS[UserRole.DRIVER];
                        const Icon = details.icon;
                        const isSelf = u.id === currentUser?.uid;

                        return (
                          <motion.tr 
                            key={u.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                              "group transition-all",
                              isSelf ? "bg-indigo-50" : "hover:bg-gray-50/50",
                              u.role === UserRole.PENDING && "bg-amber-50/30"
                            )}
                          >
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-5">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform shadow-sm",
                                  u.role === UserRole.PENDING ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-gray-50 border border-gray-100 text-indigo-600"
                                )}>
                                  {u.role === UserRole.PENDING ? <Clock className="w-6 h-6" /> : (u.displayName?.charAt(0) || u.email?.charAt(0).toUpperCase())}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3">
                                    <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">
                                      {u.displayName || 'User'}
                                    </p>
                                    {isSelf && <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded-full tracking-widest">YOU</span>}
                                    {u.role === UserRole.PENDING && (
                                      <span className="text-[8px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-black tracking-widest animate-pulse">NEW REQUEST</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 tracking-wider">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                               <div className={cn(
                                 "inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest bg-opacity-10 whitespace-nowrap",
                                 details.color
                               )}>
                                 <Icon className="w-3 h-3" />
                                 {details.label}
                               </div>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                                {ROLE_PERMISSIONS[u.role]?.map(p => (
                                  <span 
                                    key={p} 
                                    className="text-[7px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/30 transition-colors cursor-default"
                                    title={p.split('_').join(' ').toUpperCase()}
                                  >
                                    {p.split('_').join(' ')}
                                  </span>
                                ))}
                                {(!ROLE_PERMISSIONS[u.role] || ROLE_PERMISSIONS[u.role].length === 0) && (
                                  <span className="text-[7px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 italic">
                                    No permissions assigned
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-10 py-6 text-right">
                               {can('manage_users') ? (
                                 <div className="flex items-center justify-end gap-3">
                                    {u.role === UserRole.PENDING && (
                                      <button
                                        onClick={() => handleRoleChange(u.id, UserRole.DRIVER)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                                      >
                                        Approve Access
                                      </button>
                                    )}
                                    <select
                                      disabled={updatingId === u.id || (u.role === UserRole.DEVELOPER && currentRole !== UserRole.DEVELOPER)}
                                      value={u.role}
                                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                      className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] focus:border-indigo-500/50 outline-none transition-all disabled:opacity-30 cursor-pointer"
                                    >
                                      {Object.entries(UserRole).map(([key, value]) => (
                                        <option key={value} value={value} className="bg-[var(--bg-main)] text-[var(--text-main)]" disabled={value === UserRole.DEVELOPER && currentRole !== UserRole.DEVELOPER}>
                                          {value === UserRole.PENDING ? 'Access Request' : `Assign ${key}`}
                                        </option>
                                      ))}
                                    </select>
                                    {updatingId === u.id && (
                                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    )}
                                 </div>
                               ) : (
                                 <Shield className="w-4 h-4 text-[var(--border-main)] opacity-50 ml-auto" />
                               )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>

          {/* Permission Information Sidebar */}
          <div className="space-y-8">
             <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-[2rem] p-8 space-y-8 shadow-sm">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                      <Shield className="w-6 h-6 text-white" />
                   </div>
                   <div>
                      <h3 className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">Help</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-1 tracking-widest">Role Definitions</p>
                   </div>
                </div>

                <div className="space-y-6">
                   {Object.entries(ROLE_DETAILS).map(([role, detail]) => (
                     <div key={role} className="space-y-2">
                        <div className="flex items-center gap-2">
                           <detail.icon className={cn("w-3 h-3", detail.color.split(' ')[0])} />
                           <span className={cn("text-[9px] font-black uppercase tracking-widest", detail.color.split(' ')[0])}>
                             {detail.label}
                           </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium italic">
                          {detail.description}
                        </p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      ) : (
       <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/5 p-10">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
               <thead className="bg-gray-50 text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] border-b border-[var(--border-main)]">
                <tr>
                  <th className="px-6 py-6 font-black">Role Name</th>
                  {Object.values(UserRole).map(r => (
                    <th key={r} className="px-4 py-6 font-black text-center whitespace-nowrap">
                      {ROLE_DETAILS[r]?.label.split(' ')[0] || r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {allPermissions.map((perm, i) => (
                  <motion.tr 
                    key={perm}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">{perm.replace(/_/g, ' ')}</p>
                    </td>
                    {Object.values(UserRole).map(r => {
                      const hasPerm = ROLE_PERMISSIONS[r].includes(perm);
                      return (
                        <td key={r} className="px-4 py-5 text-center">
                          {hasPerm ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto opacity-80" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-main)] mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListPage;
