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
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  helperId: z.string().optional().or(z.literal('')),
  customerId: z.string().min(1, 'Customer is required'),
  startMileage: z.number().min(0, 'Start mileage must be positive'),
  endMileage: z.number().optional().or(z.literal(0)),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional().or(z.literal('')),
  purpose: z.string().optional(),
  status: z.enum(['on-trip', 'completed']),
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
      status: 'on-trip',
      startTime: new Date().toISOString().slice(0, 16),
      startMileage: 0
    }
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    if (id) {
      const fetchLog = async () => {
        try {
          const data = await getLogSheet(id);
          if (data) {
             setValue('vehicleId', data.vehicleId);
             setValue('driverId', data.driverId);
             setValue('helperId', data.helperId || '');
             setValue('customerId', data.customerId);
             setValue('startMileage', data.startMileage);
             setValue('endMileage', data.endMileage || 0);
             setValue('startTime', data.startTime);
             setValue('endTime', data.endTime || '');
             setValue('purpose', data.purpose || '');
             setValue('status', data.status);
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
        authorisedBy: user?.email || 'Unknown',
        // Filter out empty strings for optional IDs
        helperId: data.helperId || undefined,
        endTime: data.endTime || undefined,
        endMileage: data.endMileage || undefined,
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

  const activeDrivers = staff.filter(s => s.type === 'driver' && s.active);
  const activeHelpers = staff.filter(s => s.type === 'helper' && s.active);
  const activeVehicles = vehicles.filter(v => v.status === 'active');

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader 
        title={id ? 'Amend Operational Log' : 'Initialize Mission Log'} 
        subtitle={id ? 'Transcribing mechanical telemetry and deployment data.' : 'Commencing new logistics engagement.'}
        back="/logs"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] p-8 lg:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <ClipboardList className="w-32 h-32 text-white" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
          {/* Mission Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="md:col-span-2 flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
               <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Control Status</p>
                  <p className="text-sm font-bold text-white uppercase mt-1">{selectedStatus === 'on-trip' ? 'Engagement Active' : 'Operation Terminated'}</p>
               </div>
               <div className="flex bg-black p-1 rounded-xl border border-white/5">
                  {(['on-trip', 'completed'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValue('status', s)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        selectedStatus === s ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {s}
                    </button>
                  ))}
               </div>
            </div>

            {/* Assets & Personnel */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest px-1">Deploy Vehicle</label>
              <div className="relative group">
                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 w-5 h-5 transition-colors" />
                <select
                  {...register('vehicleId')}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-bold text-white uppercase appearance-none",
                    errors.vehicleId && "border-red-500/50"
                  )}
                >
                  <option value="" className="bg-[#0a0a0a]">-- Select Active Asset --</option>
                  {activeVehicles.map(v => (
                    <option key={v.id} value={v.id} className="bg-[#0a0a0a]">{v.plateNo} ({v.type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Designated Driver</label>
              <div className="relative group">
                <UserSquare2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 w-5 h-5 transition-colors" />
                <select
                  {...register('driverId')}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white appearance-none",
                    errors.driverId && "border-red-500/50"
                  )}
                >
                  <option value="" className="bg-[#0a0a0a]">-- Select Driver --</option>
                  {activeDrivers.map(d => (
                    <option key={d.id} value={d.id} className="bg-[#0a0a0a] uppercase tracking-tighter">{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Contractor / Customer</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 transition-colors" />
                <select
                  {...register('customerId')}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white uppercase appearance-none",
                    errors.customerId && "border-red-500/50"
                  )}
                >
                  <option value="" className="bg-[#0a0a0a]">-- Select Employer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0a0a0a]">{c.nickname || c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Operational Helper (Optional)</label>
              <div className="relative group">
                <UserSquare2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5 transition-colors" />
                <select
                  {...register('helperId')}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white appearance-none"
                >
                  <option value="" className="bg-[#0a0a0a]">-- None Assigned --</option>
                  {activeHelpers.map(h => (
                    <option key={h.id} value={h.id} className="bg-[#0a0a0a]">{h.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Telemetry */}
          <div className="space-y-8">
             <div className="flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Operation Telemetry</h3>
                <div className="h-px bg-white/10 flex-1"></div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl space-y-6">
                   <div className="flex items-center gap-3 mb-4">
                      <Compass className="w-5 h-5 text-indigo-400" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Entry Data</span>
                   </div>
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-1">T-Zero Clock</label>
                         <input type="datetime-local" {...register('startTime')} className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-1">Starting Odometer (KM)</label>
                         <input type="number" {...register('startMileage', { valueAsNumber: true })} className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all" />
                      </div>
                   </div>
                </div>

                <div className={cn(
                  "p-8 border rounded-3xl space-y-6 transition-all",
                  selectedStatus === 'completed' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-white/[0.02] border-white/5 opacity-40 pointer-events-none"
                )}>
                   <div className="flex items-center gap-3 mb-4">
                      <Zap className="w-5 h-5 text-emerald-400" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Conclusion Data</span>
                   </div>
                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-1">Mission End Clock</label>
                         <input type="datetime-local" {...register('endTime')} className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] text-gray-600 font-bold uppercase tracking-widest px-1">Final Odometer (KM)</label>
                         <input type="number" {...register('endMileage', { valueAsNumber: true })} className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all" />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Mission Narrative / Remarks</label>
              <textarea
                {...register('purpose')}
                rows={2}
                placeholder="Operational purpose, unusual events, cargo details..."
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600 resize-none"
              />
          </div>

          <div className="pt-10 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Settings className="w-5 h-5 text-gray-600" />
               <div>
                  <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Authorised By</p>
                  <p className="text-xs font-bold text-gray-400">{user?.email}</p>
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/10 flex items-center space-x-3 disabled:bg-indigo-900 disabled:text-gray-500 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Archive Modifications' : 'Initialize Mission'}</span>
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

export default LogFormPage;
