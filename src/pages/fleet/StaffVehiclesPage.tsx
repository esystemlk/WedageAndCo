import React, { useEffect, useMemo, useState } from 'react';
import { User, Truck, Package, Fuel, ShieldCheck, DollarSign, Search } from 'lucide-react';
import { getVehicles, Vehicle } from '../../services/fleetService';
import { getStaffMembers, StaffMember } from '../../services/staffService';
import { getItemIssues, ItemIssue } from '../../services/itemIssueService';
import { getFuelTransactions, FuelTransaction } from '../../services/fuelStockService';
import { getGatePasses, GatePass } from '../../services/gatePassService';
import { getSecurityBillChecks, SecurityBillCheck } from '../../services/securityBillService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

type TimelineEntry =
  | { kind: 'item-issue'; date: string; data: ItemIssue }
  | { kind: 'fuel'; date: string; data: FuelTransaction }
  | { kind: 'gate-pass'; date: string; data: GatePass }
  | { kind: 'security-bill'; date: string; data: SecurityBillCheck };

const KIND_CFG: Record<TimelineEntry['kind'], { label: string; icon: React.FC<any>; color: string; bg: string }> = {
  'item-issue':     { label: 'Item Issue',    icon: Package,     color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-100' },
  'fuel':           { label: 'Fuel',          icon: Fuel,        color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
  'gate-pass':      { label: 'Gate Pass',     icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  'security-bill':  { label: 'Goods Inward',  icon: DollarSign,  color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-100' },
};

const StaffVehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [itemIssues, setItemIssues] = useState<ItemIssue[]>([]);
  const [fuelTx, setFuelTx] = useState<FuelTransaction[]>([]);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [billChecks, setBillChecks] = useState<SecurityBillCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [v, s, ii, ft, gp, sb] = await Promise.all([
          getVehicles(),
          getStaffMembers(),
          getItemIssues(),
          getFuelTransactions(),
          getGatePasses(),
          getSecurityBillChecks(),
        ]);
        setVehicles(v || []);
        setStaff(s || []);
        setItemIssues(ii || []);
        setFuelTx(ft || []);
        setGatePasses(gp || []);
        setBillChecks(sb || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const staffById = useMemo(() => {
    const map: Record<string, StaffMember> = {};
    staff.forEach(s => { if (s.id) map[s.id] = s; });
    return map;
  }, [staff]);

  const staffVehicles = useMemo(
    () => vehicles.filter(v => v.assignedStaffId && staffById[v.assignedStaffId]),
    [vehicles, staffById]
  );

  const filteredStaffVehicles = staffVehicles.filter(v => {
    const q = search.toLowerCase();
    const staffName = v.assignedStaffId ? staffById[v.assignedStaffId]?.fullName || '' : '';
    return !q || v.plateNo.toLowerCase().includes(q) || staffName.toLowerCase().includes(q);
  });

  const selectedVehicle = staffVehicles.find(v => v.id === selectedVehicleId) || filteredStaffVehicles[0] || null;

  const timeline: TimelineEntry[] = useMemo(() => {
    if (!selectedVehicle) return [];
    const plate = selectedVehicle.plateNo;
    const entries: TimelineEntry[] = [
      ...itemIssues.filter(i => i.vehicleNo === plate).map(i => ({ kind: 'item-issue' as const, date: i.date, data: i })),
      ...fuelTx.filter(f => f.vehicleNo === plate).map(f => ({ kind: 'fuel' as const, date: f.date, data: f })),
      ...gatePasses.filter(g => g.vehicleNo === plate).map(g => ({ kind: 'gate-pass' as const, date: g.date, data: g })),
      ...billChecks.filter(b => b.vehicleNo === plate).map(b => ({ kind: 'security-bill' as const, date: b.date, data: b })),
    ];
    return entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [selectedVehicle, itemIssues, fuelTx, gatePasses, billChecks]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader title="Staff Vehicles" subtitle="Vehicles assigned to individual staff members, with their inventory, fuel and security records in one place." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle list */}
        <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search plate or staff name..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-50">
            {filteredStaffVehicles.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Truck className="w-8 h-8 text-gray-200 mx-auto" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No staff-assigned vehicles</p>
                <p className="text-[10px] text-gray-400">Assign a vehicle to a staff member from its edit page.</p>
              </div>
            ) : filteredStaffVehicles.map(v => {
              const s = v.assignedStaffId ? staffById[v.assignedStaffId] : undefined;
              const active = selectedVehicle?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id!)}
                  className={cn(
                    "w-full text-left p-5 flex items-center gap-3 transition-colors",
                    active ? "bg-indigo-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400")}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{v.plateNo}</p>
                    <p className="text-[10px] text-gray-500 font-bold truncate flex items-center gap-1">
                      <User className="w-3 h-3" /> {s?.fullName || 'Unknown staff'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vehicle detail timeline */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
          {!selectedVehicle ? (
            <div className="p-20 text-center text-gray-400 text-sm font-bold">Select a vehicle to view its records</div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900">{selectedVehicle.plateNo}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                    Assigned to {selectedVehicle.assignedStaffId ? staffById[selectedVehicle.assignedStaffId]?.fullName : 'Unknown'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-gray-100 text-gray-500">
                  {timeline.length} Record{timeline.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-50">
                {timeline.length === 0 ? (
                  <div className="p-16 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No inventory, fuel or security records yet</div>
                ) : timeline.map((entry, i) => {
                  const cfg = KIND_CFG[entry.kind];
                  const Icon = cfg.icon;
                  let title = '';
                  let subtitle = '';
                  if (entry.kind === 'item-issue') {
                    title = `${entry.data.quantityIssued} ${entry.data.unitType} of ${entry.data.itemName}`;
                    subtitle = `Issued to ${entry.data.issuedTo}`;
                  } else if (entry.kind === 'fuel') {
                    title = `${entry.data.quantityIssuedL}L ${entry.data.fuelType}`;
                    subtitle = entry.data.driverName ? `Driver: ${entry.data.driverName}` : '';
                  } else if (entry.kind === 'gate-pass') {
                    title = `Gate Pass ${entry.data.gatePassNo}`;
                    subtitle = entry.data.reason || '';
                  } else {
                    title = `${entry.data.supplierName} — Invoice ${entry.data.invoiceNo}`;
                    subtitle = entry.data.description;
                  }
                  return (
                    <div key={`${entry.kind}-${i}`} className="p-5 flex items-start gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", cfg.bg)}>
                        <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded", cfg.bg, cfg.color)}>{cfg.label}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{entry.date ? format(new Date(entry.date), 'MMM dd, yyyy') : '—'}</span>
                        </div>
                        <p className="text-xs font-black text-gray-900 mt-1 truncate">{title}</p>
                        {subtitle && <p className="text-[10px] text-gray-500 font-bold truncate">{subtitle}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffVehiclesPage;
