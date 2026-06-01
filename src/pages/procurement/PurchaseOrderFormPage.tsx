import React, { useState, useEffect } from 'react';
import {
   ShoppingCart,
   Plus,
   Trash2,
   Save,
   ArrowLeft,
   User,
   Package,
   Calendar,
   DollarSign,
   FileText,
   Info,
   Truck,
   Hash,
   CheckCircle,
   AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddModal, { QuickAddType } from '../../components/shared/QuickAddModal';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPurchaseOrder, getPurchaseOrders, POItem } from '../../services/poService';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useFleet } from '../../hooks/useFleet';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';

const poSchema = z.object({
   date: z.string().min(1, 'Date is required'),
   supplierId: z.string().min(1, 'Supplier is required'),
   deliveryAddress: z.string().optional(),
   paymentTerms: z.string().min(1, 'Payment terms are required'),
   requiredDeliveryDate: z.string().optional(),
   vehicleNo: z.string().optional(),
   storesLocation: z.string().optional(),
   invoiceNo: z.string().optional(),
   voucherNo: z.string().optional(),
   items: z.array(z.object({
      description: z.string().min(1, 'Required'),
      quantity: z.number().min(0.01, 'Min 0.01'),
      unit: z.string().min(1, 'Required'),
      unitPrice: z.number().min(0, 'Min 0'),
      total: z.number()
   })).min(1, 'At least one item is required'),
   taxAmount: z.number(),
   notes: z.string().optional(),
   status: z.enum(['Draft', 'Sent', 'Partially Received', 'Fully Received', 'Cancelled']),
   managerApproved: z.boolean().optional().default(false),
   managerApprovedBy: z.string().optional(),
});

type POFormData = z.infer<typeof poSchema>;

