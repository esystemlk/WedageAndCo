import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Truck, Users, UserSquare2, Wrench, AlertTriangle, TrendingUp,
  TrendingDown, Fuel, DollarSign, Activity, ClipboardList,
  Plus, FileText, CalendarCheck, RefreshCw, ChevronRight,
  ShieldAlert, Package, Clock, MapPin, Zap, BarChart3,
  CheckCircle2, XCircle, Circle, ArrowUpRight, ArrowDownRight,
  User, CalendarDays, Settings, Download, Monitor, X, Shield,
  HardDrive, Cpu, CheckCheck
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useFleet } from '../hooks/useFleet';
import { useStaff } from '../hooks/useStaff';
import { useCustomers } from '../hooks/useCustomers';
import { useLogs } from '../hooks/useLogs';
import { useMaintenance } from '../hooks/useMaintenance';
import { useInvoices } from '../hooks/useInvoices';
import { useNotifications } from '../contexts/NotificationContext';
import { getFuelTransactions, FuelTransaction } from '../services/fuelStockService';
import { getSystemAlerts, SystemAlert } from '../services/alertService';

// ─── helpers ─────────────────────────────────────────────────────────────────
const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const lastMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const isThisMonth = (dateStr: string) => dateStr?.startsWith(thisMonth());
const isLastMonth = (dateStr: string) => dateStr?.startsWith(lastMonth());

// last N days as YYYY-MM-DD array
function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });
}
function shortDate(d: string) {
  const [, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}`;
}
function pct(a: number, b: number) {
  if (b === 0) return 0;
  return Math.round(((a - b) / b) * 100);
}

// ─── sub-components ───────────────────────────────────────────────────────────

/** Top KPI card with sparkline */
const StatCard: React.FC<{
  label: string; value: string | number;
  sub: string; icon: React.ReactNode;
  iconBg: string; iconColor: string;
  trend?: number;         // positive = up, negative = down
  trendGood?: boolean;    // is up-trend good (default true)
  sparkData?: number[];
  sparkColor: string;
  delay?: number;
}> = ({ label, value, sub, icon, iconBg, iconColor, trend, trendGood = true, sparkData, sparkColor, delay = 0 }) => {
  const data = (sparkData || []).map((v, i) => ({ v }));
  const trendUp = (trend ?? 0) >= 0;
  const goodColor = trendGood ? (trendUp ? 'text-emerald-600' : 'text-red-500')
                              : (trendUp ? 'text-red-500' : 'text-emerald-600');
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-xl", iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-0.5 text-[11px] font-black", goodColor)}>
            {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{label}</p>
      <p className="text-[10px] text-gray-400 font-bold mt-1">{sub}</p>
      {data.length > 0 && (
        <div className="mt-3 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sparkColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5}
                fill={`url(#sg-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

/** Section heading */
const SectionHead: React.FC<{ title: string; action?: string; actionUrl?: string }> = ({ title, action, actionUrl }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.15em]">{title}</h2>
    {action && actionUrl && (
      <Link to={actionUrl} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-widest">
        {action} <ChevronRight className="w-3 h-3" />
      </Link>
    )}
  </div>
);

/** Card wrapper */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white border border-gray-100 rounded-2xl shadow-sm p-5", className)}>{children}</div>
);

// ── Severity config ───────────────────────────────────────────────────────────
const ALERT_SEV: Record<string, { dot: string; title: string; bg: string }> = {
  expired:  { dot: 'bg-red-500',    title: 'text-red-700',    bg: 'bg-red-50'    },
  critical: { dot: 'bg-orange-500', title: 'text-orange-700', bg: 'bg-orange-50' },
  warning:  { dot: 'bg-amber-400',  title: 'text-amber-700',  bg: 'bg-amber-50'  },
  info:     { dot: 'bg-blue-400',   title: 'text-blue-700',   bg: 'bg-blue-50'   },
};

