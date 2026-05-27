import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ClipboardCheck, Truck, Wrench, Plus, Trash2, Save, Clock,
  User, AlertCircle, Package, ShoppingBag, CheckCircle2, StickyNote,
  Calendar, Gauge, Hash, UserCheck, Shield, Users
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddModal, { QuickAddType } from '../../components/shared/QuickAddModal';
import { cn } from '../../lib/utils';
import {
  createJobCard, updateJobCard, getJobCard, generateWorkOrderNo, JobCardStatus
} from '../../services/jobCardService';
import { useFleet } from '../../hooks/useFleet';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';

const stockItemSchema = z.object({
  stockItemId: z.string().optional(),
  itemName: z.string().min(1, 'Item name required'),
  quantity: z.number({ invalid_type_error: 'Enter quantity' }).min(0.01),
  unit: z.string().optional(),
});

const outsideItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  quantity: z.number({ invalid_type_error: 'Enter quantity' }).min(0.01),
  unit: z.string().optional(),
  unitCost: z.number({ invalid_type_error: 'Enter cost' }).min(0).optional(),
});

const jobCardSchema = z.object({
  workOrderNo: z.string().min(1),
  date: z.string().min(1, 'Date required'),
  time: z.string().optional(),
  vehicleId: z.string().min(1, 'Vehicle required'),
  vehicleNo: z.string().optional(),
  meterReading: z.number({ invalid_type_error: 'Enter meter reading' }).min(0).optional(),
  technicianName: z.string().min(1, 'Technician name required'),
  estimatedHrs: z.number({ invalid_type_error: 'Enter hours' }).min(0).optional(),
  recentDriverName: z.string().optional(),
  problemDescription: z.array(z.object({ text: z.string() })),
  itemsFromStock: z.array(stockItemSchema),
  itemsFromOutside: z.array(outsideItemSchema),
  solutionDescription: z.array(z.object({ text: z.string() })),
  notes: z.string().optional(),
  completeDate: z.string().optional(),
  completeTime: z.string().optional(),
  actualHrs: z.number({ invalid_type_error: 'Enter hours' }).min(0).optional(),
  preparedBy: z.string().optional(),
  authorizedTechnician: z.string().optional(),
  yardSupervisor: z.string().optional(),
  headOfLogistic: z.string().optional(),
  status: z.enum(['open', 'in-progress', 'completed']),
});

type JobCardForm = z.infer<typeof jobCardSchema>;

const UNITS = ['pcs', 'L', 'mL', 'kg', 'g', 'set', 'pair', 'bottle', 'can', 'box', 'roll', 'sheet', 'm'];

const SectionHeader: React.FC<{ icon: React.FC<any>; title: string; color: string; count?: number }> = ({ icon: Icon, title, color, count }) => (
  <div className={cn("flex items-center gap-3 pb-4 border-b mb-6", `border-${color}-100`)}>
    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", `bg-${color}-50 border border-${color}-100`)}>
      <Icon className={cn("w-4 h-4", `text-${color}-500`)} />
    </div>
    <div>
      <h3 className={cn("text-xs font-black uppercase tracking-[0.2em]", `text-${color}-600`)}>{title}</h3>
      {count !== undefined && (
        <p className="text-[9px] text-gray-400 font-bold mt-0.5">{count} {count === 1 ? 'entry' : 'entries'}</p>
      )}
    </div>
  </div>
);

const JobCardFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vehicles, refresh: refreshVehicles } = useFleet();
  const [quickAdd, setQuickAdd] = useState<{ type: QuickAddType; onCreated: (id: string, label: string) => void } | null>(null);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<JobCardForm>({
    resolver: zodResolver(jobCardSchema),
    defaultValues: {
      workOrderNo: generateWorkOrderNo(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      status: 'open',
      problemDescription: [{ text: '' }],
      itemsFromStock: [],
      itemsFromOutside: [],
      solutionDescription: [{ text: '' }],
      preparedBy: user?.email || '',
    }
  });

  const problems = useFieldArray({ control, name: 'problemDescription' });
  const stockItems = useFieldArray({ control, name: 'itemsFromStock' });
  const outsideItems = useFieldArray({ control, name: 'itemsFromOutside' });
  const solutions = useFieldArray({ control, name: 'solutionDescription' });

  const selectedVehicleId = watch('vehicleId');
  const status = watch('status');

  // Auto-fill vehicleNo when vehicle changes
  useEffect(() => {
    const v = vehicles.find(v => v.id === selectedVehicleId);
    if (v) setValue('vehicleNo', v.plateNo);
  }, [selectedVehicleId, vehicles, setValue]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await getJobCard(id);
        if (data) {
          Object.entries(data).forEach(([k, v]) => {
            if (k !== 'id' && k !== 'createdAt') setValue(k as any, v);
          });
          if (!data.problemDescription?.length) problems.replace([{ text: '' }]);
          if (!data.solutionDescription?.length) solutions.replace([{ text: '' }]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [id]);

  const onSubmit = async (data: JobCardForm) => {
    try {
      setSaving(true);
      const payload = {
        ...data,
        vehicleNo: data.vehicleNo || vehicles.find(v => v.id === data.vehicleId)?.plateNo || '',
        problemDescription: data.problemDescription.filter(p => p.text.trim()),
        solutionDescription: data.solutionDescription.filter(s => s.text.trim()),
      } as any;
      if (id) {
        await updateJobCard(id, payload);
      } else {
        await createJobCard(payload);
      }
      navigate('/garage/job-cards');
    } catch (err) {
      console.error(err);
      alert('Failed to save job card');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) return <LoadingSpinner />;

  const outsideTotalCost = watch('itemsFromOutside')?.reduce((sum, item) => {
    const cost = (item.unitCost || 0) * (item.quantity || 0);
    return sum + cost;
  }, 0) || 0;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={id ? 'Edit Job Card' : 'New Vehicle Repair Job Card'}
        subtitle="Vehicle Repair Job Card — Garage Operations"
        back="/garage/job-cards"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Header Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden"
        >
          {/* Title bar */}
          <div className="bg-gray-900 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5 text-white/60" />
              <span className="text-white font-black text-sm uppercase tracking-[0.2em]">Vehicle Repair Job Card</span>
            </div>
            <div className="flex items-center gap-3">
              {(['open', 'in-progress', 'completed'] as JobCardStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setValue('status', s)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    status === s
                      ? s === 'open' ? 'bg-amber-500 text-white'
                        : s === 'in-progress' ? 'bg-blue-500 text-white'
                        : 'bg-emerald-500 text-white'
                      : 'bg-white/10 text-white/40 hover:bg-white/20'
                  )}
                >
                  {s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Row 1: Work Order, Date, Time */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Hash className="w-3 h-3" /> W. Order No.
                </label>
                <input
                  {...register('workOrderNo')}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-sm text-gray-900 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date
                </label>
                <input
                  {...register('date')}
                  type="date"
                  className={cn(
                    "w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-indigo-400",
                    errors.date ? 'border-red-400' : 'border-gray-200'
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Time
                </label>
                <input
                  {...register('time')}
                  type="time"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Meter Reading
                </label>
                <input
                  {...register('meterReading', { valueAsNumber: true })}
                  type="number"
                  placeholder="km"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Row 2: Vehicle, Technician, Est Hrs, Driver */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Vehicle
                </label>
                <Controller
                  control={control}
                  name="vehicleId"
                  render={({ field }) => (
                    <SearchableSelect
                      options={vehicles.map(v => ({ value: v.id!, label: v.plateNo, subLabel: v.type }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select vehicle"
                      icon={<Truck className="w-4 h-4 text-indigo-500" />}
                      onAddNew={() => setQuickAdd({ type: 'vehicle', onCreated: (id, label) => { field.onChange(id); setValue('vehicleNo', label); refreshVehicles(); } })}
                      addNewLabel="Add New Vehicle"
                    />
                  )}
                />
                {errors.vehicleId && <p className="text-[9px] text-red-500 font-bold">{errors.vehicleId.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <User className="w-3 h-3" /> Recent Driver Name
                </label>
                <input
                  {...register('recentDriverName')}
                  placeholder="Driver name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-indigo-400 placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Technician Name
                </label>
                <input
                  {...register('technicianName')}
                  placeholder="Lead technician"
                  className={cn(
                    "w-full px-4 py-3 bg-gray-50 border rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-indigo-400 placeholder:text-gray-400",
                    errors.technicianName ? 'border-red-400' : 'border-gray-200'
                  )}
                />
                {errors.technicianName && <p className="text-[9px] text-red-500 font-bold">{errors.technicianName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Estimated Hours
                </label>
                <input
                  {...register('estimatedHrs', { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  placeholder="e.g. 2.5"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-indigo-400 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Problem Description ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8"
        >
          <SectionHeader icon={AlertCircle} title="Problem Description" color="red" count={problems.fields.length} />
          <div className="space-y-3">
            {problems.fields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-red-50 border border-red-100 text-red-400 text-[9px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                <input
                  {...register(`problemDescription.${idx}.text`)}
                  placeholder={`Problem ${idx + 1}...`}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm text-gray-900 focus:outline-none focus:border-red-300 placeholder:text-gray-400"
                />
                {problems.fields.length > 1 && (
                  <button type="button" onClick={() => problems.remove(idx)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => problems.append({ text: '' })}
              className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors mt-1">
              <Plus className="w-3.5 h-3.5" /> Add Problem
            </button>
          </div>
        </motion.div>

        {/* ─── Items From Stock ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8"
        >
          <SectionHeader icon={Package} title="Items From Stock" color="indigo" count={stockItems.fields.length} />
          {stockItems.fields.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Item Name</span>
                <span className="col-span-3">Qty</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-1"></span>
              </div>
              <div className="space-y-2">
                {stockItems.fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-1 text-[10px] font-black text-gray-300 text-center">{idx + 1}</span>
                    <input
                      {...register(`itemsFromStock.${idx}.itemName`)}
                      placeholder="Item name"
                      className="col-span-5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-indigo-300 placeholder:text-gray-400"
                    />
                    <input
                      {...register(`itemsFromStock.${idx}.quantity`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="col-span-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-indigo-300 placeholder:text-gray-400"
                    />
                    <select
                      {...register(`itemsFromStock.${idx}.unit`)}
                      className="col-span-2 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-300 appearance-none"
                    >
                      <option value="">—</option>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button type="button" onClick={() => stockItems.remove(idx)}
                      className="col-span-1 p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={() => stockItems.append({ itemName: '', quantity: 1, unit: 'pcs' })}
            className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Stock Item
          </button>
        </motion.div>

        {/* ─── Items From Outside ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8"
        >
          <SectionHeader icon={ShoppingBag} title="Items From Outside" color="amber" count={outsideItems.fields.length} />
          {outsideItems.fields.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2">
                <span className="col-span-1">#</span>
                <span className="col-span-4">Description</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-2">Unit</span>
                <span className="col-span-2">Unit Cost (LKR)</span>
                <span className="col-span-1"></span>
              </div>
              <div className="space-y-2">
                {outsideItems.fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-1 text-[10px] font-black text-gray-300 text-center">{idx + 1}</span>
                    <input
                      {...register(`itemsFromOutside.${idx}.description`)}
                      placeholder="Item description"
                      className="col-span-4 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-amber-300 placeholder:text-gray-400"
                    />
                    <input
                      {...register(`itemsFromOutside.${idx}.quantity`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="0"
                      className="col-span-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-300 placeholder:text-gray-400"
                    />
                    <select
                      {...register(`itemsFromOutside.${idx}.unit`)}
                      className="col-span-2 px-2 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-amber-300 appearance-none"
                    >
                      <option value="">—</option>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input
                      {...register(`itemsFromOutside.${idx}.unitCost`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="col-span-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-300 placeholder:text-gray-400"
                    />
                    <button type="button" onClick={() => outsideItems.remove(idx)}
                      className="col-span-1 p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {outsideTotalCost > 0 && (
                <div className="mt-4 flex justify-end">
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-right">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Total Outside Cost</p>
                    <p className="text-lg font-black text-gray-900 mt-0.5">
                      LKR {outsideTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={() => outsideItems.append({ description: '', quantity: 1, unit: 'pcs', unitCost: 0 })}
            className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest hover:text-amber-600 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Outside Item
          </button>
        </motion.div>

        {/* ─── Solution Description ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8"
        >
          <SectionHeader icon={CheckCircle2} title="Solution Description" color="emerald" count={solutions.fields.length} />
          <div className="space-y-3">
            {solutions.fields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-400 text-[9px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                <input
                  {...register(`solutionDescription.${idx}.text`)}
                  placeholder={`Solution step ${idx + 1}...`}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm text-gray-900 focus:outline-none focus:border-emerald-300 placeholder:text-gray-400"
                />
                {solutions.fields.length > 1 && (
                  <button type="button" onClick={() => solutions.remove(idx)}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => solutions.append({ text: '' })}
              className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors mt-1">
              <Plus className="w-3.5 h-3.5" /> Add Solution
            </button>
          </div>
        </motion.div>

        {/* ─── Notes ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8"
        >
          <SectionHeader icon={StickyNote} title="Notes" color="violet" />
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Additional notes, observations, or instructions..."
            className="w-full px-5 py-4 bg-violet-50/50 border border-violet-100 rounded-2xl font-medium text-sm text-gray-900 focus:outline-none focus:border-violet-300 placeholder:text-gray-400 resize-none"
          />
        </motion.div>

        {/* ─── Completion Details ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8"
        >
          <SectionHeader icon={CheckCircle2} title="Completion Details" color="blue" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Complete Date
              </label>
              <input
                {...register('completeDate')}
                type="date"
                className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-3 h-3" /> Complete Time
              </label>
              <input
                {...register('completeTime')}
                type="time"
                className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-3 h-3" /> Actual Hours
              </label>
              <input
                {...register('actualHrs', { valueAsNumber: true })}
                type="number"
                step="0.5"
                placeholder="e.g. 3.5"
                className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-blue-400 placeholder:text-gray-400"
              />
            </div>
          </div>
        </motion.div>

        {/* ─── Signatures ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white rounded-[2rem] border border-gray-200 shadow-sm p-8"
        >
          <SectionHeader icon={Users} title="Authorizations & Signatures" color="gray" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'preparedBy', label: 'Prepared By', icon: User },
              { name: 'authorizedTechnician', label: 'Authorized Technician', icon: Wrench },
              { name: 'yardSupervisor', label: 'Yard Supervisor', icon: UserCheck },
              { name: 'headOfLogistic', label: 'Head of Logistic', icon: Shield },
            ].map(({ name, label, icon: Icon }) => (
              <div key={name} className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {label}
                </label>
                <input
                  {...register(name as any)}
                  placeholder={label}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-900 focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── Submit ─── */}
        <div className="flex items-center justify-between pb-8">
          <button
            type="button"
            onClick={() => navigate('/garage/job-cards')}
            className="px-8 py-3.5 rounded-xl border border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-gray-900 hover:bg-gray-800 text-white font-black px-10 py-3.5 rounded-xl transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 group"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="uppercase tracking-[0.2em] text-xs">{id ? 'Update Job Card' : 'Save Job Card'}</span>
              </>
            )}
          </button>
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

export default JobCardFormPage;
