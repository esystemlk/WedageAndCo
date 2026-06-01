import React, { useState, useEffect, useMemo } from 'react';
import { useStaff } from '../../hooks/useStaff';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import FileUpload from '../../components/shared/FileUpload';
import {
  UserPlus, Search, ChevronRight, ChevronDown, ChevronLeft, Edit, Trash2, Eye,
  Users, UserCheck, UserMinus, CalendarClock, Upload, Download, LayoutGrid,
  Cake, Gift, ListChecks,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
} from 'recharts';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteStaffMember, updateStaffMember, StaffMember } from '../../services/staffService';
import { getLeaveRequests, LeaveRequest } from '../../services/leaveService';
import { exportCSV } from '../../utils/mealExports';

// ── category meta ────────────────────────────────────────────────────────────
const CATEGORIES = ['Driver', 'Helper', 'Cleaner', 'Office Staff', 'Garage'] as const;
const CAT_META: Record<string, { plural: string; color: string; pill: string }> = {
  'Driver':      { plural: 'Drivers',      color: '#3B82F6', pill: 'bg-blue-50 text-blue-600' },
  'Helper':      { plural: 'Helpers',      color: '#10B981', pill: 'bg-emerald-50 text-emerald-600' },
  'Cleaner':     { plural: 'Cleaners',     color: '#F59E0B', pill: 'bg-amber-50 text-amber-600' },
  'Office Staff':{ plural: 'Office Staff', color: '#8B5CF6', pill: 'bg-violet-50 text-violet-600' },
  'Garage':      { plural: 'Garage',       color: '#EC4899', pill: 'bg-pink-50 text-pink-600' },
};
const PAGE_SIZE = 8;

