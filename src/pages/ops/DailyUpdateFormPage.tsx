import React, { useState, useEffect } from 'react';
import {
   Calendar,
   Truck,
   Save,
   ArrowLeft,
   User,
   AlertTriangle,
   FileText,
   Info,
   Building2,
   Wrench,
   HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddModal, { QuickAddType } from '../../components/shared/QuickAddModal';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createDailyUpdate } from '../../services/dailyUpdateService';
import { useFleet } from '../../hooks/useFleet';
import { useStaff } from '../../hooks/useStaff';
import { useCustomers } from '../../hooks/useCustomers';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { cn } from '../../lib/utils';

const dailyUpdateSchema = z.object({
   date: z.string().min(1, 'Date is required'),
   vehicleId: z.string().min(1, 'Vehicle is required'),
   actualDriverId: z.string().min(1, 'Driver is required'),
   actualHelperId: z.string().optional().or(z.literal('')),
   customerId: z.string().optional().or(z.literal('')),
   status: z.enum(['On Trip', 'Breakdown', 'Yard Parking', 'Under Repair', 'Other']),
   fuelPumped: z.number().optional().or(z.literal(null)).transform(v => v === null ? undefined : v).or(z.nan().transform(() => undefined)),
   breakdownReason: z.string().optional().or(z.literal('')),
   underRepairReason: z.string().optional().or(z.literal('')),
   otherReason: z.string().optional().or(z.literal('')),
   remarks: z.string().optional().or(z.literal('')),
   temporaryDriverName: z.string().optional(),
   temporaryHelperName: z.string().optional(),
   additionalHelpers: z.string().optional(),
}).refine(data => {
   if (data.status === 'Breakdown' && !data.breakdownReason?.trim()) {
      return false;
   }
   return true;
}, {
   message: "Critical Failure Reason is required",
   path: ["breakdownReason"]
}).refine(data => {
   if (data.status === 'Under Repair' && !data.underRepairReason?.trim()) {
      return false;
   }
   return true;
}, {
   message: "Under Repair reason is required",
   path: ["underRepairReason"]
}).refine(data => {
   if (data.status === 'Other' && !data.otherReason?.trim()) {
      return false;
   }
   return true;
}, {
   message: "Please specify reason for 'Other' status",
   path: ["otherReason"]
}).refine(data => {
   if (data.actualDriverId === 'temp' && !data.temporaryDriverName?.trim()) {
      return false;
   }
   return true;
}, {
   message: "Temporary Driver Name is required",
   path: ["temporaryDriverName"]
}).refine(data => {
   if (data.actualHelperId === 'temp' && !data.temporaryHelperName?.trim()) {
      return false;
   }
   return true;
}, {
   message: "Temporary Helper Name is required",
   path: ["temporaryHelperName"]
});

type DailyUpdateFormData = z.infer<typeof dailyUpdateSchema>;

