import React, { useEffect, useState } from 'react';
import { getLeaveRequests, createLeaveRequest, approveLeaveRequest, rejectLeaveRequest, LeaveRequest } from '../../services/leaveService';
import { useStaff } from '../../hooks/useStaff';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { 
  Calendar as CalendarIcon,
  User,
  Plus,
  X,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';

const LeaveRequestsPage: React.FC = () => {
  const { staff, loading: staffLoading } = useStaff();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
  
  const [formStaffId, setFormStaffId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formLeaveType, setFormLeaveType] = useState<'Holiday' | 'Sick Leave' | 'Half Day' | 'Casual' | 'Other'>('Holiday');
  const [formReason, setFormReason] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getLeaveRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStaffId || !formStartDate || !formEndDate || !formReason) {
      alert('Please fill all required fields');
      return;
    }

    const selectedStaff = staff.find(s => s.id === formStaffId);
    if (!selectedStaff) return;

    try {
      await createLeaveRequest({
        staffId: formStaffId,
        staffName: selectedStaff.fullName,
        staffCategory: selectedStaff.category,
        startDate: formStartDate,
        endDate: formEndDate,
        leaveType: formLeaveType,
        reason: formReason,
        status: 'Pending'
      });
      setIsModalOpen(false);
      // Reset form
      setFormStaffId('');
      setFormStartDate('');
      setFormEndDate('');
      setFormLeaveType('Holiday');
      setFormReason('');
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: string) => {
    if (window.confirm('Are you sure you want to APPROVE this leave request? It will automatically sync to the calendar.')) {
      try {
        await approveLeaveRequest(id, 'Management/HR');
        fetchRequests();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleReject = async (id: string) => {
    if (window.confirm('Are you sure you want to REJECT this leave request?')) {
      try {
        await rejectLeaveRequest(id, 'Management/HR');
        fetchRequests();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredRequests = requests.filter(r => r.status === activeTab);

  if (loading || staffLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="Leave & Holiday Requests" 
        subtitle="Manage leave requests, staff holidays, and half days calibrated with the calendar"
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Request Leave
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-150 overflow-x-auto gap-4 scrollbar-none pb-px shrink-0">
        {(['Pending', 'Approved', 'Rejected'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "text-xs font-black uppercase tracking-widest pb-3 border-b-2 px-4 transition-all shrink-0",
              activeTab === tab
                ? "text-indigo-600 border-indigo-600"
                : "text-gray-400 border-transparent hover:text-gray-600"
            )}
          >
            {tab} ({requests.filter(r => r.status === tab).length})
          </button>
        ))}
      </div>

      {/* Request Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "p-6 rounded-[2rem] border bg-white shadow-sm flex flex-col justify-between",
              req.status === 'Pending' ? "border-amber-100 shadow-amber-500/5" :
              req.status === 'Approved' ? "border-emerald-100 shadow-emerald-500/5" :
              "border-rose-100"
            )}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-black text-gray-900 leading-tight">{req.staffName}</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{req.staffCategory}</p>
                </div>
                <span className={cn(
                  "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border",
                  req.leaveType === 'Holiday' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                  req.leaveType === 'Sick Leave' ? "bg-red-50 text-red-600 border-red-100" :
                  req.leaveType === 'Half Day' ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-gray-50 text-gray-600 border-gray-100"
                )}>
                  {req.leaveType}
                </span>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center gap-4 text-center">
                <div className="flex-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Start Date</p>
                  <p className="text-xs font-black text-gray-900 mt-0.5">{req.startDate}</p>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">End Date</p>
                  <p className="text-xs font-black text-gray-900 mt-0.5">{req.endDate}</p>
                </div>
              </div>

              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason / Notes</p>
                <p className="text-xs font-bold text-gray-650 bg-gray-50/50 p-3 rounded-xl border border-gray-100 italic">
                  "{req.reason}"
                </p>
              </div>
            </div>

            {req.status === 'Pending' && (
              <div className="flex gap-3 pt-6 mt-4 border-t border-gray-100">
                <PermissionGate permission="edit_staff">
                  <button
                    onClick={() => handleReject(req.id!)}
                    className="flex-1 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100 flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(req.id!)}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </PermissionGate>
              </div>
            )}

            {req.status !== 'Pending' && (
              <div className="pt-4 mt-4 border-t border-gray-150 flex items-center justify-between text-[9px] font-black uppercase text-gray-400 tracking-wider">
                <span>Processed by: {req.approvedBy || 'System'}</span>
                <span>{req.approvedAt ? new Date(req.approvedAt.toDate()).toLocaleDateString() : ''}</span>
              </div>
            )}
          </motion.div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-20 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">No {activeTab} Requests</h4>
            <p className="text-xs text-gray-300 mt-1">All leave files are fully up to date.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-md font-black text-gray-900 uppercase tracking-tight">Submit Leave Request</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Select Staff Member</label>
                  <select
                    value={formStaffId}
                    onChange={(e) => setFormStaffId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-gray-900"
                    required
                  >
                    <option value="">Choose personnel...</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.fullName} ({s.category})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Start Date</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">End Date</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Type of Leave</label>
                  <select
                    value={formLeaveType}
                    onChange={(e) => setFormLeaveType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-gray-900"
                  >
                    <option value="Holiday">Holiday / Annual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Detailed Reason</label>
                  <textarea
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-gray-900 resize-none"
                    placeholder="Enter reason for leave..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-250 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaveRequestsPage;
