import React, { useEffect, useMemo, useState } from 'react';
import {
  Truck, CheckCircle2, Square, CheckSquare, Loader2, ParkingSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFleet } from '../../hooks/useFleet';
import { useAuth } from '../../contexts/AuthContext';
import {
  getDailyUpdates,
  createDailyUpdatesBulk,
  DailyVehicleUpdate
} from '../../services/dailyUpdateService';

interface FleetStatusBoardProps {
  /** Date (YYYY-MM-DD) to evaluate update status against */
  date: string;
  /** Called after a bulk yard-parking action so a parent list can refresh */
  onChanged?: () => void;
  className?: string;
}

/**
 * FleetStatusBoard
 * Shows every fleet vehicle with its daily-update status for the given date:
 *   green = updated · red = pending.
 * Pending vehicles can be ticked and bulk-placed as "Yard Parking" in one action.
 */
const FleetStatusBoard: React.FC<FleetStatusBoardProps> = ({ date, onChanged, className }) => {
  const { vehicles } = useFleet();
  const { user } = useAuth();

  const [updates, setUpdates] = useState<DailyVehicleUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = date === todayStr;

  const load = async () => {
    if (!date) return;
    setLoading(true);
    try {
      const data = await getDailyUpdates(date);
      setUpdates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Which vehicles have been updated on the selected date
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
        updated: updatedKeys.has(v.id!) || updatedKeys.has(v.plateNo),
      }))
      .sort((a, b) => {
        if (a.updated !== b.updated) return a.updated ? 1 : -1;
        return a.plateNo.localeCompare(b.plateNo);
      });
  }, [vehicles, updatedKeys]);

  const pendingVehicles = vehicleStatusList.filter(v => !v.updated);
  const updatedCount = vehicleStatusList.length - pendingVehicles.length;
  const selectedCount = pendingVehicles.filter(v => selectedIds.has(v.id)).length;

  const allPendingSelected =
    pendingVehicles.length > 0 && pendingVehicles.every(v => selectedIds.has(v.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(pendingVehicles.map(v => v.id)));
  };

  const handleBulkYardParking = async () => {
    const targets = pendingVehicles.filter(v => selectedIds.has(v.id));
    if (targets.length === 0) return;
    if (!window.confirm(`Place ${targets.length} vehicle(s) as "Yard Parking" for ${date}?`)) return;

    setBulkBusy(true);
    try {
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      const payloads = targets.map(v => ({
        date,
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
      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      alert('Failed to place vehicles as Yard Parking.');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className={cn("bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900">Fleet Status Board</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
              {isToday ? "Today's" : date} update status
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
            type="button"
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
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-300">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-[11px] font-bold uppercase tracking-widest">Loading fleet…</p>
          </div>
        ) : vehicleStatusList.length === 0 ? (
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
                {!v.updated ? (
                  checked
                    ? <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", v.updated ? "bg-emerald-500" : "bg-rose-500")} />
                    <span className="text-[12px] font-black text-gray-900 truncate">{v.plateNo}</span>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 pl-4 truncate">
                    {v.nickname || v.type}
                  </p>
                </div>

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
            type="button"
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
  );
};

export default FleetStatusBoard;
