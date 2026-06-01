import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarCheck, Plus, Truck, User, Clock, MapPin, CheckCircle2,
  XCircle, AlertTriangle, Trash2, Eye, RefreshCw, Filter, Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getBookings, approveBooking, rejectBooking, deleteBooking,
  VehicleBooking, BookingStatus
} from '../../services/bookingService';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const STATUS_CFG: Record<BookingStatus, { label: string; bg: string; text: string; border: string }> = {
  pending:   { label: 'Pending',   bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200'  },
  approved:  { label: 'Approved',  bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200'},
  rejected:  { label: 'Rejected',  bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200'    },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-50',    text: 'text-gray-500',   border: 'border-gray-200'   },
  completed: { label: 'Completed', bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200'   },
};

const VehicleBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [rejectModal, setRejectModal] = useState<{ id: string; plate: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setBookings(await getBookings());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    await approveBooking(id, user?.email || 'Manager');
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'approved', approvedBy: user?.email } : b));
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal.id);
    await rejectBooking(rejectModal.id, rejectReason, user?.email || 'Manager');
    setBookings(prev => prev.map(b => b.id === rejectModal.id ? { ...b, status: 'rejected', rejectionReason: rejectReason } : b));
    setRejectModal(null);
    setRejectReason('');
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this booking?')) return;
    await deleteBooking(id);
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const counts = {
    pending:  bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    all:      bookings.length,
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Vehicle Bookings</h1>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
            Request · Approve · Track
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => navigate('/fleet/bookings/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Booking Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'all',     label: 'Total Bookings', value: counts.all,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { key: 'pending', label: 'Pending Review', value: counts.pending,  color: 'text-amber-600',  bg: 'bg-amber-50'  },
          { key: 'approved',label: 'Active / Approved',value: counts.approved,color:'text-emerald-600',bg: 'bg-emerald-50'},
        ].map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter(s.key as any)}
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className={cn("text-3xl font-black mt-1", s.color)}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected', 'completed', 'cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
              filter === f
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
            )}
          >
            {f === 'all' ? 'All' : STATUS_CFG[f].label}
            {f === 'pending' && counts.pending > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white border border-gray-100 rounded-[2rem]">
          <CalendarCheck className="w-12 h-12 text-gray-200" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No bookings found</p>
          <button onClick={() => navigate('/fleet/bookings/new')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
            <Plus className="w-3 h-3" /> Create First Booking
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((b, i) => {
              const cfg = STATUS_CFG[b.status];
              const isPending = b.status === 'pending';
              return (
                <motion.div key={b.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ delay: i * 0.03 }}
                  className={cn(
                    "bg-white border rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all",
                    isPending ? "border-amber-200" : "border-gray-100"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                          {b.vehiclePlate}
                        </span>
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border", cfg.bg, cfg.text, cfg.border)}>
                          {cfg.label}
                        </span>
                        {b.driverRequired && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-600 border border-violet-200 rounded-full text-[10px] font-black">
                            <User className="w-3 h-3" /> Driver needed
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-bold">{b.requestedBy}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{b.destination}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{b.fromDate} {b.fromTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{b.toDate} {b.toTime}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        <span className="font-bold text-gray-700">Purpose: </span>{b.purpose}
                      </p>

                      {b.rejectionReason && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                          <span className="font-black">Rejected: </span>{b.rejectionReason}
                        </p>
                      )}
                      {b.approvedBy && b.status === 'approved' && (
                        <p className="text-[10px] text-emerald-600 font-bold">✓ Approved by {b.approvedBy}</p>
                      )}
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleApprove(b.id!)}
                            disabled={actionLoading === b.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                          >
                            {actionLoading === b.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModal({ id: b.id!, plate: b.vehiclePlate })}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(b.id!)}
                        className="p-2 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-gray-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40" onClick={() => setRejectModal(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-red-100 rounded-xl">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900">Reject Booking</h3>
                  <p className="text-xs text-gray-500">{rejectModal.plate}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason for rejection *</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this booking is being rejected..."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-red-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400 resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-black text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || actionLoading !== null}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VehicleBookingPage;
