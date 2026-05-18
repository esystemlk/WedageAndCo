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
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createPurchaseOrder, POItem } from '../../services/poService';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { cn } from '../../lib/utils';

const poSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  deliveryAddress: z.string().min(5, 'Delivery address is too short'),
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  requiredDeliveryDate: z.string().optional(),
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
});

type POFormData = z.infer<typeof poSchema>;

const PurchaseOrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { suppliers } = useSuppliers();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      items: [{ description: '', quantity: 1, unit: 'pcs', unitPrice: 0, total: 0 }],
      status: 'Draft',
      deliveryAddress: 'Main Warehouse, Wedage & Co.',
      paymentTerms: 'Net 30',
      taxAmount: 0
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch('items');
  const watchTax = watch('taxAmount');

  // Calculate totals
  const subTotal = watchItems.reduce((acc, item) => acc + (item.total || 0), 0);
  const grandTotal = subTotal + (watchTax || 0);

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

      navigate('/purchase-orders');
    } catch (err) {
      console.error(err);
      alert('Failed to issue Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-2">
         <button 
          onClick={() => navigate('/purchase-orders')}
          className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
         >
          <ArrowLeft className="w-5 h-5" />
         </button>
         <PageHeader 
          title="Direct Procurement" 
          subtitle="Issuing formal purchase authorization to supply chain partners."
         />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-12"
        >
           {/* Section: Acquisition Header */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Issuance Date</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                       <input type="date" {...register('date')} className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none [color-scheme:light] shadow-sm" />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Target Vendor</label>
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
                        />
                      )}
                    />
                    {errors.supplierId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.supplierId.message}</p>}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tactical Status</label>
                    <div className="grid grid-cols-2 gap-3">
                       {['Draft', 'Sent'].map(s => (
                          <button
                             key={s}
                             type="button"
                             onClick={() => setValue('status', s as any)}
                             className={cn(
                                "px-4 py-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm",
                                watch('status') === s 
                                   ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100" 
                                   : "bg-gray-50 border-gray-100 text-gray-400"
                             )}
                          >
                             {s}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Payment Strategy</label>
                    <input type="text" {...register('paymentTerms')} className="w-full bg-gray-50 border border-gray-100 px-6 py-4 rounded-2xl text-gray-900 font-bold outline-none shadow-sm placeholder:text-gray-400" placeholder="e.g. Net 30, Cash on Delivery" />
                 </div>
              </div>
           </div>

           {/* Section: Cargo Specs (Line Items) */}
           <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
                       <Package className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em]">Payload Specifications</h3>
                 </div>
                 <button 
                  type="button"
                  onClick={() => append({ description: '', quantity: 1, unit: 'pcs', unitPrice: 0, total: 0 })}
                  className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-white transition-all bg-indigo-50 hover:bg-indigo-600 px-4 py-2 rounded-full border border-indigo-100 shadow-sm"
                 >
                    <Plus className="w-3 h-3" />
                    Add Entry
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
                             <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Description / SKU</label>
                             <input 
                              type="text" 
                              {...register(`items.${index}.description`)}
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
                             <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">UNIT PRICE</label>
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
                              className={cn(
                                "p-3 rounded-xl text-gray-300 hover:text-rose-500 transition-all",
                                fields.length === 1 && "pointer-events-none opacity-0"
                              )}
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
           </div>

           {/* Financial Reconciliation */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Deployment Location</label>
                    <textarea {...register('deliveryAddress')} rows={3} className="w-full bg-gray-50 border border-gray-100 p-6 rounded-[2rem] text-gray-900 font-bold outline-none resize-none text-xs shadow-sm shadow-inner" />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Operational Directives (Notes)</label>
                    <textarea {...register('notes')} rows={2} className="w-full bg-gray-50 border border-gray-100 p-6 rounded-[2rem] text-gray-900 font-bold outline-none resize-none text-xs shadow-sm shadow-inner" />
                 </div>
              </div>

              <div className="bg-indigo-50/30 p-10 rounded-[2.5rem] border border-indigo-100 shadow-sm space-y-8 flex flex-col justify-center">
                 <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Net Aggregate</span>
                    <span className="text-xl font-bold text-gray-900 font-mono">LKR {subTotal.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Fiscal Duty (Tax)</span>
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
                    Authorize Acquisition
                  </>
                )}
              </button>
           </div>
        </motion.div>
      </form>
    </div>
  );
};

export default PurchaseOrderFormPage;
