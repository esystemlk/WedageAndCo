import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Save, 
  AlertCircle,
  Clock,
  Navigation,
  User,
  Truck,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createGatePass, getGatePass, updateGatePass, GatePass } from '../../services/gatePassService';
import { getVehicles } from '../../services/fleetService';
import { getStaffMembers } from '../../services/staffService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';

const gatePassSchema = z.object({
  linkedLogSheetNo: z.string().min(1, 'Linked Log Sheet No is required'),
  date: z.string().min(1, 'Date is required'),
  vehicleNo: z.string().min(1, 'Vehicle is required'),
  driverName: z.string().min(1, 'Driver is required'),
  passengers: z.string().optional(),
  timeOut: z.string().min(1, 'Time Out is required'),
  meterOut: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v),
  reason: z.string().min(1, 'Reason is required'),
  securityOfficer: z.string().min(1, 'Security Officer name is required'),
  remarks: z.string().optional(),
  status: z.enum(['Open', 'Returned', 'Cancelled']),
  timeIn: z.string().optional(),
  meterIn: z.number().optional().or(z.literal(null)).or(z.literal('')).transform(v => (v === null || v === '') ? undefined : typeof v === 'string' ? parseFloat(v) : v),
});

type GatePassFormData = z.infer<typeof gatePassSchema>;

const GatePassFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<GatePassFormData>({
    resolver: zodResolver(gatePassSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: 'Open',
      timeOut: formatTime(new Date())
    }
  });

  function formatTime(date: Date) {
    let hours = date.getHours();
    let minutes: string | number = date.getMinutes();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0'+minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
  }

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [vData, sData] = await Promise.all([getVehicles(), getStaffMembers()]);
        setVehicles(vData || []);
        setStaff(sData || []);

        if (id) {
          const pass = await getGatePass(id);
          if (pass) {
            Object.keys(pass).forEach((key) => {
              if (key !== 'id' && key !== 'createdAt') {
                setValue(key as any, (pass as any)[key]);
              }
            });
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
        await updateGatePass(id, data);
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
          title={id ? "Authorize Return" : "Issue Gate Pass"} 
          subtitle={id ? "Finalizing vehicle return movement" : "Initiating new vehicle gate exit protocol"}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Header Info */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-10 shadow-xl shadow-gray-200/50">
             <div className="flex items-center gap-4">
                <div className="h-px bg-gray-100 flex-1"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Movement Authorization</h3>
                <div className="h-px bg-gray-100 flex-1"></div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                   <div className="flex items-center gap-2 px-1">
                      <FileText className="w-3 h-3 text-indigo-600" />
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Log Sheet No</label>
                   </div>
                   <input 
                    type="text" 
                    {...register('linkedLogSheetNo')}
                    placeholder="e.g. LS-2026-1102"
                    className={cn(
                      "w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-300 shadow-sm shadow-inner",
                      errors.linkedLogSheetNo && "border-rose-300 bg-rose-50"
                    )} 
                   />
                </div>

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
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                   <div className="flex items-center gap-2 px-1">
                      <Truck className="w-3 h-3 text-indigo-600" />
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle No</label>
                   </div>
                   <select 
                    {...register('vehicleNo')}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm appearance-none cursor-pointer shadow-sm shadow-inner"
                   >
                    <option value="" className="bg-white text-gray-900">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.plateNo} className="bg-white text-gray-900">{v.plateNo} - {v.type}</option>
                    ))}
                   </select>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-2 px-1">
                      <User className="w-3 h-3 text-indigo-600" />
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Driver Name</label>
                   </div>
                   <select 
                    {...register('driverName')}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm appearance-none cursor-pointer shadow-sm shadow-inner"
                   >
                    <option value="" className="bg-white text-gray-900">Select Driver</option>
                    {staff.filter(s => s.category === 'Driver').map(s => (
                      <option key={s.id} value={s.fullName} className="bg-white text-gray-900">{s.fullName}</option>
                    ))}
                   </select>
                </div>
             </div>
          </div>

          {/* Details Section */}
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-10 shadow-xl shadow-gray-200/50">
             <div className="flex items-center gap-4">
                <div className="h-px bg-gray-100 flex-1"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Observation & Meter Data</h3>
                <div className="h-px bg-gray-100 flex-1"></div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Passenger(s)</label>
                      <input 
                        type="text" 
                        {...register('passengers')}
                        placeholder="Additional crew/passengers"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-300 shadow-sm shadow-inner"
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Purpose / Reason</label>
                      <textarea 
                        {...register('reason')}
                        rows={3}
                        placeholder="e.g. Scheduled Delivery to Kothmale"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm resize-none shadow-sm shadow-inner"
                      />
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                         <select 
                          {...register('status')}
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm appearance-none cursor-pointer shadow-sm shadow-inner"
                         >
                          <option value="Open" className="bg-white">Open</option>
                          <option value="Returned" className="bg-white">Returned</option>
                          <option value="Cancelled" className="bg-white">Cancelled</option>
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Time Out</label>
                         <input 
                          type="text" 
                          {...register('timeOut')}
                          placeholder="HH:MM AM/PM"
                          className="w-full px-6 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-bold text-gray-900 text-sm shadow-sm"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
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
                         <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Time In</label>
                         <input 
                          type="text" 
                          {...register('timeIn')}
                          placeholder="HH:MM AM/PM"
                          disabled={watch('status') !== 'Returned'}
                          className="w-full px-6 py-4 bg-rose-50 border border-rose-100 rounded-2xl focus:ring-1 focus:ring-rose-500/50 outline-none transition-all font-bold text-gray-900 text-sm disabled:opacity-30 shadow-sm"
                         />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Meter In (At Return)</label>
                      <input 
                        type="number" 
                        {...register('meterIn')}
                        placeholder="00.00"
                        disabled={watch('status') !== 'Returned'}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-mono font-black text-gray-900 text-sm disabled:opacity-30 shadow-sm shadow-inner"
                      />
                   </div>
                </div>
             </div>
          </div>
        </div>

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

              <button 
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-indigo-100 active:scale-95"
              >
                {loading ? <LoadingSpinner /> : (
                  <>
                    <Save className="w-4 h-4" />
                    Commit Gate Pass
                  </>
                )}
              </button>
           </div>

           {(errors.linkedLogSheetNo || errors.vehicleNo || errors.driverName || errors.reason || errors.securityOfficer) && (
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
                    {errors.linkedLogSheetNo && <li>Log Sheet link is mandatory</li>}
                    {errors.vehicleNo && <li>Vehicle selection required</li>}
                    {errors.driverName && <li>Driver assignment required</li>}
                    {errors.reason && <li>Clear purpose is mandatory</li>}
                    {errors.securityOfficer && <li>Recording officer name required</li>}
                 </ul>
              </motion.div>
           )}
        </div>
      </form>
    </div>
  );
};

export default GatePassFormPage;
