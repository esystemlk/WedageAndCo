import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Plus, Search, FileText, Clock, CheckCircle2, XCircle,
  Truck, ChevronRight, ChevronDown, Download, AlertTriangle, AlertCircle,
  Info, DollarSign, TrendingUp, TrendingDown, Package, RefreshCw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { getPurchaseOrders, PurchaseOrder } from '../../services/poService';
import { useSuppliers } from '../../hooks/useSuppliers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CATEGORY_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#94A3B8'];

// Display mapping for the raw status enum
const STATUS_DISPLAY: Record<string, { label: string; pill: string; color: string }> = {
  'Draft':              { label: 'Draft',       pill: 'bg-gray-100 text-gray-500',    color: '#94A3B8' },
  'Sent':               { label: 'Sent',        pill: 'bg-blue-100 text-blue-600',    color: '#3B82F6' },
  'Partially Received': { label: 'In Progress', pill: 'bg-amber-100 text-amber-600',  color: '#F59E0B' },
  'Fully Received':     { label: 'Received',    pill: 'bg-emerald-100 text-emerald-600', color: '#10B981' },
  'Cancelled':          { label: 'Cancelled',   pill: 'bg-red-100 text-red-600',      color: '#EF4444' },
};
const STATUS_ORDER = ['Draft', 'Sent', 'Partially Received', 'Fully Received', 'Cancelled'];

function fmtLKR(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString();
}

