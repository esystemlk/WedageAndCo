import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Building2, Edit, Trash2, FileText, ChevronRight,
  ChevronDown, Download, Users, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, Clock, AlertTriangle, Calendar,
  Phone, Mail, RefreshCw, Activity, DollarSign, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteCustomer, Customer } from '../../services/customerService';
import { useCustomers } from '../../hooks/useCustomers';
import { useInvoices } from '../../hooks/useInvoices';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

// ── helpers ──────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function thisMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function lastMonthKey() {
  const d = new Date(); d.setMonth(d.getMonth()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
const isThisMonth = (s: string) => s?.startsWith(thisMonthKey());
const isLastMonth = (s: string) => s?.startsWith(lastMonthKey());

function lkr(n: number): string {
  if (n >= 1_000_000) return `LKR ${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `LKR ${(n/1_000).toFixed(0)}K`;
  return `LKR ${n.toLocaleString('en-LK')}`;
}
function lkrFull(n: number): string {
  return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function daysDiff(dateStr?: string): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d.getTime()-t.getTime())/86400000);
}

function getInitials(name: string) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function tsToDateStr(ts: any): string {
  if (!ts) return '';
  if (typeof ts === 'string') return ts.slice(0,7);
  if (ts?.seconds) return new Date(ts.seconds*1000).toISOString().slice(0,7);
  if (ts instanceof Date) return ts.toISOString().slice(0,7);
  return '';
}

// Avatar colour pool
const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700','bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700','bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700','bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700','bg-teal-100 text-teal-700',
];

const CYCLE_CFG: Record<string, { label: string; bg: string; text: string; color: string }> = {
  monthly:   { label: 'Monthly',      bg: 'bg-indigo-50', text: 'text-indigo-700', color: '#6366F1' },
  quarterly: { label: 'Quarterly',    bg: 'bg-emerald-50',text: 'text-emerald-700',color: '#10B981' },
  yearly:    { label: 'Yearly',       bg: 'bg-amber-50',  text: 'text-amber-700',  color: '#F59E0B' },
  project:   { label: 'Project Based',bg: 'bg-violet-50', text: 'text-violet-700', color: '#8B5CF6' },
  adhoc:     { label: 'Ad-hoc',       bg: 'bg-gray-50',   text: 'text-gray-500',   color: '#94A3B8' },
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active:    { label: 'Active',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inactive:  { label: 'Inactive',  bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-400'    },
  prospect:  { label: 'Prospect',  bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400'    },
  suspended: { label: 'Suspended', bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
};

const INV_STATUS_CFG: Record<string, { color: string; label: string }> = {
  paid:    { color: '#10B981', label: 'Paid'      },
  sent:    { color: '#6366F1', label: 'Pending'   },
  overdue: { color: '#EF4444', label: 'Overdue'   },
  draft:   { color: '#94A3B8', label: 'Draft'     },
};

// ── Small reusable card ───────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white border border-gray-100 rounded-2xl shadow-sm", className)}>{children}</div>
);
const SH: React.FC<{ title: string; action?: string; actionUrl?: string }> = ({ title, action, actionUrl }) => (
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-black text-gray-900">{title}</h3>
    {action && (
      <Link to={actionUrl||'#'} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-widest">
        {action} <ChevronRight className="w-3 h-3"/>
      </Link>
    )}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const CustomerListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { customers, loading: custLoading, refresh } = useCustomers();
  const { invoices, loading: invLoading } = useInvoices();

  // Filters
  const [search, setSearch]               = useState('');
  const [cycleFilter, setCycleFilter]     = useState('All');
  const [statusFilter, setStatusFilter]   = useState('All');

  const isLoading = custLoading || invLoading;

  // ── Per-customer invoice metrics ──────────────────────────────────────────
  const customerMetrics = useMemo(() => {
    const map: Record<string, { revenue: number; outstanding: number; invCount: number }> = {};
    invoices.forEach(inv => {
      if (!inv.customerId) return;
      if (!map[inv.customerId]) map[inv.customerId] = { revenue: 0, outstanding: 0, invCount: 0 };
      map[inv.customerId].invCount += 1;
      if (inv.status === 'paid')    map[inv.customerId].revenue     += inv.totalAmount || 0;
      if (inv.status === 'overdue') map[inv.customerId].outstanding += inv.totalAmount || 0;
    });
    return map;
  }, [invoices]);

  // ── KPI stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active   = customers.filter(c => (c.status||'active') === 'active');
    const inactive = customers.filter(c => c.status === 'inactive');
    const newThisMonth = customers.filter(c => tsToDateStr(c.createdAt) === thisMonthKey());
    const newLastMonth = customers.filter(c => tsToDateStr(c.createdAt) === lastMonthKey());

    const revThisMonth = invoices
      .filter(i => isThisMonth(i.date) && i.status === 'paid')
      .reduce((s, i) => s + (i.totalAmount||0), 0);
    const revLastMonth = invoices
      .filter(i => isLastMonth(i.date) && i.status === 'paid')
      .reduce((s, i) => s + (i.totalAmount||0), 0);

    const overdueInvs = invoices.filter(i => i.status === 'overdue');
    const overdueAmt  = overdueInvs.reduce((s, i) => s + (i.totalAmount||0), 0);

    return {
      total: customers.length,
      active: active.length,
      inactive: inactive.length,
      newThisMonth: newThisMonth.length,
      newLastMonth: newLastMonth.length,
      revThisMonth, revLastMonth,
      overdueCount: overdueInvs.length,
      overdueAmt,
    };
  }, [customers, invoices]);

  // ── Monthly revenue chart (last 12 months) ────────────────────────────────
  const monthlyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.filter(i => i.status === 'paid').forEach(i => {
      const key = (i.date||'').slice(0,7);
      map[key] = (map[key]||0) + (i.totalAmount||0);
    });
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11-i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      return { month: MONTHS_SHORT[d.getMonth()], revenue: map[key]||0 };
    });
  }, [invoices]);

  // ── Client by agreement cycle ─────────────────────────────────────────────
  const cycleBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    customers.forEach(c => {
      const k = c.agreementCycle || (c.customerType === 'permanent' ? 'yearly' : 'adhoc');
      map[k] = (map[k]||0) + 1;
    });
    return Object.entries(map).map(([k, v]) => ({
      key: k, value: v,
      label: CYCLE_CFG[k]?.label || k,
      color: CYCLE_CFG[k]?.color || '#94A3B8',
    })).sort((a,b) => b.value - a.value);
  }, [customers]);

  // ── Invoice status breakdown ──────────────────────────────────────────────
  const invoiceStatusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(i => { map[i.status] = (map[i.status]||0)+1; });
    return Object.entries(map).map(([k,v]) => ({
      key: k, value: v,
      label: INV_STATUS_CFG[k]?.label || k,
      color: INV_STATUS_CFG[k]?.color || '#94A3B8',
    }));
  }, [invoices]);

  // ── Top clients by revenue ────────────────────────────────────────────────
  const topClients = useMemo(() => {
    return customers
      .map(c => ({ ...c, revenue: customerMetrics[c.id!]?.revenue||0 }))
      .sort((a,b) => b.revenue - a.revenue)
      .filter(c => c.revenue > 0)
      .slice(0, 5);
  }, [customers, customerMetrics]);
  const maxClientRev = topClients[0]?.revenue || 1;

  // ── Upcoming renewals ─────────────────────────────────────────────────────
  const upcomingRenewals = useMemo(() => {
    return customers
      .map(c => ({ ...c, days: daysDiff(c.agreementEnd) }))
      .filter(c => c.days >= 0 && c.days <= 45)
      .sort((a,b) => a.days - b.days)
      .slice(0, 5);
  }, [customers]);

  // ── Recent activity (latest invoices + new customers) ────────────────────
  const recentActivity = useMemo(() => {
    const items: { icon: React.ReactNode; text: string; time: string; color: string }[] = [];
    [...invoices].slice(0,4).forEach(inv => {
      const cust = customers.find(c => c.id === inv.customerId);
      items.push({
        icon: <FileText className="w-3.5 h-3.5"/>,
        text: `Invoice #${inv.invoiceNo} — ${cust?.name||'Client'} · ${lkr(inv.totalAmount||0)}`,
        time: inv.date||'',
        color: inv.status==='paid' ? 'bg-emerald-100 text-emerald-600' : inv.status==='overdue' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600',
      });
    });
    customers.slice(0,3).forEach(c => {
      if (!tsToDateStr(c.createdAt)) return;
      items.push({
        icon: <Building2 className="w-3.5 h-3.5"/>,
        text: `New client registered — ${c.name}`,
        time: tsToDateStr(c.createdAt) || '',
        color: 'bg-violet-100 text-violet-600',
      });
    });
    return items.sort((a,b) => b.time.localeCompare(a.time)).slice(0, 7);
  }, [invoices, customers]);

  // ── Filtered table ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return customers.filter(c => {
      const q = search.toLowerCase();
      const matchQ = !q || c.name.toLowerCase().includes(q)
        || (c.nickname||'').toLowerCase().includes(q)
        || c.brNo.toLowerCase().includes(q)
        || (c.opsContactName||'').toLowerCase().includes(q);
      const cycle  = c.agreementCycle || (c.customerType === 'permanent' ? 'yearly' : 'adhoc');
      const status = c.status || 'active';
      const matchCycle  = cycleFilter === 'All' || cycle === cycleFilter;
      const matchStatus = statusFilter === 'All' || status === statusFilter.toLowerCase();
      return matchQ && matchCycle && matchStatus;
    });
  }, [customers, search, cycleFilter, statusFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete client "${name}"?`)) return;
    try {
      await deleteCustomer(id); refresh();
      toast.success('Customer deleted', `${name} was removed.`);
    } catch (e) {
      console.error(e);
      toast.error('Delete failed', `Could not delete ${name}.`);
    }
  };

  const totalRevAllTime = Object.values(customerMetrics).reduce((s,m) => s+m.revenue, 0);
  const avgRevPerClient = customers.length > 0 ? totalRevAllTime / customers.length : 0;
  const revTrend = stats.revLastMonth > 0
    ? Math.round(((stats.revThisMonth - stats.revLastMonth) / stats.revLastMonth) * 100)
    : 0;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black italic text-gray-900">Client Directory</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
            Operational Partnerships · {stats.active} Active Accounts
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5"/> Import Clients
          </button>
          <PermissionGate permission="view_customers">
            <Link to="/customers/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5"/> New Client
            </Link>
          </PermissionGate>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner/></div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════
              ROW 1 — KPI Cards
          ══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                label: 'Total Clients', val: stats.total,
                sub: `+${stats.newThisMonth} this month`,
                icon: <Users className="w-4 h-4"/>, bg: 'bg-indigo-50', color: 'text-indigo-600',
                trend: stats.newThisMonth > 0 ? 'up' : null, trendGood: true,
                spark: [stats.total-4, stats.total-2, stats.total-1, stats.total],
                sparkColor: '#6366F1',
              },
              {
                label: 'Active Clients', val: stats.active,
                sub: `${stats.total > 0 ? Math.round(stats.active/stats.total*100) : 0}% of total`,
                icon: <CheckCircle2 className="w-4 h-4"/>, bg: 'bg-emerald-50', color: 'text-emerald-600',
                trend: 'up', trendGood: true,
                spark: [stats.active-3,stats.active-1,stats.active-2,stats.active],
                sparkColor: '#10B981',
              },
              {
                label: 'New This Month', val: stats.newThisMonth,
                sub: `+${stats.newThisMonth - stats.newLastMonth} vs last month`,
                icon: <TrendingUp className="w-4 h-4"/>, bg: 'bg-violet-50', color: 'text-violet-600',
                trend: stats.newThisMonth >= stats.newLastMonth ? 'up' : 'down', trendGood: true,
                spark: [stats.newLastMonth, stats.newThisMonth],
                sparkColor: '#8B5CF6',
              },
              {
                label: 'Inactive Clients', val: stats.inactive,
                sub: `${stats.inactive} deactivated`,
                icon: <XCircle className="w-4 h-4"/>, bg: 'bg-gray-50', color: 'text-gray-500',
                trend: null, trendGood: false,
                spark: [stats.inactive],
                sparkColor: '#94A3B8',
              },
              {
                label: 'Revenue (This Month)', val: lkr(stats.revThisMonth),
                sub: `${revTrend >= 0 ? '+' : ''}${revTrend}% vs last month`,
                icon: <DollarSign className="w-4 h-4"/>, bg: 'bg-amber-50', color: 'text-amber-600',
                trend: revTrend >= 0 ? 'up' : 'down', trendGood: true,
                spark: monthlyRevenue.slice(-4).map(m => m.revenue),
                sparkColor: '#F59E0B',
              },
              {
                label: 'Overdue Invoices', val: stats.overdueCount,
                sub: lkr(stats.overdueAmt) + ' overdue',
                icon: <AlertTriangle className="w-4 h-4"/>, bg: 'bg-red-50', color: 'text-red-600',
                trend: stats.overdueCount > 0 ? 'up-bad' : null, trendGood: false,
                spark: [stats.overdueCount, stats.overdueCount],
                sparkColor: '#EF4444',
              },
            ].map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i*0.05 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2.5 rounded-xl", k.bg)}>
                    <span className={k.color}>{k.icon}</span>
                  </div>
                  {k.trend && (
                    <span className={cn("text-[10px] font-black flex items-center gap-0.5",
                      k.trend === 'up' ? 'text-emerald-600'
                      : k.trend === 'up-bad' ? 'text-red-500'
                      : 'text-red-500')}>
                      {k.trend === 'down' ? <ArrowDownRight className="w-3 h-3"/> : <ArrowUpRight className="w-3 h-3"/>}
                      {k.trend === 'up-bad' ? 'Alert' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xl font-black text-gray-900 leading-tight">{k.val}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{k.label}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-1">{k.sub}</p>
                {k.spark.length > 1 && (
                  <div className="mt-2 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={k.spark.map(v => ({ v }))}>
                        <defs>
                          <linearGradient id={`cg${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={k.sparkColor} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={k.sparkColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={k.sparkColor} strokeWidth={1.5}
                          fill={`url(#cg${i})`} dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ROW 2 — Agreement Cycle Donut | Revenue Overview | Top Clients
          ══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Agreement Cycle Donut */}
            <Card className="p-5">
              <SH title="Client by Agreement Cycle" action="View All" actionUrl="/customers"/>
              <div className="flex items-center gap-4 mt-4">
                <div className="relative flex-shrink-0">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie data={cycleBreakdown.length ? cycleBreakdown : [{value:1,color:'#E5E7EB'}]}
                        cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
                        {cycleBreakdown.map((e,i) => <Cell key={i} fill={e.color}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-black text-gray-900">{stats.total}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">Total</p>
                  </div>
                </div>
                <div className="space-y-1.5 flex-1 max-h-[110px] overflow-y-auto custom-scrollbar">
                  {cycleBreakdown.map(c => (
                    <div key={c.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }}/>
                        <span className="text-[10px] font-bold text-gray-600 truncate">{c.label}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <span className="text-[10px] font-black text-gray-900">{c.value}</span>
                        <span className="text-[9px] text-gray-400">({stats.total > 0 ? Math.round(c.value/stats.total*100) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                  {cycleBreakdown.length === 0 && <p className="text-[10px] text-gray-400">No clients yet</p>}
                </div>
              </div>
            </Card>

            {/* Revenue Overview */}
            <Card className="p-5">
              <SH title="Revenue Overview"/>
              <div className="grid grid-cols-2 gap-4 mt-3 mb-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Revenue</p>
                  <p className="text-lg font-black text-gray-900">{lkr(totalRevAllTime)}</p>
                  {revTrend !== 0 && (
                    <p className={cn("text-[10px] font-black flex items-center gap-0.5", revTrend > 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {revTrend > 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                      {Math.abs(revTrend)}% vs last month
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg. / Client</p>
                  <p className="text-lg font-black text-gray-900">{lkr(avgRevPerClient)}</p>
                </div>
              </div>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue} margin={{ top: 0, right: 4, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                    <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#94A3B8', fontWeight: 700 }}/>
                    <YAxis tick={{ fontSize: 8, fill: '#94A3B8' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}/>
                    <RTooltip contentStyle={{ fontSize: 11, borderRadius: 10, border:'1px solid #E2E8F0' }}
                      formatter={(v: number) => [lkrFull(v), 'Revenue']}/>
                    <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2}
                      fill="url(#revGrad)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top Clients by Revenue */}
            <Card className="p-5">
              <SH title="Top Clients by Revenue (This Month)" action="View All" actionUrl="/customers"/>
              <div className="mt-4">
                {topClients.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold text-center py-6">No revenue data yet</p>
                ) : (
                  <div className="space-y-3">
                    {topClients.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
                        onClick={() => navigate(`/customers/${c.id}`)}>
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0",
                          i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'
                        )}>{i+1}</span>
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                          {getInitials(c.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-gray-700 truncate">{c.name}</p>
                          <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.round((c.revenue/maxClientRev)*100)}%` }}/>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 flex-shrink-0">{lkr(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ROW 3 — Invoice Status | Recent Activity | Upcoming Renewals
          ══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Invoice Status Donut */}
            <Card className="p-5">
              <SH title="Invoice Status Overview" action="View All" actionUrl="/invoices"/>
              <div className="flex items-center gap-4 mt-4">
                <div className="relative flex-shrink-0">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie data={invoiceStatusBreakdown.length ? invoiceStatusBreakdown : [{value:1,color:'#E5E7EB'}]}
                        cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
                        {invoiceStatusBreakdown.map((e,i) => <Cell key={i} fill={e.color}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-black text-gray-900">{invoices.length}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">Total</p>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {invoiceStatusBreakdown.map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }}/>
                        <span className="text-[10px] font-bold text-gray-600">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-gray-900">{s.value}</span>
                        <span className="text-[9px] text-gray-400">({invoices.length > 0 ? Math.round(s.value/invoices.length*100) : 0}%)</span>
                      </div>
                    </div>
                  ))}
                  {invoiceStatusBreakdown.length === 0 && <p className="text-[10px] text-gray-400">No invoices yet</p>}
                </div>
              </div>
            </Card>

            {/* Recent Client Activity */}
            <Card className="p-5">
              <SH title="Recent Client Activity" action="View All" actionUrl="/invoices"/>
              <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                {recentActivity.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold text-center py-6">No recent activity</p>
                ) : recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={cn("p-1.5 rounded-lg flex-shrink-0 mt-0.5", a.color)}>{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-700 leading-tight">{a.text}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upcoming Renewals */}
            <Card className="p-5">
              <SH title="Upcoming Renewals" action="View All" actionUrl="/customers"/>
              <div className="mt-4 space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                {upcomingRenewals.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                    <p className="text-xs font-bold text-emerald-700">No renewals due within 45 days</p>
                  </div>
                ) : upcomingRenewals.map(c => {
                  const urgent = c.days <= 10;
                  const soon   = c.days <= 20;
                  const expiryDate = new Date(c.agreementEnd || '').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
                  return (
                    <div key={c.id} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
                      onClick={() => navigate(`/customers/${c.id}/edit`)}>
                      <div className={cn("p-1.5 rounded-lg flex-shrink-0", urgent ? 'bg-red-100' : soon ? 'bg-amber-100' : 'bg-blue-100')}>
                        <Calendar className={cn("w-3.5 h-3.5", urgent ? 'text-red-600' : soon ? 'text-amber-600' : 'text-blue-600')}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-800 truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-500">Contract renewal in {c.days} day{c.days !== 1?'s':''}</p>
                      </div>
                      <span className={cn("text-[10px] font-black flex-shrink-0", urgent ? 'text-red-600' : soon ? 'text-amber-600' : 'text-blue-600')}>
                        {expiryDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ROW 4 — All Clients Table
          ══════════════════════════════════════════════════════════════ */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900">All Clients</h3>
                  <p className="text-[10px] text-gray-400 font-bold">{customers.length} total clients</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search clients..."
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500/50 w-44 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="relative">
                    <select value={cycleFilter} onChange={e => setCycleFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-600 outline-none cursor-pointer">
                      <option value="All">All Agreement Cycles</option>
                      {Object.entries(CYCLE_CFG).map(([k,c]) => <option key={k} value={k}>{c.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
                  </div>
                  <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-600 outline-none cursor-pointer">
                      <option value="All">All Status</option>
                      {Object.entries(STATUS_CFG).map(([k,c]) => <option key={k} value={k}>{c.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"/>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5"/> Export
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Company / Identity','BR Number','Contact Person','Contact Channel','Agreement Cycle','Total Revenue','Outstanding','Status','Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filtered.map((c, i) => {
                      const m      = customerMetrics[c.id!] || { revenue: 0, outstanding: 0, invCount: 0 };
                      const status = c.status || 'active';
                      const cycle  = c.agreementCycle || (c.customerType === 'permanent' ? 'yearly' : 'adhoc');
                      const scfg   = STATUS_CFG[status] || STATUS_CFG.active;
                      const ccfg   = CYCLE_CFG[cycle]  || CYCLE_CFG.adhoc;

                      return (
                        <motion.tr key={c.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ delay: i*0.02 }}
                          className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                          onClick={() => navigate(`/customers/${c.id}`)}
                        >
                          {/* Company */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                                {getInitials(c.name)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{c.name}</p>
                                {c.nickname && <p className="text-[9px] text-gray-400 font-bold">{c.nickname}</p>}
                              </div>
                            </div>
                          </td>

                          {/* BR Number */}
                          <td className="px-5 py-4">
                            <span className="font-mono text-[11px] font-bold text-gray-600">{c.brNo || '—'}</span>
                          </td>

                          {/* Contact Person */}
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">
                            {c.opsContactName || c.billingContactName || '—'}
                          </td>

                          {/* Contact Channel */}
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              {c.opsContactNumber && (
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                                  <Phone className="w-3 h-3 text-gray-400"/> {c.opsContactNumber}
                                </div>
                              )}
                              {c.billingContactNumber && c.billingContactNumber !== c.opsContactNumber && (
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                                  <Mail className="w-3 h-3 text-gray-300"/> {c.billingContactNumber}
                                </div>
                              )}
                              {!c.opsContactNumber && !c.billingContactNumber && (
                                <span className="text-[11px] text-gray-300">—</span>
                              )}
                            </div>
                          </td>

                          {/* Agreement Cycle */}
                          <td className="px-5 py-4">
                            <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black", ccfg.bg, ccfg.text)}>
                              {ccfg.label}
                            </span>
                          </td>

                          {/* Total Revenue */}
                          <td className="px-5 py-4">
                            <span className="text-sm font-black text-gray-900">
                              {m.revenue > 0 ? lkrFull(m.revenue) : '—'}
                            </span>
                          </td>

                          {/* Outstanding */}
                          <td className="px-5 py-4">
                            <span className={cn("text-sm font-black", m.outstanding > 0 ? 'text-red-600' : 'text-gray-300')}>
                              {m.outstanding > 0 ? lkrFull(m.outstanding) : 'LKR 0'}
                            </span>
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
                              <button onClick={() => navigate(`/customers/${c.id}`)}
                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                                <FileText className="w-3.5 h-3.5"/>
                              </button>
                              <button onClick={() => navigate(`/customers/${c.id}/edit`)}
                                className="p-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors">
                                <Edit className="w-3.5 h-3.5"/>
                              </button>
                              <button onClick={() => handleDelete(c.id!, c.name)}
                                className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
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
                  <Building2 className="w-12 h-12 text-gray-200"/>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No clients found</p>
                  <Link to="/customers/new"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <Plus className="w-3 h-3"/> Add First Client
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default CustomerListPage;
