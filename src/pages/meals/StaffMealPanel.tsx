import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils, Power, Coffee, Sun, Moon, Soup, Wallet, CalendarDays,
  Download, FileText, Search, CheckCircle, XCircle, ArrowUpRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { StaffMember, updateStaffMember } from '../../services/staffService';
import {
  getMealSettings, getEmployeeMeals, monthDateRange,
  MealSettings, EmployeeMeal, MealType, MEAL_TYPES,
} from '../../services/mealService';
import { exportCSV, exportPDF, monthName } from '../../utils/mealExports';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { useToast } from '../../contexts/ToastContext';

const fmt = (n: number) => `LKR ${n.toLocaleString('en-LK')}`;
const MEAL_ICON: Record<MealType, React.ReactNode> = {
  breakfast: <Coffee className="w-3.5 h-3.5" />, lunch: <Sun className="w-3.5 h-3.5" />,
  dinner: <Moon className="w-3.5 h-3.5" />, tea: <Soup className="w-3.5 h-3.5" />,
};

/** Employee Meal Registration + Meal History panel embedded in the Staff Profile. */
const StaffMealPanel: React.FC<{ member: StaffMember; onChange?: (m: StaffMember) => void }> = ({ member, onChange }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [settings, setSettings] = useState<MealSettings | null>(null);
  const [history, setHistory] = useState<EmployeeMeal[]>([]);
  const [enrolled, setEnrolled] = useState(!!member.usesMeals);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const now = new Date();

  useEffect(() => { setEnrolled(!!member.usesMeals); }, [member.usesMeals]);

  useEffect(() => {
    (async () => {
      if (!member.id) return;
      setLoading(true);
      setSettings(await getMealSettings());
      // last ~2 months of history
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = monthDateRange(now.getFullYear(), now.getMonth() + 1).end;
      setHistory(await getEmployeeMeals(member.id, start, end));
      setLoading(false);
    })();
  }, [member.id]);

  const monthCost = useMemo(() => {
    const { start, end } = monthDateRange(now.getFullYear(), now.getMonth() + 1);
    return history.filter(h => h.date >= start && h.date <= end).reduce((a, h) => a + (h.dailyTotal || 0), 0);
  }, [history]);

  const mealDays = useMemo(() => history.filter(h => h.breakfast || h.lunch || h.dinner || h.tea).length, [history]);

  const filtered = history.filter(h => !search || h.date.includes(search));

  const toggleEnrol = async () => {
    if (!member.id) return;
    setSaving(true);
    const next = !enrolled;
    await updateStaffMember(member.id, { usesMeals: next });
    setEnrolled(next);
    onChange?.({ ...member, usesMeals: next });
    toast.success(next ? 'Enrolled in meal program' : 'Removed from meal program', `${member.fullName} ${next ? 'now uses' : 'no longer uses'} company meals.`);
    setSaving(false);
  };

  const exportRows = () => filtered.map(h => [
    h.date, h.breakfast ? 'Yes' : '-', h.lunch ? 'Yes' : '-', h.dinner ? 'Yes' : '-', h.tea ? 'Yes' : '-', h.dailyTotal,
  ]);
  const headers = ['Date', 'Breakfast', 'Lunch', 'Dinner', 'Tea', 'Cost (LKR)'];
  const sub = `${member.fullName} · ${monthName(now.getMonth() + 1)} ${now.getFullYear()}`;

  return (
    <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
          <Utensils className="w-4 h-4 text-indigo-600" /> Meal Program
        </h4>
        <button onClick={() => navigate('/meals')}
          className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
          Open Module <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Enrolment */}
      <div className={cn('flex items-center justify-between p-5 rounded-2xl border',
        enrolled ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100')}>
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-xl', enrolled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400')}>
            <Power className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900">{enrolled ? 'Employee uses company meals' : 'Not enrolled in meal program'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {enrolled ? 'Meal costs are tracked & deducted via payroll' : 'Enable to start tracking meals'}
            </p>
          </div>
        </div>
        <PermissionGate permission="edit_staff" fallback={
          <span className={cn('px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest', enrolled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500')}>
            {enrolled ? 'Enrolled' : 'Off'}
          </span>
        }>
          <button onClick={toggleEnrol} disabled={saving}
            className={cn('relative w-14 h-7 rounded-full transition-colors disabled:opacity-50', enrolled ? 'bg-emerald-500' : 'bg-gray-300')}>
            <span className={cn('absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform', enrolled && 'translate-x-7')} />
          </button>
        </PermissionGate>
      </div>

      {enrolled && (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Meal Days', val: mealDays, icon: <CalendarDays className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'This Month', val: fmt(monthCost), icon: <Wallet className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Records', val: history.length, icon: <FileText className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map(s => (
              <div key={s.label} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className={cn('p-2 rounded-lg w-fit mb-2', s.bg)}><span className={s.color}>{s.icon}</span></div>
                <p className="text-lg font-black text-gray-900">{s.val}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>

          {/* History */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by date (YYYY-MM)…"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportCSV(`Meals_${member.fullName.replace(/\s+/g, '_')}`, headers, exportRows())}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"><Download className="w-3.5 h-3.5" /> CSV</button>
                <button onClick={() => exportPDF({ title: 'Employee Meal History', subtitle: sub, headers, rows: exportRows(), filename: `Meals_${member.fullName.replace(/\s+/g, '_')}` })}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"><FileText className="w-3.5 h-3.5" /> PDF</button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    {['Date', ...MEAL_TYPES.map(t => settings?.[t].label || t), 'Cost'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No meal records</td></tr>
                  ) : filtered.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-700">{h.date}</td>
                      {MEAL_TYPES.map(t => (
                        <td key={t} className="px-4 py-2.5">
                          {(h as any)[t]
                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                            : <XCircle className="w-4 h-4 text-gray-200" />}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-xs font-black text-gray-900">{fmt(h.dailyTotal || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default StaffMealPanel;
