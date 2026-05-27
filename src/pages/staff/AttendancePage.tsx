import React, { useState, useEffect } from 'react';
import { useStaff } from '../../hooks/useStaff';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAttendanceForDate,
  saveAttendanceForDate,
  AttendanceStatus,
} from '../../services/attendanceService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import {
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';

const AttendancePage: React.FC = () => {
  const { staff, loading } = useStaff();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Operations' | 'Office Staff'>('Operations');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});

  // Load saved attendance whenever date changes
  useEffect(() => {
    getAttendanceForDate(date).then(setAttendanceRecords);
  }, [date]);

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          member.phone.includes(searchTerm);
    
    // Group "Drivers & Helpers" (Operations) vs "Office Staff"
    const isOps = ['Driver', 'Helper', 'Cleaner', 'Garage'].includes(member.category);
    const matchesTab = activeTab === 'Operations' ? isOps : !isOps;
    
    return matchesSearch && matchesTab;
  });

  const handleMarkAttendance = (staffId: string, status: AttendanceStatus) => {
    setAttendanceRecords(prev => ({ ...prev, [staffId]: status }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveAttendanceForDate(date, attendanceRecords, user?.email || 'Unknown');
      setSaveMsg('Attendance saved successfully!');
    } catch (err) {
      setSaveMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Attendance Register" 
        subtitle={`Daily Roster & Workforce Tracking • ${date}`}
        actions={
          <div className="flex gap-4">
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-11 pr-5 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-bold text-gray-900 shadow-sm"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-gray-900 shadow-sm placeholder:text-gray-400"
              />
            </div>
            <PermissionGate permission="edit_staff">
              <div className="flex flex-col items-end gap-1">
                {saveMsg && (
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    saveMsg.includes('success') ? 'text-emerald-600' : 'text-rose-600'
                  )}>{saveMsg}</p>
                )}
                <button
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Registry'}</span>
                </button>
              </div>
            </PermissionGate>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-[60vh]">
        <div className="bg-gray-50 px-8 pt-4 pb-0 border-b border-gray-100 flex items-center gap-8 overflow-x-auto scrollbar-hide">
          {(['Operations', 'Office Staff'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-sm font-bold capitalize transition-all pb-4 border-b-2 whitespace-nowrap",
                activeTab === tab 
                  ? "text-gray-900 border-indigo-500" 
                  : "text-gray-400 hover:text-gray-600 border-transparent"
              )}
            >
              {tab === 'Operations' ? 'Drivers, Helpers & Garage' : 'Office Staff'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5 font-bold">Name & Identifier</th>
                  <th className="px-8 py-5 font-bold">Role / Type</th>
                  <th className="px-8 py-5 font-bold text-center">Status</th>
                  <th className="px-8 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredStaff.map((member, i) => {
                  const currentStatus = attendanceRecords[member.id!] || null;
                  
                  return (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100 shadow-sm">
                            {member.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{member.fullName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">IDX-{member.id?.slice(-6).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-2 py-1 text-[10px] uppercase font-black tracking-widest rounded border",
                          member.category === 'Driver' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          member.category === 'Helper' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          member.category === 'Office Staff' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-gray-50 text-gray-600 border-gray-100'
                        )}>
                          {member.category}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex justify-center">
                            {currentStatus ? (
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold border",
                                currentStatus === 'Present' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                currentStatus === 'Absent' ? "bg-red-50 text-red-600 border-red-200" :
                                "bg-amber-50 text-amber-600 border-amber-200"
                              )}>
                                {currentStatus}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium italic">Unmarked</span>
                            )}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-100 transition-all">
                          <button 
                            onClick={() => handleMarkAttendance(member.id!, 'Present')}
                            className={cn("p-2 rounded-lg transition-colors border", currentStatus === 'Present' ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'text-gray-400 hover:text-emerald-600 border-transparent hover:bg-emerald-50')}
                            title="Mark Present"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(member.id!, 'Half-Day')}
                            className={cn("p-2 rounded-lg transition-colors border", currentStatus === 'Half-Day' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'text-gray-400 hover:text-amber-600 border-transparent hover:bg-amber-50')}
                            title="Mark Half-Day"
                          >
                            <Clock className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(member.id!, 'Absent')}
                            className={cn("p-2 rounded-lg transition-colors border", currentStatus === 'Absent' ? 'bg-red-100 border-red-300 text-red-700' : 'text-gray-400 hover:text-red-600 border-transparent hover:bg-red-50')}
                            title="Mark Absent"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filteredStaff.length === 0 && (
              <div className="py-24 text-center">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No personnel found for this roster.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
