import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Search, ChevronRight, ChevronDown, Download, CheckCircle2,
  AlertTriangle, XCircle, Truck, Boxes, Wallet, TrendingUp, ClipboardCheck, FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { getGRNs, GRN } from '../../services/grnService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { exportCSV } from '../../utils/mealExports';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CONDITION_CFG: Record<string, { label: string; pill: string; color: string }> = {
  'Good':     { label: 'Good',     pill: 'bg-emerald-100 text-emerald-700', color: '#10B981' },
  'Partial':  { label: 'Partial',  pill: 'bg-amber-100 text-amber-700',     color: '#F59E0B' },
  'Damaged':  { label: 'Damaged',  pill: 'bg-orange-100 text-orange-700',   color: '#F97316' },
  'Rejected': { label: 'Rejected', pill: 'bg-red-100 text-red-700',         color: '#EF4444' },
};
const CONDITION_ORDER = ['Good', 'Partial', 'Damaged', 'Rejected'];

function fmtLKR(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString();
}

function grnValue(g: GRN): number {
  return (g.items || []).reduce((s, it) =>
    s + (it.totalValue || (it.quantityReceived || 0) * (it.unitPrice || 0)), 0);
}
function hasVariance(g: GRN): boolean {
  return (g.items || []).some(it => (it.variance || 0) !== 0);
}
function isSameMonth(dateStr: string, ref: Date): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('bg-white border border-gray-100 rounded-2xl shadow-sm', className)}>{children}</div>
);