const DailyUpdateFormPage: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const { vehicles, refresh: refreshVehicles } = useFleet();
   const { staff, refresh: refreshStaff } = useStaff();
   const { customers, refresh: refreshCustomers } = useCustomers();
   const [quickAdd, setQuickAdd] = useState<{ type: QuickAddType; onCreated: (id: string, label: string) => void } | null>(null);
   const [loading, setLoading] = useState(false);

   const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<DailyUpdateFormData>({
      resolver: zodResolver(dailyUpdateSchema),
      defaultValues: {
         date: new Date().toISOString().split('T')[0],
         status: 'Yard Parking',
         customerId: '',
         actualDriverId: '',
         actualHelperId: '',
         temporaryDriverName: '',
         temporaryHelperName: '',
         additionalHelpers: '',
         breakdownReason: '',
         underRepairReason: '',
         otherReason: ''
      }
   });

   const selectedStatus = watch('status');
   const actualDriverId = watch('actualDriverId');
   const actualHelperId = watch('actualHelperId');

   const onSubmit = async (data: DailyUpdateFormData) => {
      try {
         setLoading(true);
         const vehicle = vehicles.find(v => v.id === data.vehicleId);
         const driver = data.actualDriverId === 'temp' ? null : staff.find(s => s.id === data.actualDriverId);
         const helper = data.actualHelperId === 'temp' ? null : staff.find(s => s.id === data.actualHelperId);
         const customer = customers.find(c => c.id === data.customerId);

         const dayOfWeek = new Date(data.date).toLocaleDateString('en-US', { weekday: 'long' });

         await createDailyUpdate({
            ...data,
            dayOfWeek,
            vehicleNo: vehicle?.plateNo || '',
            actualDriverName: data.actualDriverId === 'temp' ? (data.temporaryDriverName || 'Temporary Driver') : (driver?.fullName || ''),
            actualHelperName: data.actualHelperId === 'temp' ? (data.temporaryHelperName || 'Temporary Helper') : (helper?.fullName || ''),
            customerName: customer?.name || '',
            enteredBy: user?.email || 'Unknown',
            actualHelperId: data.actualHelperId === 'temp' ? undefined : (data.actualHelperId || undefined),
         } as any);

         navigate('/daily-updates');
      } catch (err) {
         console.error(err);
         alert('Failed to log asset status');
      } finally {
         setLoading(false);
      }
   };

   const activeVehicles = vehicles.filter(v => v.status === 'active');
   const activeDrivers = staff.filter(s => s.category === 'Driver');
   const activeHelpers = staff.filter(s => s.category === 'Helper');

   const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      'On Trip': { color: 'bg-blue-600', icon: <Truck className="w-3 h-3" /> },
      'Yard Parking': { color: 'bg-gray-600', icon: <Building2 className="w-3 h-3" /> },
      'Breakdown': { color: 'bg-rose-600', icon: <AlertTriangle className="w-3 h-3" /> },
      'Under Repair': { color: 'bg-amber-600', icon: <Wrench className="w-3 h-3" /> },
      'Other': { color: 'bg-purple-600', icon: <HelpCircle className="w-3 h-3" /> },
   };

   return (
      <div className="max-w-4xl mx-auto pb-20">
         <div className="flex items-center gap-4 mb-2">
            <button
               onClick={() => navigate('/daily-updates')}
               className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
            >
               <ArrowLeft className="w-5 h-5" />
            </button>
            <PageHeader
               title="Daily Asset Logging"
               subtitle="Recording operational readiness and status for fleet management."
            />
         </div>

         <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-12"
            >
               {/* Primary Sync */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Sync Date</label>
                     <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                        <input type="date" {...register('date')} className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none [color-scheme:light]" />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Operational Asset</label>
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
                              onAddNew={() => setQuickAdd({ type: 'vehicle', onCreated: (id) => { field.onChange(id); refreshVehicles(); } })}
                              addNewLabel="Add New Vehicle"
                           />
                        )}
                     />
                     {errors.vehicleId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.vehicleId.message}</p>}
                  </div>
               </div>

               {/* Crew Configuration */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Active Driver</label>
                     <Controller
                        control={control}
                        name="actualDriverId"
                        render={({ field }) => (
                           <SearchableSelect
                              options={[
                                 { value: 'temp', label: 'Temporary Driver (Manual Entry)' },
                                 ...activeDrivers.map(d => ({ value: d.id!, label: d.fullName, subLabel: d.phone }))
                              ]}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Assigned Duty Driver"
                              icon={<User className="w-4 h-4 text-indigo-600" />}
                              onAddNew={() => setQuickAdd({ type: 'driver', onCreated: (id) => { field.onChange(id); refreshStaff(); } })}
                              addNewLabel="Add New Driver"
                           />
                        )}
                     />
                     {errors.actualDriverId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.actualDriverId.message}</p>}

                     {actualDriverId === 'temp' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
                           <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Temporary Driver Name</label>
                           <input type="text" {...register('temporaryDriverName')} placeholder="Enter full name of driver" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm" />
                           {errors.temporaryDriverName && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.temporaryDriverName.message}</p>}
                        </motion.div>
                     )}
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Engagement Helper (Optional)</label>
                     <Controller
                        control={control}
                        name="actualHelperId"
                        render={({ field }) => (
                           <SearchableSelect
                              options={[
                                 { value: 'temp', label: 'Temporary Helper (Manual Entry)' },
                                 ...activeHelpers.map(h => ({ value: h.id!, label: h.fullName, subLabel: h.phone }))
                              ]}
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="No Helper Assigned"
                              icon={<User className="w-4 h-4 text-gray-400" />}
                              onAddNew={() => setQuickAdd({ type: 'helper', onCreated: (id) => { field.onChange(id); refreshStaff(); } })}
                              addNewLabel="Add New Helper"
                           />
                        )}
                     />
                     {errors.actualHelperId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.actualHelperId.message}</p>}

                     {actualHelperId === 'temp' && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
                           <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Temporary Helper Name</label>
                           <input type="text" {...register('temporaryHelperName')} placeholder="Enter full name of helper" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm" />
                           {errors.temporaryHelperName && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.temporaryHelperName.message}</p>}
                        </motion.div>
                     )}
                  </div>
               </div>

               {/* Additional Crew / Helpers */}
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Additional Helpers / Crew</label>
                  <input type="text" {...register('additionalHelpers')} placeholder="e.g. Nimal, Sunil (comma separated)" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm" />
               </div>

               {/* Deployment Status */}
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Current Tactical Status</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {(['On Trip', 'Yard Parking', 'Breakdown', 'Under Repair', 'Other'] as const).map(s => (
                        <button
                           key={s}
                           type="button"
                           onClick={() => setValue('status', s)}
                           className={cn(
                              "px-4 py-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm flex items-center justify-center gap-2",
                              selectedStatus === s
                                 ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100"
                                 : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                           )}
                        >
                           {s}
                        </button>
                     ))}
                  </div>
                  {selectedStatus === 'On Trip' && (
                     <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Note: Changing from "On Trip" from a previous day requires Manager authorization.</p>
                     </motion.div>
                  )}
               </div>

               {/* Reason fields for statuses that require it */}
               <div className="space-y-4">
                  {selectedStatus === 'Breakdown' && (
                     <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                        <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Critical Failure Reason *</label>
                        <div className="relative">
                           <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-600" />
                           <input type="text" {...register('breakdownReason')} placeholder="Describe mechanical fault" className="w-full bg-rose-50 border border-rose-100 pl-12 pr-4 py-4 rounded-2xl text-rose-900 font-bold outline-none" />
                        </div>
                        {errors.breakdownReason && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.breakdownReason.message}</p>}
                     </motion.div>
                  )}

                  {selectedStatus === 'Under Repair' && (
                     <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                        <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Under Repair — Reason *</label>
                        <div className="relative">
                           <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                           <input type="text" {...register('underRepairReason')} placeholder="Describe what is being repaired" className="w-full bg-amber-50 border border-amber-100 pl-12 pr-4 py-4 rounded-2xl text-amber-900 font-bold outline-none" />
                        </div>
                        {errors.underRepairReason && <p className="text-[10px] font-bold text-amber-600 px-1">{errors.underRepairReason.message}</p>}
                     </motion.div>
                  )}

                  {selectedStatus === 'Other' && (
                     <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                        <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest px-1">Specify Reason *</label>
                        <div className="relative">
                           <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600" />
                           <input type="text" {...register('otherReason')} placeholder="Describe the situation" className="w-full bg-purple-50 border border-purple-100 pl-12 pr-4 py-4 rounded-2xl text-purple-900 font-bold outline-none" />
                        </div>
                        {errors.otherReason && <p className="text-[10px] font-bold text-purple-600 px-1">{errors.otherReason.message}</p>}
                     </motion.div>
                  )}
               </div>

               {/* Customer Assignment */}
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Assign to Customer</label>
                  <Controller
                     control={control}
                     name="customerId"
                     render={({ field }) => (
                        <SearchableSelect
                           options={customers.map(c => ({ value: c.id!, label: c.name, subLabel: c.nickname || undefined }))}
                           value={field.value || ''}
                           onChange={field.onChange}
                           placeholder="Select Customer (Optional)"
                           icon={<Building2 className="w-4 h-4 text-gray-400" />}
                           onAddNew={() => setQuickAdd({ type: 'customer', onCreated: (id) => { field.onChange(id); refreshCustomers(); } })}
                           addNewLabel="Add New Customer"
                        />
                     )}
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Operational Remarks</label>
                  <div className="relative">
                     <FileText className="absolute left-4 top-6 w-4 h-4 text-gray-400" />
                     <textarea {...register('remarks')} rows={3} placeholder="Substituted vehicle details, special instructions, etc." className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-6 rounded-[2.5rem] text-gray-900 font-bold outline-none resize-none shadow-sm" />
                  </div>
               </div>

               <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                        <Info className="w-5 h-5 text-indigo-600" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logging Protocol</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">Asset ID: {watch('vehicleId') || 'UNSELECTED'}</p>
                     </div>
                  </div>

                  <button
                     type="submit"
                     disabled={loading}
                     className="w-full sm:w-auto bg-indigo-600 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                  >
                     {loading ? <LoadingSpinner /> : (
                        <>
                           <Save className="w-4 h-4" />
                           Commit Operations Log
                        </>
                     )}
                  </button>
               </div>
            </motion.div>
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

export default DailyUpdateFormPage;
