import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Utensils, UserCheck, CalendarDays, Wallet, Search, Save,
  Settings as SettingsIcon, Coffee, Sun, Moon, Soup, ChevronDown,
  Download, FileText, Printer, RefreshCw, Power, TrendingUp, BarChart3,
  MapPin, Building2, Store, Plus, Edit, Trash2, X, UserPlus,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { cn } from '../../lib/utils';
import { useStaff } from '../../hooks/useStaff';
import { updateStaffMember, StaffMember } from '../../services/staffService';
import {
  getMealSettings, saveMealSettings, getMealsByDate, getMealsInRange,
  getMonthlySummary, generateMonthlyDeductions, bulkUpsertMeals,
  computeDailyTotal, monthDateRange, defaultPricesFromSettings,
  getMealLocations, saveMealLocation, deleteMealLocation,
  getMealSuppliers, saveMealSupplier, deleteMealSupplier, getLocationSummary,
  getGuestMealsInRange, saveGuestMeal, deleteGuestMeal, getGuestSummary, computeGuestTotal,
  MealSettings, EmployeeMeal, MealType, MEAL_TYPES, MealDeductionMethod, MonthlySummaryRow,
  MealLocation, MealSupplier, MealLocationType, LocationSummaryRow,
  MainMealType, MAIN_MEALS, MealLocationMap,
  GuestMeal, GuestMealReason, GUEST_MEAL_REASONS, GuestSummary,
} from '../../services/mealService';
import { exportCSV, exportPDF, printTable, monthName } from '../../utils/mealExports';
import { PermissionGate } from '../../components/auth/RouteGuards';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';

// ── helpers ──────────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => `LKR ${n.toLocaleString('en-LK')}`;
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700',
];
const avatarColor = (s: string) =>
  AVATAR_COLORS[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const MEAL_ICON: Record<MealType, React.ReactNode> = {
  breakfast: <Coffee className="w-3.5 h-3.5" />,
  lunch: <Sun className="w-3.5 h-3.5" />,
  dinner: <Moon className="w-3.5 h-3.5" />,
  tea: <Soup className="w-3.5 h-3.5" />,
};
const MEAL_COLOR: Record<MealType, string> = {
  breakfast: '#6366F1', lunch: '#F59E0B', dinner: '#8B5CF6', tea: '#10B981',
};

type Tab = 'overview' | 'register' | 'guests' | 'monthly' | 'locations' | 'suppliers' | 'reports' | 'settings';
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'register', label: "Today's Register", icon: <CalendarDays className="w-4 h-4" /> },
  { key: 'guests', label: 'Guest Meals', icon: <UserPlus className="w-4 h-4" /> },
  { key: 'monthly', label: 'Monthly Summary', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'locations', label: 'Locations', icon: <MapPin className="w-4 h-4" /> },
  { key: 'suppliers', label: 'Suppliers', icon: <Store className="w-4 h-4" /> },
  { key: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
  { key: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
];

const LOC_TYPE_META: Record<MealLocationType, { label: string; icon: React.ReactNode; color: string }> = {
  'office':     { label: 'Office',      icon: <Building2 className="w-3.5 h-3.5" />, color: '#6366F1' },
  'rest-point': { label: 'Rest Point',  icon: <MapPin className="w-3.5 h-3.5" />,    color: '#F59E0B' },
  'partner':    { label: 'Partner',     icon: <Store className="w-3.5 h-3.5" />,     color: '#10B981' },
  'other':      { label: 'Other',       icon: <MapPin className="w-3.5 h-3.5" />,    color: '#94A3B8' },
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('bg-white border border-gray-100 rounded-2xl shadow-sm', className)}>{children}</div>
);

