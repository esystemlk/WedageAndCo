import React, { useEffect, useState, useMemo } from 'react';
import {
  Package, Plus, Search, Fuel, Droplets, Filter, Zap, Battery,
  FileText, AlertTriangle, TrendingDown, TrendingUp, CheckCircle, Edit,
  Trash2, RefreshCw, Archive, Gauge, User, Calendar, ChevronRight,
  Download, Clock, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar,
} from 'recharts';
import { cn } from '../../lib/utils';
import {
  getInventoryItems, deleteInventoryItem,
  InventoryItem, CATEGORY_LABELS, StockStatus
} from '../../services/inventoryService';
import {
  getFuelTransactions, deleteFuelTransaction, FuelTransaction
} from '../../services/fuelStockService';
import {
  getOilTransactions, deleteOilTransaction, OilTransaction
} from '../../services/oilStockService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';

// ─── Category icons ────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'fuel':        <Fuel className="w-4 h-4" />,
  'lubricants':  <Droplets className="w-4 h-4" />,
  'filters':     <Filter className="w-4 h-4" />,
  'parts-new':   <Archive className="w-4 h-4" />,
  'parts-used':  <RefreshCw className="w-4 h-4" />,
  'battery-new': <Battery className="w-4 h-4" />,
  'battery-used':<Battery className="w-4 h-4" />,
  'electrical':  <Zap className="w-4 h-4" />,
  'stationery':  <FileText className="w-4 h-4" />,
  'other':       <Package className="w-4 h-4" />,
};

const STATUS_CONFIG: Record<StockStatus, { label: string; color: string }> = {
  'available':    { label: 'In Stock',      color: 'bg-emerald-100 text-emerald-700' },
  'low-stock':    { label: 'Low Stock',     color: 'bg-amber-100 text-amber-700' },
  'out-of-stock': { label: 'Out of Stock',  color: 'bg-red-100 text-red-700' },
  'reserved':     { label: 'Reserved',      color: 'bg-blue-100 text-blue-700' },
  'damaged':      { label: 'Damaged',       color: 'bg-rose-100 text-rose-700' },
  'expired':      { label: 'Expired',       color: 'bg-gray-100 text-gray-500' },
};

const STOCK_CATEGORY_TABS = [
  { key: 'all',        label: 'All Items'   },
  { key: 'fuel',       label: 'Fuel'        },
  { key: 'lubricants', label: 'Lubricants'  },
  { key: 'filters',    label: 'Filters'     },
  { key: 'parts',      label: 'Parts'       },
  { key: 'battery',    label: 'Battery'     },
  { key: 'electrical', label: 'Electrical'  },
  { key: 'stationery', label: 'Stationery'  },
];

// Category groups for the donut (parts-new/used merge into "Parts", battery merge)
const CATEGORY_GROUPS: { key: string; label: string; match: (c: string) => boolean; color: string }[] = [
  { key: 'fuel',       label: 'Fuel',       match: c => c === 'fuel',                                  color: '#F59E0B' },
  { key: 'lubricants', label: 'Lubricants', match: c => c === 'lubricants',                            color: '#06B6D4' },
  { key: 'filters',    label: 'Filters',    match: c => c === 'filters',                               color: '#6366F1' },
  { key: 'parts',      label: 'Parts',      match: c => c === 'parts-new' || c === 'parts-used',       color: '#10B981' },
  { key: 'battery',    label: 'Battery',    match: c => c === 'battery-new' || c === 'battery-used',   color: '#8B5CF6' },
  { key: 'electrical', label: 'Electrical', match: c => c === 'electrical',                            color: '#EF4444' },
  { key: 'stationery', label: 'Stationery', match: c => c === 'stationery',                            color: '#F97316' },
  { key: 'other',      label: 'Other',      match: c => c === 'other',                                 color: '#94A3B8' },
];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysUntil(dateStr?: string): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

function fmtLKR(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString();
}

// ─── Main section tabs ─────────────────────────────────────────────────────
type MainTab = 'stock' | 'fuel' | 'oil';

