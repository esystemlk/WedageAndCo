import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Package, Edit, Trash2, Phone, Mail, Star, ChevronDown,
  Download, AlertTriangle, CheckCircle2, Clock, XCircle, RefreshCw,
  TrendingUp, TrendingDown, ShieldAlert, FileText, ChevronRight,
  Filter, Users, BarChart3, DollarSign, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from 'recharts';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteSupplier, Supplier } from '../../services/supplierService';
import { useSuppliers } from '../../hooks/useSuppliers';
import { getPurchaseOrders, PurchaseOrder } from '../../services/poService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

// ── helpers ──────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysDiff(dateStr?: string): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700','bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700','bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700','bg-teal-100 text-teal-700',
];

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active:      { label: 'Active',      bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending:     { label: 'Pending',     bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  blacklisted: { label: 'Blacklisted', bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
  inactive:    { label: 'Inactive',    bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-400'     },
};

const CATEGORY_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316'];

// Stars component
const Stars: React.FC<{ value: number; size?: 'sm' | 'md' }> = ({ value, size = 'sm' }) => {
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={cn(sz, i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200')} />
      ))}
      <span className={cn("font-black ml-1", size === 'sm' ? 'text-[10px]' : 'text-xs', "text-gray-700")}>{value.toFixed(1)}</span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
const SupplierListPage: React.FC = () => {
  const navigate = useNavigate();
  const { suppliers, loading, refresh } = useSuppliers();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [posLoading, setPosLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    getPurchaseOrders().then(data => {
      setPos(data || []);
      setPosLoading(false);
    });
  }, []);

  // ── Per-supplier PO metrics ──────────────────────────────────────────────
  const supplierMetrics = useMemo(() => {
    const map: Record<string, { orders: number; spend: number }> = {};
    pos.forEach(po => {
      if (!po.supplierId) return;
      if (!map[po.supplierId]) map[po.supplierId] = { orders: 0, spend: 0 };
      map[po.supplierId].orders += 1;
      map[po.supplierId].spend  += po.grandTotal || 0;
    });
    return map;
  }, [pos]);

  // ── Monthly spend (last 12 months from POs) ──────────────────────────────
  const monthlySpend = useMemo(() => {
    const map: Record<string, number> = {};
    pos.forEach(po => {
      if (!po.date) return;
      const [y, m] = po.date.split('-');
      const key = `${y}-${m}`;
      map[key] = (map[key] || 0) + (po.grandTotal || 0);
    });
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (7 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
      const val = map[key] || 0;
      return { month: MONTHS_SHORT[d.getMonth()], spend: val, label: val >= 1000 ? `$${(val/1000).toFixed(1)}K` : `$${val}` };
    });
  }, [pos]);

  // ── PO status breakdown ───────────────────────────────────────────────────
  const poStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    pos.forEach(po => { counts[po.status] = (counts[po.status] || 0) + 1; });
    const colors: Record<string, string> = {
      'Draft': '#6366F1', 'Sent': '#10B981',
      'Partially Received': '#F59E0B', 'Fully Received': '#94A3B8', 'Cancelled': '#EF4444',
    };
    return Object.entries(counts).map(([status, value]) => ({
      name: status, value, color: colors[status] || '#94A3B8'
    }));
  }, [pos]);

  // ── Vendor categories breakdown ──────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    suppliers.forEach(s => {
      const cats = s.supplyCategories?.length ? s.supplyCategories : ['Uncategorised'];
      cats.forEach(c => { map[c] = (map[c] || 0) + 1; });
    });
    return Object.entries(map)
      .sort((a,b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  }, [suppliers]);

  // ── Spend by category ────────────────────────────────────────────────────
  const spendByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    const totalSpend = Object.values(supplierMetrics).reduce((s, m) => s + m.spend, 0);
    suppliers.forEach(s => {
      const cats = s.supplyCategories?.length ? s.supplyCategories : ['Uncategorised'];
      const m = supplierMetrics[s.id!];
      if (!m) return;
      cats.forEach(c => { map[c] = (map[c] || 0) + m.spend / cats.length; });
    });
    return Object.entries(map)
      .sort((a,b) => b[1] - a[1]).slice(0, 6)
      .map(([name, spend], i) => ({
        name, spend,
        pct: totalSpend > 0 ? Math.round((spend / totalSpend) * 100) : 0,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        label: spend >= 1_000_000 ? `LKR ${(spend/1_000_000).toFixed(1)}M` : spend >= 1000 ? `LKR ${(spend/1000).toFixed(0)}K` : `LKR ${spend.toFixed(0)}`,
      }));
  }, [suppliers, supplierMetrics]);

  // ── KPI stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all     = suppliers;
    const active  = all.filter(s => (s.status || 'active') === 'active');
    const pending = all.filter(s => s.status === 'pending');
    const black   = all.filter(s => s.status === 'blacklisted');
    const rated   = all.filter(s => s.rating);
    const avgRating = rated.length ? (rated.reduce((s, r) => s + (r.rating||0), 0) / rated.length) : 0;
    const expiring  = all.filter(s => { const d = daysDiff(s.contractExpiry); return d >= 0 && d <= 30; });
    return { total: all.length, active: active.length, pending: pending.length, blacklisted: black.length, avgRating, expiring: expiring.length };
  }, [suppliers]);

  // ── Critical alerts ──────────────────────────────────────────────────────
  const criticalAlerts = useMemo(() => {
    const items: { icon: React.ReactNode; title: string; body: string; color: string; bg: string; time?: string }[] = [];
    suppliers.filter(s => { const d = daysDiff(s.contractExpiry); return d >= 0 && d <= 30; })
      .forEach(s => items.push({
        icon: <FileText className="w-4 h-4"/>,
        title: 'Contract expiring soon',
        body: `${s.name} contract expires in ${daysDiff(s.contractExpiry)} days.`,
        color: 'text-red-600', bg: 'bg-red-50',
      }));
    suppliers.filter(s => s.status === 'blacklisted')
      .forEach(s => items.push({
        icon: <XCircle className="w-4 h-4"/>,
        title: 'Vendor blacklisted',
        body: `${s.name} is blacklisted. Review active POs immediately.`,
        color: 'text-rose-600', bg: 'bg-rose-50',
      }));
    suppliers.filter(s => s.status === 'pending')
      .slice(0, 3).forEach(s => items.push({
        icon: <Clock className="w-4 h-4"/>,
        title: 'Pending approval',
        body: `${s.name} is awaiting vendor approval.`,
        color: 'text-amber-600', bg: 'bg-amber-50',
      }));
    pos.filter(p => p.status === 'Sent' || p.status === 'Draft')
      .slice(0, 2).forEach(p => items.push({
        icon: <AlertTriangle className="w-4 h-4"/>,
        title: 'Open Purchase Order',
        body: `PO #${p.poNumber} (${p.supplierName}) — ${p.status}`,
        color: 'text-indigo-600', bg: 'bg-indigo-50',
      }));
    return items.slice(0, 6);
  }, [suppliers, pos]);

  // ── Top vendors by spend ──────────────────────────────────────────────────
  const topVendors = useMemo(() => {
    return suppliers
      .map(s => ({ ...s, spend: supplierMetrics[s.id!]?.spend || 0, orders: supplierMetrics[s.id!]?.orders || 0 }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
  }, [suppliers, supplierMetrics]);

  // ── Filtered table ────────────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    suppliers.forEach(s => s.supplyCategories?.forEach(c => cats.add(c)));
    return ['All', ...Array.from(cats)];
  }, [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q)
        || (s.contactName||'').toLowerCase().includes(q)
        || s.email.toLowerCase().includes(q);
      const status = s.status || 'active';
      const matchStatus = statusFilter === 'All' || status === statusFilter.toLowerCase();
      const matchCat = catFilter === 'All' || s.supplyCategories?.includes(catFilter);
      return matchSearch && matchStatus && matchCat;
    });
  }, [suppliers, search, statusFilter, catFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete supplier "${name}"?`)) return;
    await deleteSupplier(id);
    refresh();
  };

  const isLoading = loading || posLoading;

  // ── Card + SectionHead helpers ────────────────────────────────────────────
  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("bg-white border border-gray-100 rounded-2xl shadow-sm", className)}>{children}</div>
  );

  const SH: React.FC<{ title: string; action?: string; actionUrl?: string }> = ({ title, action, actionUrl }) => (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-black text-gray-900">{title}</h3>
      {action && (
        <Link to={actionUrl || '#'} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-widest">
          {action} <ChevronRight className="w-3 h-3"/>
        </Link>
      )}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Vendor Network</h1>
          <p className="text-sm text-gray-400 font-bold mt-0.5">
            Manage and monitor your vendor relationships, performance, and procurement activities.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <PermissionGate permission="edit_suppliers">
            <Link to="/suppliers/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Vendor
            </Link>
          </PermissionGate>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════════
              ROW 1 — KPI Cards
          ════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Vendors',     val: stats.total,       sub: '+0 this month',                     icon: <Users className="w-4 h-4"/>,       color: 'text-indigo-600', bg: 'bg-indigo-50',  trend: null },
              { label: 'Active Vendors',    val: stats.active,      sub: `${stats.total > 0 ? Math.round(stats.active/stats.total*100) : 0}% of total`, icon: <CheckCircle2 className="w-4 h-4"/>, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'up' },
              { label: 'Pending Approval',  val: stats.pending,     sub: `${stats.pending} awaiting`,         icon: <Clock className="w-4 h-4"/>,       color: 'text-amber-600',  bg: 'bg-amber-50',   trend: stats.pending > 0 ? 'up' : null },
              { label: 'Blacklisted',       val: stats.blacklisted, sub: `${stats.blacklisted} restricted`,   icon: <XCircle className="w-4 h-4"/>,     color: 'text-red-600',    bg: 'bg-red-50',     trend: null },
              { label: 'Avg. Rating',       val: `${stats.avgRating.toFixed(1)} / 5`, sub: 'Vendor performance', icon: <Star className="w-4 h-4"/>,    color: 'text-amber-500',  bg: 'bg-amber-50',   trend: 'up' },
              { label: 'Contracts Expiring',val: stats.expiring,    sub: 'Within 30 days',                    icon: <AlertTriangle className="w-4 h-4"/>,color: 'text-rose-600', bg: 'bg-rose-50',    trend: stats.expiring > 0 ? 'up-bad' : null },
            ].map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2.5 rounded-xl", k.bg)}>
                    <span className={k.color}>{k.icon}</span>
                  </div>
                  {k.trend && (
                    <span className={cn("text-[10px] font-black flex items-center gap-0.5",
                      k.trend === 'up' ? 'text-emerald-600' : k.trend === 'up-bad' ? 'text-red-500' : 'text-gray-400')}>
                      {k.trend === 'up' ? '↑' : '↑'} {k.trend === 'up-bad' ? 'Alert' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-black text-gray-900">{k.val}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{k.label}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-1">{k.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              ROW 2 — Categories Donut | Monthly Spend | Critical Alerts
          ════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Vendor Categories */}
            <Card className="p-5">
              <SH title="Vendor Categories" action="View All" actionUrl="/suppliers" />
              <div className="flex items-center gap-4 mt-4">
                <div className="relative flex-shrink-0">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie data={categoryBreakdown.length ? categoryBreakdown : [{ value: 1, color: '#E5E7EB' }]}
                        cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}
                      >
                        {categoryBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-black text-gray-900">{stats.total}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">Total</p>
                  </div>
                </div>
                <div className="space-y-1.5 flex-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                  {categoryBreakdown.map(c => (
                    <div key={c.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        <span className="text-[10px] font-bold text-gray-600 truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <span className="text-[10px] font-black text-gray-900">{c.value}</span>
                        <span className="text-[9px] text-gray-400">({stats.total > 0 ? Math.round(c.value/stats.total*100) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                  {categoryBreakdown.length === 0 && (
                    <p className="text-[10px] text-gray-400 font-bold">No categories yet</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Monthly Spend Overview */}
            <Card className="p-5">
              <SH title="Monthly Spend Overview" />
              <div className="mt-4 h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySpend} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <RTooltip
                      contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0' }}
                      formatter={(v: number) => [`LKR ${v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}`, 'Spend']}
                    />
                    <Line type="monotone" dataKey="spend" stroke="#6366F1" strokeWidth={2}
                      dot={{ r: 3, fill: '#6366F1' }}
                      label={{ position: 'top', fontSize: 8, fill: '#6366F1', fontWeight: 700,
                        formatter: (v: number) => v > 0 ? (v >= 1000 ? `${(v/1000).toFixed(0)}K` : v) : '' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-3 h-0.5 bg-indigo-500 rounded-full"/>
                <span className="text-[9px] font-bold text-gray-400">Monthly Spend (LKR)</span>
              </div>
            </Card>

            {/* Critical Alerts */}
            <Card className="p-5">
              <SH title="Critical Alerts" action="View All" actionUrl="/suppliers" />
              <div className="mt-4 space-y-2 max-h-[148px] overflow-y-auto custom-scrollbar">
                {criticalAlerts.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                    <p className="text-xs font-bold text-emerald-700">No critical alerts</p>
                  </div>
                ) : criticalAlerts.map((a, i) => (
                  <div key={i} className={cn("flex items-start gap-2.5 p-2.5 rounded-xl", a.bg)}>
                    <span className={cn("flex-shrink-0 mt-0.5", a.color)}>{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[11px] font-black", a.color)}>{a.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{a.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              ROW 3 — PO Overview | Top Vendors | Spend by Category
          ════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* PO Status Donut */}
            <Card className="p-5">
              <SH title="Purchase Orders Overview" action="View All" actionUrl="/purchase-orders" />
              <div className="flex items-center gap-4 mt-4">
                <div className="relative flex-shrink-0">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie data={poStatusData.length ? poStatusData : [{ value: 1, color: '#E5E7EB' }]}
                        cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}
                      >
                        {poStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-black text-gray-900">{pos.length}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">Total</p>
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  {poStatusData.map(s => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }}/>
                        <span className="text-[10px] font-bold text-gray-600">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-gray-900">{s.value}</span>
                        <span className="text-[9px] text-gray-400">({pos.length > 0 ? Math.round(s.value/pos.length*100) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                  {poStatusData.length === 0 && (
                    <p className="text-[10px] text-gray-400 font-bold">No purchase orders yet</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Top Performing Vendors */}
            <Card className="p-5">
              <SH title="Top Performing Vendors" action="View All" actionUrl="/suppliers" />
              <div className="mt-4">
                {topVendors.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold text-center py-6">No vendor data yet</p>
                ) : (
                  <div className="space-y-0">
                    <div className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-2 pb-2 border-b border-gray-100">
                      <span className="text-[9px] font-black text-gray-400 uppercase">#</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase">Vendor</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase text-right">Rating</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase text-right">Spend</span>
                    </div>
                    {topVendors.map((s, i) => (
                      <div key={s.id} className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-2 items-center py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-1 transition-colors cursor-pointer"
                        onClick={() => navigate(`/suppliers/${s.id}/edit`)}
                      >
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0",
                          i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'
                        )}>{i+1}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                            {getInitials(s.name)}
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 truncate">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {s.rating ? (
                            <><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span className="text-[10px] font-black text-gray-600">{s.rating.toFixed(1)}</span></>
                          ) : <span className="text-[10px] text-gray-300">—</span>}
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 text-right">
                          {s.spend >= 1_000_000 ? `${(s.spend/1_000_000).toFixed(1)}M` : s.spend >= 1000 ? `${(s.spend/1000).toFixed(0)}K` : s.spend.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Spend by Category */}
            <Card className="p-5">
              <SH title="Spend by Category (This Month)" />
              <div className="mt-4 space-y-3">
                {spendByCategory.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold text-center py-6">No spend data yet</p>
                ) : spendByCategory.map((c, i) => {
                  const maxSpend = spendByCategory[0]?.spend || 1;
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-gray-700 truncate">{c.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] font-black text-gray-900">{c.label}</span>
                          <span className="text-[9px] text-gray-400">({c.pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.round((c.spend / maxSpend) * 100)}%`, background: c.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              ROW 4 — All Vendors Table
          ════════════════════════════════════════════════════════════════ */}
          <Card className="overflow-hidden">
            {/* Table header + filters */}
            <div className="p-5 border-b border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900">All Vendors</h3>
                  <p className="text-[10px] text-gray-400 font-bold">Total {suppliers.length} vendors</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search vendors..."
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500/50 w-44 placeholder:text-gray-400"
                    />
                  </div>
                  {/* Category filter */}
                  <div className="relative">
                    <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                    >
                      {allCategories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
                  </div>
                  {/* Status filter */}
                  <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                    >
                      {['All','Active','Pending','Blacklisted','Inactive'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
                  </div>
                  {/* Export */}
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5"/> Export
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Vendor Name','Category','Contact Person','Phone','Email','Total Orders','Total Spend','Rating','Status','Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filtered.map((s, i) => {
                      const metrics = supplierMetrics[s.id!] || { orders: 0, spend: 0 };
                      const status  = s.status || 'active';
                      const scfg   = STATUS_CFG[status] || STATUS_CFG.active;
                      const cats   = s.supplyCategories || [];
                      const spendFmt = metrics.spend >= 1_000_000
                        ? `LKR ${(metrics.spend/1_000_000).toFixed(1)}M`
                        : metrics.spend >= 1000
                        ? `LKR ${(metrics.spend/1000).toFixed(0)}K`
                        : metrics.spend > 0 ? `LKR ${metrics.spend.toLocaleString()}` : '—';

                      return (
                        <motion.tr key={s.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                          onClick={() => navigate(`/suppliers/${s.id}/edit`)}
                        >
                          {/* Name */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                {getInitials(s.name)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{s.name}</p>
                                {s.brNo && <p className="text-[9px] text-gray-400 font-mono">{s.brNo}</p>}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              {cats.slice(0, 2).map((c, ci) => (
                                <span key={ci} className="px-2 py-0.5 rounded-full text-[9px] font-black border"
                                  style={{
                                    background: CATEGORY_COLORS[ci % CATEGORY_COLORS.length] + '15',
                                    color: CATEGORY_COLORS[ci % CATEGORY_COLORS.length],
                                    borderColor: CATEGORY_COLORS[ci % CATEGORY_COLORS.length] + '40',
                                  }}>
                                  {c}
                                </span>
                              ))}
                              {cats.length > 2 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gray-100 text-gray-500">+{cats.length-2}</span>
                              )}
                              {cats.length === 0 && <span className="text-[10px] text-gray-300">—</span>}
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">{s.contactName || '—'}</td>

                          {/* Phone */}
                          <td className="px-5 py-4 text-[11px] font-bold text-gray-600">{s.phone || '—'}</td>

                          {/* Email */}
                          <td className="px-5 py-4">
                            <span className="text-[11px] font-bold text-gray-600 truncate max-w-[160px] block">{s.email || '—'}</span>
                          </td>

                          {/* Orders */}
                          <td className="px-5 py-4 text-sm font-black text-gray-700">{metrics.orders || '—'}</td>

                          {/* Spend */}
                          <td className="px-5 py-4 text-sm font-black text-indigo-600">{spendFmt}</td>

                          {/* Rating */}
                          <td className="px-5 py-4">
                            {s.rating ? <Stars value={s.rating} /> : <span className="text-[10px] text-gray-300">No rating</span>}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black", scfg.bg, scfg.text)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", scfg.dot)}/>
                              {scfg.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <PermissionGate permission="edit_suppliers">
                                <button onClick={() => navigate(`/suppliers/${s.id}/edit`)}
                                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                                  <Edit className="w-3.5 h-3.5"/>
                                </button>
                                <button onClick={() => handleDelete(s.id!, s.name)}
                                  className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Package className="w-12 h-12 text-gray-200"/>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No vendors found</p>
                  <PermissionGate permission="edit_suppliers">
                    <Link to="/suppliers/new"
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                      <Plus className="w-3 h-3"/> Add First Vendor
                    </Link>
                  </PermissionGate>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default SupplierListPage;
