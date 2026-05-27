import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Save,
  AlertCircle,
  Clock,
  User,
  Truck,
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  Navigation
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddModal, { QuickAddType } from '../../components/shared/QuickAddModal';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createGatePass, getGatePass, updateGatePass } from '../../services/gatePassService';
import { getVehicles } from '../../services/fleetService';
import { getStaffMembers } from '../../services/staffService';
import { getCustomers } from '../../services/customerService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { cn } from '../../lib/utils';

const gatePassSchema = z.object({
  linkedLogSheetNo: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  vehicleNo: z.string().min(1, 'Vehicle is required'),
  driverName: z.string().min(1, 'Driver is required'),
  repName: z.string().optional(),
  helperNames: z.array(z.object({ name: z.string().optional() })).optional(),
  customerName: z.string().optional().or(z.literal('')),
  tripType: z.enum(['Customer', 'Test Run', 'Other']).optional(),
  reason: z.string().optional(),
  timeOut: z.string().min(1, 'Time Out is required'),
  meterOut: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v),
  securityOfficer: z.string().min(1, 'Security Officer name is required'),
  remarks: z.string().optional(),
  status: z.enum(['Open', 'Returned', 'Cancelled']),
  timeIn: z.string().optional(),
  meterIn: z.number().optional().or(z.literal(null)).or(z.literal('')).transform(v => (v === null || v === '') ? undefined : typeof v === 'string' ? parseFloat(v) : v),
  invoiceNotAvailable: z.boolean().optional(),
  invoiceNo: z.string().optional(),
  invoiceReason: z.string().optional(),
  managerApproved: z.boolean().optional(),
  securityApproved: z.boolean().optional(),
  managerApprovedBy: z.string().optional(),
  securityApprovedBy: z.string().optional(),
})
.refine(data => {
  if (data.tripType === 'Customer' && !data.customerName?.trim()) return false;
  return true;
}, { message: 'Customer is required for customer trips', path: ['customerName'] })
.refine(data => {
  if ((data.tripType === 'Test Run' || data.tripType === 'Other') && !data.reason?.trim()) return false;
  return true;
}, { message: 'Reason is required', path: ['reason'] })
.refine(data => {
  if (!data.invoiceNotAvailable && !data.invoiceNo?.trim()) return false;
  return true;
}, { message: 'Invoice No is required', path: ['invoiceNo'] })
.refine(data => {
  if (data.invoiceNotAvailable && !data.invoiceReason?.trim()) return false;
  return true;
}, { message: 'Reason for no invoice is required', path: ['invoiceReason'] });

type GatePassFormData = z.infer<typeof gatePassSchema>;

function formatTime(date: Date) {
  let hours = date.getHours();
  let minutes: string | number = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return hours + ':' + minutes + ' ' + ampm;
}

const GatePassFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickAdd, setQuickAdd] = useState<{ type: QuickAddType; onCreated: (id: string, label: string) => void } | null>(null);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<GatePassFormData>({
    resolver: zodResolver(gatePassSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: 'Open',
      timeOut: formatTime(new Date()),
      helperNames: [],
      customerName: '',
      invoiceNotAvailable: false,
      invoiceNo: '',
      invoiceReason: '',
      managerApproved: false,
      securityApproved: false,
      managerApprovedBy: '',
      securityApprovedBy: ''
    }
  });

  const { fields: helperFields, append: addHelper, remove: removeHelper } = useFieldArray({
    control,
    name: 'helperNames'
  });

  const invoiceNotAvailable = watch('invoiceNotAvailable');
  const tripType = watch('tripType');

  // Refresh reference data when an entity is quick-added
  useEffect(() => {
    if (refreshKey === 0) return;
    Promise.all([getVehicles(), getStaffMembers(), getCustomers()]).then(([v, s, c]) => {
      setVehicles(v || []); setStaff(s || []); setCustomers(c || []);
    }).catch(console.error);
  }, [refreshKey]);

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [vData, sData, cData] = await Promise.all([getVehicles(), getStaffMembers(), getCustomers()]);
        setVehicles(vData || []);
        setStaff(sData || []);
        setCustomers(cData || []);

        if (id) {
          const pass = await getGatePass(id);
          if (pass) {
            Object.keys(pass).forEach((key) => {
              if (key !== 'id' && key !== 'createdAt') {
                setValue(key as any, (pass as any)[key]);
              }
            });

            // Backward compat: old single helperName → array
            const oldHelper = (pass as any).helperName;
            if (oldHelper && typeof oldHelper === 'string' && oldHelper.trim()) {
              setValue('helperNames', [{ name: oldHelper }]);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    loadDependencies();
  }, [id, setValue]);

  const onSubmit = async (data: GatePassFormData) => {
    setLoading(true);
    try {
      if (id) {
        await updateGatePass(id, data as any);
      } else {
        await createGatePass(data as any);
      }
      navigate('/security');
    } catch (err) {
      console.error(err);
      alert('Security logic failure: Could not commit gate pass record.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <LoadingSpinner />;

  return (
    <div className="space-y-10 group/page pb-20">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/security')}
          className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={id ? 'Authorize Return' : 'Vehicle In/Out Entry'}
          subtitle={id ? 'Finalizing vehicle return movement' : 'Record vehicle yard movement'}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">

          {/* Movement Authorization */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-10 shadow-xl shadow-gray-200/50">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Movement Authorization</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            {/* Row 1: Date + Log Sheet (optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Clock className="w-3 h-3 text-indigo-600" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Movement Date</label>
                </div>
                <input
                  type="date"
                  {...register('date')}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm [color-scheme:light] shadow-sm shadow-inner"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <FileText className="w-3 h-3 text-indigo-600" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Log Sheet No <span className="text-gray-300">(Optional)</span></label>
                </div>
                <input
                  type="text"
                  {...register('linkedLogSheetNo')}
                  placeholder="e.g. LS-2026-1102"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-300 shadow-sm shadow-inner"
                />
              </div>
            </div>

            {/* Row 2: Vehicle + Driver */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Truck className="w-3 h-3 text-indigo-600" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle No</label>
                </div>
                <Controller
                  control={control}
                  name="vehicleNo"
                  render={({ field }) => (
                    <SearchableSelect
                      options={vehicles.map(v => ({ value: v.plateNo, label: v.plateNo, subLabel: v.type }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select Vehicle"
                      icon={<Truck className="w-4 h-4 text-indigo-600" />}
                      onAddNew={() => setQuickAdd({ type: 'vehicle', onCreated: (id, label) => { field.onChange(label); setRefreshKey(k => k + 1); } })}
                      addNewLabel="Add New Vehicle"
                    />
                  )}
                />
                {errors.vehicleNo && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.vehicleNo.message}</p>}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <User className="w-3 h-3 text-indigo-600" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Driver Name</label>
                </div>
                <Controller
                  control={control}
                  name="driverName"
                  render={({ field }) => (
                    <SearchableSelect
                      options={staff.filter(s => s.category === 'Driver').map(s => ({ value: s.fullName, label: s.fullName, subLabel: s.phone }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select Driver"
                      icon={<User className="w-4 h-4 text-indigo-600" />}
                      onAddNew={() => setQuickAdd({ type: 'driver', onCreated: (id, label) => { field.onChange(label); setRefreshKey(k => k + 1); } })}
                      addNewLabel="Add New Driver"
                    />
                  )}
                />
                {errors.driverName && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.driverName.message}</p>}
              </div>
            </div>

            {/* Row 3: Rep Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <User className="w-3 h-3 text-indigo-600" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rep Name <span className="text-gray-300">(Optional)</span></label>
                </div>
                <Controller
                  control={control}
                  name="repName"
                  render={({ field }) => (
                    <SearchableSelect
                      options={staff.map(s => ({ value: s.fullName, label: s.fullName, subLabel: s.category }))}
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select Rep"
                      icon={<User className="w-4 h-4 text-indigo-600" />}
                    />
                  )}
                />
              </div>
            </div>

            {/* Helpers — dynamic */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-indigo-600" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Helpers</label>
                </div>
                <button
                  type="button"
                  onClick={() => addHelper({ name: '' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Helper
                </button>
              </div>

              {helperFields.length === 0 && (
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-1">No helpers assigned</p>
              )}

              <div className="space-y-3">
                {helperFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Controller
                        control={control}
                        name={`helperNames.${idx}.name`}
                        render={({ field: f }) => (
                          <SearchableSelect
                            options={staff.filter(s => s.category === 'Helper').map(s => ({ value: s.fullName, label: s.fullName, subLabel: s.phone }))}
                            value={f.value || ''}
                            onChange={f.onChange}
                            placeholder="Select or type helper name"
                            icon={<User className="w-4 h-4 text-indigo-600" />}
                            onAddNew={() => setQuickAdd({ type: 'helper', onCreated: (id, label) => { f.onChange(label); setRefreshKey(k => k + 1); } })}
                            addNewLabel="Add New Helper"
                          />
                        )}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeHelper(idx)}
                      className="p-2.5 bg-rose-50 border border-rose-100 text-rose-400 rounded-xl hover:bg-rose-100 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Trip Type / Purpose */}
            <div className="pt-6 border-t border-gray-100 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Navigation className="w-3 h-3 text-indigo-600" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trip Purpose</label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['Customer', 'Test Run', 'Other'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue('tripType', t)}
                      className={cn(
                        "py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        tripType === t
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer dropdown — when tripType === Customer */}
              {tripType === 'Customer' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <User className="w-3 h-3 text-indigo-600" />
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</label>
                  </div>
                  <Controller
                    control={control}
                    name="customerName"
                    render={({ field }) => (
                      <SearchableSelect
                        options={customers.map(c => ({ value: c.nickname || c.name, label: c.name, subLabel: c.nickname || undefined }))}
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Select Customer"
                        icon={<User className="w-4 h-4 text-indigo-600" />}
                        onAddNew={() => setQuickAdd({ type: 'customer', onCreated: (id, label) => { field.onChange(label); setRefreshKey(k => k + 1); } })}
                        addNewLabel="Add New Customer"
                      />
                    )}
                  />
                  {errors.customerName && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.customerName.message}</p>}
                </motion.div>
              )}

              {/* Mandatory reason — when tripType is Test Run or Other */}
              {(tripType === 'Test Run' || tripType === 'Other') && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                  <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">
                    Reason <span className="text-rose-400">(Required)</span>
                  </label>
                  <textarea
                    {...register('reason')}
                    rows={3}
                    placeholder={tripType === 'Test Run' ? 'e.g. Pre-delivery refrigeration test' : 'Specify the purpose of this movement'}
                    className={cn(
                      "w-full px-6 py-4 bg-rose-50/30 border border-rose-100 rounded-2xl focus:ring-1 focus:ring-rose-500/50 outline-none transition-all font-bold text-gray-900 text-sm resize-none shadow-sm",
                      errors.reason && "border-rose-400 bg-rose-50"
                    )}
                  />
                  {errors.reason && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.reason.message}</p>}
                </motion.div>
              )}
            </div>

            {/* Invoice & Billing Section */}
            <div className="pt-6 border-t border-gray-100 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Invoice & Billing Verification</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-widest">Enforce financial clearance at yard departure</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer select-none" htmlFor="invoiceNotAvailable">Invoice Not Available</label>
                  <input
                    type="checkbox"
                    id="invoiceNotAvailable"
                    {...register('invoiceNotAvailable')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </div>
              </div>

              {!invoiceNotAvailable ? (
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Invoice Number</label>
                  <input
                    type="text"
                    {...register('invoiceNo')}
                    placeholder="e.g. INV-10492"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-300 shadow-sm"
                  />
                  {errors.invoiceNo && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.invoiceNo.message}</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Reason for No Invoice</label>
                  <input
                    type="text"
                    {...register('invoiceReason')}
                    placeholder="Specify release justification reason"
                    className="w-full px-6 py-4 bg-rose-50/30 border border-rose-100 rounded-2xl focus:ring-1 focus:ring-rose-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-rose-300 shadow-sm"
                  />
                  {errors.invoiceReason && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.invoiceReason.message}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Observation & Meter Data */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-10 shadow-xl shadow-gray-200/50">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Yard Times & Meter Data</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Yard Out Time</label>
                <input
                  type="text"
                  {...register('timeOut')}
                  placeholder="HH:MM AM/PM"
                  className="w-full px-6 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-bold text-gray-900 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Yard In Time</label>
                <input
                  type="text"
                  {...register('timeIn')}
                  placeholder="HH:MM AM/PM"
                  disabled={watch('status') !== 'Returned'}
                  className="w-full px-6 py-4 bg-rose-50 border border-rose-100 rounded-2xl focus:ring-1 focus:ring-rose-500/50 outline-none transition-all font-bold text-gray-900 text-sm disabled:opacity-30 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Meter Out</label>
                <input
                  type="number"
                  {...register('meterOut', { valueAsNumber: true })}
                  placeholder="00.00"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-mono font-black text-gray-900 text-sm shadow-sm shadow-inner"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Meter In</label>
                <input
                  type="number"
                  {...register('meterIn')}
                  placeholder="00.00"
                  disabled={watch('status') !== 'Returned'}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-mono font-black text-gray-900 text-sm disabled:opacity-30 shadow-sm shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
              <select
                {...register('status')}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm appearance-none cursor-pointer shadow-sm shadow-inner"
              >
                <option value="Open">Open</option>
                <option value="Returned">Returned</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-10 shadow-xl shadow-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">Security Protocol</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Entry Validation</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Security Officer</label>
                <input
                  type="text"
                  {...register('securityOfficer')}
                  placeholder="Officer Name"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm shadow-sm shadow-inner"
                />
                {errors.securityOfficer && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.securityOfficer.message}</p>}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Audit Notes</label>
                <textarea
                  {...register('remarks')}
                  rows={4}
                  placeholder="e.g. Inspect vehicle for damage"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm resize-none uppercase shadow-sm shadow-inner"
                />
              </div>
            </div>

            {/* System Approvals */}
            <div className="pt-6 border-t border-gray-100 space-y-6">
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.25em]">System Approvals</h4>

              <div className="space-y-4 p-5 bg-emerald-50/20 border border-emerald-100/50 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-emerald-700 uppercase tracking-wider cursor-pointer" htmlFor="managerApproved">Manager Approval</label>
                  <input
                    type="checkbox"
                    id="managerApproved"
                    {...register('managerApproved')}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                </div>
                {watch('managerApproved') && (
                  <div className="space-y-2">
                    <label className="block text-[8px] font-black text-emerald-600 uppercase tracking-wider px-0.5">Approved By Manager Name</label>
                    <input
                      type="text"
                      {...register('managerApprovedBy')}
                      placeholder="Manager Name"
                      className="w-full px-4 py-2 text-xs bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 p-5 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider cursor-pointer" htmlFor="securityApproved">Security Clearance</label>
                  <input
                    type="checkbox"
                    id="securityApproved"
                    {...register('securityApproved')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </div>
                {watch('securityApproved') && (
                  <div className="space-y-2">
                    <label className="block text-[8px] font-black text-indigo-600 uppercase tracking-wider px-0.5">Security Approved By Name</label>
                    <input
                      type="text"
                      {...register('securityApprovedBy')}
                      placeholder="Security Officer / Yard Head"
                      className="w-full px-4 py-2 text-xs bg-white border border-indigo-100 rounded-xl outline-none font-bold text-gray-900"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-indigo-100 active:scale-95"
            >
              {loading ? <LoadingSpinner /> : (
                <>
                  <Save className="w-4 h-4" />
                  Commit Entry
                </>
              )}
            </button>
          </div>

          {(errors.vehicleNo || errors.driverName || errors.securityOfficer || errors.customerName || errors.reason) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Entry Errors</h4>
              </div>
              <ul className="space-y-1 list-disc list-inside text-[10px] font-bold text-rose-500/70 uppercase tracking-wider pl-1">
                {errors.vehicleNo && <li>Vehicle selection required</li>}
                {errors.driverName && <li>Driver assignment required</li>}
                {errors.securityOfficer && <li>Recording officer name required</li>}
                {errors.customerName && <li>Customer selection required for customer trips</li>}
                {errors.reason && <li>Reason is required for this trip type</li>}
              </ul>
            </motion.div>
          )}
        </div>
      </form>
      <AnimatePresence>
        {quickAdd && (
          <QuickAddModal
            type={quickAdd.type}
            onCreated={(id, label) => { quickAdd.onCreated(id, label); setQuickAdd(null); }}
            onClose={() => setQuickAdd(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GatePassFormPage;