function isSameMonth(dateStr: string | undefined, ref: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function daysUntil(dateStr?: string): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

const PurchaseOrderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { suppliers } = useSuppliers();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      const data = await getPurchaseOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Map supplierId → primary supply category (for category-based aggregations)
  const supplierCategory = useMemo(() => {
    const map: Record<string, string> = {};
    (suppliers || []).forEach(s => {
      if (s.id) map[s.id] = (s.supplyCategories && s.supplyCategories[0]) || 'Others';
    });
    return map;
  }, [suppliers]);

  const catOf = (po: PurchaseOrder) => supplierCategory[po.supplierId] || 'Others';

  const now = new Date();

  // ── KPI stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const spentThisMonth = orders
      .filter(o => isSameMonth(o.date, now) && o.status !== 'Cancelled')
      .reduce((s, o) => s + (o.grandTotal || 0), 0);
    const inProgress = orders.filter(o => o.status === 'Partially Received').length;
    const pendingApproval = orders.filter(o => o.status === 'Draft').length;
    const receivedThisMonth = orders.filter(o => o.status === 'Fully Received' && isSameMonth(o.date, now)).length;
    const overdue = orders.filter(o =>
      o.requiredDeliveryDate && daysUntil(o.requiredDeliveryDate) < 0 &&
      o.status !== 'Fully Received' && o.status !== 'Cancelled'
    ).length;
    return {
      total: orders.length,
      spentThisMonth,
      inProgress,
      pendingApproval,
      receivedThisMonth,
      overdue,
    };
  }, [orders]);

  // ── Status breakdown (donut) ────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return STATUS_ORDER
      .filter(s => counts[s])
      .map(s => ({ name: STATUS_DISPLAY[s].label, value: counts[s], color: STATUS_DISPLAY[s].color }));
  }, [orders]);

  // ── Monthly procurement spend (current year) ────────────────────────────────
  const monthlySpend = useMemo(() => {
    const map: Record<number, number> = {};
    orders.forEach(o => {
      if (!o.date || o.status === 'Cancelled') return;
      const d = new Date(o.date);
      if (d.getFullYear() === now.getFullYear()) map[d.getMonth()] = (map[d.getMonth()] || 0) + (o.grandTotal || 0);
    });
    return MONTHS_SHORT.map((m, i) => ({ month: m, spend: map[i] || 0 }));
  }, [orders]);

  // ── Spend by category (this month) ──────────────────────────────────────────
  const spendByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    orders.filter(o => isSameMonth(o.date, now) && o.status !== 'Cancelled').forEach(o => {
      const c = catOf(o);
      map[c] = (map[c] || 0) + (o.grandTotal || 0);
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, pct: (value / total) * 100, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  }, [orders, supplierCategory]);

  // ── Top suppliers by spend (this month) ─────────────────────────────────────
  const topSuppliers = useMemo(() => {
    const map: Record<string, number> = {};
    orders.filter(o => isSameMonth(o.date, now) && o.status !== 'Cancelled').forEach(o => {
      map[o.supplierName] = (map[o.supplierName] || 0) + (o.grandTotal || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, spend]) => ({ name, spend }));
  }, [orders]);

  // ── Recent POs ──────────────────────────────────────────────────────────────
  const recentPOs = useMemo(() => orders.slice(0, 5), [orders]);

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { icon: React.ReactNode; tone: string; title: string; body: string; id?: string }[] = [];
    orders.forEach(o => {
      if (o.requiredDeliveryDate && daysUntil(o.requiredDeliveryDate) < 0 && o.status !== 'Fully Received' && o.status !== 'Cancelled') {
        list.push({ icon: <AlertTriangle className="w-3.5 h-3.5" />, tone: 'red', title: `${o.poNumber} is overdue`, body: `Supplier: ${o.supplierName}`, id: o.id });
      }
    });
    orders.filter(o => o.status === 'Draft').slice(0, 3).forEach(o => {
      list.push({ icon: <AlertCircle className="w-3.5 h-3.5" />, tone: 'amber', title: `${o.poNumber} awaiting approval`, body: `Amount: LKR ${(o.grandTotal || 0).toLocaleString()}`, id: o.id });
    });
    orders.filter(o => o.status === 'Partially Received').slice(0, 2).forEach(o => {
      list.push({ icon: <Info className="w-3.5 h-3.5" />, tone: 'blue', title: `GRN pending for ${o.poNumber}`, body: `Supplier: ${o.supplierName}`, id: o.id });
    });
    return list.slice(0, 6);
  }, [orders]);

  // ── Filtered table ──────────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const s = searchTerm.toLowerCase();
    const searchMatch = !s || o.poNumber.toLowerCase().includes(s) || o.supplierName.toLowerCase().includes(s);
    const statusMatch = statusFilter === 'All' || o.status === statusFilter;
    const supplierMatch = supplierFilter === 'All' || o.supplierName === supplierFilter;
    return searchMatch && statusMatch && supplierMatch;
  });

  const supplierNames = useMemo(
    () => Array.from(new Set(orders.map(o => o.supplierName))).sort(),
    [orders]
  );

  // ── Local helpers ───────────────────────────────────────────────────────────
  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("bg-white border border-gray-100 rounded-2xl shadow-sm", className)}>{children}</div>
  );
  const SH: React.FC<{ title: string; sub?: string; action?: string; url?: string }> = ({ title, sub, action, url }) => (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-black text-gray-900">
        {title}{sub && <span className="text-[10px] font-bold text-gray-400 ml-1">{sub}</span>}
      </h3>
      {action && (
        <Link to={url || '#'} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-widest">
          {action} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Procurement &amp; Acquisitions</h1>
          <p className="text-sm text-gray-400 font-bold mt-0.5">
            Manage supply chain intent, purchase orders, and supplier performance.
          </p>
        </div>
        <button
          onClick={() => navigate('/purchase-orders/new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Issue Purchase Order
        </button>
      </div>

      {/* ── Row 1: KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Purchase Orders', val: stats.total.toLocaleString(),               sub: 'All time',          icon: <ShoppingCart className="w-4 h-4" />, color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
          { label: 'Total Spent (Month)',   val: `LKR ${fmtLKR(stats.spentThisMonth)}`,        sub: 'This month',        icon: <DollarSign className="w-4 h-4" />,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'POs In Progress',       val: stats.inProgress,                             sub: 'Being received',    icon: <RefreshCw className="w-4 h-4" />,     color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Pending Approval',      val: stats.pendingApproval,                        sub: 'Draft POs',         icon: <Clock className="w-4 h-4" />,         color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Received (Month)',      val: stats.receivedThisMonth,                      sub: 'This month',        icon: <CheckCircle2 className="w-4 h-4" />,  color: 'text-teal-600',    bg: 'bg-teal-50'    },
          { label: 'Overdue POs',           val: stats.overdue,                                sub: 'Past delivery date',icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600',     bg: 'bg-red-50'     },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2.5 rounded-xl", k.bg)}>
                <span className={k.color}>{k.icon}</span>
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900">{k.val}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{k.label}</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Row 2: Status donut | Monthly spend | Spend by category ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Status donut */}
        <Card className="p-5">
          <SH title="Purchase Orders by Status" action="View All" url="/purchase-orders" />
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={statusData.length ? statusData : [{ value: 1, color: '#E5E7EB' }]}
                    cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" strokeWidth={0}
                  >
                    {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-black text-gray-900">{stats.total}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase">Total POs</p>
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[10px] font-bold text-gray-600">{s.name}</span>
                  </div>
                  <span className="text-[9px] text-gray-400">
                    {s.value} ({stats.total > 0 ? (s.value / stats.total * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              ))}
              {statusData.length === 0 && <p className="text-[10px] text-gray-400 font-bold">No purchase orders yet</p>}
            </div>
          </div>
        </Card>

        {/* Monthly spend */}
        <Card className="p-5">
          <SH title="Monthly Procurement Spend" sub="(LKR)" />
          <div className="mt-4 h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#94A3B8', fontWeight: 700 }} interval={0} />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={(v: number) => fmtLKR(v)} />
                <RTooltip
                  contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0' }}
                  formatter={(v: number) => [`LKR ${fmtLKR(v)}`, 'Spend']}
                />
                <Area type="monotone" dataKey="spend" stroke="#8B5CF6" strokeWidth={2} fill="url(#spendGrad)"
                  dot={{ r: 2.5, fill: '#8B5CF6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Spend by category */}
        <Card className="p-5">
          <SH title="Spend by Category" sub="(This Month)" action="View All" url="/suppliers" />
          <div className="mt-4 space-y-3">
            {spendByCategory.length === 0 ? (
              <p className="text-[10px] text-gray-400 font-bold">No spend this month</p>
            ) : spendByCategory.map(c => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-[10px] font-bold text-gray-600 truncate">{c.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-gray-900 flex-shrink-0 ml-2">
                    LKR {c.value.toLocaleString()} <span className="text-gray-400 font-bold">({c.pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 3: Top suppliers | Recent POs | Alerts ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Top suppliers */}
        <Card className="p-5">
          <SH title="Top Suppliers by Spend" sub="(This Month)" action="View All" url="/suppliers" />
          <div className="mt-4 space-y-2.5">
            {topSuppliers.length === 0 ? (
              <p className="text-[10px] text-gray-400 font-bold">No supplier spend this month</p>
            ) : topSuppliers.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-300 w-3">{i + 1}</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-gray-700 flex-1 truncate">{s.name}</span>
                <span className="text-[11px] font-black text-gray-900">LKR {s.spend.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent POs */}
        <Card className="p-5">
          <SH title="Recent Purchase Orders" action="View All" url="/purchase-orders" />
          <div className="mt-4 space-y-2">
            {recentPOs.length === 0 ? (
              <p className="text-[10px] text-gray-400 font-bold">No purchase orders yet</p>
            ) : recentPOs.map(po => (
              <button key={po.id} onClick={() => navigate(`/purchase-orders/${po.id}`)}
                className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-indigo-600">{po.poNumber}</p>
                  <p className="text-[10px] text-gray-500 font-bold truncate">{po.supplierName}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide", STATUS_DISPLAY[po.status]?.pill)}>
                    {STATUS_DISPLAY[po.status]?.label || po.status}
                  </span>
                  <span className="text-[10px] font-black text-gray-700 mt-0.5">LKR {(po.grandTotal || 0).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Alerts & Notifications */}
        <Card className="p-5">
          <SH title="Alerts &amp; Notifications" action="View All" url="/purchase-orders" />
          <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-700">No active alerts</p>
              </div>
            ) : alerts.map((a, i) => {
              const tone = a.tone === 'red'
                ? { bg: 'bg-red-50 hover:bg-red-100', text: 'text-red-700', icon: 'text-red-500' }
                : a.tone === 'amber'
                ? { bg: 'bg-amber-50 hover:bg-amber-100', text: 'text-amber-700', icon: 'text-amber-500' }
                : { bg: 'bg-blue-50 hover:bg-blue-100', text: 'text-blue-700', icon: 'text-blue-500' };
              return (
                <button key={i} onClick={() => a.id && navigate(`/purchase-orders/${a.id}`)}
                  className={cn("w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl transition-colors", tone.bg)}
                >
                  <span className={cn("flex-shrink-0 mt-0.5", tone.icon)}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[11px] font-black truncate", tone.text)}>{a.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{a.body}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 4: All Purchase Orders table ───────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-100/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h3 className="text-base font-black text-gray-900">All Purchase Orders</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search PO, supplier..."
                className="w-full sm:w-56 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
              >
                <option value="All">All Status</option>
                {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_DISPLAY[s].label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer max-w-[160px]"
              >
                <option value="All">All Suppliers</option>
                {supplierNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <ShoppingCart className="w-12 h-12 text-gray-200" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No purchase orders found</p>
            <button onClick={() => navigate('/purchase-orders/new')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              <Plus className="w-3 h-3" /> Issue First PO
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['PO Number', 'Supplier', 'Order Date', 'Required By', 'Category', 'Amount (LKR)', 'Status', 'Received', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filteredOrders.map((po, i) => (
                    <motion.tr key={po.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-[11px] font-black text-indigo-600">{po.poNumber}</span>
                      </td>
                      <td className="px-5 py-4 text-[11px] font-bold text-gray-700">{po.supplierName}</td>
                      <td className="px-5 py-4 text-[11px] text-gray-500 font-bold whitespace-nowrap">
                        {po.date ? format(new Date(po.date), 'MMM dd, yyyy') : '—'}
                      </td>
                      <td className="px-5 py-4 text-[11px] text-gray-500 font-bold whitespace-nowrap">
                        {po.requiredDeliveryDate ? format(new Date(po.requiredDeliveryDate), 'MMM dd, yyyy') : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-600 bg-gray-100">{catOf(po)}</span>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-gray-900 whitespace-nowrap">
                        {(po.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide", STATUS_DISPLAY[po.status]?.pill || 'bg-gray-100 text-gray-500')}>
                          {STATUS_DISPLAY[po.status]?.label || po.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[11px] text-gray-500 font-bold whitespace-nowrap">
                        {po.status === 'Fully Received' && po.date ? format(new Date(po.date), 'MMM dd, yyyy') : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 transition-colors inline-block" />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderListPage;