const PurchaseOrderFormPage: React.FC = () => {
   const navigate = useNavigate();
   const toast = useToast();
   const { user } = useAuth();
   const { suppliers, refresh: refreshSuppliers } = useSuppliers();
   const { vehicles } = useFleet();
   const [quickAdd, setQuickAdd] = useState<{ type: QuickAddType; onCreated: (id: string, label: string) => void } | null>(null);
   const [loading, setLoading] = useState(false);
   const [monthlySpend, setMonthlySpend] = useState(0);
   const MONTHLY_LIMIT = 500000; // Default monthly PO limit in LKR

   const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<POFormData>({
      resolver: zodResolver(poSchema),
      defaultValues: {
         date: new Date().toISOString().split('T')[0],
         items: [{ description: '', quantity: 1, unit: 'pcs', unitPrice: 0, total: 0 }],
         status: 'Draft',
         deliveryAddress: 'Main Warehouse, Wedage & Company',
         paymentTerms: 'Net 30',
         taxAmount: 0,
         managerApproved: false,
         managerApprovedBy: ''
      }
   });

   const { fields, append, remove } = useFieldArray({ control, name: "items" });

   const watchItems = watch('items');
   const watchTax = watch('taxAmount');
   const managerApproved = watch('managerApproved');

   const subTotal = watchItems.reduce((acc, item) => acc + (item.total || 0), 0);
   const grandTotal = subTotal + (watchTax || 0);
   const monthlyLimitPercent = Math.min(100, Math.round(((monthlySpend + grandTotal) / MONTHLY_LIMIT) * 100));

   // Fetch current month's spend
   useEffect(() => {
      const fetchMonthlySpend = async () => {
         try {
            const allPOs = await getPurchaseOrders();
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const monthlyTotal = (allPOs || [])
               .filter(po => {
                  const d = new Date(po.date);
                  return d.getMonth() === currentMonth && d.getFullYear() === currentYear && po.status !== 'Cancelled';
               })
               .reduce((sum, po) => sum + (po.grandTotal || 0), 0);
            setMonthlySpend(monthlyTotal);
         } catch (e) {
            console.error(e);
         }
      };
      fetchMonthlySpend();
   }, []);

   const calculateItemTotal = (index: number) => {
      const qty = watch(`items.${index}.quantity`);
      const price = watch(`items.${index}.unitPrice`);
      const total = qty * price;
      setValue(`items.${index}.total`, total);
   };

   const onSubmit = async (data: POFormData) => {
      try {
         setLoading(true);
         const supplier = suppliers.find(s => s.id === data.supplierId);

         await createPurchaseOrder({
            ...data,
            supplierName: supplier?.name || 'Unknown',
            requestedBy: user?.email || 'System',
            subTotal,
            grandTotal,
         } as any);

         toast.success('Purchase Order issued', `PO for ${supplier?.name || 'supplier'} was created.`);
         navigate('/purchase-orders');
      } catch (err) {
         console.error(err);
         toast.error('Failed to issue PO', 'Could not create the purchase order. Please try again.');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="max-w-5xl mx-auto pb-20">
         <div className="flex items-center gap-4 mb-2">
            <button onClick={() => navigate('/purchase-orders')} className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm">
               <ArrowLeft className="w-5 h-5" />
            </button>
            <PageHeader title="Purchase Order" subtitle="Issue formal purchase authorization to supply chain partners." />
         </div>

         {/* Auto-generated PO number notice */}
         <div className="mb-6 flex items-center gap-3 px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <Hash className="w-4 h-4 text-indigo-600 shrink-0" />
            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">PO Number will be auto-generated on submission (e.g. PO-2026-XXXX)</p>
         </div>

         {/* Monthly Limit Banner */}
         <div className={cn(
            "mb-6 px-6 py-4 rounded-2xl border flex items-start gap-4",
            monthlyLimitPercent >= 90 ? "bg-rose-50 border-rose-200" :
            monthlyLimitPercent >= 70 ? "bg-amber-50 border-amber-200" :
            "bg-emerald-50 border-emerald-100"
         )}>
            <AlertCircle className={cn(
               "w-5 h-5 shrink-0 mt-0.5",
               monthlyLimitPercent >= 90 ? "text-rose-600" :
               monthlyLimitPercent >= 70 ? "text-amber-600" : "text-emerald-600"
            )} />
            <div className="flex-1 space-y-2">
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                  Monthly PO Limit — LKR {MONTHLY_LIMIT.toLocaleString()}
               </p>
               <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white rounded-full border border-gray-200 overflow-hidden">
                     <div
                        className={cn("h-full rounded-full transition-all", monthlyLimitPercent >= 90 ? "bg-rose-500" : monthlyLimitPercent >= 70 ? "bg-amber-500" : "bg-emerald-500")}
                        style={{ width: `${monthlyLimitPercent}%` }}
                     />
                  </div>
                  <span className="text-[10px] font-black text-gray-600 shrink-0">
                     LKR {(monthlySpend + grandTotal).toLocaleString()} / {MONTHLY_LIMIT.toLocaleString()} ({monthlyLimitPercent}%)
                  </span>
               </div>
               {monthlyLimitPercent >= 100 && (
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">⚠ Monthly limit exceeded — manager approval required before issuing.</p>
               )}
            </div>
         </div>

         <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-12"
            >
               {/* Section: PO Header */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Date</label>
                        <div className="relative">
                           <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                           <input type="date" {...register('date')} className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none [color-scheme:light] shadow-sm" />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Supplier</label>
                        <Controller
                           control={control}
                           name="supplierId"
                           render={({ field }) => (
                              <SearchableSelect
                                 options={suppliers.map(s => ({ value: s.id!, label: s.name, subLabel: s.category || undefined }))}
                                 value={field.value}
                                 onChange={field.onChange}
                                 placeholder="Select Supplier"
                                 icon={<User className="w-4 h-4 text-emerald-600" />}
                                 onAddNew={() => setQuickAdd({ type: 'supplier', onCreated: (id) => { field.onChange(id); refreshSuppliers(); } })}
                                 addNewLabel="Add New Supplier"
                              />
                           )}
                        />
                        {errors.supplierId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.supplierId.message}</p>}
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vehicle No. (if applicable)</label>
                        <div className="relative">
                           <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <input type="text" {...register('vehicleNo')} placeholder="e.g. WP CAP-1234 or leave blank" className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm placeholder:text-gray-300" />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Stores / Delivery Location</label>
                        <div className="relative">
                           <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <input type="text" {...register('storesLocation')} placeholder="e.g. Main Warehouse, Store A" className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm placeholder:text-gray-300" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                        <div className="grid grid-cols-2 gap-3">
                           {['Draft', 'Sent'].map(s => (
                              <button
                                 key={s}
                                 type="button"
                                 onClick={() => setValue('status', s as any)}
                                 className={cn(
                                    "px-4 py-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm",
                                    watch('status') === s ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100" : "bg-gray-50 border-gray-100 text-gray-400"
                                 )}
                              >
                                 {s}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Payment Terms</label>
                        <input type="text" {...register('paymentTerms')} className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm placeholder:text-gray-400" placeholder="e.g. Net 30, Cash on Delivery" />
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Invoice No / Voucher No</label>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="relative">
                              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input type="text" {...register('invoiceNo')} placeholder="Invoice #" className="w-full bg-gray-50 border border-gray-100 pl-10 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm placeholder:text-gray-300 text-sm" />
                           </div>
                           <div className="relative">
                              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                              <input type="text" {...register('voucherNo')} placeholder="Voucher #" className="w-full bg-indigo-50/30 border border-indigo-100 pl-10 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm placeholder:text-indigo-200 text-sm" />
                           </div>
                        </div>
                     </div>

                     {/* Manager Approval */}
                     <div className="space-y-4 p-5 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                        <div className="flex items-center justify-between">
                           <div>
                              <label className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Manager Approval</label>
                              <p className="text-[9px] text-emerald-600/70 font-bold uppercase mt-0.5 tracking-widest">Required before issuing PO</p>
                           </div>
                           <button
                              type="button"
                              onClick={() => setValue('managerApproved', !managerApproved)}
                              className={cn(
                                 "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border",
                                 managerApproved ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white border-emerald-200 text-emerald-600"
                              )}
                           >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {managerApproved ? 'Approved' : 'Pending'}
                           </button>
                        </div>
                        {managerApproved && (
                           <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-0.5">Approved by Manager Name</label>
                              <input
                                 type="text"
                                 {...register('managerApprovedBy')}
                                 placeholder="Manager Name"
                                 className="w-full px-4 py-3 text-xs bg-white border border-emerald-100 rounded-xl outline-none font-bold text-gray-900"
                              />
                           </motion.div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Section: Line Items */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
                           <Package className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em]">Items</h3>
                     </div>
                     <button
                        type="button"
                        onClick={() => append({ description: '', quantity: 1, unit: 'pcs', unitPrice: 0, total: 0 })}
                        className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-white transition-all bg-indigo-50 hover:bg-indigo-600 px-4 py-2 rounded-full border border-indigo-100 shadow-sm"
                     >
                        <Plus className="w-3 h-3" />
                        Add Item
                     </button>
                  </div>

                  <div className="space-y-4">
                     <AnimatePresence>
                        {fields.map((field, index) => (
                           <motion.div
                              key={field.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="grid grid-cols-12 gap-4 items-end bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm"
                           >
                              <div className="col-span-12 md:col-span-5 space-y-2">
                                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Description / Item Name</label>
                                 <input
                                    type="text"
                                    {...register(`items.${index}.description`)}
                                    placeholder="Enter item or choose from inventory"
                                    className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-gray-900 text-xs font-bold outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-400 shadow-sm"
                                 />
                              </div>
                              <div className="col-span-3 md:col-span-1 space-y-2">
                                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">QTY</label>
                                 <input
                                    type="number"
                                    {...register(`items.${index}.quantity`, { valueAsNumber: true, onChange: () => calculateItemTotal(index) })}
                                    className="w-full bg-white border border-gray-200 px-3 py-3 rounded-xl text-gray-900 text-xs font-bold outline-none [appearance:textfield] shadow-sm"
                                 />
                              </div>
                              <div className="col-span-3 md:col-span-1 space-y-2">
                                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">UNIT</label>
                                 <input
                                    type="text"
                                    {...register(`items.${index}.unit`)}
                                    className="w-full bg-white border border-gray-200 px-3 py-3 rounded-xl text-gray-900 text-xs font-bold outline-none shadow-sm"
                                 />
                              </div>
                              <div className="col-span-6 md:col-span-2 space-y-2">
                                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">UNIT PRICE (LKR)</label>
                                 <input
                                    type="number"
                                    {...register(`items.${index}.unitPrice`, { valueAsNumber: true, onChange: () => calculateItemTotal(index) })}
                                    className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-gray-900 text-xs font-bold outline-none shadow-sm"
                                 />
                              </div>
                              <div className="col-span-5 md:col-span-2 space-y-2">
                                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">TOTAL (LKR)</label>
                                 <div className="w-full bg-gray-100 border border-gray-200 px-4 py-3 rounded-xl text-gray-900 text-xs font-black font-mono shadow-inner">
                                    {watchItems[index]?.total?.toLocaleString() || '0'}
                                 </div>
                              </div>
                              <div className="col-span-1 md:col-span-1 pb-1 flex justify-center">
                                 <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className={cn("p-3 rounded-xl text-gray-300 hover:text-rose-500 transition-all", fields.length === 1 && "pointer-events-none opacity-0")}
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </motion.div>
                        ))}
                     </AnimatePresence>
                  </div>
               </div>

               {/* Financial Summary */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Notes / Instructions</label>
                        <textarea {...register('notes')} rows={3} className="w-full bg-gray-50 border border-gray-100 p-6 rounded-[2rem] text-gray-900 font-bold outline-none resize-none text-xs shadow-sm shadow-inner" />
                     </div>
                  </div>

                  <div className="bg-indigo-50/30 p-10 rounded-[2.5rem] border border-indigo-100 shadow-sm space-y-8 flex flex-col justify-center">
                     <div className="flex justify-between items-center px-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Net Sub-total</span>
                        <span className="text-xl font-bold text-gray-900 font-mono">LKR {subTotal.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center px-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Tax</span>
                        <div className="relative w-32">
                           <input
                              type="number"
                              {...register('taxAmount', { valueAsNumber: true })}
                              className="w-full bg-white border-b border-gray-200 text-right px-2 py-1 text-gray-900 font-bold font-mono outline-none focus:border-indigo-600 transition-all"
                           />
                        </div>
                     </div>
                     <div className="pt-8 border-t border-indigo-100 flex justify-between items-center px-2">
                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.5em]">Grand Total</span>
                        <span className="text-3xl font-black text-gray-900 font-mono">LKR {grandTotal.toLocaleString()}</span>
                     </div>
                  </div>
               </div>

               <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
                        <Info className="w-5 h-5 text-indigo-600" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Procurement Integrity</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">Originator: {user?.email || 'SYSTEM_CORE'}</p>
                     </div>
                  </div>

                  <button
                     type="submit"
                     disabled={loading}
                     className="bg-indigo-600 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 disabled:opacity-50 active:scale-95"
                  >
                     {loading ? <LoadingSpinner /> : (
                        <>
                           <Save className="w-4 h-4" />
                           Issue Purchase Order
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

export default PurchaseOrderFormPage;
