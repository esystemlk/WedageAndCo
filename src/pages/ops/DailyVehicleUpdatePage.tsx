import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Truck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LayoutDashboard,
  User,
  MapPin,
  Building2,
  Square,
  CheckSquare,
  Loader2,
  ParkingSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  getDailyUpdates,
  createDailyUpdatesBulk,
  DailyVehicleUpdate
} from '../../services/dailyUpdateService';
import { useFleet } from '../../hooks/useFleet';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const DailyVehicleUpdatePage: React.FC = () => {
  const [updates, setUpdates] = useState<DailyVehicleUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const navigate = useNavigate();

  const { vehicles } = useFleet();
  const { user } = useAuth();

  // Bulk yard-parking selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  useEffect(() => {
    loadUpdates();
    setSelectedIds(new Set()); // reset selection when date changes
  }, [selectedDate]);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      const data = await getDailyUpdates(selectedDate);
      setUpdates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Which vehicles have been updated on the selected date ─────────────────
  const updatedKeys = useMemo(() => {
    const set = new Set<string>();
    updates.forEach(u => {
      if (u.vehicleId) set.add(u.vehicleId);
      if (u.vehicleNo) set.add(u.vehicleNo);
    });
    return set;
  }, [updates]);

  const vehicleStatusList = useMemo(() => {
    return vehicles
      .map(v => ({
        id: v.id!,
        plateNo: v.plateNo,
        type: v.type,
        nickname: v.nickname,
        fleetStatus: v.status,
        updated: updatedKeys.has(v.id!) || updatedKeys.has(v.plateNo),
      }))
      // pending (red) first, then updated (green); alphabetical within group
      .sort((a, b) => {
        if (a.updated !== b.updated) return a.updated ? 1 : -1;
        return a.plateNo.localeCompare(b.plateNo);
      });
  }, [vehicles, updatedKeys]);

  const pendingVehicles = vehicleStatusList.filter(v => !v.updated);
  const updatedCount = vehicleStatusList.length - pendingVehicles.length;

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allPendingSelected =
    pendingVehicles.length > 0 && pendingVehicles.every(v => selectedIds.has(v.id));

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingVehicles.map(v => v.id)));
    }
  };

  // ── Bulk place selected as Yard Parking ───────────────────────────────────
  const handleBulkYardParking = async () => {
    const targets = pendingVehicles.filter(v => selectedIds.has(v.id));
    if (targets.length === 0) return;
    if (!window.confirm(
      `Place ${targets.length} vehicle(s) as "Yard Parking" for ${selectedDate}?`
    )) return;

    setBulkBusy(true);
    try {
      const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
      const payloads = targets.map(v => ({
        date: selectedDate,
        dayOfWeek,
        vehicleId: v.id,
        vehicleNo: v.plateNo,
        actualDriverId: '',
        actualDriverName: '—',
        status: 'Yard Parking' as const,
        remarks: 'Bulk-placed as Yard Parking',
        enteredBy: user?.email || 'Unknown',
      }));
      await createDailyUpdatesBulk(payloads);
      setSelectedIds(new Set());
      await loadUpdates();
    } catch (err) {
      console.error(err);
      alert('Failed to place vehicles as Yard Parking.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (updates.length === 0) {
      alert("No operations data logged for this date to generate summary.");
      return;
    }

    const statuses = {
      'On Trip': 0,
      'Yard Parking': 0,
      'Under Repair': 0,
      'Breakdown': 0
    };

    updates.forEach(u => {
      const statusKey = u.status as keyof typeof statuses;
      if (statusKey in statuses) {
        statuses[statusKey]++;
      }
    });

    let message = `*☀️ WEDAGE & COMPANY - DAILY OPERATIONS SUMMARY*\n`;
    message += `*Date:* ${selectedDate}\n\n`;
    message += `*📊 FLEET STATUS MATRIX*\n`;
    message += `• On Trip: *${statuses['On Trip']}*\n`;
    message += `• Yard Parking: *${statuses['Yard Parking']}*\n`;
    message += `• Under Repair: *${statuses['Under Repair']}*\n`;
    message += `• Breakdown: *${statuses['Breakdown']}*\n\n`;

    message += `*🚛 DAILY DEPLOYMENTS*\n`;
    updates.forEach(u => {
      message += `• *${u.vehicleNo}* | ${u.status}\n`;
      message += `  D: ${u.actualDriverName} | Client: ${u.customerName || 'N/A'}\n`;
    });

    const breakdowns = updates.filter(u => u.status === 'Breakdown');
    if (breakdowns.length > 0) {
      message += `\n*⚠️ ACTIVE BREAKDOWNS / ALERTS*\n`;
      breakdowns.forEach(b => {
        message += `• *${b.vehicleNo}*: ${b.breakdownReason || 'No reason specified'}\n`;
      });
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Trip': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Breakdown': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'Yard Parking': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Under Repair': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const selectedCount = pendingVehicles.filter(v => selectedIds.has(v.id)).length;

  return (
    <div className="space-y-8 group/page pb-20">
      <PageHeader
        title="Fleet Operations Control"
        subtitle="Daily Status Synchronization & Deployment Matrix"
      />

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-2 flex items-center justify-between sm:justify-start gap-2 shadow-sm w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-gray-400 ml-2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-gray-900 text-sm font-bold outline-none [color-scheme:light] pr-4 cursor-pointer"
            />
          </div>
          <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {updates.length} Assets Logged · {pendingVehicles.length} Pending
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <button
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto group/btn bg-emerald-600 text-white px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-emerald-100"
          >
            <CheckCircle2 className="w-4 h-4" />
            Send WhatsApp Summary
          </button>
          <button
            onClick={() => navigate('/daily-updates/new')}
            className="w-full sm:w-auto group/btn bg-indigo-600 text-white px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-indigo-100"
          >
            <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90" />
            Log Asset Status
          </button>
        </div>
      </div>

      {/* Two-column layout: Operations grid (left) + Vehicle status panel (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── LEFT: Operations Grid ─────────────────────────────────────── */}
        <div className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AnimatePresence mode='popLayout'>
              {updates.map((update, i) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-100 rounded-[2rem] p-6 space-y-6 hover:border-indigo-200 transition-all group relative overflow-hidden shadow-sm"
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                        <Truck className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{update.vehicleNo}</h4>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{update.customerName || 'No Client Assigned'}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm",
                      getStatusColor(update.status)
                    )}>
                      {update.status}
                    </span>
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-3 text-gray-400">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">{update.actualDriverName}</span>
                    </div>
                    {update.customerRoute && (
                      <div className="flex items-center gap-3 text-gray-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider truncate text-gray-600">{update.customerRoute}</span>
                      </div>
                    )}
                    <div className="flex gap-4 pt-2 border-t border-gray-50 mt-1">
                      {update.meterReading && (
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Meter</span>
                          <span className="text-[10px] font-black text-indigo-600 font-mono">{update.meterReading.toLocaleString()} KM</span>
                        </div>
                      )}
                      {update.fuelPumped && (
                        <div className="flex flex-col border-l border-gray-100 pl-4">
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Fuel</span>
                          <span className="text-[10px] font-black text-emerald-600 font-mono">{update.fuelPumped.toLocaleString()} L</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {update.breakdownReason && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-3">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] font-bold text-rose-700 uppercase tracking-tight leading-relaxed">{update.breakdownReason}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Logged: {format(update.entryTime?.toDate ? update.entryTime.toDate() : new Date(), 'HH:mm')}</span>
                    </div>
                    <p className="text-[9px] font-bold">@ {update.enteredBy.split('@')[0]}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {updates.length === 0 && !loading && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-gray-100 rounded-[3rem]">
                <LayoutDashboard className="w-12 h-12 text-gray-200" />
                <div className="text-center">
                  <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">No Operations Data Recorded</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Status logs are required for all fleet assets daily.</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="col-span-full py-20">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Vehicle Status Panel ───────────────────────────────── */}
        <div className="xl:col-span-1">
          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm sticky top-4 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900">Fleet Status Board</h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    {isToday ? "Today's" : selectedDate} update status
                  </p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Truck className="w-4 h-4 text-indigo-600" />
                </div>
              </div>

              {/* Summary counters */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Updated</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{updatedCount}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Pending</span>
                  </div>
                  <p className="text-2xl font-black text-rose-700 mt-1">{pendingVehicles.length}</p>
                </div>
              </div>
            </div>

            {/* Bulk action bar */}
            {pendingVehicles.length > 0 && (
              <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between gap-2">
                <button
                  onClick={toggleSelectAllPending}
                  className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                >
                  {allPendingSelected
                    ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                    : <Square className="w-4 h-4 text-gray-400" />}
                  Select all pending
                </button>
                <span className="text-[10px] font-black text-gray-400">{selectedCount} selected</span>
              </div>
            )}

            {/* Vehicle list */}
            <div className="max-h-[520px] overflow-y-auto custom-scrollbar divide-y divide-gray-50">
              {vehicleStatusList.length === 0 ? (
                <div className="py-16 text-center">
                  <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No vehicles in fleet</p>
                </div>
              ) : (
                vehicleStatusList.map(v => {
                  const checked = selectedIds.has(v.id);
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 transition-colors",
                        !v.updated && "cursor-pointer hover:bg-rose-50/40",
                        checked && "bg-indigo-50/50"
                      )}
                      onClick={() => !v.updated && toggleSelect(v.id)}
                    >
                      {/* Checkbox (pending only) */}
                      {!v.updated ? (
                        checked
                          ? <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}

                      {/* Status dot + plate */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", v.updated ? "bg-emerald-500" : "bg-rose-500")} />
                          <span className="text-[12px] font-black text-gray-900 truncate">{v.plateNo}</span>
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 pl-4 truncate">
                          {v.nickname || v.type}
                        </p>
                      </div>

                      {/* Badge */}
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex-shrink-0",
                        v.updated ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {v.updated ? "Updated" : "Pending"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bulk Yard Parking button */}
            {pendingVehicles.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-white">
                <button
                  onClick={handleBulkYardParking}
                  disabled={selectedCount === 0 || bulkBusy}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98]",
                    selectedCount === 0 || bulkBusy
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                  )}
                >
                  {bulkBusy
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Placing…</>
                    : <><ParkingSquare className="w-4 h-4" /> Place {selectedCount > 0 ? selectedCount : ''} as Yard Parking</>}
                </button>
                <p className="text-[9px] text-gray-400 font-bold text-center mt-2 leading-relaxed">
                  Tick the pending (red) vehicles above, then place them all in the yard at once.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyVehicleUpdatePage;
