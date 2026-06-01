import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Fuel, Save, Truck, User, MapPin, Clock, AlertTriangle, Gauge, Droplets,
  Plus, X, Check, RefreshCw, ShoppingBag, Camera, Receipt,
  CheckCircle2, XCircle, Info, Banknote
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddModal, { QuickAddType } from '../../components/shared/QuickAddModal';
import FileUpload from '../../components/shared/FileUpload';
import { cn } from '../../lib/utils';
import {
  createFuelTransaction, updateFuelTransaction,
  getFuelTransaction, getFuelTransactions
} from '../../services/fuelStockService';
import { getInventoryItems, InventoryItem } from '../../services/inventoryService';
import { FUEL_TYPE_VALUES, FUEL_TYPE_SHORT, FUEL_TYPE_COLOR, FUEL_PILL_IDLE } from '../../config/fuelTypes';
import { getCustomFuelTypes, addCustomFuelType, CustomFuelType } from '../../services/configService';
import { getVehicles } from '../../services/fleetService';
import { getStaffMembers } from '../../services/staffService';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';

// ─── Schema ───────────────────────────────────────────────────────────────────
const numOpt = z.number().optional()
  .or(z.literal(null)).transform(v => v === null ? undefined : v)
  .or(z.nan().transform(() => undefined));

const schema = z.object({
  fuelSource:   z.enum(['yard', 'outside']).default('yard'),
  date:         z.string().min(1, 'Date is required'),
  time:         z.string().min(1, 'Time is required'),
  vehicleNo:    z.string().min(1, 'Vehicle is required'),
  driverName:   z.string().min(1, 'Driver is required'),
  location:     z.string().optional(),
  issuingOfficer: z.string().min(1, 'Issuing officer is required'),
  fuelType:     z.string().min(1, 'Fuel type is required'),

  // Odometer
  meterWorking: z.boolean().default(true),
  vehiclePrevMeterReading:    numOpt,
  vehicleCurrentMeterReading: numOpt,

  // Yard pump
  stockItemId:          z.string().optional(),
  itemName:             z.string().optional(),
  tankMeterReadingBefore: numOpt,
  quantityIssuedL: z.number({ required_error: 'Quantity is required' }).min(0.1, 'Must be > 0'),

  // Outside purchase
  supplierName:   z.string().optional(),
  billPhotoUrl:   z.string().optional(),
  fuelCostPerL:   numOpt,

  notes: z.string().optional(),
})
.refine(d => {
  // Meter reading check — only when meter is working
  if (!d.meterWorking) return true;
  const prev = d.vehiclePrevMeterReading ?? 0;
  const curr = d.vehicleCurrentMeterReading ?? 0;
  return curr >= prev;
}, { message: 'Current meter must be ≥ previous reading', path: ['vehicleCurrentMeterReading'] })
.refine(d => {
  // Yard pump: stock item required
  if (d.fuelSource !== 'yard') return true;
  return !!d.stockItemId && d.stockItemId.length > 0;
}, { message: 'Select a fuel stock item from the yard', path: ['stockItemId'] })
.refine(d => {
  // Yard pump: cannot issue more than tank level
  if (d.fuelSource !== 'yard') return true;
  const tank = d.tankMeterReadingBefore ?? 0;
  return d.quantityIssuedL <= tank;
}, { message: 'Cannot issue more than current tank level', path: ['quantityIssuedL'] });

type FormData = z.infer<typeof schema>;