const MAIN_TABS: { key: MainTab; label: string; icon: React.ReactNode; color: string; activeColor: string }[] = [
  {
    key: 'stock',
    label: 'Stock Inventory',
    icon: <Package className="w-4 h-4" />,
    color: 'text-indigo-600',
    activeColor: 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20',
  },
  {
    key: 'fuel',
    label: 'Fuel Issues',
    icon: <Fuel className="w-4 h-4" />,
    color: 'text-amber-600',
    activeColor: 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20',
  },
  {
    key: 'oil',
    label: 'Oil / Lubricant Issues',
    icon: <Droplets className="w-4 h-4" />,
    color: 'text-cyan-600',
    activeColor: 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/20',
  },
];

// ─── Fuel type pill colours ────────────────────────────────────────────────
const FUEL_PILL: Record<string, string> = {
  'diesel':       'bg-amber-100 text-amber-700',
  'super-diesel': 'bg-orange-100 text-orange-700',
  'petrol':       'bg-green-100 text-green-700',
  'petrol-95':    'bg-emerald-100 text-emerald-700',
  'cng':          'bg-sky-100 text-sky-700',
  'lpg':          'bg-blue-100 text-blue-700',
  'electric':     'bg-indigo-100 text-indigo-700',
  'kerosene':     'bg-yellow-100 text-yellow-700',
  'other':        'bg-gray-100 text-gray-600',
};

