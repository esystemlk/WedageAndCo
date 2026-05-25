import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Fuel, Save, Truck, User, MapPin, Clock, AlertTriangle, Gauge, Droplets
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { createFuelTransaction, updateFuelTransaction, getFuelTransaction } from '../../services/fuelStockService';
import { getInventoryItems, InventoryItem } from '../../services/inventoryService';
import { getVehicles } from '../../services/fleetService';
import { getStaffMembers } from '../../services/staffService';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  vehicleNo: z.string().min(1, 'Vehicle is required'),
  driverName: z.string().min(1, 'Driver is required'),
  location: z.string().optional(),
  issuingOfficer: z.string().min(1, 'Issuing officer is required'),
  fuelType: z.enum(['diesel', 'petrol']),
  vehiclePrevMeterReading: z.number({ required_error: 'Required' }).min(0),
  vehicleCurrentMeterReading: z.number({ required_error: 'Required' }).min(0),
  tankMeterReadingBefore: z.number({ required_error: 'Required' }).min(0),
  quantityIssuedL: z.number({ required_error: 'Required' }).min(0.1, 'Must be > 0'),
  stockItemId: z.string().min(1, 'Select fuel stock item'),
  itemName: z.string().optional(),
  notes: z.string().optional(),
}).refine(d => d.vehicleCurrentMeterReading >= d.vehiclePrevMeterReading, {
  message: 'Current meter must be ≥ previous meter',
  path: ['vehicleCurrentMeterReading'],
}).refine(d => d.quantityIssuedL <= d.tankMeterReadingBefore, {
  message: 'Cannot issue more than tank level',
  path: ['quantityIssuedL'],
});

type FormData = z.infer<typeof schema>;