const GRNListPage: React.FC = () => {
  const navigate = useNavigate();
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const now = new Date();

  useEffect(() => { (async () => {
    try { setGrns((await getGRNs()) || []); } catch (e) { console.error(e); } finally { setLoading(false); }
  })(); }, []);

  const locations = useMemo(
    () => Array.from(new Set(grns.map(g => g.warehouseLocation).filter(Boolean))) as string[],
    [grns],
  );

  // ── KPI stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalValue = grns.reduce((s, g) => s + grnValue(g), 0);
    return {
      total: grns.length,
      thisMonth: grns.filter(g => g.date && isSameMonth(g.date, now)).length,
      totalValue,
      good: grns.filter(g => (g.conditionOfGoods || 'Good') === 'Good').length,
      variance: grns.filter(hasVariance).length,
      flagged: grns.filter(g => g.conditionOfGoods === 'Damaged' || g.conditionOfGoods === 'Rejected').length,
    };
  }, [grns]);

  // ── Condition donut ──────────────────────────────────────────────────────────
  const conditionData = useMemo(() => {
    const counts: Record<string, number> = {};
    grns.forEach(g => { const c = g.conditionOfGoods || 'Good'; counts[c] = (counts[c] || 0) + 1; });
    return CONDITION_ORDER.filter(c => counts[c]).map(c => ({ name: CONDITION_CFG[c].label, value: counts[c], color: CONDITION_CFG[c].color }));
  }, [grns]);

  // ── Monthly receipts (value, current year) ───────────────────────────────────
  const monthlyReceipts = useMemo(() => {
    const map: Record<number, number> = {};
    grns.forEach(g => {
      if (!g.date) return;
      const d = new Date(g.date);
      if (d.getFullYear() === now.getFullYear()) map[d.getMonth()] = (map[d.getMonth()] || 0) + grnValue(g);
    });
    return MONTHS_SHORT.map((m, i) => ({ month: m, value: map[i] || 0 }));
  }, [grns]);

  // ── Top suppliers by receipts ─────────────────────────────────────────────────
  const topSuppliers = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    grns.forEach(g => {
      const k = g.supplierName || 'Unknown';
      if (!map[k]) map[k] = { count: 0, value: 0 };
      map[k].count += 1; map[k].value += grnValue(g);
    });
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value).slice(0, 5)
      .map(([name, v]) => ({ name, ...v }));
  }, [grns]);

  // ── Filtered table ─────────────────────────────────────────────────────────────
  const filtered = grns.filter(g => {
    const s = search.toLowerCase();
    const sm = !s || g.grnNo.toLowerCase().includes(s) || g.supplierName.toLowerCase().includes(s) || (g.purchaseOrderRef || '').toLowerCase().includes(s);
    const cm = conditionFilter === 'all' || (g.conditionOfGoods || 'Good') === conditionFilter;
    const lm = locationFilter === 'all' || g.warehouseLocation === locationFilter;
    return sm && cm && lm;
  });

  const exportData = () => {
    exportCSV('GRN_Registry',
      ['GRN No', 'Date', 'Supplier', 'PO Ref', 'Items', 'Received Value (LKR)', 'Condition', 'Location'],
      filtered.map(g => [g.grnNo, g.date, g.supplierName, g.purchaseOrderRef || '-', (g.items || []).length, grnValue(g), g.conditionOfGoods || 'Good', g.warehouseLocation || '-']),
    );
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Goods Reception Registry</h1>
          <p className="text-sm text-gray-400 font-bold mt-0.5">
            Verify physical delivery against procurement intent and quality standards.
          </p>
        </div>
        <button onClick={() => navigate('/grn/new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all">
          <Plus className="w-3.5 h-3.5" /> Register Delivered Goods
        </button>
      </div>

      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total GRNs',        val: stats.total.toLocaleString(),         sub: 'All receipts',     icon: <Boxes className="w-4 h-4" />,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'This Month',        val: stats.thisMonth,                       sub: 'Receipts logged',  icon: <ClipboardCheck className="w-4 h-4" />,color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
          { label: 'Received Value',    val: `LKR ${fmtLKR(stats.totalValue)}`,     sub: 'Goods value',      icon: <Wallet className="w-4 h-4" />,       color: 'text-violet-600',  bg: 'bg-violet-50'  },
          { label: 'Good Condition',    val: stats.good,                            sub: 'Passed QC',        icon: <CheckCircle2 className="w-4 h-4" />,  color: 'text-teal-600',    bg: 'bg-teal-50'    },
          { label: 'With Variance',     val: stats.variance,                        sub: 'Qty mismatch',     icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Damaged / Rejected',val: stats.flagged,                         sub: 'Flagged',          icon: <XCircle className="w-4 h-4" />,       color: 'text-red-600',     bg: 'bg-red-50'     },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className={cn('p-2.5 rounded-xl', k.bg)}><span className={k.color}>{k.icon}</span></div>
            </div>
            <p className="text-2xl font-black text-gray-900">{k.val}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{k.label}</p>
            <p className="text-[10px] text-gray-400 font-bold mt-1">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Row 2: Condition donut | Monthly receipts | Top suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-black text-gray-900">Goods Condition</h3>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={conditionData.length ? conditionData : [{ value: 1, color: '#E5E7EB' }]}
                    cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" strokeWidth={0}>
                    {conditionData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-black text-gray-900">{stats.total}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase">Total</p>
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              {conditionData.length === 0 && <p className="text-[10px] text-gray-400 font-bold">No receipts yet</p>}
              {conditionData.map(c => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-[10px] font-bold text-gray-600">{c.name}</span></div>
                  <span className="text-[9px] text-gray-400">{c.value} ({stats.total > 0 ? Math.round(c.value / stats.total * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-black text-gray-900">Receipts Value <span className="text-[10px] font-bold text-gray-400">(This Year)</span></h3>
          <div className="mt-4 h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyReceipts} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="grnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#94A3B8', fontWeight: 700 }} interval={0} />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={(v: number) => fmtLKR(v)} />
                <RTooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0' }} formatter={(v: number) => [`LKR ${fmtLKR(v)}`, 'Value']} />
                <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#grnGrad)" dot={{ r: 2.5, fill: '#10B981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-black text-gray-900">Top Suppliers <span className="text-[10px] font-bold text-gray-400">(by receipts)</span></h3>
          <div className="mt-4 space-y-2.5">
            {topSuppliers.length === 0 ? <p className="text-[10px] text-gray-400 font-bold">No supplier data</p> : topSuppliers.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-300 w-3">{i + 1}</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0"><Truck className="w-3.5 h-3.5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-gray-700 truncate">{s.name}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{s.count} receipt{s.count === 1 ? '' : 's'}</p>
                </div>
                <span className="text-[11px] font-black text-gray-900">LKR {fmtLKR(s.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Filters + table */}
      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-100/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h3 className="text-base font-black text-gray-900">All Goods Receipts</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search GRN, supplier, PO ref..."
                className="w-full sm:w-60 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-emerald-500/50 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400" />
            </div>
            <div className="relative">
              <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer">
                <option value="all">All Conditions</option>
                {CONDITION_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer max-w-[160px]">
                <option value="all">All Locations</option>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={exportData}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Package className="w-12 h-12 text-gray-200" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No delivery records found</p>
            <button onClick={() => navigate('/grn/new')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
              <Plus className="w-3 h-3" /> Register First Delivery
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['GRN No', 'Supplier', 'PO Ref', 'Date', 'Items', 'Received Value (LKR)', 'Condition', 'Location', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filtered.map((g, i) => (
                    <motion.tr key={g.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/grn/${g.id}`)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Package className="w-4 h-4" /></span>
                          <span className="font-mono text-[11px] font-black text-emerald-600">{g.grnNo}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[11px] font-bold text-gray-800">{g.supplierName}</p>
                        {g.supplierInvoiceNo && <p className="text-[10px] text-gray-400 font-bold">INV: {g.supplierInvoiceNo}</p>}
                      </td>
                      <td className="px-5 py-4 text-[11px] font-bold text-gray-600">{g.purchaseOrderRef || <span className="text-gray-300">Direct</span>}</td>
                      <td className="px-5 py-4 text-[11px] text-gray-500 font-bold whitespace-nowrap">{g.date ? format(new Date(g.date), 'MMM dd, yyyy') : '—'}</td>
                      <td className="px-5 py-4 text-[11px] font-bold text-gray-600">{(g.items || []).length}</td>
                      <td className="px-5 py-4 text-sm font-black text-gray-900 whitespace-nowrap">{grnValue(g).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-5 py-4">
                        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide', CONDITION_CFG[g.conditionOfGoods || 'Good']?.pill || 'bg-gray-100 text-gray-500')}>
                          {g.conditionOfGoods || 'Good'}
                        </span>
                        {hasVariance(g) && <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-700">Variance</span>}
                      </td>
                      <td className="px-5 py-4 text-[10px] text-gray-500 font-bold">{g.warehouseLocation || '—'}</td>
                      <td className="px-5 py-4 text-right"><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-600 transition-colors inline-block" /></td>
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

export default GRNListPage;
