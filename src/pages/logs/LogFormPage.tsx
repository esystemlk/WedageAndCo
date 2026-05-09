import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
  Zap
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

const logSchema = z.object({
  logSheetCode: z.string().min(1, 'Log Sheet Code is required'),
  date: z.string().min(1, 'Date is required'),
  customerId: z.string().min(1, 'Customer is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  helperId: z.string().optional().or(z.literal('')),
  representative: z.string().optional().or(z.literal('')),
  
  // Meter Reading
  meterStatus: z.enum(['Working', 'Not Working']),
  startMileage: z.number().min(0, 'Start mileage must be positive').optional().or(z.literal(0)),
  endMileage: z.number().optional().or(z.literal(0)),
  totalKm: z.number().min(0, 'Total KM must be positive'),
  outTime: z.string().min(1, 'Time Out is required'),
  inTime: z.string().optional().or(z.literal('')),
  meterNonWorkingReason: z.string().optional(),

  // Freezer Section
  vehicleHasFreezer: z.boolean(),
  freezerStatus: z.enum(['ON', 'OFF']).optional(),
  freezerOnTime: z.string().optional().or(z.literal('')),
  freezerOffTime: z.string().optional().or(z.literal('')),
  freezerTotalHours: z.string().optional().or(z.literal('')),
  freezerTemp: z.number().optional().or(z.literal(0)),
  freezerRemarks: z.string().optional(),

  // Status & Remarks
  status: z.enum(['On Trip', 'Completed', 'Breakdown', 'Cancelled']),
  remarks: z.string().optional(),
  breakdownReason: z.string().optional(),
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

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      logSheetCode: `LS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      status: 'On Trip',
      meterStatus: 'Working',
      vehicleHasFreezer: false,
      freezerStatus: 'OFF',
      outTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalKm: 0
    }
  });

  const meterStatus = watch('meterStatus');
  const vehicleHasFreezer = watch('vehicleHasFreezer');
  const freezerStatus = watch('freezerStatus');
  const selectedStatus = watch('status');
  const startMileage = watch('startMileage') || 0;
  const endMileage = watch('endMileage') || 0;

  // Auto-calculate Total KM if meter is working
  useEffect(() => {
    if (meterStatus === 'Working' && endMileage > startMileage) {
      setValue('totalKm', endMileage - startMileage);
    }
  }, [meterStatus, startMileage, endMileage, setValue]);

  useEffect(() => {
    if (id) {
      const fetchLog = async () => {
        try {
          const data = await getLogSheet(id);
          if (data) {
             setValue('logSheetCode', data.logSheetCode);
             setValue('date', data.date);
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
             setValue('vehicleHasFreezer', data.vehicleHasFreezer);
             setValue('freezerStatus', data.freezerStatus || 'OFF');
             setValue('freezerOnTime', data.freezerOnTime || '');
             setValue('freezerOffTime', data.freezerOffTime || '');
             setValue('freezerTotalHours', data.freezerTotalHours || '');
             setValue('freezerTemp', data.freezerTemp);
             setValue('freezerRemarks', data.freezerRemarks || '');
             setValue('status', data.status);
             setValue('remarks', data.remarks || '');
             setValue('breakdownReason', data.breakdownReason || '');
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
        helperId: data.helperId || undefined,
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-3">
                 <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Log Sheet Code</label>
                 <input type="text" {...register('logSheetCode')} placeholder="LS-2026-XXXX" className="w-full bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-gray-900 font-black outline-none tracking-widest" />
              </div>
              <div className="space-y-3">
                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Engagement Date</label>
                 <input type="date" {...register('date')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none focus:ring-1 focus:ring-indigo-500/50" />
              </div>
              <div className="space-y-3">
                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Customer / Employer</label>
                 <select {...register('customerId')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none appearance-none cursor-pointer">
                    <option value="" className="bg-white">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id} className="bg-white">{c.nickname || c.name}</option>)}
                 </select>
              </div>
              <div className="space-y-3">
                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Representative (REP)</label>
                 <input type="text" {...register('representative')} placeholder="Customer Rep Name" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none placeholder:text-gray-300" />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                 <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Tactical Asset</label>
                 <select {...register('vehicleId')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none appearance-none cursor-pointer border-emerald-100">
                    <option value="" className="bg-white text-gray-400">Select Vehicle</option>
                    {activeVehicles.map(v => <option key={v.id} value={v.id} className="bg-white">{v.plateNo} ({v.type})</option>)}
                 </select>
              </div>
              <div className="space-y-3">
                 <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Assigned Driver</label>
                 <select {...register('driverId')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none appearance-none cursor-pointer border-indigo-100">
                    <option value="" className="bg-white">Select Driver</option>
                    {activeDrivers.map(d => <option key={d.id} value={d.id} className="bg-white">{d.fullName}</option>)}
                 </select>
              </div>
              <div className="space-y-3">
                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mission Helper</label>
                 <select {...register('helperId')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none appearance-none cursor-pointer">
                    <option value="" className="bg-white">None Assigned</option>
                    {activeHelpers.map(h => <option key={h.id} value={h.id} className="bg-white">{h.fullName}</option>)}
                 </select>
              </div>
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
                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Reason for Failure</label>
                      <input type="text" {...register('meterNonWorkingReason')} placeholder="Brief explanation" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Departure Time</label>
                    <input type="text" {...register('outTime')} placeholder="HH:MM AM/PM" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                 </div>
                 <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Arrival Time</label>
                    <input type="text" {...register('inTime')} placeholder="HH:MM AM/PM" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                 </div>
              </div>

              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                 <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total Displacement (KM)</span>
                 <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      {...register('totalKm', { valueAsNumber: true })} 
                      readOnly={meterStatus === 'Working'}
                      className={cn(
                        "bg-transparent text-2xl font-black text-gray-900 text-right outline-none w-32 font-mono",
                        meterStatus === 'Working' && "cursor-default"
                      )} 
                    />
                    <span className="text-xs font-bold text-gray-400">KM</span>
                 </div>
              </div>
           </motion.div>

           {/* Freezer Section */}
           <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-8"
           >
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Refrigeration Control</h3>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Toggle</span>
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                       {['ON', 'OFF'].map((s) => (
                         <button
                           key={s}
                           type="button"
                           onClick={() => setValue('freezerStatus', s as any)}
                           className={cn(
                             "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                             freezerStatus === s ? "bg-emerald-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
                           )}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                    <button 
                      type="button"
                      onClick={() => setValue('vehicleHasFreezer', !vehicleHasFreezer)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                        vehicleHasFreezer ? "bg-emerald-600 shadow-lg shadow-emerald-500/10" : "bg-gray-100 border border-gray-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                        vehicleHasFreezer ? "left-7" : "left-1"
                      )} />
                    </button>
                 </div>
              </div>

              <div className={cn("space-y-6 transition-all", !vehicleHasFreezer && "opacity-20 pointer-events-none")}>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Freezer ON (Time)</label>
                       <input type="text" {...register('freezerOnTime')} placeholder="AM/PM" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Freezer OFF (Time)</label>
                       <input type="text" {...register('freezerOffTime')} placeholder="AM/PM" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Total Hrs (Vehicle)</label>
                       <input type="text" {...register('freezerTotalHours')} placeholder="HH:MM" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Temp Log (°C)</label>
                       <input type="number" {...register('freezerTemp', { valueAsNumber: true })} placeholder="0" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
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
                       <input type="text" {...register('breakdownReason')} className="w-full bg-rose-50 border border-rose-100 p-4 rounded-2xl text-gray-900 font-bold outline-none" />
                    </motion.div>
                 )}

                 <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Settings className="w-5 h-5 text-gray-400" />
                       <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Entry Verifier</p>
                          <p className="text-xs font-bold text-gray-500">{user?.email}</p>
                       </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-5 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center space-x-4 disabled:opacity-50 active:scale-95 group/btn"
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