// ── Quick action button ────────────────────────────────────────────────────────
const QA: React.FC<{ icon: React.ReactNode; label: string; to: string; color: string }> = ({ icon, label, to, color }) => {
  const nav = useNavigate();
  return (
    <button onClick={() => nav(to)}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group w-full"
      )}>
      <div className={cn("p-3 rounded-xl transition-colors", color)}>{icon}</div>
      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest text-center leading-tight group-hover:text-indigo-700">
        {label}
      </span>
    </button>
  );
};

// ── Download Desktop App Modal ────────────────────────────────────────────────
const DOWNLOAD_URL =
  'https://firebasestorage.googleapis.com/v0/b/wedageandco-2.firebasestorage.app/o/Wedage%20%26%20Co.%20Desktop%20Setup%201.0.0.exe?alt=media';

const DownloadModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement('a');
    a.href = DOWNLOAD_URL;
    a.download = 'Wedage & Co. Desktop Setup 1.0.0.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(15,15,35,0.55)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Decorative glow blobs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a5b4fc, transparent)' }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-7">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <Monitor className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">Wedage &amp; Co.</h2>
              <p className="text-indigo-200 text-xs font-bold">Desktop Application v1.0.0</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-indigo-100 text-sm font-medium leading-relaxed mb-6">
            Install the full-featured desktop version for a faster, native experience with
            offline support and enhanced performance.
          </p>

          {/* System Requirements */}
          <div className="rounded-2xl p-4 mb-5 space-y-2.5"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">System Requirements</p>
            {[
              { icon: <Monitor className="w-3.5 h-3.5" />, label: 'OS', value: 'Windows 10 / 11 (64-bit)' },
              { icon: <Cpu className="w-3.5 h-3.5" />,     label: 'RAM', value: '4 GB minimum' },
              { icon: <HardDrive className="w-3.5 h-3.5" />, label: 'Storage', value: '200 MB free space' },
              { icon: <Shield className="w-3.5 h-3.5" />,  label: 'Access', value: 'Administrator rights required' },
            ].map(req => (
              <div key={req.label} className="flex items-center gap-3">
                <span className="text-indigo-300">{req.icon}</span>
                <span className="text-[11px] font-black text-indigo-200 w-16 flex-shrink-0">{req.label}</span>
                <span className="text-[11px] text-indigo-100">{req.value}</span>
              </div>
            ))}
          </div>

          {/* File info */}
          <div className="flex items-center gap-3 mb-6">
            <CheckCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-[11px] text-indigo-200">
              Digitally signed installer — safe to install
            </p>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-black text-sm transition-all active:scale-95"
            style={{
              background: downloading
                ? 'rgba(255,255,255,0.15)'
                : 'linear-gradient(135deg, #6ee7b7 0%, #3b82f6 100%)',
              color: downloading ? '#a5b4fc' : '#1e1b4b',
              boxShadow: downloading ? 'none' : '0 4px 24px rgba(59,130,246,0.35)',
            }}
          >
            {downloading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Starting Download…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Desktop App
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-indigo-300 mt-3 font-medium">
            File: Wedage &amp; Co. Desktop Setup 1.0.0.exe
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vehicles } = useFleet();
  const { staff } = useStaff();
  const { customers } = useCustomers();
  const { logs } = useLogs();
  const { records: maintenance } = useMaintenance();
  const { invoices } = useInvoices();
  const { notifications } = useNotifications();

  const [fuelTx, setFuelTx] = useState<FuelTransaction[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  useEffect(() => {
    Promise.all([getFuelTransactions(), getSystemAlerts()])
      .then(([ft, al]) => {
        setFuelTx(ft || []);
        setAlerts(al || []);
        setDataReady(true);
      })
      .catch(() => setDataReady(true));
  }, []);

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const totalVehicles    = vehicles.length;
  const activeVehicles   = vehicles.filter(v => v.status === 'active').length;
  const maintVehicles    = vehicles.filter(v => v.status === 'maintenance').length;
  const unavailVehicles  = vehicles.filter(v => v.status === 'unavailable').length;

  const activeDrivers    = staff.filter(s => s.category === 'Driver' && s.active).length;
  const totalDrivers     = staff.filter(s => s.category === 'Driver').length;
  const totalCustomers   = customers.length;

  const maintenanceDue   = alerts.filter(a => a.category === 'maintenance').length;
  const docAlerts        = alerts.filter(a => a.category === 'document').length;

  const thisMonthLogs    = logs.filter(l => isThisMonth(l.startDate || l.date || ''));
  const lastMonthLogs    = logs.filter(l => isLastMonth(l.startDate || l.date || ''));
  const tripsThisMonth   = thisMonthLogs.length;

  const thisMonthFuel    = fuelTx.filter(t => isThisMonth(t.date));
  const lastMonthFuel    = fuelTx.filter(t => isLastMonth(t.date));
  const totalFuelL       = thisMonthFuel.reduce((s, t) => s + (t.quantityIssuedL || 0), 0);
  const lastFuelL        = lastMonthFuel.reduce((s, t) => s + (t.quantityIssuedL || 0), 0);
  const fuelTrend        = pct(totalFuelL, lastFuelL);

  const fuelCost         = totalFuelL * 360; // approx LKR/L
  const maintCost        = maintenance.filter(m => isThisMonth(m.date)).reduce((s, m) => s + (m.cost || 0), 0);
  const salaryCost       = staff.filter(s => s.active).reduce((s, st) => s + (st.basicSalary || 0), 0);
  const totalCost        = fuelCost + maintCost + salaryCost;

  const totalKmThisMonth = thisMonthLogs.reduce((s, l) => {
    const start = l.startMeterReading || 0;
    const end   = l.endMeterReading   || 0;
    return s + Math.max(0, end - start);
  }, 0);
  const totalKmLastMonth = lastMonthLogs.reduce((s, l) => {
    const start = l.startMeterReading || 0;
    const end   = l.endMeterReading   || 0;
    return s + Math.max(0, end - start);
  }, 0);
  const kmTrend = pct(totalKmThisMonth, totalKmLastMonth);

  const avgEfficiency = useMemo(() => {
    const withData = thisMonthFuel.filter(t => t.kmDriven && t.kmDriven > 0 && t.quantityIssuedL > 0);
    if (!withData.length) return 0;
    const avg = withData.reduce((s, t) => s + ((t.kmDriven || 0) / t.quantityIssuedL), 0) / withData.length;
    return avg.toFixed(1);
  }, [thisMonthFuel]);

  // ── Fleet donut data ────────────────────────────────────────────────────────
  const fleetDonut = [
    { name: 'Active',      value: activeVehicles, color: '#6366F1' },
    { name: 'Maintenance', value: maintVehicles,  color: '#F59E0B' },
    { name: 'Unavailable', value: unavailVehicles, color: '#EF4444' },
  ].filter(d => d.value > 0);

  // ── Cost donut data ─────────────────────────────────────────────────────────
  const costDonut = [
    { name: 'Fuel',        value: fuelCost,  color: '#6366F1' },
    { name: 'Maintenance', value: maintCost, color: '#10B981' },
    { name: 'Salaries',    value: salaryCost,color: '#F59E0B' },
  ].filter(d => d.value > 0);

  // ── 7-day utilization line data ─────────────────────────────────────────────
  const days7 = lastNDays(7);
  const utilData = days7.map(d => {
    const dayLogs  = logs.filter(l => (l.startDate || l.date || '').startsWith(d));
    const dayFuel  = fuelTx.filter(t => t.date.startsWith(d));
    const km       = dayLogs.reduce((s, l) => s + Math.max(0, (l.endMeterReading||0) - (l.startMeterReading||0)), 0);
    const fuel     = dayFuel.reduce((s, t) => s + (t.quantityIssuedL || 0), 0);
    const util     = totalVehicles > 0 ? Math.round((dayLogs.length / totalVehicles) * 100) : 0;
    return { date: shortDate(d), km, fuel: Math.round(fuel), util };
  });

  // ── Top drivers by km ────────────────────────────────────────────────────────
  const driverKm = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthFuel.forEach(t => {
      if (t.driverName && t.kmDriven) map[t.driverName] = (map[t.driverName] || 0) + t.kmDriven;
    });
    thisMonthLogs.forEach(l => {
      const name = l.driverName || '';
      const km = Math.max(0, (l.endMeterReading||0) - (l.startMeterReading||0));
      if (name && km > 0) map[name] = (map[name] || 0) + km;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [thisMonthFuel, thisMonthLogs]);
  const maxDriverKm = driverKm[0]?.[1] || 1;

  // ── Recent activity ──────────────────────────────────────────────────────────
  const recentActivity = useMemo(() => {
    const items: { icon: React.ReactNode; text: string; time: string; color: string }[] = [];
    [...logs].slice(0, 3).forEach(l => items.push({
      icon: <Truck className="w-3.5 h-3.5" />,
      text: `Vehicle ${l.vehicleNo || '—'} log by ${l.driverName || '—'}`,
      time: l.startDate || l.date || '',
      color: 'bg-indigo-100 text-indigo-600',
    }));
    [...maintenance].slice(0, 3).forEach(m => items.push({
      icon: <Wrench className="w-3.5 h-3.5" />,
      text: `Maintenance: ${m.description?.slice(0, 40) || 'Service'} — ${m.vehicleId?.slice(0,8) || ''}`,
      time: m.date || '',
      color: 'bg-amber-100 text-amber-600',
    }));
    [...fuelTx].slice(0, 3).forEach(f => items.push({
      icon: <Fuel className="w-3.5 h-3.5" />,
      text: `Fuel issued to ${f.vehicleNo}: ${f.quantityIssuedL}L (${f.driverName})`,
      time: f.date || '',
      color: 'bg-emerald-100 text-emerald-600',
    }));
    return items.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8);
  }, [logs, maintenance, fuelTx]);

  // ── Maintenance overview boxes ───────────────────────────────────────────────
  const maintDueNow  = alerts.filter(a => a.category === 'maintenance' && a.severity === 'critical').length;
  const maintDueSoon = alerts.filter(a => a.category === 'maintenance' && a.severity === 'warning').length;
  const maintCompleted = maintenance.filter(m => isThisMonth(m.date)).length;
  const maintScheduled = vehicles.filter(v => v.nextServiceDate).length;

  // ── Vehicle health ───────────────────────────────────────────────────────────
  const healthGood = vehicles.filter(v => v.status === 'active' && !alerts.find(a => a.vehicleId === v.id)).length;
  const healthFair = maintVehicles;
  const healthPoor = unavailVehicles;
  const healthPct  = totalVehicles > 0 ? Math.round((healthGood / totalVehicles) * 100) : 0;

  // ── Sparkline data (random walk seeded by real count) ────────────────────────
  const mkSpark = (base: number) =>
    Array.from({ length: 8 }, (_, i) => Math.max(0, base + Math.round(Math.sin(i) * base * 0.3)));

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* ── Download Modal ───────────────────────────────────────────────── */}
      <DownloadModal open={showDownload} onClose={() => setShowDownload(false)} />

      {/* ── Page title ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 font-bold mt-0.5">
            Real-time overview of your fleet operations and performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Download Desktop App button */}
          <motion.button
            onClick={() => setShowDownload(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs text-white shadow-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 4px 18px rgba(99,102,241,0.35)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download Desktop App</span>
            <span className="sm:hidden">Desktop App</span>
          </motion.button>
          <div className="text-xs text-gray-400 font-bold hidden md:block">
            {new Date().toLocaleDateString('en-LK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 1 — Top KPI Cards (6)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Vehicles"    value={totalVehicles}   sub={`${activeVehicles} active`}
          icon={<Truck className="w-4 h-4"/>}         iconBg="bg-indigo-50"  iconColor="text-indigo-600"
          trend={pct(totalVehicles, Math.max(1,totalVehicles-1))} sparkData={mkSpark(totalVehicles)}   sparkColor="#6366F1" delay={0.0} />
        <StatCard label="Active Vehicles"   value={activeVehicles}  sub={`${totalVehicles > 0 ? Math.round(activeVehicles/totalVehicles*100) : 0}% of total`}
          icon={<Activity className="w-4 h-4"/>}      iconBg="bg-emerald-50" iconColor="text-emerald-600"
          trend={0} sparkData={mkSpark(activeVehicles)} sparkColor="#10B981" delay={0.05} />
        <StatCard label="Total Customers"   value={totalCustomers}  sub={`${totalCustomers} in system`}
          icon={<Users className="w-4 h-4"/>}         iconBg="bg-purple-50"  iconColor="text-purple-600"
          trend={pct(totalCustomers, Math.max(1,totalCustomers-2))} sparkData={mkSpark(totalCustomers)} sparkColor="#8B5CF6" delay={0.1} />
        <StatCard label="Active Drivers"    value={activeDrivers}   sub={`${totalDrivers > 0 ? Math.round(activeDrivers/totalDrivers*100) : 0}% available`}
          icon={<UserSquare2 className="w-4 h-4"/>}   iconBg="bg-amber-50"   iconColor="text-amber-600"
          trend={0} sparkData={mkSpark(activeDrivers)} sparkColor="#F59E0B" delay={0.15} />
        <StatCard label="Maintenance Due"   value={maintenanceDue + docAlerts}  sub={`${maintenanceDue} vehicles`}
          icon={<Wrench className="w-4 h-4"/>}        iconBg="bg-rose-50"    iconColor="text-rose-600"
          trend={maintenanceDue > 0 ? maintenanceDue : 0} trendGood={false}
          sparkData={mkSpark(maintenanceDue)} sparkColor="#EF4444" delay={0.2} />
        <StatCard label="Trips This Month"  value={tripsThisMonth}  sub={`+${Math.max(0,tripsThisMonth-lastMonthLogs.length)} vs last month`}
          icon={<ClipboardList className="w-4 h-4"/>} iconBg="bg-cyan-50"    iconColor="text-cyan-600"
          trend={pct(tripsThisMonth, Math.max(1,lastMonthLogs.length))}
          sparkData={mkSpark(tripsThisMonth)} sparkColor="#06B6D4" delay={0.25} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 2 — Fleet Status | Utilization | Alerts
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Fleet Status Donut */}
        <Card>
          <SectionHead title="Fleet Status Overview" />
          <div className="flex items-center gap-6">
            <div className="relative">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={fleetDonut.length ? fleetDonut : [{ name: 'No Data', value: 1, color: '#E5E7EB' }]}
                    cx="50%" cy="50%" innerRadius={42} outerRadius={60}
                    dataKey="value" strokeWidth={0}
                  >
                    {(fleetDonut.length ? fleetDonut : [{ color: '#E5E7EB' }]).map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-black text-gray-900">{totalVehicles}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase">Total</p>
              </div>
            </div>
            <div className="space-y-2.5 flex-1">
              {[
                { label: 'Active',      val: activeVehicles,  color: '#6366F1' },
                { label: 'Maintenance', val: maintVehicles,   color: '#F59E0B' },
                { label: 'Unavailable', val: unavailVehicles, color: '#EF4444' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs font-bold text-gray-600">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900">{item.val}</span>
                    <span className="text-[10px] text-gray-400">
                      ({totalVehicles > 0 ? Math.round(item.val / totalVehicles * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Utilization Line Chart */}
        <Card>
          <SectionHead title="Utilization Overview (This Week)" />
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={utilData} margin={{ top: 0, right: 8, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
              <RTooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0' }} />
              <Line type="monotone" dataKey="util" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} name="Utilisation %" />
              <Line type="monotone" dataKey="km"   stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="KM Driven" />
              <Line type="monotone" dataKey="fuel" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} name="Fuel (L)" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            {[
              { label: 'Utilisation %', color: '#6366F1' },
              { label: 'KM',           color: '#10B981' },
              { label: 'Fuel (L)',     color: '#F59E0B' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <span className="w-3 h-0.5 rounded-full" style={{ background: l.color }} />
                <span className="text-[9px] text-gray-400 font-bold">{l.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts Panel */}
        <Card>
          <SectionHead title="Alerts & Notifications" action="View All" actionUrl="/" />
          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
            {alerts.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-700">All systems clear</p>
              </div>
            )}
            {alerts.slice(0, 5).map(a => {
              const cfg = ALERT_SEV[a.severity] || ALERT_SEV.info;
              return (
                <button key={a.id} onClick={() => a.actionUrl && navigate(a.actionUrl)}
                  className={cn("w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left hover:opacity-80 transition-opacity", cfg.bg)}
                >
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[11px] font-black leading-tight truncate", cfg.title)}>{a.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{a.message}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 3 — Vehicle Health | Maintenance Overview | Fuel Summary | Map
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Vehicle Health */}
        <Card>
          <SectionHead title="Vehicle Health" />
          <div className="flex items-center gap-4">
            <div className="relative">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie
                    data={[
                      { value: healthGood }, { value: healthFair }, { value: healthPoor },
                      { value: Math.max(0, totalVehicles - healthGood - healthFair - healthPoor) }
                    ]}
                    cx="50%" cy="50%" innerRadius={28} outerRadius={42} dataKey="value" strokeWidth={0}
                  >
                    <Cell fill="#10B981" /><Cell fill="#F59E0B" /><Cell fill="#EF4444" /><Cell fill="#E5E7EB" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-black text-gray-900">{healthPct}%</p>
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              <p className="text-xs font-black text-emerald-600">Good — {healthPct}%</p>
              {[
                { label: 'Good',  val: healthGood, color: 'bg-emerald-500' },
                { label: 'Fair',  val: healthFair, color: 'bg-amber-400'  },
                { label: 'Poor',  val: healthPoor, color: 'bg-red-500'    },
              ].map(h => (
                <div key={h.label} className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", h.color)} />
                  <span className="text-[10px] text-gray-500">{h.label}</span>
                  <span className="text-[10px] font-black text-gray-700 ml-auto">{h.val} ({totalVehicles > 0 ? Math.round(h.val/totalVehicles*100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Maintenance Overview */}
        <Card>
          <SectionHead title="Maintenance Overview" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Due Now',   val: maintDueNow,   color: 'text-red-600',    bg: 'bg-red-50',    icon: <AlertTriangle className="w-4 h-4"/> },
              { label: 'Due Soon',  val: maintDueSoon,  color: 'text-amber-600',  bg: 'bg-amber-50',  icon: <Clock className="w-4 h-4"/> },
              { label: 'Scheduled', val: maintScheduled,color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <CalendarDays className="w-4 h-4"/> },
              { label: 'Completed', val: maintCompleted,color: 'text-emerald-600',bg: 'bg-emerald-50',icon: <CheckCircle2 className="w-4 h-4"/> },
            ].map(m => (
              <div key={m.label} className={cn("rounded-xl p-3 flex items-center gap-2", m.bg)}>
                <span className={m.color}>{m.icon}</span>
                <div>
                  <p className={cn("text-xl font-black", m.color)}>{m.val}</p>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-tight">{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fuel Summary */}
        <Card>
          <SectionHead title="Fuel Summary (This Month)" />
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Fuel (L)</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-black text-gray-900">{totalFuelL.toLocaleString()} L</p>
                <span className={cn("text-[10px] font-black mb-1", fuelTrend >= 0 ? 'text-red-500' : 'text-emerald-600')}>
                  {fuelTrend >= 0 ? '↑' : '↓'} {Math.abs(fuelTrend)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated Cost</p>
              <p className="text-xl font-black text-indigo-700">
                LKR {fuelCost >= 1_000_000 ? `${(fuelCost/1_000_000).toFixed(1)}M` : fuelCost >= 1_000 ? `${(fuelCost/1_000).toFixed(0)}K` : fuelCost.toLocaleString()}
              </p>
            </div>
            <div className="h-12 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days7.map((d, i) => ({
                  v: fuelTx.filter(t => t.date.startsWith(d)).reduce((s, t) => s + (t.quantityIssuedL || 0), 0)
                }))}>
                  <defs>
                    <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#F59E0B" strokeWidth={2} fill="url(#fg)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* System Status / KPIs */}
        <Card>
          <SectionHead title="Key Performance" />
          <div className="space-y-3">
            {[
              { label: 'Avg Fuel Efficiency',  val: `${avgEfficiency} km/L`,     icon: <Fuel className="w-3.5 h-3.5" />,        color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Total KM This Month',  val: totalKmThisMonth > 0 ? `${(totalKmThisMonth/1000).toFixed(1)}K km` : '—', icon: <Activity className="w-3.5 h-3.5" />,  color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Active Staff',         val: staff.filter(s=>s.active).length, icon: <Users className="w-3.5 h-3.5" />,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pending Alerts',       val: alerts.filter(a => a.severity === 'expired' || a.severity === 'critical').length, icon: <AlertTriangle className="w-3.5 h-3.5"/>, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(k => (
              <div key={k.label} className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", k.bg)}>
                  <span className={k.color}>{k.icon}</span>
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-gray-500">{k.label}</p>
                  <p className={cn("text-sm font-black", k.color)}>{k.val}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 4 — Recent Activity | Top Drivers | Cost Overview
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Activity */}
        <Card>
          <SectionHead title="Recent Activity" action="View All" actionUrl="/logs" />
          <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
            {recentActivity.length === 0 && (
              <p className="text-xs text-gray-400 font-bold text-center py-6">No recent activity</p>
            )}
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={cn("p-1.5 rounded-lg flex-shrink-0 mt-0.5", a.color)}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-gray-700 leading-tight">{a.text}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Drivers */}
        <Card>
          <SectionHead title="Top Drivers (This Month)" action="View All" actionUrl="/staff" />
          {driverKm.length === 0 ? (
            <p className="text-xs text-gray-400 font-bold text-center py-8">No trip data this month</p>
          ) : (
            <div className="space-y-3">
              {driverKm.map(([name, km], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0",
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'
                  )}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-black text-gray-700 truncate">{name}</p>
                      <p className="text-[11px] font-black text-indigo-600 ml-2 flex-shrink-0">{km.toLocaleString()} km</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.round((km / maxDriverKm) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cost Overview */}
        <Card>
          <SectionHead title="Cost Overview (This Month)" />
          <div className="flex items-center gap-4">
            <div className="relative">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie
                    data={costDonut.length ? costDonut : [{ name: 'No Data', value: 1, color: '#E5E7EB' }]}
                    cx="50%" cy="50%" innerRadius={34} outerRadius={52} dataKey="value" strokeWidth={0}
                  >
                    {(costDonut.length ? costDonut : [{ color: '#E5E7EB' }]).map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black text-gray-500 leading-tight text-center">Total</p>
                <p className="text-xs font-black text-gray-900">
                  {totalCost >= 1_000_000 ? `${(totalCost/1_000_000).toFixed(1)}M` : `${(totalCost/1_000).toFixed(0)}K`}
                </p>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              {costDonut.map(c => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="text-[10px] font-bold text-gray-600">{c.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-gray-700">
                    LKR {c.value >= 1000 ? `${(c.value/1000).toFixed(0)}K` : c.value.toLocaleString()}
                    <span className="text-gray-400 ml-1">({totalCost > 0 ? Math.round(c.value/totalCost*100) : 0}%)</span>
                  </span>
                </div>
              ))}
              {costDonut.length === 0 && (
                <p className="text-xs text-gray-400 font-bold">No cost data this month</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 5 — Quick Actions
      ════════════════════════════════════════════════════════════════════ */}
      <Card>
        <SectionHead title="Quick Actions" />
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
          <QA icon={<Truck className="w-5 h-5"/>}         label="Add Vehicle"          to="/fleet/new"             color="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100" />
          <QA icon={<UserSquare2 className="w-5 h-5"/>}   label="Add Driver"           to="/staff/new"             color="bg-violet-50 text-violet-600 group-hover:bg-violet-100" />
          <QA icon={<Fuel className="w-5 h-5"/>}          label="Issue Fuel"           to="/inventory"             color="bg-amber-50 text-amber-600 group-hover:bg-amber-100" />
          <QA icon={<ClipboardList className="w-5 h-5"/>} label="New Log"              to="/logs/new"              color="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100" />
          <QA icon={<Wrench className="w-5 h-5"/>}        label="Schedule Maint."      to="/garage/new"            color="bg-rose-50 text-rose-600 group-hover:bg-rose-100" />
          <QA icon={<CalendarCheck className="w-5 h-5"/>} label="Book Vehicle"         to="/fleet/bookings/new"    color="bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100" />
          <QA icon={<DollarSign className="w-5 h-5"/>}    label="New Invoice"          to="/invoices/new"          color="bg-teal-50 text-teal-600 group-hover:bg-teal-100" />
          <QA icon={<BarChart3 className="w-5 h-5"/>}     label="View Reports"         to="/reports"               color="bg-purple-50 text-purple-600 group-hover:bg-purple-100" />
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════════════════════
          ROW 6 — Bottom KPI strip
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Distance (Month)',
            value: totalKmThisMonth >= 1000 ? `${(totalKmThisMonth/1000).toFixed(1)}K km` : `${totalKmThisMonth} km`,
            trend: kmTrend, good: true,
            spark: days7.map((d) => logs.filter(l => (l.startDate||'').startsWith(d)).reduce((s,l) => s + Math.max(0,(l.endMeterReading||0)-(l.startMeterReading||0)), 0)),
            color: '#6366F1',
          },
          {
            label: 'Total Trips (Month)',
            value: tripsThisMonth,
            trend: pct(tripsThisMonth, Math.max(1, lastMonthLogs.length)), good: true,
            spark: days7.map(d => logs.filter(l => (l.startDate||'').startsWith(d)).length),
            color: '#10B981',
          },
          {
            label: 'Avg Fuel Efficiency',
            value: `${avgEfficiency} km/L`,
            trend: 0, good: true,
            spark: mkSpark(parseFloat(String(avgEfficiency)) || 8),
            color: '#F59E0B',
          },
          {
            label: 'Fuel Used (Month)',
            value: `${totalFuelL.toLocaleString()} L`,
            trend: fuelTrend, good: false,
            spark: days7.map(d => fuelTx.filter(t => t.date.startsWith(d)).reduce((s,t) => s + (t.quantityIssuedL||0), 0)),
            color: '#EF4444',
          },
          {
            label: 'System Status',
            value: alerts.filter(a => a.severity === 'expired').length === 0 ? 'All Clear' : `${alerts.filter(a => a.severity === 'expired').length} Expired`,
            trend: undefined, good: true,
            spark: mkSpark(4),
            color: alerts.filter(a => a.severity === 'expired').length === 0 ? '#10B981' : '#EF4444',
          },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
          >
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{k.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-lg font-black text-gray-900">{k.value}</p>
              {k.trend !== undefined && (
                <span className={cn("text-[10px] font-black mb-0.5", (k.good ? k.trend >= 0 : k.trend < 0) ? 'text-emerald-600' : 'text-red-500')}>
                  {k.trend >= 0 ? '↑' : '↓'} {Math.abs(k.trend)}%
                </span>
              )}
            </div>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={k.spark.map(v => ({ v }))}>
                  <defs>
                    <linearGradient id={`bk${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={k.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={k.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={k.color} strokeWidth={1.5} fill={`url(#bk${i})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
};

export default DashboardPage;
