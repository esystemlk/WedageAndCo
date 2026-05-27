import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Droplets, Save, Truck, User, Plus, Trash2, Gauge, Wrench, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddModal, { QuickAddType } from '../../components/shared/QuickAddModal';
import { cn } from '../../lib/utils';
import { createOilTransaction, updateOilTransaction, getOilTransaction } from '../../services/oilStockService';
import { getInventoryItems, InventoryItem } from '../../services/inventoryService';
import { getVehicles } from '../../services/fleetService';
import { getStaffMembers } from '../../services/staffService';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';

const numOpt = z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined));

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  vehicleNo: z.string().min(1, 'Vehicle is required'),
  driverName: z.string().min(1, 'Driver is required'),
  issuingOfficer: z.string().min(1, 'Issuing officer is required'),
  stockItemId: z.string().min(1, 'Select oil/lubricant item'),
  itemName: z.string().optional(),
  oilType: z.string().optional(),
  oilGrade: z.string().optional(),
  openingStockL: numOpt,
  quantityIssuedMl: z.number({ required_error: 'Required' }).min(1, 'Must be > 0'),
  meterReading: numOpt,
  technicians: z.array(z.object({ name: z.string().optional() })).optional(),
  checkedByManager: z.boolean().default(false),
  managerName: z.string().optional(),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const OilIssueFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [oilItems, setOilItems] = useState<InventoryItem[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickAdd, setQuickAdd] = useState<{ type: QuickAddType; onCreated: (id: string, label: string) => void } | null>(null);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      quantityIssuedMl: 0,
      checkedByManager: false,
      technicians: [],
    }
  });

  const { fields: techFields, append: addTech, remove: removeTech } = useFieldArray({
    control,
    name: 'technicians'
  });

  const stockItemId = watch('stockItemId');
  const quantityMl = watch('quantityIssuedMl') || 0;
  const openingStockL = watch('openingStockL') || 0;
  const checkedByManager = watch('checkedByManager');

  const quantityL = quantityMl / 1000;
  const closingStockL = Math.max(0, openingStockL - quantityL);

  const selectedItem = oilItems.find(i => i.id === stockItemId);

  // Refresh reference data when an entity is quick-added
  useEffect(() => {
    if (refreshKey === 0) return;
    Promise.all([getVehicles(), getStaffMembers()]).then(([v, s]) => {
      setVehicles(v || []); setStaff(s || []);
    }).catch(console.error);
  }, [refreshKey]);

  useEffect(() => {
    const load = async () => {
      const [oi, v, s] = await Promise.all([
        getInventoryItems('lubricants'),
        getVehicles(),
        getStaffMembers()
      ]);
      setOilItems(oi || []);
      setVehicles(v || []);
      setStaff(s || []);

      if (id) {
        const tx = await getOilTransaction(id);
        if (tx) {
          Object.keys(tx).forEach(k => {
            if (k !== 'id' && k !== 'createdAt') setValue(k as any, (tx as any)[k]);
          });
        }
        setFetching(false);
      }
    };
    load();
  }, [id, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        quantityIssuedL: quantityL,
        closingStockL,
        openingStockL: data.openingStockL || 0,
        itemName: selectedItem?.name || data.itemName || '',
        oilType: selectedItem?.subCategory || data.oilType || '',
        oilGrade: selectedItem?.extended?.oilGrade || data.oilGrade || '',
        technicians: (data.technicians || []).filter(t => t.name?.trim()),
      };
      if (id) {
        await updateOilTransaction(id, payload as any);
      } else {
        await createOilTransaction(payload as any, user?.email || 'system');
      }
      navigate('/inventory');
    } catch (err) {
      console.error(err);
      alert('Failed to save oil issue record');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <LoadingSpinner />;

  const fieldCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-cyan-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400";
  const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest px-1";

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={id ? 'Edit Oil Issue' : 'Issue Oil / Lubricant'}
        subtitle="Record engine oil, gear oil, brake fluid, ATF or lubricant issue"
        back="/inventory"
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Droplets className="w-32 h-32 text-cyan-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 relative z-10">

          {/* Oil Item Selection */}
          <div className="space-y-4 p-6 bg-cyan-50 rounded-[2rem] border border-cyan-100">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Oil / Lubricant Stock Item</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={cn(labelCls, "text-cyan-700")}>Select Item *</label>
                <Controller control={control} name="stockItemId"
                  render={({ field }) => (
                    <SearchableSelect
                      options={oilItems.map(i => ({
                        value: i.id!,
                        label: i.name,
                        subLabel: `${i.currentStock} ${i.unitType} available · ${i.extended?.oilGrade || ''}`
                      }))}
                      value={field.value || ''}
                      onChange={v => {
                        field.onChange(v);
                        const item = oilItems.find(i => i.id === v);
                        if (item) {
                          setValue('openingStockL', item.currentStock || 0);
                          setValue('oilType', item.subCategory || '');
                          setValue('oilGrade', item.extended?.oilGrade || '');
                        }
                      }}
                      placeholder="Select oil/lubricant..."
                      icon={<Droplets className="w-4 h-4 text-cyan-600" />}
                    />
                  )}
                />
                {errors.stockItemId && <p className="text-[10px] font-bold text-red-500 px-1">{errors.stockItemId.message}</p>}
              </div>

              {selectedItem && (
                <div className="p-4 bg-white rounded-xl border border-cyan-200 space-y-2">
                  <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Selected Item Info</p>
                  <p className="font-bold text-gray-900 text-sm">{selectedItem.name}</p>
                  <div className="flex gap-4 text-[10px] font-bold text-gray-500 uppercase">
                    <span>Type: {selectedItem.subCategory || '—'}</span>
                    <span>Grade: {selectedItem.extended?.oilGrade || '—'}</span>
                    <span>Stock: {selectedItem.currentStock} {selectedItem.unitType}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle & Personnel */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Vehicle & Personnel</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className={labelCls}>Date *</label>
                <input type="date" {...register('date')} className={cn(fieldCls, errors.date && "border-red-400")} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Vehicle No.</label>
                <Controller control={control} name="vehicleNo"
                  render={({ field }) => (
                    <SearchableSelect
                      options={vehicles.map(v => ({ value: v.plateNo, label: v.plateNo, subLabel: v.type }))}
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select vehicle"
                      icon={<Truck className="w-4 h-4 text-indigo-600" />}
                      onAddNew={() => setQuickAdd({ type: 'vehicle', onCreated: (id, label) => { field.onChange(label); setRefreshKey(k => k + 1); } })}
                      addNewLabel="Add New Vehicle"
                    />
                  )}
                />
                {errors.vehicleNo && <p className="text-[10px] font-bold text-red-500 px-1">{errors.vehicleNo.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Driver Name</label>
                <Controller control={control} name="driverName"
                  render={({ field }) => (
                    <SearchableSelect
                      options={staff.filter(s => s.category === 'Driver').map(s => ({ value: s.fullName, label: s.fullName }))}
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select driver"
                      icon={<User className="w-4 h-4 text-indigo-600" />}
                      onAddNew={() => setQuickAdd({ type: 'driver', onCreated: (id, label) => { field.onChange(label); setRefreshKey(k => k + 1); } })}
                      addNewLabel="Add New Driver"
                    />
                  )}
                />
                {errors.driverName && <p className="text-[10px] font-bold text-red-500 px-1">{errors.driverName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Issuing Officer *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('issuingOfficer')} placeholder="Officer name"
                    className={cn(fieldCls, "pl-10", errors.issuingOfficer && "border-red-400")} />
                </div>
                {errors.issuingOfficer && <p className="text-[10px] font-bold text-red-500 px-1">{errors.issuingOfficer.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Meter Reading (km)</label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" step="1" {...register('meterReading', { valueAsNumber: true })}
                    placeholder="Current odometer" className={cn(fieldCls, "pl-10")} />
                </div>
              </div>
            </div>
          </div>

          {/* Stock & Quantity */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Stock & Issue Quantity</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-cyan-50/50 p-6 rounded-[2rem] border border-cyan-100">
              <div className="space-y-2">
                <label className={cn(labelCls, "text-cyan-700")}>Opening Stock (Litres)</label>
                <input type="number" step="0.001" {...register('openingStockL', { valueAsNumber: true })}
                  placeholder="Auto-filled from stock"
                  className={cn(fieldCls, "bg-white border-cyan-200")} />
              </div>
              <div className="space-y-2">
                <label className={cn(labelCls, "text-cyan-700")}>Issue Quantity (mL) *</label>
                <input type="number" step="1" {...register('quantityIssuedMl', { valueAsNumber: true })}
                  placeholder="e.g. 500, 1000, 4000"
                  className={cn(fieldCls, "bg-white border-cyan-200 text-cyan-900", errors.quantityIssuedMl && "border-red-400")} />
                {errors.quantityIssuedMl && <p className="text-[10px] font-bold text-red-500 px-1">{errors.quantityIssuedMl.message}</p>}
                {quantityMl > 0 && (
                  <p className="text-[10px] font-bold text-cyan-600 px-1">= {quantityL.toFixed(3)} Litres</p>
                )}
              </div>
              <div className="space-y-2">
                <label className={cn(labelCls, "text-cyan-700")}>Closing Stock (Auto)</label>
                <div className={cn(
                  "px-4 py-3 rounded-xl border-2 font-black text-xl",
                  closingStockL < (selectedItem?.minStockLevel || 0)
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                )}>
                  {closingStockL.toFixed(3)} L
                  {closingStockL < (selectedItem?.minStockLevel || 0) && (
                    <span className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Below Min Level</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Technicians */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-gray-500" />
                <label className={labelCls}>Technicians</label>
              </div>
              <button type="button" onClick={() => addTech({ name: '' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Technician
              </button>
            </div>
            {techFields.length === 0 && (
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-1">No technicians added</p>
            )}
            <div className="space-y-3">
              {techFields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Controller control={control} name={`technicians.${idx}.name`}
                      render={({ field: f }) => (
                        <SearchableSelect
                          options={staff.map(s => ({ value: s.fullName, label: s.fullName, subLabel: s.category }))}
                          value={f.value || ''}
                          onChange={f.onChange}
                          placeholder="Select or type technician name"
                          icon={<Wrench className="w-4 h-4 text-gray-400" />}
                          onAddNew={() => setQuickAdd({ type: 'staff', onCreated: (id, label) => { f.onChange(label); setRefreshKey(k => k + 1); } })}
                          addNewLabel="Add New Technician"
                        />
                      )}
                    />
                  </div>
                  <button type="button" onClick={() => removeTech(idx)}
                    className="p-2.5 bg-rose-50 border border-rose-100 text-rose-400 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Manager Check */}
          <div className="space-y-4 p-5 bg-emerald-50/40 border border-emerald-100 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest cursor-pointer" htmlFor="checkedByManager">
                  Checked by Manager
                </label>
              </div>
              <input type="checkbox" id="checkedByManager" {...register('checkedByManager')}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
            </div>
            {checkedByManager && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className={cn(labelCls, "text-emerald-700")}>Manager Name</label>
                <input {...register('managerName')} placeholder="Approving manager name"
                  className={cn(fieldCls, "bg-white border-emerald-200")} />
              </motion.div>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <label className={labelCls}>Remarks</label>
            <textarea {...register('remarks')} rows={2} placeholder="Any observations, condition notes, or special remarks..."
              className={cn(fieldCls, "resize-none")} />
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
            <button type="submit" disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-black px-12 py-4 rounded-xl transition-all shadow-xl shadow-cyan-500/10 flex items-center gap-3 disabled:bg-cyan-200 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Update Record' : 'Record Issue'}</span>
                  <Save className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

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

export default OilIssueFormPage;
