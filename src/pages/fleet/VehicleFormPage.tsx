import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Truck, 
  Settings, 
  Fuel, 
  ShieldCheck, 
  Save, 
  AlertCircle,
  Tag,
  Maximize,
  Weight
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { getVehicle, createVehicle, updateVehicle } from '../../services/fleetService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const vehicleSchema = z.object({
  plateNo: z.string().min(1, 'Plate number is required'),
  type: z.enum(['prime-mover', 'lorry', 'container', 'other']),
  make: z.string().optional(),
  model: z.string().optional(),
  chassisNo: z.string().optional(),
  engineNo: z.string().optional(),
  fuelType: z.enum(['diesel', 'petrol']),
  status: z.enum(['active', 'maintenance', 'unavailable']),
  ownership: z.enum(['owned', 'rented']),
  length: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v),
  width: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v),
  height: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v),
  weightCapacity: z.number().min(0).optional().or(z.literal(null)).transform(v => v === null ? undefined : v),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

const VehicleFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      type: 'prime-mover',
      fuelType: 'diesel',
      status: 'active',
      ownership: 'owned'
    }
  });

  const selectedType = watch('type');
  const selectedFuel = watch('fuelType');
  const selectedStatus = watch('status');
  const selectedOwnership = watch('ownership');

  useEffect(() => {
    if (id) {
      const fetchVehicle = async () => {
        try {
          const data = await getVehicle(id);
          if (data) {
             Object.keys(data).forEach(key => {
               if (key !== 'id') {
                 setValue(key as any, (data as any)[key]);
               }
             });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchVehicle();
    }
  }, [id, setValue]);

  const onSubmit = async (data: VehicleFormData) => {
    try {
      setLoading(true);
      if (id) {
        await updateVehicle(id, data);
      } else {
        await createVehicle(data);
      }
      navigate('/fleet');
    } catch (err) {
      console.error(err);
      alert('Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader 
        title={id ? 'Configure Asset Specs' : 'Register New Asset'} 
        subtitle={id ? 'Updating mechanical and ownership records.' : 'Expanding fleet capacity with new heavy-duty machinery.'}
        back="/fleet"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Truck className="w-32 h-32 text-indigo-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
          {/* Primary Identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vehicle Plate No.</label>
              <div className="relative group">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                <input
                  {...register('plateNo')}
                  placeholder="WP CAP-1234"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-black text-gray-900 uppercase placeholder:text-gray-400",
                    errors.plateNo && "border-red-500/50"
                  )}
                />
              </div>
              {errors.plateNo && <p className="mt-1 text-[10px] font-bold text-red-500 px-1 uppercase">{errors.plateNo.message}</p>}
            </div>

            <div className="lg:col-span-2 space-y-3">
               <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Asset Classification</label>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['prime-mover', 'lorry', 'container', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue('type', type)}
                      className={cn(
                        "px-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all truncate",
                        selectedType === type ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100" : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      {type.replace('-', ' ')}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          {/* Mechanical Specs */}
          <div className="space-y-8">
             <div className="flex items-center gap-4">
                <div className="h-px bg-gray-100 flex-1"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Mechanical Infrastructure</h3>
                <div className="h-px bg-gray-100 flex-1"></div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Make / Manufacturer</label>
                   <input {...register('make')} placeholder="e.g. TATA" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Model Series</label>
                   <input {...register('model')} placeholder="e.g. Prima 4028.S" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Chassis Serial</label>
                   <input {...register('chassisNo')} placeholder="M-123456789" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">Engine Code</label>
                   <input {...register('engineNo')} placeholder="E-987654321" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" />
                </div>
             </div>
          </div>

          {/* Logistics Specs */}
          <div className="space-y-8">
             <div className="flex items-center gap-4">
                <div className="h-px bg-gray-100 flex-1"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Logistics & Load Specs</h3>
                <div className="h-px bg-gray-100 flex-1"></div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 px-1">
                      <Maximize className="w-3 h-3 text-gray-400" />
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Length (FT)</label>
                   </div>
                   <input 
                    type="number" 
                    step="0.01"
                    {...register('length', { valueAsNumber: true })} 
                    placeholder="0.00" 
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" 
                   />
                </div>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 px-1">
                      <Maximize className="w-3 h-3 text-gray-400 rotate-90" />
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Width (FT)</label>
                   </div>
                   <input 
                    type="number" 
                    step="0.01"
                    {...register('width', { valueAsNumber: true })} 
                    placeholder="0.00" 
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" 
                   />
                </div>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 px-1">
                      <Maximize className="w-3 h-3 text-gray-400" />
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Height (FT)</label>
                   </div>
                   <input 
                    type="number" 
                    step="0.01"
                    {...register('height', { valueAsNumber: true })} 
                    placeholder="0.00" 
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" 
                   />
                </div>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 px-1">
                      <Weight className="w-3 h-3 text-gray-400" />
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Max Capacity (Tons)</label>
                   </div>
                   <input 
                    type="number" 
                    step="0.1"
                    {...register('weightCapacity', { valueAsNumber: true })} 
                    placeholder="0.0" 
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 text-sm placeholder:text-gray-400" 
                   />
                </div>
             </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-4">
             <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <Fuel className="w-4 h-4 text-amber-600" />
                   <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Fuel Core</span>
                </div>
                <div className="flex gap-2">
                   {(['diesel', 'petrol'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setValue('fuelType', f)}
                        className={cn(
                          "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          selectedFuel === f ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-gray-50 border-gray-100 text-gray-400"
                        )}
                      >
                        {f}
                      </button>
                   ))}
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <Settings className="w-4 h-4 text-indigo-600" />
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Operational Status</span>
                </div>
                <div className="flex gap-2">
                   {(['active', 'maintenance', 'unavailable'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setValue('status', s)}
                        className={cn(
                          "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          selectedStatus === s ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-gray-50 border-gray-100 text-gray-400"
                        )}
                      >
                        {s}
                      </button>
                   ))}
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <ShieldCheck className="w-4 h-4 text-emerald-600" />
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Financial Ownership</span>
                </div>
                <div className="flex gap-2">
                   {(['owned', 'rented'] as const).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setValue('ownership', o)}
                        className={cn(
                          "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          selectedOwnership === o ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-gray-50 border-gray-100 text-gray-400"
                        )}
                      >
                        {o}
                      </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="pt-10 border-t border-gray-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/10 flex items-center space-x-3 disabled:bg-indigo-200 disabled:text-gray-500 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Archive Modifications' : 'Initialize Asset'}</span>
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

export default VehicleFormPage;
