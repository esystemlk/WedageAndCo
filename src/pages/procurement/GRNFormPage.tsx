import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  User,
  ShoppingCart,
  Calendar,
  Truck,
  FileText,
  Info,
  Hash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createGRN } from '../../services/grnService';
import { getPurchaseOrders, PurchaseOrder } from '../../services/poService';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { cn } from '../../lib/utils';

const grnSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  purchaseOrderRef: z.string().optional(),
  poDate: z.string().optional(),
  supplierInvoiceNo: z.string().optional(),
  voucherNo: z.string().optional(),
  voucherDate: z.string().optional(),
  warehouseLocation: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Required'),
    orderedQuantity: z.number().min(0, 'Min 0'),
    receivedQuantity: z.number().min(0, 'Min 0'),
    unit: z.string().min(1, 'Required'),
  })).min(1, 'At least one item is required'),
  remarks: z.string().optional(),
});

type GRNFormData = z.infer<typeof grnSchema>;

const GRNFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { suppliers } = useSuppliers();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<GRNFormData>({
    resolver: zodResolver(grnSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      voucherDate: new Date().toISOString().split('T')[0],
      items: [{ description: '', orderedQuantity: 0, receivedQuantity: 0, unit: 'pcs' }],
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items"
  });

  useEffect(() => {
    const fetchPOs = async () => {
       const pos = await getPurchaseOrders();
       setPurchaseOrders(pos || []);
    };
    fetchPOs();
  }, []);

  const handlePORefChange = (poNumber: string) => {
    const selectedPO = purchaseOrders.find(po => po.poNumber === poNumber);
    if (selectedPO) {
       setValue('supplierId', selectedPO.supplierId);
       setValue('poDate', selectedPO.date || '');
       replace(selectedPO.items.map(item => ({
          description: item.description,
          orderedQuantity: item.quantity,
          receivedQuantity: item.quantity,
          unit: item.unit
       })));
    } else {
      setValue('poDate', '');
    }
  };

  const onSubmit = async (data: GRNFormData) => {
    try {
      setLoading(true);
      const supplier = suppliers.find(s => s.id === data.supplierId);

      await createGRN({
        ...data,
        supplierName: supplier?.name || 'Unknown',
        receivedBy: user?.email || 'System'
      } as any);

      navigate('/grn');
    } catch (err) {
      console.error(err);
      alert('Failed to register Goods delivery');
    } finally {
      setLoading(false);
    }
  };

  const selectedPORef = watch('purchaseOrderRef');
  const selectedPOData = purchaseOrders.find(po => po.poNumber === selectedPORef);

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-2">
         <button
          onClick={() => navigate('/grn')}
          className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
         >
          <ArrowLeft className="w-5 h-5" />
         </button>
         <PageHeader
          title="Goods Receipt Note"
          subtitle="Register and verify physical supply chain deliveries."
         />
      </div>

      {/* GRN Auto Number Banner */}
      <div className="mb-6 flex items-center gap-3 px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
        <Hash className="w-4 h-4 text-indigo-600 shrink-0" />
        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">GRN Number will be auto-generated on submission (e.g. GRN-2026-XXXX)</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-12"
        >
           {/* Section: Delivery Context */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Registry Date</label>
                    <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                       <input type="date" {...register('date')} className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none [color-scheme:light] shadow-sm" />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Linked Purchase Order</label>
                    <Controller
                      control={control}
                      name="purchaseOrderRef"
                      render={({ field }) => (
                        <SearchableSelect
                          options={[
                            { value: '', label: 'Unlinked Delivery' },
                            ...purchaseOrders.map(po => ({ value: po.poNumber, label: po.poNumber, subLabel: po.supplierName }))
                          ]}
                          value={field.value || ''}
                          onChange={(val) => {
                            field.onChange(val);
                            handlePORefChange(val);
                          }}
                          placeholder="Unlinked Delivery"
                          icon={<ShoppingCart className="w-4 h-4 text-indigo-600" />}
                        />
                      )}
                    />
                 </div>

                 {selectedPOData && (
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">PO Date (Auto-filled)</label>
                     <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                       <input
                         type="date"
                         {...register('poDate')}
                         readOnly
                         className="w-full bg-indigo-50/30 border border-indigo-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none cursor-default [color-scheme:light]"
                       />
                     </div>
                   </div>
                 )}

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Receiving Location / Warehouse</label>
                    <div className="relative shadow-sm">
                       <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input type="text" {...register('warehouseLocation')} className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none" placeholder="e.g. Main Yard / Warehouse A" />
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
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
                        />
                      )}
                    />
                    {errors.supplierId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.supplierId.message}</p>}
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Invoice Number</label>
                    <div className="relative shadow-sm">
                       <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input type="text" {...register('supplierInvoiceNo')} className="w-full bg-gray-50 border border-gray-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none" placeholder="Invoice #" />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Voucher Number</label>
                    <div className="relative shadow-sm">
                       <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                       <input type="text" {...register('voucherNo')} className="w-full bg-indigo-50/30 border border-indigo-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none" placeholder="Internal Voucher #" />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Voucher Date</label>
                    <div className="relative shadow-sm">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                       <input type="date" {...register('voucherDate')} className="w-full bg-indigo-50/30 border border-indigo-100 pl-12 pr-4 py-4 rounded-2xl text-gray-900 font-bold outline-none [color-scheme:light]" />
                    </div>
                 </div>
              </div>
           </div>

           {/* Section: Items Received */}
           <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100 shadow-sm">
                       <Package className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.3em]">Items Received</h3>
                 </div>
                 <button
                  type="button"
                  onClick={() => append({ description: '', orderedQuantity: 0, receivedQuantity: 0, unit: 'pcs' })}
                  className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-white transition-all bg-emerald-50 hover:bg-emerald-600 px-4 py-2 rounded-full border border-emerald-100 shadow-sm"
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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="grid grid-cols-12 gap-4 items-end bg-gray-50 p-6 rounded-3xl border border-gray-100 shadow-sm"
                       >
                          <div className="col-span-12 md:col-span-5 space-y-2">
                             <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Item Description</label>
                             <input
                              type="text"
                              {...register(`items.${index}.description`)}
                              placeholder="Enter item name"
                              className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl text-gray-900 text-xs font-bold outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-400 shadow-sm"
                             />
                          </div>
                          <div className="col-span-4 md:col-span-2 space-y-2">
                             <label className="text-[8px] font-black text-indigo-600 uppercase tracking-widest px-1">Ordered (Qty)</label>
                             <input
                              type="number"
                              {...register(`items.${index}.orderedQuantity`, { valueAsNumber: true })}
                              className="w-full bg-indigo-50 border border-indigo-100 px-3 py-3 rounded-xl text-gray-900 text-xs font-bold outline-none shadow-sm"
                             />
                          </div>
                          <div className="col-span-4 md:col-span-2 space-y-2">
                             <label className="text-[8px] font-black text-emerald-600 uppercase tracking-widest px-1">Received (Qty)</label>
                             <input
                              type="number"
                              {...register(`items.${index}.receivedQuantity`, { valueAsNumber: true })}
                              className="w-full bg-emerald-50 border border-emerald-100 px-3 py-3 rounded-xl text-gray-900 text-xs font-bold outline-none font-black shadow-sm"
                             />
                          </div>
                          <div className="col-span-3 md:col-span-2 space-y-2">
                             <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Unit</label>
                             <input
                              type="text"
                              {...register(`items.${index}.unit`)}
                              className="w-full bg-white border border-gray-200 px-3 py-3 rounded-xl text-gray-900 text-xs font-bold outline-none shadow-sm"
                             />
                          </div>
                          <div className="col-span-1 md:col-span-1 pb-1 flex justify-center">
                             <button
                              type="button"
                              onClick={() => remove(index)}
                              className={cn("p-3 text-gray-300 hover:text-rose-500 transition-all", fields.length === 1 && "pointer-events-none opacity-0")}
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
           </div>

           {/* Remarks */}
           <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observational Notes</label>
              <textarea {...register('remarks')} rows={4} className="w-full bg-gray-50 border border-gray-100 p-8 rounded-[2.5rem] text-gray-900 font-bold outline-none resize-none text-xs shadow-sm shadow-inner placeholder:text-gray-400" placeholder="Note down shortages, breakage reasons, or logistics deviations..." />
           </div>

           <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
                    <Info className="w-5 h-5 text-emerald-600" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargo Verification Protocol</p>
                    <p className="text-[9px] font-bold text-gray-600 uppercase mt-0.5">Receiver: {user?.email || 'OFFLINE_AGENT'}</p>
                 </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center gap-3 disabled:opacity-50 active:scale-95"
              >
                {loading ? <LoadingSpinner /> : (
                  <>
                    <Save className="w-4 h-4" />
                    Submit GRN
                  </>
                )}
              </button>
           </div>
        </motion.div>
      </form>
    </div>
  );
};

export default GRNFormPage;