function formatTime(d: Date) {
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m < 10 ? '0' + m : m} ${ampm}`;
}

const FuelIssueFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [fuelItems, setFuelItems] = useState<InventoryItem[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: formatTime(new Date()),
      fuelType: 'diesel',
      vehiclePrevMeterReading: 0,
      vehicleCurrentMeterReading: 0,
      tankMeterReadingBefore: 0,
      quantityIssuedL: 0,
    }
  });

  const stockItemId = watch('stockItemId');
  const tankBefore = watch('tankMeterReadingBefore') || 0;
  const issued = watch('quantityIssuedL') || 0;
  const prevMeter = watch('vehiclePrevMeterReading') || 0;
  const currMeter = watch('vehicleCurrentMeterReading') || 0;

  const tankBalanceAfter = Math.max(0, tankBefore - issued);
  const kmDriven = Math.max(0, currMeter - prevMeter);
  const litresPerKm = kmDriven > 0 ? (issued / kmDriven).toFixed(3) : null;
  const balancePct = tankBefore > 0 ? (tankBalanceAfter / tankBefore) * 100 : 0;

  const selectedFuelItem = fuelItems.find(i => i.id === stockItemId);

  useEffect(() => {
    const load = async () => {
      const [fi, v, s] = await Promise.all([
        getInventoryItems('fuel'),
        getVehicles(),
        getStaffMembers()
      ]);
      setFuelItems(fi || []);
      setVehicles(v || []);
      setStaff(s || []);

      if (id) {
        const tx = await getFuelTransaction(id);
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
        kmDriven,
        tankBalanceAfterL: tankBalanceAfter,
        litresPerKm: litresPerKm ? parseFloat(litresPerKm) : undefined,
        itemName: selectedFuelItem?.name || data.itemName || '',
      };
      if (id) {
        await updateFuelTransaction(id, payload as any);
      } else {
        await createFuelTransaction(payload as any, user?.email || 'system');
      }
      navigate('/inventory');
    } catch (err) {
      console.error(err);
      alert('Failed to save fuel issue record');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <LoadingSpinner />;

  const fieldCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400";
  const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest px-1";

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={id ? 'Edit Fuel Issue' : 'Issue Fuel'}
        subtitle="Record vehicle fuel dispensing from yard tank"
        back="/inventory"
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Fuel className="w-32 h-32 text-amber-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 relative z-10">

          {/* Remaining Balance Banner */}
          {issued > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cn(
                "flex items-center justify-between p-5 rounded-[1.5rem] border",
                balancePct < 20 ? 'bg-red-50 border-red-200' : balancePct < 40 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
              )}
            >
              <div className="flex items-center gap-3">
                <Fuel className={cn("w-5 h-5", balancePct < 20 ? 'text-red-600' : balancePct < 40 ? 'text-amber-600' : 'text-emerald-600')} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tank Balance After Issue</p>
                  <p className={cn("text-2xl font-black", balancePct < 20 ? 'text-red-600' : balancePct < 40 ? 'text-amber-700' : 'text-emerald-700')}>
                    {tankBalanceAfter.toFixed(1)} L
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Remaining</p>
                <p className={cn("text-xl font-black", balancePct < 20 ? 'text-red-600' : balancePct < 40 ? 'text-amber-600' : 'text-emerald-600')}>
                  {balancePct.toFixed(0)}%
                </p>
              </div>
            </motion.div>
          )}

          {/* Fuel Stock Item Selection */}
          <div className="space-y-4 p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-amber-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Fuel Source</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={cn(labelCls, "text-amber-700")}>Select Fuel Stock Item</label>
                <Controller control={control} name="stockItemId"
                  render={({ field }) => (
                    <SearchableSelect
                      options={fuelItems.map(i => ({
                        value: i.id!,
                        label: i.name,
                        subLabel: `${i.currentStock} ${i.unitType} available · SKU: ${i.sku}`
                      }))}
                      value={field.value || ''}
                      onChange={v => {
                        field.onChange(v);
                        const item = fuelItems.find(i => i.id === v);
                        if (item) {
                          setValue('fuelType', item.extended?.fuelType || 'diesel');
                          setValue('tankMeterReadingBefore', item.currentStock || 0);
                        }
                      }}
                      placeholder="Select fuel stock..."
                      icon={<Fuel className="w-4 h-4 text-amber-600" />}
                    />
                  )}
                />
                {errors.stockItemId && <p className="text-[10px] font-bold text-red-500 px-1">{errors.stockItemId.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={cn(labelCls, "text-amber-700")}>Fuel Type</label>
                <div className="flex gap-3">
                  {(['diesel', 'petrol'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setValue('fuelType', t)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        watch('fuelType') === t ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white border-amber-200 text-amber-600'
                      )}
                    >{t}</button>
                  ))}
                </div>
              </div>
            </div>
            {selectedFuelItem && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Tank Stock:</span>
                <span className="text-sm font-black text-amber-700">{selectedFuelItem.currentStock} {selectedFuelItem.unitType}</span>
                <span className="text-[10px] font-bold text-gray-400 ml-auto">Location: {selectedFuelItem.warehouseLocation || '—'}</span>
              </div>
            )}
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
                <label className={labelCls}>Vehicle No.</label>
                <Controller control={control} name="vehicleNo"
                  render={({ field }) => (
                    <SearchableSelect
                      options={vehicles.map(v => ({ value: v.plateNo, label: v.plateNo, subLabel: v.type }))}
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select vehicle"
                      icon={<Truck className="w-4 h-4 text-indigo-600" />}
                    />
                  )}
                />
                {errors.vehicleNo && <p className="text-[10px] font-bold text-red-500 px-1">{errors.vehicleNo.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Driver</label>
                <Controller control={control} name="driverName"
                  render={({ field }) => (
                    <SearchableSelect
                      options={staff.filter(s => s.category === 'Driver').map(s => ({ value: s.fullName, label: s.fullName, subLabel: s.phone }))}
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select driver"
                      icon={<User className="w-4 h-4 text-indigo-600" />}
                    />
                  )}
                />
                {errors.driverName && <p className="text-[10px] font-bold text-red-500 px-1">{errors.driverName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Issuing Officer</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('issuingOfficer')} placeholder="Officer name"
                    className={cn(fieldCls, "pl-10", errors.issuingOfficer && "border-red-400")} />
                </div>
                {errors.issuingOfficer && <p className="text-[10px] font-bold text-red-500 px-1">{errors.issuingOfficer.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('location')} placeholder="e.g. Colombo Yard"
                    className={cn(fieldCls, "pl-10")} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Date</label>
                <input type="date" {...register('date')} className={cn(fieldCls, errors.date && "border-red-400")} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('time')} placeholder="HH:MM AM/PM"
                    className={cn(fieldCls, "pl-10")} />
                </div>
              </div>
            </div>
          </div>

          {/* Meter Readings */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Meter Readings</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
              <div className="space-y-2">
                <label className={labelCls}>Previous Vehicle Meter Reading (km)</label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" step="1" {...register('vehiclePrevMeterReading', { valueAsNumber: true })}
                    placeholder="0" className={cn(fieldCls, "pl-10", errors.vehiclePrevMeterReading && "border-red-400")} />
                </div>
                {errors.vehiclePrevMeterReading && <p className="text-[10px] font-bold text-red-500 px-1">{errors.vehiclePrevMeterReading.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Current Vehicle Meter Reading (km)</label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                  <input type="number" step="1" {...register('vehicleCurrentMeterReading', { valueAsNumber: true })}
                    placeholder="0" className={cn(fieldCls, "pl-10", errors.vehicleCurrentMeterReading && "border-red-400")} />
                </div>
                {errors.vehicleCurrentMeterReading && <p className="text-[10px] font-bold text-red-500 px-1">{errors.vehicleCurrentMeterReading.message}</p>}
              </div>

              {kmDriven > 0 && (
                <div className="md:col-span-2 flex items-center gap-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">KM Since Last Fill</p>
                    <p className="text-xl font-black text-indigo-700">{kmDriven.toLocaleString()} km</p>
                  </div>
                  {litresPerKm && (
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Litres / KM</p>
                      <p className="text-xl font-black text-indigo-700">{litresPerKm} L/km</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fuel Dispensing */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Diesel / Fuel Dispensing</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100">
              <div className="space-y-2">
                <label className={cn(labelCls, "text-amber-700")}>Current Diesel Meter Reading of Tank (L)</label>
                <div className="relative">
                  <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  <input type="number" step="0.1" {...register('tankMeterReadingBefore', { valueAsNumber: true })}
                    placeholder="Tank level before issue"
                    className={cn(fieldCls, "pl-10 bg-white border-amber-200", errors.tankMeterReadingBefore && "border-red-400")} />
                </div>
                {errors.tankMeterReadingBefore && <p className="text-[10px] font-bold text-red-500 px-1">{errors.tankMeterReadingBefore.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={cn(labelCls, "text-amber-700")}>Quantity Issued to Vehicle (L)</label>
                <div className="relative">
                  <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                  <input type="number" step="0.1" {...register('quantityIssuedL', { valueAsNumber: true })}
                    placeholder="Litres issued"
                    className={cn(fieldCls, "pl-10 bg-white border-amber-200 text-amber-900", errors.quantityIssuedL && "border-red-400")} />
                </div>
                {errors.quantityIssuedL && <p className="text-[10px] font-bold text-red-500 px-1">{errors.quantityIssuedL.message}</p>}
              </div>
              <div className="space-y-2">
                <label className={cn(labelCls, "text-amber-700")}>Remaining Tank Balance (Auto)</label>
                <div className={cn(
                  "px-4 py-3 rounded-xl border-2 font-black text-2xl",
                  tankBalanceAfter < 200 ? 'bg-red-50 border-red-300 text-red-700'
                  : tankBalanceAfter < 500 ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                )}>
                  {tankBalanceAfter.toFixed(1)} L
                  {tankBalanceAfter < 200 && (
                    <span className="block text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">⚠ Low — Reorder</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className={labelCls}>Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Any observations or remarks..."
              className={cn(fieldCls, "resize-none")} />
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
            <button type="submit" disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black px-12 py-4 rounded-xl transition-all shadow-xl shadow-amber-500/20 flex items-center gap-3 disabled:bg-amber-200 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Update Record' : 'Record Fuel Issue'}</span>
                  <Save className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default FuelIssueFormPage;
