import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Wrench, 
  Truck, 
  Package, 
  Calendar, 
  DollarSign, 
  Save, 
  FileText
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { getMaintenanceRecord, createMaintenanceRecord, updateMaintenanceRecord } from '../../services/maintenanceService';
import { useFleet } from '../../hooks/useFleet';
import { useSuppliers } from '../../hooks/useSuppliers';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import FileUpload from '../../components/shared/FileUpload';

const maintenanceSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  supplierId: z.string().optional().or(z.literal('')),
  date: z.string().min(1, 'Service date is required'),
  description: z.string().min(10, 'Details of work are required'),
  cost: z.number().min(0, 'Cost must be positive'),
  partsReplaced: z.string().optional(),
  billUrl: z.string().optional()
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

const MaintenanceFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vehicles } = useFleet();
  const { suppliers } = useSuppliers();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      cost: 0
    }
  });

  const billUrl = watch('billUrl');

  useEffect(() => {
    if (id) {
      const fetchRecord = async () => {
        try {
          const data = await getMaintenanceRecord(id);
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
      fetchRecord();
    }
  }, [id, setValue]);

  const onSubmit = async (data: MaintenanceFormData) => {
    try {
      setLoading(true);
      if (id) {
        await updateMaintenanceRecord(id, data);
      } else {
        await createMaintenanceRecord(data);
      }
      navigate('/garage');
    } catch (err) {
      console.error(err);
      alert('Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader 
        title={id ? 'Amend Service Record' : 'Log Maintenance Event'} 
        subtitle={id ? 'Recalibrating mechanical history and financial impact.' : 'Recording fleet intervention for performance auditing.'}
        back="/garage"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Wrench className="w-32 h-32 text-indigo-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {/* Primary Context */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Target Asset</label>
              <div className="relative group">
                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 w-5 h-5 transition-colors" />
                <select
                  {...register('vehicleId')}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-black text-gray-900 uppercase appearance-none",
                    errors.vehicleId && "border-red-500/50"
                  )}
                >
                  <option value="" className="bg-white text-gray-400 italic">-- Select Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id} className="bg-white text-gray-900 font-bold">{v.plateNo} ({v.type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Service Provider / Garage</label>
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors" />
                <select
                  {...register('supplierId')}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 appearance-none"
                >
                  <option value="" className="bg-white text-gray-400 italic">-- Internal / Third Party --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id} className="bg-white text-gray-900 uppercase tracking-tighter">{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Intervention Date</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors" />
                <input
                  {...register('date')}
                  type="date"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900",
                    errors.date && "border-red-500/50"
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Financial Expenditure (LKR)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 text-xs font-black">LKR</div>
                <input
                  {...register('cost', { valueAsNumber: true })}
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  className={cn(
                    "w-full pl-14 pr-4 py-4 bg-amber-50 border border-amber-200 rounded-2xl focus:ring-1 focus:ring-amber-500/50 outline-none transition-all font-black text-gray-900",
                    errors.cost && "border-red-500/50"
                  )}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Technical Work Description</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Exhaustive details of structural, mechanical, or electrical work performed..."
                className={cn(
                  "w-full p-6 bg-gray-50 border border-gray-200 rounded-3xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 resize-none",
                  errors.description && "border-red-500/50"
                )}
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Components / Parts Exchanged</label>
              <input
                {...register('partsReplaced')}
                placeholder="e.g. Brake Pads (Front), Filter Set, Lube Exchange"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="md:col-span-2 pt-4">
               <FileUpload 
                 label="Fiscal Invoice / Service Bill (Visual Evidence)"
                 path="maintenance/bills"
                 onUploadComplete={(url) => setValue('billUrl', url)}
                 currentUrl={billUrl}
               />
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
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Synchronize Record' : 'Commit Entry'}</span>
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

export default MaintenanceFormPage;