// ══════════════════════════════════════════════════════════════════════════════
const MealManagementPage: React.FC = () => {
  const { staff, loading: staffLoading, refresh: refreshStaff } = useStaff();
  const [tab, setTab] = useState<Tab>('overview');

  const [settings, setSettings] = useState<MealSettings | null>(null);
  const [todayMeals, setTodayMeals] = useState<EmployeeMeal[]>([]);
  const [monthMeals, setMonthMeals] = useState<EmployeeMeal[]>([]);
  const [locations, setLocations] = useState<MealLocation[]>([]);
  const [suppliers, setSuppliers] = useState<MealSupplier[]>([]);
  const [guestSummary, setGuestSummary] = useState<GuestSummary>({ count: 0, guests: 0, totalMeals: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);

  const reloadLocations = async () => setLocations(await getMealLocations());
  const reloadSuppliers = async () => setSuppliers(await getMealSuppliers());

  const now = new Date();
  const activeStaff = useMemo(() => staff.filter(s => s.active), [staff]);
  const enrolled = useMemo(() => activeStaff.filter(s => s.usesMeals), [activeStaff]);

  // ── initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const s = await getMealSettings();
      setSettings(s);
      const today = await getMealsByDate(todayISO());
      setTodayMeals(today);
      const { start, end } = monthDateRange(now.getFullYear(), now.getMonth() + 1);
      setMonthMeals(await getMealsInRange(start, end));
      setLocations(await getMealLocations());
      setSuppliers(await getMealSuppliers());
      setGuestSummary(await getGuestSummary(now.getFullYear(), now.getMonth() + 1));
      setLoading(false);
    })();
  }, []);

  const reloadGuestSummary = async () =>
    setGuestSummary(await getGuestSummary(now.getFullYear(), now.getMonth() + 1));

  const resolver = (id: string) => {
    const m = staff.find(s => s.id === id);
    return m ? { name: m.fullName, department: m.department || '—' } : undefined;
  };

  // ── overview stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const monthCost = monthMeals.reduce((a, m) => a + (m.dailyTotal || 0), 0);
    const todayCount = todayMeals.filter(m => m.breakfast || m.lunch || m.dinner || m.tea).length;
    return {
      totalEmployees: activeStaff.length,
      usingMeals: enrolled.length,
      todayMeals: todayCount,
      monthCost,
      guestCost: guestSummary.totalCost,
      totalFoodCost: monthCost + guestSummary.totalCost,
    };
  }, [activeStaff, enrolled, todayMeals, monthMeals, guestSummary]);

  const mealTypeUsage = useMemo(() => {
    const counts: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, tea: 0 };
    monthMeals.forEach(m => MEAL_TYPES.forEach(t => { if ((m as any)[t]) counts[t] += 1; }));
    return MEAL_TYPES.map(t => ({ name: settings?.[t].label || t, value: counts[t], color: MEAL_COLOR[t] }))
      .filter(d => d.value > 0);
  }, [monthMeals, settings]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, number>();
    monthMeals.forEach(m => map.set(m.date, (map.get(m.date) || 0) + (m.dailyTotal || 0)));
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, cost]) => ({ day: date.slice(8), cost }));
  }, [monthMeals]);

  if (loading || staffLoading || !settings) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Utensils className="w-6 h-6 text-indigo-600" /> Meal Management
          </h1>
          <p className="text-sm text-gray-400 font-bold mt-0.5">
            Track employee meals, manage costs, and automate payroll deductions.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl w-fit overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
              tab === t.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-gray-400 hover:text-gray-700',
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }} className="space-y-6"
        >
          {tab === 'overview' && (
            <OverviewTab stats={stats} mealTypeUsage={mealTypeUsage} dailyTrend={dailyTrend}
              settings={settings} monthLabel={`${monthName(now.getMonth() + 1)} ${now.getFullYear()}`} />
          )}
          {tab === 'register' && (
            <RegisterTab activeStaff={activeStaff} settings={settings} todayMeals={todayMeals} locations={locations}
              onSaved={async () => setTodayMeals(await getMealsByDate(todayISO()))}
              onToggleEnrol={async (m, v) => { await updateStaffMember(m.id!, { usesMeals: v }); refreshStaff(); }} />
          )}
          {tab === 'guests' && (
            <GuestsTab settings={settings} locations={locations} onChanged={reloadGuestSummary} />
          )}
          {tab === 'monthly' && (
            <MonthlyTab resolver={resolver} />
          )}
          {tab === 'locations' && (
            <LocationsTab locations={locations} suppliers={suppliers} settings={settings} reload={reloadLocations} />
          )}
          {tab === 'suppliers' && (
            <SuppliersTab suppliers={suppliers} locations={locations} reload={reloadSuppliers} />
          )}
          {tab === 'reports' && (
            <ReportsTab staff={activeStaff} resolver={resolver} locations={locations} settings={settings} />
          )}
          {tab === 'settings' && (
            <SettingsTab settings={settings} onSave={async (s) => { await saveMealSettings(s); setSettings(s); }} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Overview ─────────────────────────────────────────────────────────────────
const OverviewTab: React.FC<{
  stats: { totalEmployees: number; usingMeals: number; todayMeals: number; monthCost: number; guestCost: number; totalFoodCost: number };
  mealTypeUsage: { name: string; value: number; color: string }[];
  dailyTrend: { day: string; cost: number }[];
  settings: MealSettings;
  monthLabel: string;
}> = ({ stats, mealTypeUsage, dailyTrend, settings, monthLabel }) => (
  <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Using Meals', val: stats.usingMeals, sub: `of ${stats.totalEmployees} active staff`, icon: <UserCheck className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: "Today's Meals", val: stats.todayMeals, sub: 'Employees served', icon: <CalendarDays className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Staff + Guest Cost', val: fmt(stats.totalFoodCost), sub: `${monthLabel} · total food`, icon: <Wallet className="w-4 h-4" />, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Guest Meals', val: fmt(stats.guestCost), sub: 'Outsiders (company expense)', icon: <UserPlus className="w-4 h-4" />, color: 'text-rose-600', bg: 'bg-rose-50' },
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

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-5">
        <h3 className="text-sm font-black text-gray-900">Meal Type Usage <span className="text-[10px] font-bold text-gray-400">(This Month)</span></h3>
        <div className="flex items-center gap-4 mt-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={mealTypeUsage.length ? mealTypeUsage : [{ name: '-', value: 1, color: '#E5E7EB' }]}
                cx="50%" cy="50%" innerRadius={34} outerRadius={56} dataKey="value" strokeWidth={0}>
                {(mealTypeUsage.length ? mealTypeUsage : [{ color: '#E5E7EB' }]).map((e, i) => <Cell key={i} fill={(e as any).color} />)}
              </Pie>
              <RTooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 flex-1">
            {mealTypeUsage.length === 0 && <p className="text-[10px] text-gray-400 font-bold">No meals recorded</p>}
            {mealTypeUsage.map(m => (
              <div key={m.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                  <span className="text-[10px] font-bold text-gray-600">{m.name}</span>
                </div>
                <span className="text-[10px] font-black text-gray-900">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h3 className="text-sm font-black text-gray-900">Daily Meal Cost <span className="text-[10px] font-bold text-gray-400">(This Month)</span></h3>
        <div className="mt-4 h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94A3B8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
              <RTooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} formatter={(v: number) => [fmt(v), 'Cost']} />
              <Bar dataKey="cost" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>

    <Card className="p-5">
      <h3 className="text-sm font-black text-gray-900 mb-4">Current Meal Prices</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MEAL_TYPES.map(t => (
          <div key={t} className={cn('p-4 rounded-2xl border', settings[t].isActive ? 'bg-gray-50 border-gray-100' : 'bg-gray-50/50 border-dashed border-gray-200 opacity-60')}>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-lg" style={{ background: `${MEAL_COLOR[t]}1a`, color: MEAL_COLOR[t] }}>{MEAL_ICON[t]}</span>
              <span className="text-[11px] font-black text-gray-700 uppercase tracking-wide">{settings[t].label}</span>
            </div>
            <p className="text-xl font-black text-gray-900">{fmt(settings[t].cost)}</p>
            <p className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: settings[t].isActive ? '#10B981' : '#9CA3AF' }}>
              {settings[t].isActive ? 'Active' : 'Disabled'}
            </p>
          </div>
        ))}
      </div>
    </Card>
  </>
);

// ── Today's Register (bulk entry) ────────────────────────────────────────────
const RegisterTab: React.FC<{
  activeStaff: StaffMember[];
  settings: MealSettings;
  todayMeals: EmployeeMeal[];
  locations: MealLocation[];
  onSaved: () => Promise<void>;
  onToggleEnrol: (m: StaffMember, v: boolean) => Promise<void>;
}> = ({ activeStaff, settings, todayMeals, locations, onSaved, onToggleEnrol }) => {
  const toast = useToast();
  const activeLocations = useMemo(() => locations.filter(l => l.isActive), [locations]);
  const defaultLoc = useMemo(() => activeLocations.find(l => l.isDefault) || activeLocations[0], [activeLocations]);

  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [type, setType] = useState('all');
  const [saving, setSaving] = useState(false);
  const [defLocId, setDefLocId] = useState<string>('');         // register-wide default location
  const [rows, setRows] = useState<Record<string, Pick<EmployeeMeal, 'breakfast' | 'lunch' | 'dinner' | 'tea'>>>({});
  const [rowLoc, setRowLoc] = useState<Record<string, string>>({}); // per-employee day-default location override
  const [mealLoc, setMealLoc] = useState<Record<string, MealLocationMap>>({}); // per-employee per-main-meal location

  useEffect(() => { if (!defLocId && defaultLoc?.id) setDefLocId(defaultLoc.id); }, [defaultLoc]);

  // hydrate selections from saved meals for the chosen date
  useEffect(() => {
    (async () => {
      const meals = date === todayISO() ? todayMeals : await getMealsByDate(date);
      const init: typeof rows = {};
      const locInit: Record<string, string> = {};
      const mealLocInit: Record<string, MealLocationMap> = {};
      meals.forEach(m => {
        init[m.employeeId] = { breakfast: m.breakfast, lunch: m.lunch, dinner: m.dinner, tea: m.tea };
        if (m.locationId) locInit[m.employeeId] = m.locationId;
        if (m.mealLocations && Object.keys(m.mealLocations).length) mealLocInit[m.employeeId] = { ...m.mealLocations };
      });
      setRows(init);
      setRowLoc(locInit);
      setMealLoc(mealLocInit);
    })();
  }, [date, todayMeals]);

  const depts = useMemo(() => Array.from(new Set(activeStaff.map(s => s.department).filter(Boolean))) as string[], [activeStaff]);
  const types = useMemo(() => Array.from(new Set(activeStaff.map(s => s.category))), [activeStaff]);

  const visible = activeStaff.filter(s => {
    const sm = !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || (s.staffId || '').toLowerCase().includes(search.toLowerCase());
    const dm = dept === 'all' || s.department === dept;
    const tm = type === 'all' || s.category === type;
    return sm && dm && tm;
  });

  const getSel = (id: string) => rows[id] || { breakfast: false, lunch: false, dinner: false, tea: false };
  const toggle = (id: string, meal: MealType) => setRows(prev => ({ ...prev, [id]: { ...getSel(id), [meal]: !getSel(id)[meal] } }));
  const effLocId = (id: string) => rowLoc[id] || defLocId;
  const locObj = (id: string) => activeLocations.find(l => l.id === effLocId(id)) || null;

  // per-main-meal location override (empty = same as the row's day location)
  const mealLocId = (id: string, t: MainMealType) => mealLoc[id]?.[t] || '';
  const setMealLocFor = (id: string, t: MainMealType, lid: string) =>
    setMealLoc(prev => {
      const next = { ...(prev[id] || {}) };
      if (lid) next[t] = lid; else delete next[t];
      return { ...prev, [id]: next };
    });
  const setMealLocForAll = (t: MainMealType, lid: string) =>
    setMealLoc(prev => {
      const next = { ...prev };
      visible.filter(s => s.usesMeals).forEach(s => {
        const cur = { ...(next[s.id!] || {}) };
        if (lid) cur[t] = lid; else delete cur[t];
        next[s.id!] = cur;
      });
      return next;
    });

  const perMealLocObjs = (id: string) => {
    const out: Partial<Record<MainMealType, MealLocation | null>> = {};
    MAIN_MEALS.forEach(t => {
      const lid = mealLocId(id, t);
      if (lid) out[t] = activeLocations.find(l => l.id === lid) || null;
    });
    return out;
  };
  const rowTotal = (id: string) => computeDailyTotal(getSel(id), settings, locObj(id), perMealLocObjs(id));
  const grandTotal = visible.filter(s => s.usesMeals).reduce((a, s) => a + rowTotal(s.id!), 0);

  const save = async () => {
    setSaving(true);
    const entries = visible.filter(s => s.usesMeals).map(s => {
      const lid = effLocId(s.id!);
      const loc = activeLocations.find(l => l.id === lid);
      const mLoc: MealLocationMap = {};
      MAIN_MEALS.forEach(t => { const ml = mealLocId(s.id!, t); if (ml) mLoc[t] = ml; });
      return {
        employeeId: s.id!, employeeName: s.fullName, department: s.department || '—', date, ...getSel(s.id!),
        locationId: lid || undefined, locationName: loc?.name,
        mealLocations: mLoc,
      };
    });
    try {
      await bulkUpsertMeals(date, entries, settings, activeLocations);
      await onSaved();
      toast.success('Meal register saved', `${entries.length} employee${entries.length === 1 ? '' : 's'} recorded for ${date}.`);
    } catch {
      toast.error('Save failed', 'Could not save the meal register. Please try again.');
    }
    setSaving(false);
  };

  const locOptions: [string, string][] = [['', 'Default / Office'], ...activeLocations.map(l => [l.id!, l.name] as [string, string])];
  // per-meal dropdown: empty means "use the row's day location"
  const mealLocOptions: [string, string][] = [['', 'Same as row'], ...activeLocations.map(l => [l.id!, l.name] as [string, string])];

  return (
    <Card className="overflow-hidden">
      {/* toolbar */}
      <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-gray-400" />
        </div>
        <Dropdown value={dept} onChange={setDept} options={[['all', 'All Departments'], ...depts.map(d => [d, d] as [string, string])]} />
        <Dropdown value={type} onChange={setType} options={[['all', 'All Staff Types'], ...types.map(t => [t, t] as [string, string])]} />
        <PermissionGate permission="edit_staff">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Register
          </button>
        </PermissionGate>
      </div>

      {/* default location banner */}
      <div className="px-5 py-3 bg-indigo-50/40 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest"><MapPin className="w-3.5 h-3.5" /> Default Meal Location</span>
        <Dropdown value={defLocId} onChange={setDefLocId} options={locOptions} />
        <span className="text-[11px] font-bold text-gray-400">
          Used for tea &amp; any meal left as “Same as row”. Override per employee in the Location column.
          {activeLocations.length === 0 && ' (No locations configured — using office default prices.)'}
        </span>
      </div>

      {/* quick-set: assign a place to one main meal for everyone (e.g. drivers' lunch on the road) */}
      {activeLocations.length > 0 && (
        <div className="px-5 py-3 bg-amber-50/40 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase tracking-widest"><MapPin className="w-3.5 h-3.5" /> Quick-set place for all</span>
          {MAIN_MEALS.map(t => (
            <label key={t} className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide">{settings[t].label}</span>
              <Dropdown value="" onChange={lid => setMealLocForAll(t, lid)} options={mealLocOptions} />
            </label>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Employee', 'Enrolled', 'Location', ...MEAL_TYPES.map(t => settings[t].label), 'Daily Total'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(s => {
              const on = !!s.usesMeals;
              return (
                <tr key={s.id} className={cn('hover:bg-gray-50/50 transition-colors', !on && 'opacity-50')}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px]', avatarColor(s.fullName))}>
                        {initials(s.fullName)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{s.fullName}</p>
                        <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide bg-gray-100 text-gray-500">{s.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <PermissionGate permission="edit_staff" fallback={<span className="text-[10px] font-bold text-gray-400">{on ? 'Yes' : 'No'}</span>}>
                      <button onClick={() => onToggleEnrol(s, !on)}
                        className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors',
                          on ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}>
                        <Power className="w-3 h-3" /> {on ? 'Enrolled' : 'Off'}
                      </button>
                    </PermissionGate>
                  </td>
                  <td className="px-5 py-3">
                    {on && activeLocations.length > 0 ? (
                      <select value={effLocId(s.id!)} onChange={e => setRowLoc(prev => ({ ...prev, [s.id!]: e.target.value }))}
                        className="appearance-none px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer max-w-[140px]">
                        {locOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    ) : <span className="text-[10px] text-gray-300 font-bold">—</span>}
                  </td>
                  {MEAL_TYPES.map(t => {
                    const checked = getSel(s.id!)[t];
                    const isMain = t !== 'tea';
                    return (
                      <td key={t} className="px-5 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          <input type="checkbox" disabled={!on || !settings[t].isActive}
                            checked={checked} onChange={() => toggle(s.id!, t)}
                            className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 disabled:opacity-30 cursor-pointer" />
                          {isMain && on && checked && activeLocations.length > 0 && (
                            <select value={mealLocId(s.id!, t as MainMealType)}
                              onChange={e => setMealLocFor(s.id!, t as MainMealType, e.target.value)}
                              title="Where this meal was taken"
                              className="appearance-none px-1.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer max-w-[120px]">
                              {mealLocOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 text-sm font-black text-gray-900">{on ? fmt(rowTotal(s.id!)) : '—'}</td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No employees match the filters</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 bg-gray-50/50">
              <td colSpan={7} className="px-5 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Register Total</td>
              <td className="px-5 py-3 text-sm font-black text-indigo-600">{fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};

// ── Guest (outsider) Meals ───────────────────────────────────────────────────
const emptyGuest = (): GuestMeal => ({
  date: todayISO(), guestName: '', company: '', reason: 'client-visit', authorizedBy: '',
  locationId: '', locationName: '', breakfast: false, lunch: false, dinner: false, tea: false,
  count: 1, total: 0, notes: '',
});
const REASON_LABEL = (r: GuestMealReason) => GUEST_MEAL_REASONS.find(x => x.key === r)?.label || r;

const GuestsTab: React.FC<{ settings: MealSettings; locations: MealLocation[]; onChanged: () => Promise<void> }> = ({ settings, locations, onChanged }) => {
  const toast = useToast();
  const now = new Date();
  const activeLocations = useMemo(() => locations.filter(l => l.isActive), [locations]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [list, setList] = useState<GuestMeal[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<GuestMeal | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setBusy(true);
    const { start, end } = monthDateRange(year, month);
    setList(await getGuestMealsInRange(start, end));
    setBusy(false);
  };
  useEffect(() => { load(); }, [year, month]);

  const totals = useMemo(() => ({
    records: list.length,
    guests: list.reduce((a, g) => a + Math.max(1, g.count || 1), 0),
    cost: list.reduce((a, g) => a + (g.total || 0), 0),
  }), [list]);

  const editorTotal = useMemo(() => {
    if (!editing) return 0;
    const loc = editing.locationId ? activeLocations.find(l => l.id === editing.locationId) ?? null : null;
    return computeGuestTotal(editing, settings, loc);
  }, [editing, activeLocations, settings]);

  const save = async () => {
    if (!editing) return;
    if (!editing.guestName.trim()) { toast.warning('Guest name required', 'Enter who received the meal.'); return; }
    if (!MEAL_TYPES.some(t => (editing as any)[t])) { toast.warning('Select a meal', 'Tick at least one meal.'); return; }
    setSaving(true);
    await saveGuestMeal(editing, settings, activeLocations);
    await load();
    await onChanged();
    setSaving(false);
    toast.success('Guest meal saved', `${editing.guestName} · LKR ${editorTotal.toLocaleString('en-LK')}.`);
    setEditing(null);
  };
  const remove = async (g: GuestMeal) => {
    if (!window.confirm(`Delete guest meal for "${g.guestName}"?`)) return;
    await deleteGuestMeal(g.id!); await load(); await onChanged();
    toast.success('Guest meal deleted', `${g.guestName} was removed.`);
  };

  const sub = `${monthName(month)} ${year}`;
  const mealsLabel = (g: GuestMeal) => MEAL_TYPES.filter(t => (g as any)[t]).map(t => settings[t].label).join(', ') || '—';
  const headers = ['Date', 'Guest', 'Company', 'Reason', 'Location', 'Meals', 'Guests', 'Total (LKR)'];
  const exportRows = () => list.map(g => [g.date, g.guestName, g.company || '—', REASON_LABEL(g.reason), g.locationName || 'Office', mealsLabel(g), g.count || 1, g.total || 0]);
  const setE = (patch: Partial<GuestMeal>) => setEditing(e => e ? { ...e, ...patch } : e);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-gray-900">Guest Meals</h3>
          <p className="text-[11px] font-bold text-gray-400">Food given to visitors who are not staff — company expense, never a payroll deduction.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dropdown value={String(month)} onChange={v => setMonth(Number(v))} options={Array.from({ length: 12 }, (_, i) => [String(i + 1), monthName(i + 1)] as [string, string])} />
          <Dropdown value={String(year)} onChange={v => setYear(Number(v))} options={Array.from({ length: 5 }, (_, i) => { const y = now.getFullYear() - i; return [String(y), String(y)] as [string, string]; })} />
          <ExportButtons onCSV={() => exportCSV(`Guest_Meals_${sub}`, headers, exportRows())}
            onPDF={() => exportPDF({ title: 'Guest Meals', subtitle: sub, headers, rows: exportRows(), filename: `Guest_Meals_${sub}`, footerTotals: ['', '', '', '', '', 'TOTAL', totals.guests, totals.cost] })}
            onPrint={() => printTable('Guest Meals', sub, headers, exportRows())} />
          <PermissionGate permission="edit_staff">
            <button onClick={() => setEditing(emptyGuest())} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
              <Plus className="w-3.5 h-3.5" /> Add Guest Meal
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* totals strip */}
      <Card className="grid grid-cols-3 divide-x divide-gray-100 overflow-hidden">
        {[['Records', totals.records], ['Guests Served', totals.guests], ['Guest Expense', fmt(totals.cost)]].map(([l, v]) => (
          <div key={l as string} className="p-4 text-center">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{l}</p>
            <p className="text-lg font-black text-gray-900 mt-0.5">{v}</p>
          </div>
        ))}
      </Card>

      <Card className="overflow-hidden">
        {busy ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                {[...headers, ''].map(h => <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {list.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs font-bold text-gray-700">{g.date}</td>
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] bg-rose-50 text-rose-600">{initials(g.guestName || 'G')}</span><span className="font-bold text-sm text-gray-900">{g.guestName}</span></div></td>
                    <td className="px-5 py-3 text-[11px] font-bold text-gray-600">{g.company || '—'}</td>
                    <td className="px-5 py-3"><span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{REASON_LABEL(g.reason)}</span></td>
                    <td className="px-5 py-3 text-[11px] font-bold text-gray-500">{g.locationName || 'Office'}</td>
                    <td className="px-5 py-3 text-[11px] font-medium text-gray-600">{mealsLabel(g)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-700">{g.count || 1}</td>
                    <td className="px-5 py-3 text-sm font-black text-gray-900">{fmt(g.total || 0)}</td>
                    <td className="px-5 py-3 text-right">
                      <PermissionGate permission="edit_staff">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditing(g)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => remove(g)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No guest meals recorded for {sub}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditing(null)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                <h3 className="text-sm font-black text-gray-900">{editing.id ? 'Edit Guest Meal' : 'New Guest Meal'}</h3>
                <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <input type="date" value={editing.date} onChange={e => setE({ date: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                  </Field>
                  <Field label="Guests (count)">
                    <input type="number" min={1} value={editing.count} onChange={e => setE({ count: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                  </Field>
                </div>
                <Field label="Guest Name">
                  <input value={editing.guestName} onChange={e => setE({ guestName: e.target.value })} placeholder="e.g. Mr. Perera"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company (optional)">
                    <input value={editing.company} onChange={e => setE({ company: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                  </Field>
                  <Field label="Reason">
                    <select value={editing.reason} onChange={e => setE({ reason: e.target.value as GuestMealReason })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500/50">
                      {GUEST_MEAL_REASONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Location (prices)">
                    <select value={editing.locationId} onChange={e => setE({ locationId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500/50">
                      <option value="">Default / Office</option>
                      {activeLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Authorized By (optional)">
                    <input value={editing.authorizedBy} onChange={e => setE({ authorizedBy: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                  </Field>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Meals given</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MEAL_TYPES.map(t => (
                      <label key={t} className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer', (editing as any)[t] ? 'bg-indigo-50/60 border-indigo-200' : 'bg-gray-50 border-gray-200', !settings[t].isActive && 'opacity-40 pointer-events-none')}>
                        <input type="checkbox" disabled={!settings[t].isActive} checked={(editing as any)[t]} onChange={e => setE({ [t]: e.target.checked } as any)}
                          className="w-4 h-4 rounded text-indigo-600" />
                        <span className="text-[11px] font-bold text-gray-700">{settings[t].label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="Notes (optional)">
                  <input value={editing.notes} onChange={e => setE({ notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                </Field>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated cost</span>
                  <span className="text-base font-black text-indigo-600">{fmt(editorTotal)}</span>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
                <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Save Guest Meal</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Monthly Summary ──────────────────────────────────────────────────────────
const MonthlyTab: React.FC<{ resolver: (id: string) => { name: string; department: string } | undefined }> = ({ resolver }) => {
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<MonthlySummaryRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [gen, setGen] = useState(false);

  const load = async () => {
    setBusy(true);
    setRows(await getMonthlySummary(year, month, resolver));
    setBusy(false);
  };
  useEffect(() => { load(); }, [year, month]);

  const totals = useMemo(() => ({
    days: rows.reduce((a, r) => a + r.mealDays, 0),
    meals: rows.reduce((a, r) => a + r.totalMeals, 0),
    cost: rows.reduce((a, r) => a + r.totalCost, 0),
  }), [rows]);

  const exportRows = () => rows.map(r => [r.employeeName, r.department, r.mealDays, r.totalMeals, r.totalCost]);
  const headers = ['Employee', 'Department', 'Meal Days', 'Total Meals', 'Total Cost (LKR)'];
  const sub = `${monthName(month)} ${year}`;

  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Dropdown value={String(month)} onChange={v => setMonth(Number(v))}
            options={Array.from({ length: 12 }, (_, i) => [String(i + 1), monthName(i + 1)] as [string, string])} />
          <Dropdown value={String(year)} onChange={v => setYear(Number(v))}
            options={Array.from({ length: 5 }, (_, i) => { const y = now.getFullYear() - i; return [String(y), String(y)] as [string, string]; })} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons onCSV={() => exportCSV(`Meal_Summary_${sub}`, headers, exportRows())}
            onPDF={() => exportPDF({ title: 'Monthly Meal Summary', subtitle: sub, headers, rows: exportRows(), filename: `Meal_Summary_${sub}`, footerTotals: ['TOTAL', '', totals.days, totals.meals, totals.cost] })}
            onPrint={() => printTable('Monthly Meal Summary', sub, headers, exportRows())} />
          <PermissionGate permission="edit_staff">
            <button onClick={async () => { setGen(true); const r = await generateMonthlyDeductions(year, month, resolver); setGen(false); toast.success('Deductions generated', `${r.length} meal deduction record${r.length === 1 ? '' : 's'} saved for ${monthName(month)} ${year}.`); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
              {gen ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />} Generate Deductions
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* totals strip */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {[['Total Meal Days', totals.days], ['Total Meals', totals.meals], ['Company Meal Expense', fmt(totals.cost)]].map(([l, v]) => (
          <div key={l as string} className="p-4 text-center">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{l}</p>
            <p className="text-lg font-black text-gray-900 mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      {busy ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Department', 'Meal Days', 'Total Meals', 'Total Cost'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(r => (
                <tr key={r.employeeId} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px]', avatarColor(r.employeeName))}>{initials(r.employeeName)}</div>
                      <span className="font-bold text-sm text-gray-900">{r.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{r.department}</span></td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-700">{r.mealDays} days</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-700">{r.totalMeals}</td>
                  <td className="px-5 py-3 text-sm font-black text-gray-900">{fmt(r.totalCost)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No meals recorded for {sub}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

// ── Reports ──────────────────────────────────────────────────────────────────
const ReportsTab: React.FC<{ staff: StaffMember[]; resolver: (id: string) => { name: string; department: string } | undefined; locations: MealLocation[]; settings: MealSettings }> = ({ resolver, locations, settings }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<MonthlySummaryRow[]>([]);
  const [locRows, setLocRows] = useState<LocationSummaryRow[]>([]);
  const [guests, setGuests] = useState<GuestMeal[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => { (async () => {
    setBusy(true);
    const { start, end } = monthDateRange(year, month);
    setRows(await getMonthlySummary(year, month, resolver));
    setLocRows(await getLocationSummary(year, month, locations, settings));
    setGuests(await getGuestMealsInRange(start, end));
    setBusy(false);
  })(); }, [year, month, locations, settings]);

  const sub = `${monthName(month)} ${year}`;
  // department aggregation
  const byDept = useMemo(() => {
    const map = new Map<string, { meals: number; cost: number }>();
    rows.forEach(r => {
      const d = map.get(r.department) || { meals: 0, cost: 0 };
      d.meals += r.totalMeals; d.cost += r.totalCost; map.set(r.department, d);
    });
    return Array.from(map.entries()).map(([dept, v]) => ({ dept, ...v })).sort((a, b) => b.cost - a.cost);
  }, [rows]);

  const totalCost = rows.reduce((a, r) => a + r.totalCost, 0);
  const totalMeals = rows.reduce((a, r) => a + r.totalMeals, 0);
  const guestCost = guests.reduce((a, g) => a + (g.total || 0), 0);
  const guestCount = guests.reduce((a, g) => a + Math.max(1, g.count || 1), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Dropdown value={String(month)} onChange={v => setMonth(Number(v))} options={Array.from({ length: 12 }, (_, i) => [String(i + 1), monthName(i + 1)] as [string, string])} />
        <Dropdown value={String(year)} onChange={v => setYear(Number(v))} options={Array.from({ length: 5 }, (_, i) => { const y = now.getFullYear() - i; return [String(y), String(y)] as [string, string]; })} />
      </div>

      {busy ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
        <>
          {/* Company expense */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Staff Meal Expense', val: fmt(totalCost), color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Guest Meal Expense', val: fmt(guestCost), color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Total Food Cost', val: fmt(totalCost + guestCost), color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Meals Served', val: totalMeals, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(k => (
              <Card key={k.label} className="p-5">
                <div className={cn('p-2.5 rounded-xl w-fit mb-3', k.bg)}><Wallet className={cn('w-4 h-4', k.color)} /></div>
                <p className="text-2xl font-black text-gray-900">{k.val}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{k.label}</p>
              </Card>
            ))}
          </div>

          {/* Employee Meal Report */}
          <ReportTable title="Employee Meal Report" subtitle={sub}
            headers={['Employee', 'Month', 'Total Meals', 'Total Cost (LKR)']}
            rows={rows.map(r => [r.employeeName, sub, r.totalMeals, r.totalCost])} />

          {/* Department Meal Report */}
          <ReportTable title="Department Meal Report" subtitle={sub}
            headers={['Department', 'Total Meals', 'Total Cost (LKR)']}
            rows={byDept.map(d => [d.dept, d.meals, d.cost])} />

          {/* Location Meal Report */}
          <ReportTable title="Location Meal Report" subtitle={sub}
            headers={['Location', 'Supplier', 'Meal Days', 'Total Meals', 'Total Cost (LKR)']}
            rows={locRows.map(l => [l.locationName, l.supplierName, l.mealDays, l.totalMeals, l.totalCost])} />

          {/* Guest Meal Report */}
          <ReportTable title="Guest Meal Report" subtitle={`${sub} · ${guestCount} guest${guestCount === 1 ? '' : 's'} · company expense`}
            headers={['Date', 'Guest', 'Company', 'Reason', 'Location', 'Guests', 'Total Cost (LKR)']}
            rows={guests.map(g => [g.date, g.guestName, g.company || '—', REASON_LABEL(g.reason), g.locationName || 'Office', g.count || 1, g.total || 0])} />
        </>
      )}
    </div>
  );
};

const ReportTable: React.FC<{ title: string; subtitle: string; headers: string[]; rows: (string | number)[][] }> = ({ title, subtitle, headers, rows }) => (
  <Card className="overflow-hidden">
    <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-black text-gray-900">{title}</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
      </div>
      <ExportButtons
        onCSV={() => exportCSV(`${title.replace(/\s+/g, '_')}_${subtitle}`, headers, rows)}
        onPDF={() => exportPDF({ title, subtitle, headers, rows, filename: `${title.replace(/\s+/g, '_')}_${subtitle}` })}
        onPrint={() => printTable(title, subtitle, headers, rows)} />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-gray-100">{headers.map(h => <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50/50">
              {r.map((c, j) => <td key={j} className={cn('px-5 py-3 text-sm', j === 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-600')}>{typeof c === 'number' && j === r.length - 1 ? fmt(c) : c}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} className="px-5 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No data</td></tr>}
        </tbody>
      </table>
    </div>
  </Card>
);

// ── Settings ─────────────────────────────────────────────────────────────────
const SettingsTab: React.FC<{ settings: MealSettings; onSave: (s: MealSettings) => Promise<void> }> = ({ settings, onSave }) => {
  const toast = useToast();
  const [draft, setDraft] = useState<MealSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setType = (t: MealType, patch: Partial<MealSettings['breakfast']>) =>
    setDraft(d => ({ ...d, [t]: { ...d[t], ...patch } }));

  const save = async () => {
    setSaving(true); await onSave(draft); setSaving(false); setSaved(true);
    toast.success('Settings saved', 'Meal prices and deduction method were updated.');
    setTimeout(() => setSaved(false), 2000);
  };

  const methods: { key: MealDeductionMethod; title: string; desc: string }[] = [
    { key: 'immediate', title: 'Immediate Deduction', desc: 'Deduct daily as meals are recorded.' },
    { key: 'monthly', title: 'Monthly Deduction', desc: 'Deduct during payroll generation.' },
    { key: 'none', title: 'No Deduction', desc: 'Meals are company-sponsored.' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-sm font-black text-gray-900 mb-1">Meal Configuration</h3>
        <p className="text-[11px] font-bold text-gray-400 mb-5">Define meal prices and enable or disable meal types.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MEAL_TYPES.map(t => (
            <div key={t} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg" style={{ background: `${MEAL_COLOR[t]}1a`, color: MEAL_COLOR[t] }}>{MEAL_ICON[t]}</span>
                  <span className="text-[11px] font-black text-gray-700 uppercase tracking-wide">{draft[t].label}</span>
                </div>
                <button onClick={() => setType(t, { isActive: !draft[t].isActive })}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', draft[t].isActive ? 'bg-emerald-500' : 'bg-gray-300')}>
                  <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', draft[t].isActive && 'translate-x-5')} />
                </button>
              </div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cost (LKR)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-400">LKR</span>
                <input type="number" min={0} value={draft[t].cost}
                  onChange={e => setType(t, { cost: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-black text-gray-900 mb-1">Payroll · Meal Deduction Method</h3>
        <p className="text-[11px] font-bold text-gray-400 mb-5">Controls how meal costs flow into payroll.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {methods.map(m => (
            <button key={m.key} onClick={() => setDraft(d => ({ ...d, deductionMethod: m.key }))}
              className={cn('text-left p-4 rounded-2xl border-2 transition-all',
                draft.deductionMethod === m.key ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100 bg-gray-50 hover:border-gray-200')}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-gray-900 uppercase tracking-wide">{m.title}</span>
                <span className={cn('w-4 h-4 rounded-full border-2', draft.deductionMethod === m.key ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300')} />
              </div>
              <p className="text-[11px] font-medium text-gray-500">{m.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <PermissionGate permission="edit_staff" fallback={<p className="text-[11px] font-bold text-gray-400">You don't have permission to edit settings.</p>}>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Settings
          </button>
          {saved && <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Saved ✓</span>}
        </PermissionGate>
      </div>
    </div>
  );
};

// ── Locations Tab ────────────────────────────────────────────────────────────
const emptyLocation = (prices: MealPricesT): MealLocation => ({
  name: '', type: 'rest-point', address: '', prices: { ...prices }, supplierId: '', supplierName: '', isDefault: false, isActive: true, notes: '',
});
type MealPricesT = Record<MealType, number>;

const LocationsTab: React.FC<{ locations: MealLocation[]; suppliers: MealSupplier[]; settings: MealSettings; reload: () => Promise<void> }> = ({ locations, suppliers, settings, reload }) => {
  const toast = useToast();
  const [editing, setEditing] = useState<MealLocation | null>(null);

  const openNew = () => setEditing(emptyLocation(defaultPricesFromSettings(settings)));
  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.warning('Name required', 'Enter a location name.'); return; }
    const sup = suppliers.find(s => s.id === editing.supplierId);
    await saveMealLocation({ ...editing, supplierName: sup?.name || '' });
    await reload();
    toast.success('Location saved', `${editing.name} was saved.`);
    setEditing(null);
  };
  const remove = async (l: MealLocation) => {
    if (!window.confirm(`Delete location "${l.name}"?`)) return;
    await deleteMealLocation(l.id!); await reload(); toast.success('Location deleted', `${l.name} was removed.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-gray-900">Meal Locations</h3>
          <p className="text-[11px] font-bold text-gray-400">Places where staff receive meals — each with its own prices and supplier.</p>
        </div>
        <PermissionGate permission="edit_staff">
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
            <Plus className="w-3.5 h-3.5" /> Add Location
          </button>
        </PermissionGate>
      </div>

      {locations.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No meal locations yet. The office default prices apply until you add one.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map(l => {
            const meta = LOC_TYPE_META[l.type];
            return (
              <Card key={l.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2.5 rounded-xl" style={{ background: `${meta.color}1a`, color: meta.color }}>{meta.icon}</span>
                    <div>
                      <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">{l.name}
                        {l.isDefault && <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black bg-indigo-100 text-indigo-600 uppercase">Default</span>}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{meta.label}{!l.isActive && ' · Inactive'}</p>
                    </div>
                  </div>
                  <PermissionGate permission="edit_staff">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(l)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => remove(l)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </PermissionGate>
                </div>
                {l.address && <p className="text-[11px] text-gray-500 font-medium mb-3 flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-300" /> {l.address}</p>}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {MEAL_TYPES.map(t => (
                    <div key={t} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 rounded-lg">
                      <span className="text-[10px] font-bold text-gray-500">{settings[t].label}</span>
                      <span className="text-[11px] font-black text-gray-900">{fmt(l.prices?.[t] ?? settings[t].cost)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500"><Store className="w-3.5 h-3.5 text-gray-300" /> {l.supplierName || 'No supplier set'}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditing(null)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                <h3 className="text-sm font-black text-gray-900">{editing.id ? 'Edit Location' : 'New Meal Location'}</h3>
                <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <Field label="Location Name">
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Kandy Rest Point"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type">
                    <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as MealLocationType })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500/50">
                      {(Object.keys(LOC_TYPE_META) as MealLocationType[]).map(t => <option key={t} value={t}>{LOC_TYPE_META[t].label}</option>)}
                    </select>
                  </Field>
                  <Field label="Supplier">
                    <select value={editing.supplierId} onChange={e => setEditing({ ...editing, supplierId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500/50">
                      <option value="">No supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Address (optional)">
                  <input value={editing.address} onChange={e => setEditing({ ...editing, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                </Field>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Meal Prices at this location (LKR)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {MEAL_TYPES.map(t => (
                      <div key={t} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500 w-20">{settings[t].label}</span>
                        <input type="number" min={0} value={editing.prices?.[t] ?? 0}
                          onChange={e => setEditing({ ...editing, prices: { ...editing.prices, [t]: Number(e.target.value) } })}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!editing.isDefault} onChange={e => setEditing({ ...editing, isDefault: e.target.checked })} className="w-4 h-4 rounded text-indigo-600" />
                    <span className="text-[11px] font-bold text-gray-600">Default location</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} className="w-4 h-4 rounded text-emerald-600" />
                    <span className="text-[11px] font-bold text-gray-600">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
                <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50">Cancel</button>
                <button onClick={save} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Save Location</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Suppliers Tab ────────────────────────────────────────────────────────────
const emptySupplier = (): MealSupplier => ({ name: '', contactPerson: '', phone: '', email: '', address: '', isActive: true, notes: '' });

const SuppliersTab: React.FC<{ suppliers: MealSupplier[]; locations: MealLocation[]; reload: () => Promise<void> }> = ({ suppliers, locations, reload }) => {
  const toast = useToast();
  const [editing, setEditing] = useState<MealSupplier | null>(null);
  const locCount = (sid?: string) => locations.filter(l => l.supplierId === sid).length;

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.warning('Name required', 'Enter a supplier name.'); return; }
    await saveMealSupplier(editing); await reload(); toast.success('Supplier saved', `${editing.name} was saved.`); setEditing(null);
  };
  const remove = async (s: MealSupplier) => {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    await deleteMealSupplier(s.id!); await reload(); toast.success('Supplier deleted', `${s.name} was removed.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-gray-900">Meal Suppliers</h3>
          <p className="text-[11px] font-bold text-gray-400">Vendors that provide meals to your staff at each location.</p>
        </div>
        <PermissionGate permission="edit_staff">
          <button onClick={() => setEditing(emptySupplier())} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
            <Plus className="w-3.5 h-3.5" /> Add Supplier
          </button>
        </PermissionGate>
      </div>

      {suppliers.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No meal suppliers yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {['Supplier', 'Contact', 'Phone', 'Locations', 'Status', ''].map(h => <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Store className="w-4 h-4" /></span><span className="font-bold text-sm text-gray-900">{s.name}</span></div></td>
                  <td className="px-5 py-3 text-[11px] font-bold text-gray-600">{s.contactPerson || '—'}</td>
                  <td className="px-5 py-3 text-[11px] font-bold text-gray-600">{s.phone || '—'}</td>
                  <td className="px-5 py-3 text-[11px] font-bold text-gray-600">{locCount(s.id)} linked</td>
                  <td className="px-5 py-3"><span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase', s.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400')}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-5 py-3 text-right">
                    <PermissionGate permission="edit_staff">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(s)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => remove(s)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </PermissionGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditing(null)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900">{editing.id ? 'Edit Supplier' : 'New Meal Supplier'}</h3>
                <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <Field label="Supplier Name"><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Highway Kitchen (Pvt) Ltd" className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contact Person"><input value={editing.contactPerson} onChange={e => setEditing({ ...editing, contactPerson: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" /></Field>
                  <Field label="Phone"><input value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" /></Field>
                </div>
                <Field label="Email"><input value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" /></Field>
                <Field label="Address"><input value={editing.address} onChange={e => setEditing({ ...editing, address: e.target.value })} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50" /></Field>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} className="w-4 h-4 rounded text-emerald-600" />
                  <span className="text-[11px] font-bold text-gray-600">Active</span>
                </label>
              </div>
              <div className="flex gap-3 p-5 border-t border-gray-100">
                <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50">Cancel</button>
                <button onClick={save} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Save Supplier</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

// ── shared small UI ──────────────────────────────────────────────────────────
const Dropdown: React.FC<{ value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ value, onChange, options }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)}
      className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
  </div>
);

const ExportButtons: React.FC<{ onCSV: () => void; onPDF: () => void; onPrint: () => void }> = ({ onCSV, onPDF, onPrint }) => (
  <div className="flex items-center gap-2">
    <button onClick={onCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"><Download className="w-3.5 h-3.5" /> CSV</button>
    <button onClick={onPDF} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"><FileText className="w-3.5 h-3.5" /> PDF</button>
    <button onClick={onPrint} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"><Printer className="w-3.5 h-3.5" /> Print</button>
  </div>
);

export default MealManagementPage;