function formatTime(d: Date) {
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m < 10 ? '0' + m : m} ${ampm}`;
}

// ══════════════════════════════════════════════════════════════════════════════
const FuelIssueFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [formError, setFormError] = useState<string | null>(null);
  const [fuelItems, setFuelItems] = useState<InventoryItem[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickAdd, setQuickAdd] = useState<{ type: QuickAddType; onCreated: (id: string, label: string) => void } | null>(null);

  // Auto-filled previous reading info
  const [prevMeterAutoFilled, setPrevMeterAutoFilled] = useState<{ reading: number; date: string } | null>(null);
  const [loadingPrevMeter, setLoadingPrevMeter] = useState(false);

  // Custom fuel types
  const [customFuelTypes, setCustomFuelTypes] = useState<CustomFuelType[]>([]);
  const [addingFuel, setAddingFuel] = useState(false);
  const [newFuelName, setNewFuelName] = useState('');
  const [savingFuel, setSavingFuel] = useState(false);

  const {
    register, handleSubmit, setValue, watch, control,
    formState: { errors, isSubmitted }
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      fuelSource: 'yard',
      date: new Date().toISOString().split('T')[0],
      time: formatTime(new Date()),
      fuelType: 'diesel',
      meterWorking: true,
      vehiclePrevMeterReading: undefined,
      vehicleCurrentMeterReading: undefined,
      tankMeterReadingBefore: undefined,
      quantityIssuedL: 0,
    }
  });

  const fuelSource   = watch('fuelSource');
  const meterWorking = watch('meterWorking');
  const stockItemId  = watch('stockItemId');
  const tankBefore   = watch('tankMeterReadingBefore') ?? 0;
  const issued       = watch('quantityIssuedL') ?? 0;
  const prevMeter    = watch('vehiclePrevMeterReading') ?? 0;
  const currMeter    = watch('vehicleCurrentMeterReading') ?? 0;
  const fuelCostPerL = watch('fuelCostPerL') ?? 0;

  const tankBalanceAfter = Math.max(0, tankBefore - issued);
  const kmDriven  = meterWorking ? Math.max(0, (currMeter || 0) - (prevMeter || 0)) : 0;
  const litresPerKm = kmDriven > 0 ? (issued / kmDriven).toFixed(3) : null;
  const balancePct  = tankBefore > 0 ? (tankBalanceAfter / tankBefore) * 100 : 0;
  const totalCost   = fuelCostPerL > 0 ? (fuelCostPerL * issued).toFixed(2) : null;

  const selectedFuelItem = fuelItems.find(i => i.id === stockItemId);

  // Refresh dropdowns after quick-add
  useEffect(() => {
    if (refreshKey === 0) return;
    Promise.all([getVehicles(), getStaffMembers()]).then(([v, s]) => {
      setVehicles(v || []); setStaff(s || []);
    }).catch(console.error);
  }, [refreshKey]);

  useEffect(() => { getCustomFuelTypes().then(setCustomFuelTypes); }, []);

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

  // ── Auto-fill previous meter reading when vehicle selected ───────────────
  const handleVehicleChange = async (vehicleNo: string, fieldOnChange: (v: string) => void) => {
    fieldOnChange(vehicleNo);
    if (id || !vehicleNo) return; // don't overwrite when editing
    setLoadingPrevMeter(true);
    try {
      const allTx = await getFuelTransactions();
      const vehicleTx = allTx
        .filter(t => t.vehicleNo === vehicleNo && (t.vehicleCurrentMeterReading ?? 0) > 0)
        .sort((a, b) => {
          const dc = b.date.localeCompare(a.date);
          return dc !== 0 ? dc : (b.time || '').localeCompare(a.time || '');
        });
      if (vehicleTx.length > 0) {
        const lastReading = vehicleTx[0].vehicleCurrentMeterReading;
        setValue('vehiclePrevMeterReading', lastReading);
        setPrevMeterAutoFilled({ reading: lastReading, date: vehicleTx[0].date });
      } else {
        setPrevMeterAutoFilled(null);
      }
    } catch (e) {
      console.error('Could not fetch last meter reading', e);
    } finally {
      setLoadingPrevMeter(false);
    }
  };

  // Merge built-in + custom fuel types
  const allFuelTypes = [
    ...FUEL_TYPE_VALUES.map(v => ({
      value: v, shortLabel: FUEL_TYPE_SHORT[v], colorClass: FUEL_TYPE_COLOR[v],
    })),
    ...customFuelTypes.map(ft => ({
      value: ft.value, shortLabel: ft.shortLabel,
      colorClass: 'bg-violet-50 border-violet-300 text-violet-700',
    })),
  ];

  const handleAddFuel = async () => {
    const label = newFuelName.trim();
    if (!label) return;
    setSavingFuel(true);
    try {
      const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const shortLabel = label.length > 10 ? label.slice(0, 9).trim() + '…' : label;
      const saved = await addCustomFuelType({ value, label, shortLabel });
      setCustomFuelTypes(prev => [...prev, saved]);
      setValue('fuelType', saved.value as any);
      setAddingFuel(false);
      setNewFuelName('');
    } finally {
      setSavingFuel(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setFormError(null);
    setLoading(true);
    try {
      const payload = {
        ...data,
        kmDriven: meterWorking ? kmDriven : null,
        tankBalanceAfterL: fuelSource === 'yard' ? tankBalanceAfter : null,
        litresPerKm: litresPerKm ? parseFloat(litresPerKm) : undefined,
        itemName: selectedFuelItem?.name || data.itemName || '',
      };
      if (id) {
        await updateFuelTransaction(id, payload as any);
      } else {
        await createFuelTransaction(payload as any, user?.email || 'system');
      }
      navigate('/inventory');
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Failed to save fuel issue record. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <LoadingSpinner />;

  const fieldCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400";
  const labelCls = "text-[10px] font-black text-gray-400 uppercase tracking-widest px-1";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={id ? 'Edit Fuel Issue' : 'Issue Fuel'}
        subtitle="Record vehicle fuel dispensing from yard tank or outside purchase"
        back="/inventory"
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Fuel className="w-32 h-32 text-amber-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 relative z-10">

          {/* ── Error / validation banners ─────────────────────────────────── */}
          {formError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-700">Save Failed</p>
                <p className="text-xs text-red-600 mt-0.5">{formError}</p>
              </div>
            </div>
          )}
          {isSubmitted && Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-700">Please fix the errors below</p>
                <p className="text-xs text-amber-600 mt-0.5">Required fields are highlighted in red.</p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              FUEL SOURCE TOGGLE — Yard Pump vs Outside Purchase
          ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <label className={labelCls}>Fuel Source</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue('fuelSource', 'yard')}
                className={cn(
                  "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all text-left",
                  fuelSource === 'yard'
                    ? "bg-amber-50 border-amber-400 shadow-lg shadow-amber-100"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn("p-2.5 rounded-xl", fuelSource === 'yard' ? "bg-amber-500" : "bg-gray-200")}>
                  <Droplets className={cn("w-5 h-5", fuelSource === 'yard' ? "text-white" : "text-gray-400")} />
                </div>
                <div>
                  <p className={cn("text-sm font-black", fuelSource === 'yard' ? "text-amber-800" : "text-gray-500")}>
                    Yard Pump
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold">Dispensed from on-site tank</p>
                </div>
                {fuelSource === 'yard' && <CheckCircle2 className="w-5 h-5 text-amber-500 ml-auto flex-shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setValue('fuelSource', 'outside')}
                className={cn(
                  "flex items-center gap-3 p-5 rounded-2xl border-2 transition-all text-left",
                  fuelSource === 'outside'
                    ? "bg-blue-50 border-blue-400 shadow-lg shadow-blue-100"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn("p-2.5 rounded-xl", fuelSource === 'outside' ? "bg-blue-500" : "bg-gray-200")}>
                  <ShoppingBag className={cn("w-5 h-5", fuelSource === 'outside' ? "text-white" : "text-gray-400")} />
                </div>
                <div>
                  <p className={cn("text-sm font-black", fuelSource === 'outside' ? "text-blue-800" : "text-gray-500")}>
                    Outside Purchase
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold">Bought from external station</p>
                </div>
                {fuelSource === 'outside' && <CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto flex-shrink-0" />}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              YARD PUMP — Stock Item + Fuel Type
          ══════════════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {fuelSource === 'yard' && (
              <motion.div key="yard"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="space-y-4 p-6 bg-amber-50 rounded-[2rem] border border-amber-100"
              >
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Yard Fuel Source</span>
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
                              setValue('fuelType', (item as any).extended?.fuelType || 'diesel');
                              setValue('tankMeterReadingBefore', item.currentStock || 0);
                            }
                          }}
                          placeholder="Select fuel stock..."
                          icon={<Fuel className="w-4 h-4 text-amber-600" />}
                        />
                      )}
                    />
                    {errors.stockItemId && (
                      <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 px-1">
                        <AlertTriangle className="w-3 h-3" /> {errors.stockItemId.message}
                      </p>
                    )}
                  </div>

                  {/* Fuel Type Pills */}
                  <div className="space-y-2">
                    <label className={cn(labelCls, "text-amber-700")}>Fuel Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {allFuelTypes.map(t => (
                        <button key={t.value} type="button" onClick={() => setValue('fuelType', t.value as any)}
                          className={cn(
                            "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            watch('fuelType') === t.value ? t.colorClass : FUEL_PILL_IDLE
                          )}
                        >{t.shortLabel}</button>
                      ))}
                      {!addingFuel && (
                        <button type="button" onClick={() => setAddingFuel(true)}
                          className="py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 border-dashed border-gray-200 text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-all"
                        >+ New</button>
                      )}
                    </div>
                    {addingFuel && (
                      <div className="flex gap-2">
                        <input type="text" value={newFuelName} onChange={e => setNewFuelName(e.target.value)}
                          placeholder="Fuel type name…"
                          className="flex-1 px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-gray-400"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleAddFuel(); }
                            if (e.key === 'Escape') { setAddingFuel(false); setNewFuelName(''); }
                          }}
                        />
                        <button type="button" onClick={handleAddFuel}
                          disabled={!newFuelName.trim() || savingFuel}
                          className="px-3 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-black disabled:opacity-40"
                        >{savingFuel ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}</button>
                        <button type="button" onClick={() => { setAddingFuel(false); setNewFuelName(''); }}
                          className="px-3 py-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl"
                        ><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>

                {selectedFuelItem && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Tank Stock:</span>
                    <span className="text-sm font-black text-amber-700">{selectedFuelItem.currentStock} {selectedFuelItem.unitType}</span>
                    <span className="text-[10px] font-bold text-gray-400 ml-auto">Location: {selectedFuelItem.warehouseLocation || '—'}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                OUTSIDE PURCHASE — Bill photo + Supplier + Cost
            ════════════════════════════════════════════════════════════════ */}
            {fuelSource === 'outside' && (
              <motion.div key="outside"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="space-y-6 p-6 bg-blue-50 rounded-[2rem] border border-blue-100"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Outside Purchase Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fuel Type Pills (same as yard) */}
                  <div className="space-y-2">
                    <label className={cn(labelCls, "text-blue-700")}>Fuel Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {allFuelTypes.map(t => (
                        <button key={t.value} type="button" onClick={() => setValue('fuelType', t.value as any)}
                          className={cn(
                            "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            watch('fuelType') === t.value ? t.colorClass : FUEL_PILL_IDLE
                          )}
                        >{t.shortLabel}</button>
                      ))}
                    </div>
                  </div>

                  {/* Supplier / Petrol Station */}
                  <div className="space-y-2">
                    <label className={cn(labelCls, "text-blue-700")}>Fuel Station / Supplier</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input {...register('supplierName')}
                        placeholder="e.g. CPC Station, Colombo 03"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-1 focus:ring-blue-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Cost per Litre */}
                  <div className="space-y-2">
                    <label className={cn(labelCls, "text-blue-700")}>Cost per Litre (LKR)</label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input type="number" step="0.01"
                        {...register('fuelCostPerL', { valueAsNumber: true })}
                        placeholder="e.g. 320.00"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-1 focus:ring-blue-500/50 outline-none font-bold text-gray-900 text-sm placeholder:text-gray-400"
                      />
                    </div>
                    {totalCost && (
                      <p className="text-[10px] font-black text-blue-700 px-1">
                        Total Cost: LKR {Number(totalCost).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Bill Photo Upload */}
                  <div className="space-y-2">
                    <label className={cn(labelCls, "text-blue-700 flex items-center gap-1")}>
                      <Camera className="w-3 h-3" /> Fuel Bill / Receipt Photo
                    </label>
                    <FileUpload
                      label="Upload Bill Photo"
                      path="fuel/bills"
                      accept="image/*,application/pdf"
                      onUploadComplete={url => setValue('billPhotoUrl', url)}
                      currentUrl={watch('billPhotoUrl')}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Remaining Balance Banner — yard only */}
          {fuelSource === 'yard' && issued > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cn(
                "flex items-center justify-between p-5 rounded-[1.5rem] border",
                balancePct < 20 ? 'bg-red-50 border-red-200'
                : balancePct < 40 ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
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

          {/* ══════════════════════════════════════════════════════════════════
              VEHICLE & PERSONNEL
          ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Vehicle &amp; Personnel</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Vehicle */}
              <div className="space-y-2">
                <label className={labelCls}>Vehicle No.</label>
                <Controller control={control} name="vehicleNo"
                  render={({ field }) => (
                    <SearchableSelect
                      options={vehicles.map(v => ({ value: v.plateNo, label: v.plateNo, subLabel: v.type }))}
                      value={field.value || ''}
                      onChange={v => handleVehicleChange(v, field.onChange)}
                      placeholder="Select vehicle"
                      icon={<Truck className="w-4 h-4 text-indigo-600" />}
                      onAddNew={() => setQuickAdd({ type: 'vehicle', onCreated: (id, label) => { field.onChange(label); setRefreshKey(k => k + 1); } })}
                      addNewLabel="Add New Vehicle"
                    />
                  )}
                />
                {errors.vehicleNo && <p className="text-[10px] font-bold text-red-500 px-1">{errors.vehicleNo.message}</p>}
                {loadingPrevMeter && (
                  <p className="text-[10px] text-indigo-500 font-bold px-1 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Loading last meter reading…
                  </p>
                )}
              </div>

              {/* Driver */}
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
                      onAddNew={() => setQuickAdd({ type: 'driver', onCreated: (id, label) => { field.onChange(label); setRefreshKey(k => k + 1); } })}
                      addNewLabel="Add New Driver"
                    />
                  )}
                />
                {errors.driverName && <p className="text-[10px] font-bold text-red-500 px-1">{errors.driverName.message}</p>}
              </div>

              {/* Issuing Officer */}
              <div className="space-y-2">
                <label className={labelCls}>Issuing Officer</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('issuingOfficer')} placeholder="Officer name"
                    className={cn(fieldCls, "pl-10", errors.issuingOfficer && "border-red-400")} />
                </div>
                {errors.issuingOfficer && <p className="text-[10px] font-bold text-red-500 px-1">{errors.issuingOfficer.message}</p>}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className={labelCls}>Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('location')} placeholder="e.g. Colombo Yard"
                    className={cn(fieldCls, "pl-10")} />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className={labelCls}>Date</label>
                <input type="date" {...register('date')}
                  className={cn(fieldCls, errors.date && "border-red-400")} />
              </div>

              {/* Time */}
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

          {/* ══════════════════════════════════════════════════════════════════
              ODOMETER STATUS + METER READINGS
          ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Odometer / Meter Readings</h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            {/* Odometer Working Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setValue('meterWorking', true)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                  meterWorking
                    ? "bg-emerald-50 border-emerald-400 shadow-md shadow-emerald-100"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn("p-2 rounded-xl", meterWorking ? "bg-emerald-500" : "bg-gray-200")}>
                  <Gauge className={cn("w-4 h-4", meterWorking ? "text-white" : "text-gray-400")} />
                </div>
                <div>
                  <p className={cn("text-sm font-black", meterWorking ? "text-emerald-800" : "text-gray-500")}>
                    Meter Working
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold">Odometer readings available</p>
                </div>
                {meterWorking && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" />}
              </button>

              <button type="button" onClick={() => setValue('meterWorking', false)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                  !meterWorking
                    ? "bg-rose-50 border-rose-400 shadow-md shadow-rose-100"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn("p-2 rounded-xl", !meterWorking ? "bg-rose-500" : "bg-gray-200")}>
                  <XCircle className={cn("w-4 h-4", !meterWorking ? "text-white" : "text-gray-400")} />
                </div>
                <div>
                  <p className={cn("text-sm font-black", !meterWorking ? "text-rose-800" : "text-gray-500")}>
                    Meter Faulty / Not Working
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold">Readings unavailable</p>
                </div>
                {!meterWorking && <CheckCircle2 className="w-5 h-5 text-rose-500 ml-auto flex-shrink-0" />}
              </button>
            </div>

            {/* Meter Reading Fields */}
            <AnimatePresence mode="wait">
              {meterWorking ? (
                <motion.div key="meter-on"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100"
                >
                  {/* Previous Reading */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className={labelCls}>Previous Meter Reading (km)</label>
                      {prevMeterAutoFilled && (
                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Info className="w-2.5 h-2.5" /> Auto-filled from {prevMeterAutoFilled.date}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="number" step="1"
                        {...register('vehiclePrevMeterReading', { valueAsNumber: true })}
                        placeholder="Last recorded reading"
                        className={cn(
                          fieldCls, "pl-10",
                          prevMeterAutoFilled ? "border-indigo-300 bg-indigo-50/50" : "",
                          errors.vehiclePrevMeterReading && "border-red-400"
                        )}
                      />
                    </div>
                    {errors.vehiclePrevMeterReading && (
                      <p className="text-[10px] font-bold text-red-500 px-1">{errors.vehiclePrevMeterReading.message}</p>
                    )}
                  </div>

                  {/* Current Reading */}
                  <div className="space-y-2">
                    <label className={labelCls}>Current Meter Reading (km)</label>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                      <input type="number" step="1"
                        {...register('vehicleCurrentMeterReading', { valueAsNumber: true })}
                        placeholder="Reading right now"
                        className={cn(fieldCls, "pl-10", errors.vehicleCurrentMeterReading && "border-red-400")}
                      />
                    </div>
                    {errors.vehicleCurrentMeterReading && (
                      <p className="text-[10px] font-bold text-red-500 px-1">{errors.vehicleCurrentMeterReading.message}</p>
                    )}
                  </div>

                  {/* KM / Efficiency calc */}
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
                      {litresPerKm && (
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Avg KM / L</p>
                          <p className="text-xl font-black text-indigo-700">{(1 / parseFloat(litresPerKm)).toFixed(1)} km/L</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="meter-off"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-3 bg-rose-50 border-2 border-rose-200 rounded-2xl p-5"
                >
                  <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-rose-700">Odometer Not Functional</p>
                    <p className="text-xs text-rose-600 mt-1">
                      Meter readings will be recorded as N/A for this issue.
                      KM and fuel efficiency cannot be calculated.
                      Please arrange meter repair as soon as possible.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              FUEL DISPENSING — Quantity
          ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                {fuelSource === 'yard' ? 'Fuel Dispensing' : 'Fuel Quantity Purchased'}
              </h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className={cn(
              "grid grid-cols-1 gap-6 p-6 rounded-[2rem] border",
              fuelSource === 'yard'
                ? "md:grid-cols-3 bg-amber-50/50 border-amber-100"
                : "md:grid-cols-2 bg-blue-50/50 border-blue-100"
            )}>
              {/* Yard: Current Tank Level */}
              {fuelSource === 'yard' && (
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-amber-700")}>Tank Level Before Issue (L)</label>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                    <input type="number" step="0.1"
                      {...register('tankMeterReadingBefore', { valueAsNumber: true })}
                      placeholder="Current tank level"
                      className={cn(fieldCls, "pl-10 bg-white border-amber-200", errors.tankMeterReadingBefore && "border-red-400")}
                    />
                  </div>
                  {errors.tankMeterReadingBefore && (
                    <p className="text-[10px] font-bold text-red-500 px-1">{errors.tankMeterReadingBefore.message}</p>
                  )}
                </div>
              )}

              {/* Quantity Issued */}
              <div className="space-y-2">
                <label className={cn(labelCls, fuelSource === 'yard' ? "text-amber-700" : "text-blue-700")}>
                  Quantity Issued / Purchased (L)
                </label>
                <div className="relative">
                  <Fuel className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", fuelSource === 'yard' ? "text-amber-600" : "text-blue-500")} />
                  <input type="number" step="0.1"
                    {...register('quantityIssuedL', { valueAsNumber: true })}
                    placeholder="Litres"
                    className={cn(
                      fieldCls, "pl-10",
                      fuelSource === 'yard' ? "bg-white border-amber-200 text-amber-900" : "bg-white border-blue-200",
                      errors.quantityIssuedL && "border-red-400"
                    )}
                  />
                </div>
                {errors.quantityIssuedL && (
                  <p className="text-[10px] font-bold text-red-500 px-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.quantityIssuedL.message}
                  </p>
                )}
              </div>

              {/* Yard: Remaining Balance (auto) */}
              {fuelSource === 'yard' && (
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
              )}

              {/* Outside: Total Cost display */}
              {fuelSource === 'outside' && totalCost && (
                <div className="space-y-2">
                  <label className={cn(labelCls, "text-blue-700")}>Total Purchase Cost</label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-blue-200 rounded-xl">
                    <Receipt className="w-4 h-4 text-blue-500" />
                    <span className="text-xl font-black text-blue-700">LKR {Number(totalCost).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className={labelCls}>Notes / Remarks</label>
            <textarea {...register('notes')} rows={2}
              placeholder="Any observations or remarks…"
              className={cn(fieldCls, "resize-none")}
            />
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-end">
            <button type="submit" disabled={loading}
              className={cn(
                "text-white font-black px-12 py-4 rounded-xl transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 group",
                fuelSource === 'yard'
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">
                    {id ? 'Update Record' : fuelSource === 'yard' ? 'Record Fuel Issue' : 'Record Purchase'}
                  </span>
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

export default FuelIssueFormPage;
