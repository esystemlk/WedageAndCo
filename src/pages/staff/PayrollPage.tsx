import React, { useState } from 'react';
import { useStaff } from '../../hooks/useStaff';
import { updateStaffMember, StaffMember } from '../../services/staffService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import FileUpload from '../../components/shared/FileUpload';
import { 
  DollarSign,
  User,
  ShieldAlert,
  Save,
  CheckCircle,
  XCircle,
  Briefcase,
  FileText,
  FileCheck,
  Download,
  AlertCircle,
  Truck,
  Shirt,
  Calendar,
  LogOut,
  Edit,
  ClipboardList,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { getMonthlySummary, getMealSettings, MealSettings } from '../../services/mealService';
import { generatePayslip } from '../../utils/generatePayslip';
import { useToast } from '../../contexts/ToastContext';

const PayrollPage: React.FC = () => {
  const { staff, loading, refresh } = useStaff();
  const toast = useToast();
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isOffboardingModalOpen, setIsOffboardingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Registry' | 'Uniforms' | 'Offboarding'>('Registry');

  // ── Meal deduction integration ─────────────────────────────────────────────
  const [mealSettings, setMealSettings] = useState<MealSettings | null>(null);
  const [mealCosts, setMealCosts] = useState<Record<string, { totalCost: number; mealDays: number }>>({});
  const now = new Date();
  const payMonth = now.getMonth() + 1;
  const payYear = now.getFullYear();

  React.useEffect(() => {
    (async () => {
      const s = await getMealSettings();
      setMealSettings(s);
      const rows = await getMonthlySummary(payYear, payMonth, (id) => {
        const m = staff.find(x => x.id === id);
        return m ? { name: m.fullName, department: m.department || '—' } : undefined;
      });
      const map: Record<string, { totalCost: number; mealDays: number }> = {};
      rows.forEach(r => { map[r.employeeId] = { totalCost: r.totalCost, mealDays: r.mealDays }; });
      setMealCosts(map);
    })();
  }, [staff.length]);

  const mealDeductionFor = (member: StaffMember): number => {
    if (!mealSettings || mealSettings.deductionMethod === 'none') return 0;
    if (!member.usesMeals) return 0;
    return mealCosts[member.id!]?.totalCost || 0;
  };

  const handleGeneratePayslip = (member: StaffMember) => {
    const meal = mealDeductionFor(member);
    generatePayslip({
      staff: member,
      month: payMonth,
      year: payYear,
      basicSalary: member.basicSalary || 0,
      deductions: meal > 0 ? [{ label: `Meal Deduction (${mealCosts[member.id!]?.mealDays || 0} days)`, amount: meal }] : [],
      generatedBy: 'Wedage & Company Payroll',
    });
    toast.success('Payslip generated', `${member.fullName}'s payslip PDF was downloaded.`);
  };

  // Offboarding form states
  const [resignationDate, setResignationDate] = useState('');
  const [leavingDate, setLeavingDate] = useState('');
  const [leavingReason, setLeavingReason] = useState('');
  const [resignationLetterUrl, setResignationLetterUrl] = useState('');
  const [uniformReturnChecklist, setUniformReturnChecklist] = useState({
    shirts: false,
    trousers: false,
    boots: false,
    cap: false
  });

  const handleSaveUniform = async (member: StaffMember, uniformProvided: boolean, uniformDetails?: any) => {
    try {
      await updateStaffMember(member.id!, {
        uniformProvided,
        // Save structured uniform information in metadata
        ...uniformDetails
      });
      toast.success('Uniform status updated', `${member.fullName}'s uniform record was saved.`);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Update failed', 'Could not update the uniform status.');
    }
  };

  const handleOpenOffboarding = (member: StaffMember) => {
    setSelectedStaff(member);
    setResignationDate('');
    setLeavingDate('');
    setLeavingReason('');
    setResignationLetterUrl('');
    setUniformReturnChecklist({
      shirts: false,
      trousers: false,
      boots: false,
      cap: false
    });
    setIsOffboardingModalOpen(true);
  };

  const handleOffboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !resignationDate || !leavingDate || !leavingReason) {
      toast.warning('Missing details', 'Please fill out all exit credentials.');
      return;
    }

    try {
      await updateStaffMember(selectedStaff.id!, {
        active: false,
        // Offboarding details
        resignationDate,
        leavingDate,
        leavingReason,
        resignationLetterUrl,
        uniformReturned: uniformReturnChecklist
      });
      setIsOffboardingModalOpen(false);
      toast.success('Offboarding complete', `${selectedStaff.fullName} has been offboarded.`);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Offboarding failed', 'Could not complete the offboarding. Please try again.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="Payroll, Uniforms & Offboarding" 
        subtitle="Manage salary credentials, EPF/ETF contributions, uniform inventory tracking, and personnel offboarding lists"
      />

      {/* Tabs */}
      <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-150 inline-flex items-center gap-2">
        {(['Registry', 'Uniforms', 'Offboarding'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === tab
                ? "bg-white text-indigo-600 shadow-sm border border-gray-100 font-bold"
                : "text-gray-400 hover:text-gray-600 border-transparent"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main View Grid */}
      <AnimatePresence mode="wait">
        {activeTab === 'Registry' && (
          <motion.div
            key="Registry"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-5 font-bold">Personnel & ID</th>
                    <th className="px-8 py-5 font-bold">Position</th>
                    <th className="px-8 py-5 font-bold">EPF / ETF No.</th>
                    <th className="px-8 py-5 font-bold">Meal Deduction</th>
                    <th className="px-8 py-5 font-bold">Net (Est.)</th>
                    <th className="px-8 py-5 font-bold text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-xs">
                  {staff.filter(s => s.active).map(member => {
                    const basic = member.basicSalary || 0;
                    const empEpf = basic * 0.08;
                    const emplyrEpf = basic * 0.12;
                    const emplyrEtf = basic * 0.03;

                    return (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100">
                              {member.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-gray-900">{member.fullName}</p>
                              <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">{member.staffId || `IDX-${member.id?.slice(-6).toUpperCase()}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-bold text-gray-600 uppercase tracking-tight">{member.position || 'Not Calibrated'}</span>
                        </td>
                        <td className="px-8 py-5 font-mono text-gray-500">
                          {member.epfNo || member.etfNo ? (
                            <div>
                              <p>EPF: {member.epfNo || 'N/A'}</p>
                              <p>ETF: {member.etfNo || 'N/A'}</p>
                            </div>
                          ) : 'Not Calibrated'}
                        </td>
                        <td className="px-8 py-5">
                          {(() => {
                            const meal = mealDeductionFor(member);
                            return meal > 0 ? (
                              <div>
                                <p className="font-black text-rose-600">- Rs. {meal.toLocaleString()}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{mealCosts[member.id!]?.mealDays || 0} meal days</p>
                              </div>
                            ) : member.usesMeals ? (
                              <span className="text-[9px] text-gray-300 italic uppercase">No meals this month</span>
                            ) : (
                              <span className="text-[9px] text-gray-300 italic uppercase">Not enrolled</span>
                            );
                          })()}
                        </td>
                        <td className="px-8 py-5 font-mono font-black text-gray-900">
                          Rs. {Math.max(0, basic - empEpf - mealDeductionFor(member)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            onClick={() => handleGeneratePayslip(member)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                            <Download className="w-3.5 h-3.5" /> Payslip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'Uniforms' && (
          <motion.div
            key="Uniforms"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {staff.filter(s => s.active).map(member => (
              <div key={member.id} className="bg-white border border-gray-150 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <Shirt className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 leading-tight">{member.fullName}</h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{member.position || member.category}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Uniform status</span>
                      <span className={cn(
                        "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg border",
                        member.uniformProvided ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {member.uniformProvided ? 'Issued' : 'Pending'}
                      </span>
                    </div>

                    {member.uniformProvided && (
                      <div className="pt-2 border-t border-gray-200 text-[10px] space-y-1 text-gray-650">
                        {(['shirts', 'trousers', 'boots', 'cap'] as const).map(part => {
                          const returned = member.uniformReturned?.[part];
                          return (
                            <p key={part} className="flex justify-between items-center capitalize">
                              <span className="font-bold">{part}:</span>
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide',
                                returned ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600',
                              )}>
                                {returned ? 'Returned' : 'Issued'}
                              </span>
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveUniform(member, !member.uniformProvided)}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      member.uniformProvided 
                        ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100" 
                        : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/10"
                    )}
                  >
                    {member.uniformProvided ? 'Revoke / Return Uniform' : 'Issue Full Uniform'}
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'Offboarding' && (
          <motion.div
            key="Offboarding"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Active Personnel for Offboarding */}
            <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Active Personnel Directory</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 font-bold">Personnel</th>
                      <th className="px-8 py-5 font-bold">Category</th>
                      <th className="px-8 py-5 font-bold">Position</th>
                      <th className="px-8 py-5 font-bold">Uniform status</th>
                      <th className="px-8 py-5 font-bold text-right">Initiate Exit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-xs">
                    {staff.filter(s => s.active).map(member => (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100">
                              {member.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-gray-900">{member.fullName}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{member.staffId || member.nicNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 uppercase text-[10px] font-black text-gray-400">{member.category}</td>
                        <td className="px-8 py-5 font-bold text-gray-600">{member.position || 'Not Calibrated'}</td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border",
                            member.uniformProvided ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-150"
                          )}>
                            {member.uniformProvided ? 'Uniform Held' : 'None'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            onClick={() => handleOpenOffboarding(member)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-colors rounded-xl text-[10px] font-black uppercase tracking-widest"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Offboard Member
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Offboarded / Left Personnel History */}
            <div className="bg-white border border-gray-250 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-150 bg-gray-50/50">
                <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest">Offboarded Personnel Archive</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 font-bold">Personnel</th>
                      <th className="px-8 py-5 font-bold">Resignation Date</th>
                      <th className="px-8 py-5 font-bold">Leaving Date</th>
                      <th className="px-8 py-5 font-bold">Leaving Reason</th>
                      <th className="px-8 py-5 font-bold">Uniform status</th>
                      <th className="px-8 py-5 font-bold text-right">Exit Document</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-xs text-gray-500">
                    {staff.filter(s => !s.active && (s as any).resignationDate).map(member => (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center font-bold text-xs border border-gray-200">
                              {member.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-gray-700 line-through">{member.fullName}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{member.staffId || member.nicNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 font-mono">{(member as any).resignationDate}</td>
                        <td className="px-8 py-5 font-mono">{(member as any).leavingDate}</td>
                        <td className="px-8 py-5 italic text-gray-500">"{(member as any).leavingReason}"</td>
                        <td className="px-8 py-5">
                          {(() => {
                            if (!member.uniformProvided) {
                              return <span className="px-2.5 py-1 bg-gray-50 text-gray-400 border border-gray-150 rounded-lg text-[9px] font-black uppercase tracking-widest">No Uniform</span>;
                            }
                            const ret = (member as any).uniformReturned || {};
                            const parts = ['shirts', 'trousers', 'boots', 'cap'];
                            const returned = parts.filter(p => ret[p]).length;
                            const all = returned === parts.length;
                            return (
                              <span className={cn(
                                'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border',
                                all ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : returned > 0 ? 'bg-amber-50 text-amber-600 border-amber-100'
                                  : 'bg-rose-50 text-rose-600 border-rose-100',
                              )}>
                                {all ? 'All Returned' : returned > 0 ? `${returned}/${parts.length} Returned` : 'Pending Return'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          {(member as any).resignationLetterUrl ? (
                            <a
                              href={(member as any).resignationLetterUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-[10px] font-black uppercase text-indigo-600"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Exit Letter
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-300 italic uppercase">Not Uploaded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {staff.filter(s => !s.active && (s as any).resignationDate).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-8 py-10 text-center text-gray-400 font-bold uppercase tracking-widest">
                          No offboarded personnel in system archives.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offboarding Modal */}
      <AnimatePresence>
        {isOffboardingModalOpen && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOffboardingModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-rose-50/50">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                  <h3 className="text-md font-black text-rose-600 uppercase tracking-tight">Onboard Out / Offboard Staff</h3>
                </div>
                <button onClick={() => setIsOffboardingModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleOffboardSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm">
                    {selectedStaff.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{selectedStaff.fullName}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{selectedStaff.position || selectedStaff.category}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Resignation Date</label>
                    <input
                      type="date"
                      value={resignationDate}
                      onChange={(e) => setResignationDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Leaving Date</label>
                    <input
                      type="date"
                      value={leavingDate}
                      onChange={(e) => setLeavingDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold text-sm text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Leaving Reason</label>
                  <textarea
                    value={leavingReason}
                    onChange={(e) => setLeavingReason(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold text-sm text-gray-900 resize-none"
                    placeholder="Enter resignation reason..."
                    required
                  />
                </div>

                {/* Resignation Letter Upload */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Resignation / Leaving Letter Copy</label>
                  <FileUpload
                    path="staff/offboarding"
                    onUploadComplete={(url) => setResignationLetterUrl(url)}
                    currentUrl={resignationLetterUrl}
                    label="Leaving Letter Copy"
                  />
                </div>

                {/* Uniform Return Checklist */}
                {selectedStaff.uniformProvided && (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-3">
                    <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Uniform Return Checklist</label>
                    <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uniformReturnChecklist.shirts}
                          onChange={(e) => setUniformReturnChecklist({...uniformReturnChecklist, shirts: e.target.checked})}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        Shirts Returned
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uniformReturnChecklist.trousers}
                          onChange={(e) => setUniformReturnChecklist({...uniformReturnChecklist, trousers: e.target.checked})}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        Trousers Returned
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uniformReturnChecklist.boots}
                          onChange={(e) => setUniformReturnChecklist({...uniformReturnChecklist, boots: e.target.checked})}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        Boots Returned
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uniformReturnChecklist.cap}
                          onChange={(e) => setUniformReturnChecklist({...uniformReturnChecklist, cap: e.target.checked})}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        Cap Returned
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOffboardingModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-250 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/10"
                  >
                    Confirm Offboard
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PayrollPage;
