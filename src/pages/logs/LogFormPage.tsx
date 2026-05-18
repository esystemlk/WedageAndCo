import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ClipboardList,
  Truck,
  UserSquare2,
  Building2,
  Settings,
  Save,
  Compass,
  Zap,
  User
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { getLogSheet, createLogSheet, updateLogSheet } from '../../services/logService';
import { useCustomers } from '../../hooks/useCustomers';
import { useFleet } from '../../hooks/useFleet';
import { useStaff } from '../../hooks/useStaff';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';

const logSchema = z.object({
  logSheetCode: z.string().min(1, 'Log Sheet Code is required'),
  date: z.string().min(1, 'Start Date is required'),
  endDate: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  helperId: z.string().optional().or(z.literal('')),
  representative: z.string().optional().or(z.literal('')),
  temporaryDriverName: z.string().optional(),
  temporaryHelperName: z.string().optional(),
  additionalHelpers: z.string().optional(),

  // Meter Reading
  meterStatus: z.enum(['Working', 'Not Working']),
  startMileage: z.number().min(0, 'Start mileage must be positive').optional().or(z.literal(0)),
  endMileage: z.number().optional().or(z.literal(0)),
  totalKm: z.number().min(0, 'Total KM must be positive'),
  outTime: z.string().min(1, 'Time Out is required'),
  inTime: z.string().optional().or(z.literal('')),
  meterNonWorkingReason: z.string().optional(),
  googleMapsKm: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
  totalHours: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),

  // Freezer Section
  vehicleHasFreezer: z.boolean(),
  freezerStatus: z.enum(['ON', 'OFF']).optional(),
  freezerOnTime: z.string().optional().or(z.literal('')),
  freezerOffTime: z.string().optional().or(z.literal('')),
  freezerTotalHours: z.string().optional().or(z.literal('')),
  freezerRemarks: z.string().optional(),
  freezerMode: z.enum(['Plus Cool', 'Negative Temp', 'Ambient', 'Not Mentioned']).optional(),

  // Status & Remarks
  status: z.enum(['On Trip', 'Completed', 'Breakdown', 'Cancelled']),
  remarks: z.string().optional(),
  breakdownReason: z.string().optional(),
  cancelReason: z.string().optional(),
}).refine(data => {
  if (data.status === 'Breakdown' && !data.breakdownReason?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Mechanical Failure Reason is required",
  path: ["breakdownReason"]
}).refine(data => {
  if (data.status === 'Cancelled' && !data.cancelReason?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Cancellation Reason is required",
  path: ["cancelReason"]
}).refine(data => {
  if (data.driverId === 'temp' && !data.temporaryDriverName?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Temporary Driver Name is required",
  path: ["temporaryDriverName"]
}).refine(data => {
  if (data.helperId === 'temp' && !data.temporaryHelperName?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Temporary Helper Name is required",
  path: ["temporaryHelperName"]
});

type LogFormData = z.infer<typeof logSchema>;

const LogFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { vehicles } = useFleet();
  const { staff } = useStaff();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      logSheetCode: `LS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: 'On Trip',
      meterStatus: 'Working',
      vehicleHasFreezer: false,
      freezerStatus: 'OFF',
      outTime: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      totalKm: 0,
      googleMapsKm: undefined,
      totalHours: 0,
      freezerMode: 'Not Mentioned',
      breakdownReason: '',
      cancelReason: '',
      temporaryDriverName: '',
      temporaryHelperName: '',
      additionalHelpers: ''
    }
  });

  const meterStatus = watch('meterStatus');
  const vehicleHasFreezer = watch('vehicleHasFreezer');
  const freezerStatus = watch('freezerStatus');
  const selectedStatus = watch('status');
  const driverId = watch('driverId');
  const helperId = watch('helperId');
  const startMileage = watch('startMileage') || 0;
  const endMileage = watch('endMileage') || 0;
  const googleMapsKm = watch('googleMapsKm');
  const outTime = watch('outTime');
  const inTime = watch('inTime');
  const selectedVehicleId = watch('vehicleId');
  const freezerOnTime = watch('freezerOnTime');
  const freezerOffTime = watch('freezerOffTime');

  // Auto-calculate Total KM if meter is working
  useEffect(() => {
    if (meterStatus === 'Working' && endMileage > startMileage) {
      setValue('totalKm', endMileage - startMileage);
    } else if (meterStatus === 'Not Working' && googleMapsKm) {
      setValue('totalKm', googleMapsKm);
    }
  }, [meterStatus, startMileage, endMileage, googleMapsKm, setValue]);

  // Auto-calculate Total Hours
  useEffect(() => {
    if (outTime && inTime) {
      const outDate = new Date(outTime);
      const inDate = new Date(inTime);
      const diffMs = inDate.getTime() - outDate.getTime();
      if (diffMs > 0) {
        const diffHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        setValue('totalHours', diffHrs);
      } else {
        setValue('totalHours', 0);
      }
    }
  }, [outTime, inTime, setValue]);

  // Auto-detect if selected vehicle has freezer
  useEffect(() => {
    if (selectedVehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        setValue('vehicleHasFreezer', vehicle.type === 'freezer-truck');
      }
    }
  }, [selectedVehicleId, vehicles, setValue]);

  // Auto-calculate Total Freezer Hours
  useEffect(() => {
    if (freezerOnTime && freezerOffTime) {
      const onDate = new Date(freezerOnTime);
      const offDate = new Date(freezerOffTime);
      const diffMs = offDate.getTime() - onDate.getTime();
      if (diffMs > 0) {
        const diffHrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
        setValue('freezerTotalHours', diffHrs);
      } else {
        setValue('freezerTotalHours', '0.00');
      }
    }
  }, [freezerOnTime, freezerOffTime, setValue]);

  useEffect(() => {
    if (id) {
      const fetchLog = async () => {
        try {
          const data = await getLogSheet(id);
          if (data) {
            setValue('logSheetCode', data.logSheetCode);
            setValue('date', data.date);
            setValue('endDate', data.endDate || data.date);
            setValue('customerId', data.customerId);
            setValue('vehicleId', data.vehicleId);
            setValue('driverId', data.driverId);
            setValue('helperId', data.helperId || '');
            setValue('representative', data.representative || '');
            setValue('meterStatus', data.meterStatus);
            setValue('startMileage', data.startMileage);
            setValue('endMileage', data.endMileage);
            setValue('totalKm', data.totalKm);
            setValue('outTime', data.outTime);
            setValue('inTime', data.inTime || '');
            setValue('meterNonWorkingReason', data.meterNonWorkingReason || '');
            setValue('googleMapsKm', data.googleMapsKm);
            setValue('totalHours', data.totalHours || 0);
            setValue('vehicleHasFreezer', data.vehicleHasFreezer);
            setValue('freezerStatus', data.freezerStatus || 'OFF');
            setValue('freezerOnTime', data.freezerOnTime || '');
            setValue('freezerOffTime', data.freezerOffTime || '');
            setValue('freezerTotalHours', data.freezerTotalHours || '');
            setValue('freezerRemarks', data.freezerRemarks || '');
            setValue('freezerMode', (data as any).freezerMode || 'Not Mentioned');
            setValue('status', data.status);
            setValue('remarks', data.remarks || '');
            setValue('breakdownReason', data.breakdownReason || '');
            setValue('cancelReason', (data as any).cancelReason || '');
            setValue('temporaryDriverName', (data as any).temporaryDriverName || '');
            setValue('temporaryHelperName', (data as any).temporaryHelperName || '');
            setValue('additionalHelpers', (data as any).additionalHelpers || '');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchLog();
    }
  }, [id, setValue]);

  const onSubmit = async (data: LogFormData) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        enteredBy: user?.email || 'Unknown',
        // Filter out empty strings for optional IDs
        helperId: data.helperId === 'temp' ? undefined : (data.helperId || undefined),
        driverId: data.driverId === 'temp' ? 'temp' : data.driverId,
        temporaryDriverName: data.driverId === 'temp' ? data.temporaryDriverName : undefined,
        temporaryHelperName: data.helperId === 'temp' ? data.temporaryHelperName : undefined,
        additionalHelpers: data.additionalHelpers || undefined,
      };

      if (id) {
        await updateLogSheet(id, payload as any);
      } else {
        await createLogSheet(payload as any);
      }
      navigate('/logs');
    } catch (err) {
      console.error(err);
      alert('Failed to save log sheet');
    } finally {
      setLoading(false);
    }
  };

  const activeDrivers = staff.filter(s => s.category === 'Driver' && s.active);
  const activeHelpers = staff.filter(s => s.category === 'Helper' && s.active);
  const activeVehicles = vehicles.filter(v => v.status === 'Active');

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <PageHeader
        title={id ? 'Amend Operational Log' : 'Initialize Mission Log'}
        subtitle={id ? 'Transcribing mechanical telemetry and deployment data.' : 'Commencing new logistics engagement.'}
        back="/logs"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <input type="hidden" {...register('vehicleHasFreezer')} />
        <input type="hidden" {...register('freezerStatus')} />
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-10"
        >
          <div className="flex items-center gap-4">
            <div className="h-px bg-gray-100 flex-1"></div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Log Header & Engagement</h3>
            <div className="h-px bg-gray-100 flex-1"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Log Sheet Code</label>
              <input type="text" {...register('logSheetCode')} placeholder="LS-2026-XXXX" className="w-full bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-gray-900 font-black outline-none tracking-widest" />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Start Date</label>
              <input type="date" {...register('date')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none focus:ring-1 focus:ring-indigo-500/50" />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">End Date</label>
              <input type="date" {...register('endDate')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none focus:ring-1 focus:ring-indigo-500/50" />
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Customer / Employer</label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <SearchableSelect
                    options={customers.map(c => ({ value: c.id!, label: c.name, subLabel: c.nickname || undefined }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select Customer"
                    icon={<Building2 className="w-4 h-4 text-gray-400" />}
                  />
                )}
              />
              {errors.customerId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.customerId.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Representative (REP)</label>
              <input type="text" {...register('representative')} placeholder="Customer Rep Name" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none placeholder:text-gray-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Tactical Asset</label>
              <Controller
                control={control}
                name="vehicleId"
                render={({ field }) => (
                  <SearchableSelect
                    options={activeVehicles.map(v => ({ value: v.id!, label: `${v.plateNo}`, subLabel: `${v.type}` }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select Vehicle"
                    icon={<Truck className="w-4 h-4 text-emerald-600" />}
                  />
                )}
              />
              {errors.vehicleId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.vehicleId.message}</p>}
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Assigned Driver</label>
              <Controller
                control={control}
                name="driverId"
                render={({ field }) => (
                  <SearchableSelect
                    options={[
                      { value: 'temp', label: 'Temporary Driver (Manual Entry)' },
                      ...activeDrivers.map(d => ({ value: d.id!, label: d.fullName, subLabel: d.phone }))
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select Driver"
                    icon={<User className="w-4 h-4 text-indigo-600" />}
                  />
                )}
              />
              {errors.driverId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.driverId.message}</p>}

              {driverId === 'temp' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Temporary Driver Name</label>
                  <input type="text" {...register('temporaryDriverName')} placeholder="Enter driver full name" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                  {errors.temporaryDriverName && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.temporaryDriverName.message}</p>}
                </motion.div>
              )}
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mission Helper</label>
              <Controller
                control={control}
                name="helperId"
                render={({ field }) => (
                  <SearchableSelect
                    options={[
                      { value: 'temp', label: 'Temporary Helper (Manual Entry)' },
                      ...activeHelpers.map(h => ({ value: h.id!, label: h.fullName, subLabel: h.phone }))
                    ]}
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="None Assigned"
                    icon={<User className="w-4 h-4 text-gray-400" />}
                  />
                )}
              />
              {errors.helperId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.helperId.message}</p>}

              {helperId === 'temp' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Temporary Helper Name</label>
                  <input type="text" {...register('temporaryHelperName')} placeholder="Enter helper full name" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                  {errors.temporaryHelperName && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.temporaryHelperName.message}</p>}
                </motion.div>
              )}
            </div>
          </div>

          {/* Additional Helpers / Crew */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Additional Helpers / Mission Crew</label>
            <input type="text" {...register('additionalHelpers')} placeholder="e.g. Nimal, Sunil (comma separated)" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none placeholder:text-gray-300" />
          </div>
        </motion.div>

        {/* Telemetry Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Meter Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Compass className="w-5 h-5 text-indigo-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Meter Telemetry</h3>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                {['Working', 'Not Working'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue('meterStatus', s as any)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      meterStatus === s ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {meterStatus === 'Working' ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Odometer (OUT)</label>
                  <input type="number" {...register('startMileage', { valueAsNumber: true })} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-mono font-bold outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Odometer (IN)</label>
                  <input type="number" {...register('endMileage', { valueAsNumber: true })} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-mono font-bold outline-none" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Reason for Failure</label>
                  <input type="text" {...register('meterNonWorkingReason')} placeholder="Brief explanation" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Est. Google Maps KM</label>
                  <input type="number" step="0.1" {...register('googleMapsKm', { valueAsNumber: true })} placeholder="Estimated KM" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Departure (Date & Time)</label>
                <input type="datetime-local" {...register('outTime')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Arrival (Date & Time)</label>
                <input type="datetime-local" {...register('inTime')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col justify-between gap-3 min-h-[100px]">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total Displacement</span>
                <div className="flex items-baseline justify-between mt-auto">
                  <span className="text-[10px] font-bold text-indigo-500/60 uppercase">KM</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      {...register('totalKm', { valueAsNumber: true })}
                      readOnly={meterStatus === 'Working'}
                      className={cn(
                        "bg-transparent text-2xl font-black text-gray-900 text-right outline-none w-28 font-mono",
                        meterStatus === 'Working' && "cursor-default"
                      )}
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">KM</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-amber-50/80 border border-amber-100 rounded-2xl flex flex-col justify-between gap-3 min-h-[100px]">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total Duration</span>
                <div className="flex items-baseline justify-between mt-auto">
                  <span className="text-[10px] font-bold text-amber-500/60 uppercase">HRS</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      {...register('totalHours', { valueAsNumber: true })}
                      readOnly
                      className="bg-transparent text-2xl font-black text-gray-900 text-right outline-none w-28 font-mono cursor-default"
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">HRS</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Freezer Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "bg-white p-8 lg:p-10 rounded-[2.5rem] border shadow-sm space-y-8 transition-all",
              !vehicleHasFreezer ? "hidden" : "border-gray-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-emerald-600" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Refrigeration Control</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Freezer Status</span>
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                  {['ON', 'OFF'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValue('freezerStatus', s as any)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        freezerStatus === s ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={cn("space-y-6 transition-all", freezerStatus !== 'ON' && "opacity-30 pointer-events-none grayscale")}>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Freezer ON (Date & Time)</label>
                  <input type="datetime-local" {...register('freezerOnTime')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Freezer OFF (Date & Time)</label>
                  <input type="datetime-local" {...register('freezerOffTime')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Temperature Class</label>
                  <div className="relative">
                    <select {...register('freezerMode')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none appearance-none">
                      <option value="Not Mentioned">Not Mentioned</option>
                      <option value="Plus Cool">Plus Cool</option>
                      <option value="Negative Temp">Negative Temp</option>
                      <option value="Ambient">Ambient</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-emerald-50/80 border border-emerald-100 rounded-2xl flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Freezer Duration (HRS)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      {...register('freezerTotalHours')}
                      readOnly
                      className="bg-transparent text-2xl font-black text-gray-900 text-right outline-none w-32 font-mono cursor-default"
                    />
                    <span className="text-xs font-bold text-emerald-400">HRS</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Freezer Remarks</label>
                <textarea {...register('freezerRemarks')} rows={2} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-bold outline-none resize-none" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Remarks & Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mission Narrative / Trip Description</label>
              <textarea {...register('remarks')} rows={4} placeholder="Operational details, remarks, or observations..." className="w-full p-6 bg-gray-50 border border-gray-200 rounded-[2rem] text-gray-900 font-bold outline-none resize-none text-xs" />
            </div>
            <div className="space-y-10">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Log Disposition / Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {['On Trip', 'Completed', 'Breakdown', 'Cancelled'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValue('status', s as any)}
                      className={cn(
                        "px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border",
                        selectedStatus === s
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:border-indigo-100"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {selectedStatus === 'Breakdown' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3"
                >
                  <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Mechanical Failure Reason</label>
                  <input type="text" {...register('breakdownReason')} placeholder="Reason for mechanical failure..." className="w-full bg-rose-50 border border-rose-100 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                  {errors.breakdownReason && (
                    <p className="text-[10px] font-bold text-rose-500 px-1">{errors.breakdownReason.message}</p>
                  )}
                </motion.div>
              )}

              {selectedStatus === 'Cancelled' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3"
                >
                  <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Cancellation Reason</label>
                  <input type="text" {...register('cancelReason')} placeholder="Reason for cancellation..." className="w-full bg-rose-50 border border-rose-100 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                  {errors.cancelReason && (
                    <p className="text-[10px] font-bold text-rose-500 px-1">{errors.cancelReason.message}</p>
                  )}
                </motion.div>
              )}

              <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Entry Verifier</p>
                    <p className="text-xs font-bold text-gray-500 truncate max-w-[240px] sm:max-w-xs">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-5 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center space-x-4 disabled:opacity-50 active:scale-95 group/btn"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="uppercase tracking-[0.3em] text-[10px]">{id ? 'Commit Changes' : 'Initialize Engagement'}</span>
                      <Save className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  );
};

export default LogFormPage;