const AVATAR_COLORS = ['bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700'];
const avatarColor = (s: string) => AVATAR_COLORS[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
function daysUntilAnnual(dateStr: string): number {
  const d = new Date(dateStr); const t = new Date(); t.setHours(0, 0, 0, 0);
  const next = new Date(t.getFullYear(), d.getMonth(), d.getDate());
  if (next < t) next.setFullYear(t.getFullYear() + 1);
  return Math.round((next.getTime() - t.getTime()) / 86400000);
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('bg-white border border-gray-100 rounded-2xl shadow-sm', className)}>{children}</div>
);
const SH: React.FC<{ title: string; action?: string; onAction?: () => void }> = ({ title, action, onAction }) => (
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-black text-gray-900">{title}</h3>
    {action && <button onClick={onAction} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">{action}</button>}
  </div>
);

const StaffListPage: React.FC = () => {
  const { staff, loading, refresh } = useStaff();
  const navigate = useNavigate();
  const toast = useToast();

  const [view, setView] = useState<'directory' | 'dossier'>('directory');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'All' | typeof CATEGORIES[number]>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  useEffect(() => { getLeaveRequests().then(d => setLeaves(d || [])); }, []);
  useEffect(() => { setPage(1); }, [search, catFilter, deptFilter, statusFilter]);

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  // staff currently on approved leave
  const onLeaveIds = useMemo(() => new Set(
    leaves.filter(l => l.status === 'Approved' && l.startDate <= todayISO && l.endDate >= todayISO).map(l => l.staffId),
  ), [leaves, todayISO]);

  const statusOf = (m: StaffMember): 'Active' | 'On Leave' | 'Inactive' | 'Resigned' => {
    if (m.active) return m.id && onLeaveIds.has(m.id) ? 'On Leave' : 'Active';
    return (m as any).resignationDate ? 'Resigned' : 'Inactive';
  };

  const departments = useMemo(() => Array.from(new Set(staff.map(s => s.department).filter(Boolean))) as string[], [staff]);

  // ── stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = staff.filter(s => s.active).length;
    const onLeave = staff.filter(s => s.active && s.id && onLeaveIds.has(s.id)).length;
    const newJoiners = staff.filter(s => s.joinDate && new Date(s.joinDate).getFullYear() === now.getFullYear() && new Date(s.joinDate).getMonth() === now.getMonth()).length;
    return { total: staff.length, active: active - onLeave, onLeave, newJoiners };
  }, [staff, onLeaveIds]);

  const statusCounts = useMemo(() => {
    const c = { Active: 0, 'On Leave': 0, Inactive: 0, Resigned: 0 } as Record<string, number>;
    staff.forEach(s => { c[statusOf(s)] += 1; });
    return c;
  }, [staff, onLeaveIds]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    CATEGORIES.forEach(cat => { c[cat] = staff.filter(s => s.category === cat).length; });
    return c;
  }, [staff]);

  const donutData = CATEGORIES.map(cat => ({ name: CAT_META[cat].plural, value: catCounts[cat] || 0, color: CAT_META[cat].color })).filter(d => d.value > 0);
  const deptBars = CATEGORIES.map(cat => ({ name: CAT_META[cat].plural, value: catCounts[cat] || 0, color: CAT_META[cat].color }));

  const recentJoiners = useMemo(() =>
    [...staff].filter(s => s.joinDate).sort((a, b) => (b.joinDate! > a.joinDate! ? 1 : -1)).slice(0, 4), [staff]);

  const upcomingBirthdays = useMemo(() =>
    staff.filter(s => (s as any).dateOfBirth).map(s => ({ s, days: daysUntilAnnual((s as any).dateOfBirth) }))
      .filter(x => x.days <= 60).sort((a, b) => a.days - b.days).slice(0, 4), [staff]);

  // ── filtered + paginated table ───────────────────────────────────────────────
  const filtered = useMemo(() => staff.filter(m => {
    const s = search.toLowerCase();
    const sm = !s || m.fullName.toLowerCase().includes(s) || (m.phone || '').includes(search) || (m.staffId || '').toLowerCase().includes(s) || (m.email || '').toLowerCase().includes(s);
    const cm = catFilter === 'All' || m.category === catFilter;
    const dm = deptFilter === 'All' || m.department === deptFilter;
    const stm = statusFilter === 'All' || statusOf(m) === statusFilter;
    return sm && cm && dm && stm;
  }), [staff, search, catFilter, deptFilter, statusFilter, onLeaveIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── dossier (preserved) ──────────────────────────────────────────────────────
  const dossierStaff = staff.filter(m => {
    if (!m.active) return false;
    return (m.policeReportAddLater && !m.policeReportUrl) || (m.gramaNiladariAddLater && !m.gramaNiladariUrl)
      || (m.birthCertificateAddLater && !m.birthCertificateUrl) || (m.cvAddLater && !m.cvUrl)
      || (m.additionalCertificatesAddLater && (!m.certificatesUrls || m.certificatesUrls.length === 0));
  });

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from records?`)) return;
    try { await deleteStaffMember(id); refresh(); toast.success('Staff removed', `${name} was removed from the directory.`); }
    catch { toast.error('Delete failed', `Could not remove ${name}.`); }
  };

  const exportStaff = () => exportCSV('Staff_Directory',
    ['Staff ID', 'Name', 'Role', 'Department', 'Status', 'Phone', 'Joined'],
    filtered.map(m => [m.staffId || m.id?.slice(-6) || '', m.fullName, m.category, m.department || '', statusOf(m), m.phone || '', m.joinDate || '']),
  );

  const STATUS_PILL: Record<string, string> = {
    'Active': 'text-emerald-600', 'On Leave': 'text-amber-600', 'Inactive': 'text-gray-400', 'Resigned': 'text-red-500',
  };
  const STATUS_DOT: Record<string, string> = {
    'Active': 'bg-emerald-500', 'On Leave': 'bg-amber-500', 'Inactive': 'bg-gray-300', 'Resigned': 'bg-red-500',
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Staff Registry</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Human Resources · Staff Directory</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(v => v === 'directory' ? 'dossier' : 'directory')}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors',
              view === 'dossier' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
            <ListChecks className="w-3.5 h-3.5" /> Dossier {dossierStaff.length > 0 && `(${dossierStaff.length})`}
          </button>
          <PermissionGate permission="edit_staff">
            <Link to="/staff/new" className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all">
              <UserPlus className="w-3.5 h-3.5" /> Add Member
            </Link>
          </PermissionGate>
        </div>
      </div>

      {view === 'dossier' ? (
        <DossierLedger dossierStaff={dossierStaff} refresh={refresh} />
      ) : (
      <>
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Personnel', val: stats.total, icon: <Users className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Active Staff', val: stats.active, icon: <UserCheck className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'On Leave', val: stats.onLeave, icon: <CalendarClock className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'New Joiners (This Month)', val: stats.newJoiners, icon: <UserPlus className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
              <div className={cn('p-3 rounded-2xl', k.bg)}><span className={k.color}>{k.icon}</span></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
                <p className="text-2xl font-black text-gray-900">{k.val}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT — table */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              {/* category tabs */}
              <div className="flex gap-1 px-5 pt-4 border-b border-gray-100 overflow-x-auto">
                {(['All', ...CATEGORIES] as const).map(cat => {
                  const count = cat === 'All' ? staff.length : catCounts[cat] || 0;
                  return (
                    <button key={cat} onClick={() => setCatFilter(cat as any)}
                      className={cn('px-3 py-2.5 text-[11px] font-black whitespace-nowrap border-b-2 transition-colors',
                        catFilter === cat ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600')}>
                      {cat === 'All' ? 'All Staff' : CAT_META[cat as string].plural} ({count})
                    </button>
                  );
                })}
              </div>

              {/* filters */}
              <div className="p-4 flex flex-col lg:flex-row gap-3 border-b border-gray-100">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, phone or email…"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-gray-400" />
                </div>
                <Dropdown value={deptFilter} onChange={setDeptFilter} options={[['All', 'Department: All'], ...departments.map(d => [d, d] as [string, string])]} />
                <Dropdown value={statusFilter} onChange={setStatusFilter} options={[['All', 'Status: All'], ['Active', 'Active'], ['On Leave', 'On Leave'], ['Inactive', 'Inactive'], ['Resigned', 'Resigned']]} />
              </div>

              {/* table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-gray-100">
                    {['Staff Member', 'Role / Type', 'Department', 'Status', 'Joined On', 'Actions'].map(h => (
                      <th key={h} className={cn('px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]', h === 'Actions' ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    <AnimatePresence>
                      {pageRows.map((m, i) => {
                        const st = statusOf(m);
                        return (
                          <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }}
                            className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/staff/${m.id}`)}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                {m.profilePicture
                                  ? <img src={m.profilePicture} alt="" className="w-9 h-9 rounded-xl object-cover" />
                                  : <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px]', avatarColor(m.fullName))}>{initials(m.fullName)}</div>}
                                <div>
                                  <p className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors">{m.fullName}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{m.staffId || `EMP-${m.id?.slice(-4).toUpperCase()}`}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-[11px] font-bold text-gray-600">{m.position || m.category}</td>
                            <td className="px-5 py-3">
                              <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black', CAT_META[m.category]?.pill || 'bg-gray-100 text-gray-600')}>
                                {CAT_META[m.category]?.plural || m.department || m.category}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold', STATUS_PILL[st])}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[st])} />{st}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-[11px] font-bold text-gray-500 whitespace-nowrap">{fmtDate(m.joinDate)}</td>
                            <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Link to={`/staff/${m.id}`} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><Eye className="w-4 h-4" /></Link>
                                <PermissionGate permission="edit_staff">
                                  <Link to={`/staff/${m.id}/edit`} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><Edit className="w-4 h-4" /></Link>
                                  <button onClick={() => handleDelete(m.id!, m.fullName)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </PermissionGate>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="py-20 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No staff members found</div>}
              </div>

              {/* pagination */}
              {filtered.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400">
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages).map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1 text-gray-300">…</span>}
                        <button onClick={() => setPage(p)} className={cn('w-8 h-8 rounded-lg text-[11px] font-black', page === p ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50')}>{p}</button>
                      </React.Fragment>
                    ))}
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </Card>

            {/* bottom: department distribution + staff status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5">
                <SH title="Department Distribution" />
                <div className="mt-4 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptBars} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 700 }} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                      <RTooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} cursor={{ fill: '#F8FAFC' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {deptBars.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <SH title="Staff Status" />
                <div className="mt-4 space-y-4">
                  {[
                    { label: 'Active', n: statusCounts.Active, color: 'bg-emerald-500', text: 'text-emerald-600' },
                    { label: 'On Leave', n: statusCounts['On Leave'], color: 'bg-amber-500', text: 'text-amber-600' },
                    { label: 'Inactive', n: statusCounts.Inactive, color: 'bg-gray-400', text: 'text-gray-500' },
                    { label: 'Resigned', n: statusCounts.Resigned, color: 'bg-red-500', text: 'text-red-500' },
                  ].map(r => {
                    const pct = stats.total > 0 ? (r.n / stats.total * 100) : 0;
                    return (
                      <div key={r.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={cn('text-[11px] font-black uppercase tracking-wide', r.text)}>{r.label}</span>
                          <span className="text-[11px] font-bold text-gray-500">{r.n} · {pct.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2"><div className={cn('h-2 rounded-full', r.color)} style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          {/* RIGHT — sidebar */}
          <div className="space-y-6">
            {/* Staff overview donut */}
            <Card className="p-5">
              <SH title="Staff Overview" />
              <div className="flex flex-col items-center mt-2">
                <div className="relative">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={donutData.length ? donutData : [{ value: 1, color: '#E5E7EB' }]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0} paddingAngle={2}>
                        {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase">Total Staff</p>
                  </div>
                </div>
                <div className="w-full space-y-1.5 mt-4">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /><span className="text-[11px] font-bold text-gray-600">{d.name}</span></div>
                      <span className="text-[11px] text-gray-400 font-bold">{d.value} ({stats.total > 0 ? (d.value / stats.total * 100).toFixed(1) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Recent joiners */}
            <Card className="p-5">
              <SH title="Recent Joiners" action="View All" onAction={() => { setCatFilter('All'); setStatusFilter('All'); }} />
              <div className="mt-4 space-y-3">
                {recentJoiners.length === 0 ? <p className="text-[11px] text-gray-400 font-bold">No join dates recorded</p> : recentJoiners.map(m => (
                  <Link key={m.id} to={`/staff/${m.id}`} className="flex items-center gap-3 group">
                    {m.profilePicture ? <img src={m.profilePicture} className="w-9 h-9 rounded-lg object-cover" /> : <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center font-black text-[10px]', avatarColor(m.fullName))}>{initials(m.fullName)}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-gray-800 truncate group-hover:text-indigo-600">{m.fullName}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{m.position || m.category}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{fmtDate(m.joinDate)}</span>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Upcoming birthdays */}
            <Card className="p-5">
              <SH title="Upcoming Birthdays" />
              <div className="mt-4 space-y-3">
                {upcomingBirthdays.length === 0 ? (
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 font-bold"><Cake className="w-4 h-4 text-gray-300" /> No birthdays on record</div>
                ) : upcomingBirthdays.map(({ s, days }) => (
                  <Link key={s.id} to={`/staff/${s.id}`} className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center"><Gift className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-gray-800 truncate group-hover:text-indigo-600">{s.fullName}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{s.position || s.category}</p>
                    </div>
                    <span className="text-[10px] font-black text-pink-500">{days === 0 ? 'Today' : `${days}d`}</span>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Quick actions */}
            <Card className="p-5">
              <SH title="Quick Actions" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: 'Add New Member', icon: <UserPlus className="w-4 h-4" />, onClick: () => navigate('/staff/new') },
                  { label: 'Export Staff', icon: <Download className="w-4 h-4" />, onClick: exportStaff },
                  { label: 'Import Staff', icon: <Upload className="w-4 h-4" />, onClick: () => toast.info('Import staff', 'Bulk import will be available soon.') },
                  { label: 'Bulk Actions', icon: <LayoutGrid className="w-4 h-4" />, onClick: () => toast.info('Bulk actions', 'Select rows to perform bulk operations (coming soon).') },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-100 rounded-xl text-gray-600 hover:text-indigo-600 transition-colors">
                    {a.icon}<span className="text-[10px] font-black uppercase tracking-widest text-center">{a.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </>
      )}
    </div>
  );
};

// ── Dropdown ─────────────────────────────────────────────────────────────────
const Dropdown: React.FC<{ value: string; onChange: (v: string) => void; options: [string, string][] }> = ({ value, onChange, options }) => (
  <div className="relative">
    <select value={value} onChange={e => onChange(e.target.value)}
      className="appearance-none pl-4 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-600 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
  </div>
);

// ── Dossier Ledger (preserved from original) ─────────────────────────────────
const DossierLedger: React.FC<{ dossierStaff: StaffMember[]; refresh: () => void }> = ({ dossierStaff, refresh }) => (
  <div className="space-y-8">
    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest">Document Auditing Ledger</h4>
        <p className="text-[10px] font-bold text-indigo-500 uppercase mt-0.5">Track and upload outstanding documentation for personnel allowed to onboard with grace periods.</p>
      </div>
      <div className="px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider text-center shrink-0">{dossierStaff.length} Personnel Audits Pending</div>
    </div>

    {dossierStaff.length === 0 ? (
      <div className="py-16 text-center"><p className="text-gray-400 text-sm font-bold uppercase tracking-widest">🎉 All staff members have complete dossiers!</p></div>
    ) : (
      <div className="grid grid-cols-1 gap-8">
        {dossierStaff.map((member) => {
          const items: { label: string; field: string; deadline?: string }[] = [];
          if (member.policeReportAddLater && !member.policeReportUrl) items.push({ label: 'Police Report', field: 'policeReportUrl', deadline: member.policeReportDeadline });
          if (member.gramaNiladariAddLater && !member.gramaNiladariUrl) items.push({ label: 'Grama Niladari Certificate', field: 'gramaNiladariUrl', deadline: member.gramaNiladariDeadline });
          if (member.birthCertificateAddLater && !member.birthCertificateUrl) items.push({ label: 'Birth Certificate Copy', field: 'birthCertificateUrl', deadline: member.birthCertificateDeadline });
          if (member.cvAddLater && !member.cvUrl) items.push({ label: 'Copy of CV', field: 'cvUrl', deadline: member.cvDeadline });
          if (member.additionalCertificatesAddLater && (!member.certificatesUrls || member.certificatesUrls.length === 0)) items.push({ label: 'Additional Certificates', field: 'certificatesUrls', deadline: member.additionalCertificatesDeadline });
          return (
            <div key={member.id} className="p-6 bg-white border border-gray-150 rounded-[2rem] shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100 shadow-sm">{member.fullName.charAt(0)}</div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{member.fullName}</h4>
                    <p className="text-[10px] text-gray-400 font-mono">IDX-{member.id?.slice(-6).toUpperCase()} • {member.category}</p>
                  </div>
                </div>
                <Link to={`/staff/${member.id}`} className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">View Profile</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item) => {
                  const isOverdue = item.deadline ? new Date(item.deadline) < new Date() : false;
                  const deadlineDate = item.deadline ? new Date(item.deadline).toLocaleDateString() : 'No deadline';
                  return (
                    <div key={item.label} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col justify-between gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-gray-900 uppercase tracking-wider">{item.label}</p>
                          <p className={cn('text-[9px] font-black uppercase tracking-widest mt-1', isOverdue ? 'text-red-500 animate-pulse' : 'text-amber-500')}>{isOverdue ? '⚠️ Overdue' : '⏳ Grace Period'} • {deadlineDate}</p>
                        </div>
                      </div>
                      <FileUpload path="staff/docs"
                        onUploadComplete={async (url) => {
                          if (item.field === 'certificatesUrls') await updateStaffMember(member.id!, { certificatesUrls: [url], additionalCertificatesAddLater: false });
                          else await updateStaffMember(member.id!, { [item.field]: url, [item.field.replace('Url', 'AddLater')]: false } as any);
                          refresh();
                        }}
                        showPreview={false} label={`Click to Upload ${item.label}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default StaffListPage;