// ══════════════════════════════════════════════════════════════════════════════
const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Main tab
  const [mainTab, setMainTab] = useState<MainTab>('stock');

  // Stock state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [categoryTab, setCategoryTab] = useState('all');
  const [stockSearch, setStockSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Fuel state
  const [fuelTx, setFuelTx] = useState<FuelTransaction[]>([]);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelLoaded, setFuelLoaded] = useState(false);
  const [fuelSearch, setFuelSearch] = useState('');

  // Oil state
  const [oilTx, setOilTx] = useState<OilTransaction[]>([]);
  const [oilLoading, setOilLoading] = useState(false);
  const [oilLoaded, setOilLoaded] = useState(false);
  const [oilSearch, setOilSearch] = useState('');

  // Load stock on mount
  useEffect(() => {
    (async () => {
      setStockLoading(true);
      setItems(await getInventoryItems());
      setStockLoading(false);
    })();
  }, []);

  // Lazy-load fuel / oil when tab first opens
  useEffect(() => {
    if (mainTab === 'fuel' && !fuelLoaded) {
      setFuelLoading(true);
      getFuelTransactions().then(data => {
        setFuelTx(data);
        setFuelLoading(false);
        setFuelLoaded(true);
      });
    }
    if (mainTab === 'oil' && !oilLoaded) {
      setOilLoading(true);
      getOilTransactions().then(data => {
        setOilTx(data);
        setOilLoading(false);
        setOilLoaded(true);
      });
    }
  }, [mainTab]);

  // ── Delete handlers ────────────────────────────────────────────────────────
  const handleDeleteStock = async (id: string) => {
    if (!window.confirm('Delete this inventory item? This cannot be undone.')) return;
    await deleteInventoryItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Item deleted', 'The inventory item was removed.');
  };

  const handleDeleteFuel = async (id: string) => {
    if (!window.confirm('Delete this fuel issue record?')) return;
    await deleteFuelTransaction(id);
    setFuelTx(prev => prev.filter(t => t.id !== id));
    toast.success('Fuel issue deleted', 'The fuel issue record was removed.');
  };

  const handleDeleteOil = async (id: string) => {
    if (!window.confirm('Delete this oil issue record?')) return;
    await deleteOilTransaction(id);
    setOilTx(prev => prev.filter(t => t.id !== id));
    toast.success('Oil issue deleted', 'The oil/lubricant issue record was removed.');
  };

  // ── Distinct warehouse locations for the filter ─────────────────────────────
  const locations = useMemo(
    () => Array.from(new Set(items.map(i => i.warehouseLocation).filter(Boolean))) as string[],
    [items]
  );

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredStock = items.filter(item => {
    const tabMatch = categoryTab === 'all'
      || item.category === categoryTab
      || (categoryTab === 'parts'   && (item.category === 'parts-new'   || item.category === 'parts-used'))
      || (categoryTab === 'battery' && (item.category === 'battery-new' || item.category === 'battery-used'));
    const searchMatch = !stockSearch
      || item.name.toLowerCase().includes(stockSearch.toLowerCase())
      || item.sku.toLowerCase().includes(stockSearch.toLowerCase())
      || (item.subCategory || '').toLowerCase().includes(stockSearch.toLowerCase())
      || (item.brand || '').toLowerCase().includes(stockSearch.toLowerCase());
    const statusMatch   = statusFilter === 'all'   || item.stockStatus === statusFilter;
    const locationMatch = locationFilter === 'all' || item.warehouseLocation === locationFilter;
    return tabMatch && searchMatch && statusMatch && locationMatch;
  });

  const filteredFuel = fuelTx.filter(t =>
    !fuelSearch
    || t.vehicleNo.toLowerCase().includes(fuelSearch.toLowerCase())
    || t.driverName.toLowerCase().includes(fuelSearch.toLowerCase())
    || t.fuelType.toLowerCase().includes(fuelSearch.toLowerCase())
    || t.issuingOfficer.toLowerCase().includes(fuelSearch.toLowerCase())
  );

  const filteredOil = oilTx.filter(t =>
    !oilSearch
    || t.vehicleNo.toLowerCase().includes(oilSearch.toLowerCase())
    || t.driverName.toLowerCase().includes(oilSearch.toLowerCase())
    || (t.oilType || '').toLowerCase().includes(oilSearch.toLowerCase())
  );

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalValue = items.reduce((s, i) => s + ((i.currentStock || 0) * (i.purchaseCost || 0)), 0);
    const expiringSoon = items.filter(i => {
      const d = daysUntil(i.expiryDate);
      return d >= 0 && d <= 30;
    }).length;
    const totalIssued = items.reduce((s, i) => s + (i.issueRate || 0), 0);
    const avgStock    = items.reduce((s, i) => s + (i.currentStock || 0), 0) / (items.length || 1);
    const stockTurns  = avgStock > 0 ? totalIssued / avgStock : 0;
    return {
      total:      items.length,
      lowStock:   items.filter(i => i.stockStatus === 'low-stock').length,
      outOfStock: items.filter(i => i.stockStatus === 'out-of-stock').length,
      expiringSoon,
      totalValue,
      stockTurns,
    };
  }, [items]);

  // ── Category breakdown (donut) ──────────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    return CATEGORY_GROUPS.map(g => ({
      ...g,
      value: items.filter(i => g.match(i.category as string)).length,
    })).filter(g => g.value > 0);
  }, [items]);

  // ── Stock value trend (cumulative value by purchase month, last 6) ──────────
  const valueTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const ref = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0); // end of that month
      const value = items.reduce((s, it) => {
        const dp = it.datePurchased ? new Date(it.datePurchased) : null;
        if (dp && dp <= ref) return s + ((it.currentStock || 0) * (it.purchaseCost || 0));
        return s;
      }, 0);
      return { month: MONTHS_SHORT[ref.getMonth()], value };
    });
  }, [items]);

  // ── Inventory health (available vs at-risk vs critical) ─────────────────────
  const health = useMemo(() => {
    const total    = items.length || 1;
    const healthy  = items.filter(i => i.stockStatus === 'available').length;
    const atRisk   = items.filter(i => i.stockStatus === 'low-stock' || i.stockStatus === 'reserved').length;
    const critical = items.filter(i => i.stockStatus === 'out-of-stock' || i.stockStatus === 'damaged' || i.stockStatus === 'expired').length;
    return {
      pct: Math.round((healthy / total) * 100),
      healthy, atRisk, critical,
      healthyPct:  Math.round((healthy / total) * 100),
      atRiskPct:   Math.round((atRisk / total) * 100),
      criticalPct: Math.round((critical / total) * 100),
    };
  }, [items]);

  // ── Recent alerts (low / out of stock / expiring) ───────────────────────────
  const alerts = useMemo(() => {
    const list: { id: string; title: string; sub: string; tone: 'amber' | 'red' }[] = [];
    items.forEach(i => {
      if (i.stockStatus === 'out-of-stock') {
        list.push({ id: i.id!, title: `Out of stock: ${i.name}`, sub: 'Out of stock', tone: 'red' });
      } else if (i.stockStatus === 'low-stock') {
        list.push({ id: i.id!, title: `Low stock: ${i.name}`, sub: `${i.currentStock} ${i.unitType} left`, tone: 'amber' });
      }
      const d = daysUntil(i.expiryDate);
      if (d >= 0 && d <= 30) {
        list.push({ id: i.id!, title: `Expiring soon: ${i.name}`, sub: `Expires in ${d} day${d === 1 ? '' : 's'}`, tone: 'amber' });
      }
    });
    return list.slice(0, 6);
  }, [items]);

  // Small local helpers
  const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("bg-white border border-gray-100 rounded-2xl shadow-sm", className)}>{children}</div>
  );
  const SH: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-sm font-black text-gray-900">{title}</h3>
  );

  const healthData = [{ name: 'health', value: health.pct, fill: '#10B981' }];

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-10">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventory</h1>
          <p className="text-sm text-gray-400 font-bold mt-0.5">
            Manage your stock, track inventory levels, and monitor item performance.
          </p>
        </div>

        {/* Action buttons change by tab */}
        <div className="flex gap-3 flex-wrap">
          {mainTab === 'stock' && (
            <button
              onClick={() => navigate('/inventory/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Add Stock Item
            </button>
          )}
          {mainTab === 'fuel' && (
            <button
              onClick={() => navigate('/inventory/fuel/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
            >
              <Fuel className="w-3.5 h-3.5" /> Issue Fuel
            </button>
          )}
          {mainTab === 'oil' && (
            <button
              onClick={() => navigate('/inventory/oil/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20"
            >
              <Droplets className="w-3.5 h-3.5" /> Issue Oil / Lubricant
            </button>
          )}
        </div>
      </div>

      {/* ── Main tab switcher ──────────────────────────────────────────────── */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit">
        {MAIN_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200",
              mainTab === tab.key
                ? tab.activeColor
                : "bg-transparent border-transparent text-gray-400 hover:text-gray-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════════════════════════════════
            STOCK TAB
        ════════════════════════════════════════════════════════════════════ */}
        {mainTab === 'stock' && (
          <motion.div key="stock"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {stockLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : (
            <>
            {/* ── Row 1: KPI cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Items',      value: stats.total.toLocaleString(),       sub: 'Across all categories', icon: Package,       color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
                { label: 'Low Stock Items',  value: stats.lowStock,                     sub: 'Need reorder',          icon: TrendingDown,  color: 'text-amber-600',   bg: 'bg-amber-50'   },
                { label: 'Out of Stock',     value: stats.outOfStock,                   sub: 'Unavailable',           icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50'     },
                { label: 'Expiring Soon',    value: stats.expiringSoon,                 sub: 'Within 30 days',        icon: Clock,         color: 'text-orange-600',  bg: 'bg-orange-50'  },
                { label: 'Total Value (LKR)',value: `LKR ${fmtLKR(stats.totalValue)}`,  sub: 'Current stock value',   icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Stock Turns',      value: `${stats.stockTurns.toFixed(1)}x`,  sub: stats.stockTurns >= 2 ? 'Good performance' : 'This month', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("p-2.5 rounded-xl", s.bg)}>
                      <s.icon className={cn("w-4 h-4", s.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">{s.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Row 2: Category donut | Value trend | Health | Alerts ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

              {/* Inventory by Category */}
              <Card className="p-5">
                <SH title="Inventory by Category" />
                <div className="flex items-center gap-3 mt-4">
                  <div className="relative flex-shrink-0">
                    <ResponsiveContainer width={104} height={104}>
                      <PieChart>
                        <Pie data={categoryBreakdown.length ? categoryBreakdown : [{ value: 1, color: '#E5E7EB' }]}
                          cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}
                        >
                          {categoryBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-lg font-black text-gray-900">{stats.total}</p>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Total</p>
                    </div>
                  </div>
                  <div className="space-y-1 flex-1 max-h-[110px] overflow-y-auto">
                    {categoryBreakdown.map(c => (
                      <div key={c.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                          <span className="text-[10px] font-bold text-gray-600 truncate">{c.label}</span>
                        </div>
                        <span className="text-[9px] text-gray-400 ml-2">
                          {stats.total > 0 ? Math.round(c.value / stats.total * 100) : 0}% ({c.value})
                        </span>
                      </div>
                    ))}
                    {categoryBreakdown.length === 0 && (
                      <p className="text-[10px] text-gray-400 font-bold">No items yet</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Stock Value Trend */}
              <Card className="p-5">
                <SH title="Stock Value Overview" />
                <div className="mt-4 h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={valueTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={(v: number) => fmtLKR(v)} />
                      <RTooltip
                        contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #E2E8F0' }}
                        formatter={(v: number) => [`LKR ${fmtLKR(v)}`, 'Value']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} fill="url(#valGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-indigo-500 rounded-full" />
                  <span className="text-[9px] font-bold text-gray-400">Stock Value (LKR)</span>
                </div>
              </Card>

              {/* Inventory Health */}
              <Card className="p-5">
                <SH title="Inventory Health" />
                <div className="flex flex-col items-center mt-2">
                  <div className="relative">
                    <ResponsiveContainer width={130} height={110}>
                      <RadialBarChart cx="50%" cy="100%" innerRadius={48} outerRadius={70}
                        startAngle={180} endAngle={0} data={healthData} barSize={14}
                      >
                        <RadialBar background={{ fill: '#F1F5F9' }} dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                      <p className="text-2xl font-black text-gray-900">{health.pct}%</p>
                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Healthy</p>
                    </div>
                  </div>
                  <div className="w-full space-y-1 mt-2">
                    {[
                      { label: 'Healthy',  pct: health.healthyPct,  n: health.healthy,  color: 'text-emerald-600', dot: 'bg-emerald-500' },
                      { label: 'At Risk',  pct: health.atRiskPct,   n: health.atRisk,   color: 'text-amber-600',   dot: 'bg-amber-400'   },
                      { label: 'Critical', pct: health.criticalPct, n: health.critical, color: 'text-red-600',     dot: 'bg-red-500'     },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", r.dot)} />
                          <span className="text-[10px] font-bold text-gray-600">{r.label}</span>
                        </div>
                        <span className={cn("text-[10px] font-black", r.color)}>{r.pct}% ({r.n})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Recent Alerts */}
              <Card className="p-5">
                <SH title="Recent Alerts" />
                <div className="mt-4 space-y-2 max-h-[180px] overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs font-bold text-emerald-700">All stock healthy</p>
                    </div>
                  ) : alerts.map((a, i) => (
                    <button key={i} onClick={() => navigate(`/inventory/${a.id}/edit`)}
                      className={cn("w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl transition-colors",
                        a.tone === 'red' ? 'bg-red-50 hover:bg-red-100' : 'bg-amber-50 hover:bg-amber-100')}
                    >
                      <AlertTriangle className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", a.tone === 'red' ? 'text-red-500' : 'text-amber-500')} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[11px] font-black truncate", a.tone === 'red' ? 'text-red-700' : 'text-amber-700')}>{a.title}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{a.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── Row 3: Filters + table ────────────────────────────────────── */}
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-100/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 space-y-4">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text" value={stockSearch} onChange={e => setStockSearch(e.target.value)}
                      placeholder="Search by name, SKU, brand, part number..."
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  {/* Status filter */}
                  <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                  {/* Location filter */}
                  <div className="relative">
                    <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                    >
                      <option value="all">All Locations</option>
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                  <button className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {STOCK_CATEGORY_TABS.map(tab => (
                    <button key={tab.key} onClick={() => setCategoryTab(tab.key)}
                      className={cn(
                        "flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        categoryTab === tab.key
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Package className="w-12 h-12 text-gray-200" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No items found</p>
                  <button onClick={() => navigate('/inventory/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <Plus className="w-3 h-3" /> Add First Item
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Item Name', 'SKU / Part No.', 'Category', 'Brand', 'Unit', 'Stock', 'Status', 'Unit Cost (LKR)', 'Total Value (LKR)', 'Location', ''].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <AnimatePresence>
                        {filteredStock.map((item, i) => (
                          <motion.tr key={item.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-gray-50/50 transition-colors group"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-lg bg-gray-50 text-gray-400">{CATEGORY_ICONS[item.category] || <Package className="w-4 h-4" />}</span>
                                <div>
                                  <p className="font-bold text-sm text-gray-900">{item.name}</p>
                                  {item.subCategory && <p className="text-[10px] text-gray-400 font-bold">{item.subCategory}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-mono text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                {item.sku}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-600 bg-gray-100">
                                {CATEGORY_LABELS[item.category] || item.category}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-[11px] font-bold text-gray-600">
                              {item.brand || '—'}
                            </td>
                            <td className="px-5 py-4 text-[11px] font-bold text-gray-500">
                              {item.unitType}
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn(
                                "text-sm font-black",
                                item.currentStock <= 0 ? 'text-red-600'
                                : item.currentStock <= (item.minStockLevel || 0) ? 'text-amber-600'
                                : 'text-gray-900'
                              )}>
                                {item.currentStock}
                              </span>
                              <span className="text-[10px] text-gray-400 ml-1">{item.unitType}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide",
                                STATUS_CONFIG[item.stockStatus]?.color || 'bg-gray-100 text-gray-500'
                              )}>
                                {STATUS_CONFIG[item.stockStatus]?.label || item.stockStatus}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-gray-700">
                              {item.purchaseCost > 0 ? item.purchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                            </td>
                            <td className="px-5 py-4 text-sm font-black text-gray-900">
                              {((item.currentStock || 0) * (item.purchaseCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-4 text-[10px] text-gray-500 font-bold">
                              {item.warehouseLocation || '—'}
                              {item.binRackNumber && <span className="text-gray-400"> · {item.binRackNumber}</span>}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => navigate(`/inventory/${item.id}/edit`)}
                                  className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteStock(item.id!)}
                                  className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            FUEL ISSUES TAB
        ════════════════════════════════════════════════════════════════════ */}
        {mainTab === 'fuel' && (
          <motion.div key="fuel"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Fuel summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Issues',    value: fuelTx.length,                                                                     color: 'text-amber-600',  bg: 'bg-amber-50',  icon: Fuel     },
                { label: 'Total Litres',    value: `${fuelTx.reduce((s, t) => s + (t.quantityIssuedL || 0), 0).toFixed(0)} L`,        color: 'text-orange-600', bg: 'bg-orange-50', icon: Gauge    },
                { label: 'Vehicles Served', value: new Set(fuelTx.map(t => t.vehicleNo)).size,                                        color: 'text-indigo-600', bg: 'bg-indigo-50', icon: ChevronRight },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">{s.value}</p>
                    </div>
                    <div className={cn("p-2.5 rounded-xl", s.bg)}>
                      <s.icon className={cn("w-4 h-4", s.color)} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Fuel table */}
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-100/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={fuelSearch} onChange={e => setFuelSearch(e.target.value)}
                    placeholder="Search by vehicle, driver, fuel type..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {fuelLoading ? (
                <div className="flex justify-center py-20"><LoadingSpinner /></div>
              ) : filteredFuel.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Fuel className="w-12 h-12 text-gray-200" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No fuel issues recorded</p>
                  <button onClick={() => navigate('/inventory/fuel/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <Plus className="w-3 h-3" /> Record First Issue
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Date', 'Vehicle', 'Driver', 'Fuel Type', 'Qty Issued', 'Km Driven', 'L/100km', 'Officer', ''].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <AnimatePresence>
                        {filteredFuel.map((tx, i) => (
                          <motion.tr key={tx.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-amber-50/30 transition-colors group"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-bold">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {tx.date}
                                {tx.time && <span className="text-gray-400 font-normal">{tx.time}</span>}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-mono text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                {tx.vehicleNo}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-gray-400" />
                                <span className="text-[11px] font-bold text-gray-700">{tx.driverName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide",
                                FUEL_PILL[tx.fuelType] || 'bg-gray-100 text-gray-600'
                              )}>
                                {tx.fuelType}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm font-black text-amber-600">{tx.quantityIssuedL}</span>
                              <span className="text-[10px] text-gray-400 ml-1">L</span>
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-gray-600">
                              {tx.kmDriven > 0 ? `${tx.kmDriven} km` : '—'}
                            </td>
                            <td className="px-5 py-4 text-[11px] font-bold text-gray-500">
                              {tx.litresPerKm ? `${(tx.litresPerKm * 100).toFixed(1)}` : '—'}
                            </td>
                            <td className="px-5 py-4 text-[11px] text-gray-500 font-bold">
                              {tx.issuingOfficer}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => navigate(`/inventory/fuel/${tx.id}/edit`)}
                                  className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteFuel(tx.id!)}
                                  className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            OIL / LUBRICANT ISSUES TAB
        ════════════════════════════════════════════════════════════════════ */}
        {mainTab === 'oil' && (
          <motion.div key="oil"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Oil summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Issues',    value: oilTx.length,                                                                           color: 'text-cyan-600',   bg: 'bg-cyan-50',   icon: Droplets },
                { label: 'Total Qty (mL)',  value: `${oilTx.reduce((s, t) => s + (t.quantityIssuedMl || 0), 0).toLocaleString()} mL`,      color: 'text-teal-600',   bg: 'bg-teal-50',   icon: Gauge    },
                { label: 'Vehicles Served', value: new Set(oilTx.map(t => t.vehicleNo)).size,                                              color: 'text-indigo-600', bg: 'bg-indigo-50', icon: ChevronRight },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">{s.value}</p>
                    </div>
                    <div className={cn("p-2.5 rounded-xl", s.bg)}>
                      <s.icon className={cn("w-4 h-4", s.color)} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Oil table */}
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-100/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={oilSearch} onChange={e => setOilSearch(e.target.value)}
                    placeholder="Search by vehicle, driver, oil type..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-cyan-500/50 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {oilLoading ? (
                <div className="flex justify-center py-20"><LoadingSpinner /></div>
              ) : filteredOil.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Droplets className="w-12 h-12 text-gray-200" />
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No oil issues recorded</p>
                  <button onClick={() => navigate('/inventory/oil/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <Plus className="w-3 h-3" /> Record First Issue
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Date', 'Vehicle', 'Driver', 'Oil / Item', 'Grade', 'Qty Issued', 'Meter Reading', 'Manager Check', ''].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <AnimatePresence>
                        {filteredOil.map((tx, i) => (
                          <motion.tr key={tx.id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-cyan-50/30 transition-colors group"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-bold">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {tx.date}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-mono text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                {tx.vehicleNo}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-gray-400" />
                                <span className="text-[11px] font-bold text-gray-700">{tx.driverName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div>
                                <p className="text-[11px] font-black text-gray-800">{tx.itemName}</p>
                                {tx.oilType && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-100 text-cyan-700 uppercase tracking-wide">
                                    {tx.oilType}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-[11px] font-bold text-gray-500">
                              {tx.oilGrade || '—'}
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm font-black text-cyan-600">{tx.quantityIssuedMl?.toLocaleString()}</span>
                              <span className="text-[10px] text-gray-400 ml-1">mL</span>
                            </td>
                            <td className="px-5 py-4 text-[11px] font-bold text-gray-500">
                              {tx.meterReading > 0 ? `${tx.meterReading.toLocaleString()} km` : '—'}
                            </td>
                            <td className="px-5 py-4">
                              {tx.checkedByManager ? (
                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600">
                                  <CheckCircle className="w-3.5 h-3.5" /> {tx.managerName || 'Yes'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => navigate(`/inventory/oil/${tx.id}/edit`)}
                                  className="p-2 bg-cyan-50 text-cyan-600 rounded-xl hover:bg-cyan-100 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteOil(tx.id!)}
                                  className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default InventoryPage;
