import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  FileText, 
  Building2, 
  Plus, 
  Trash2, 
  Save, 
  Calendar,
  DollarSign,
  Briefcase,
  Printer,
  ChevronLeft,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import QuickAddModal, { QuickAddType } from '../../components/shared/QuickAddModal';
import { cn } from '../../lib/utils';
import { createInvoice, updateInvoice, getInvoice, InvoiceItem } from '../../services/invoiceService';
import { useCustomers } from '../../hooks/useCustomers';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SearchableSelect from '../../components/shared/SearchableSelect';
import { generateInvoicePDF } from '../../lib/pdfUtils';

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Qty must be at least 1'),
  rate: z.number().min(0, 'Rate must be positive'),
  amount: z.number()
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceNo: z.string().min(1, 'Invoice Number is required'),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().min(1, 'Due Date is required'),
  items: z.array(invoiceItemSchema).min(1, 'At least one item required'),
  taxRate: z.number().min(0).max(100),
  bankDetails: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const InvoiceFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, refresh: refreshCustomers } = useCustomers();
  const [quickAdd, setQuickAdd] = useState<{ type: QuickAddType; onCreated: (id: string, label: string) => void } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);

  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
      status: 'draft',
      taxRate: 0,
      bankDetails: 'Bank: Commercial Bank\nAcc: 1000234567\nBranch: Colombo 07',
      items: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch('items');
  const watchStatus = watch('status');
  const watchTaxRate = watch('taxRate');

  useEffect(() => {
    if (id) {
      const loadInvoice = async () => {
        try {
          const data = await getInvoice(id);
          if (data) {
            reset(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setFetching(false);
        }
      };
      loadInvoice();
    }
  }, [id, reset]);

  const subtotal = watchItems?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0) || 0;
  const taxAmount = (subtotal * (watchTaxRate || 0)) / 100;
  const totalAmount = subtotal + taxAmount;

  const onSubmit = async (data: InvoiceFormData, shouldExport = false) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        subtotal,
        taxAmount,
        totalAmount,
        items: data.items.map(item => ({
          ...item,
          amount: item.quantity * item.rate
        }))
      };
      
      if (id) {
        await updateInvoice(id, payload);
      } else {
        await createInvoice(payload);
      }
      
      if (shouldExport) {
        const customer = customers.find(c => c.id === data.customerId) || null;
        generateInvoicePDF({ ...payload, id: id || 'NEW' }, customer);
      }
      
      navigate('/invoices');
    } catch (err) {
      console.error(err);
      alert('Failed to save invoice document');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <PageHeader 
        title={id ? "Modify Fiscal Record" : "Fiscal Documentation"} 
        subtitle={id ? `Updating document ${watch('invoiceNo')}` : "Generating new account receivable record for customer billing."}
        back="/invoices"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-[2.5rem] p-10 lg:p-14 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <DollarSign className="w-48 h-48 text-indigo-500" />
        </div>

        <form className="space-y-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Context Sidebar */}
            <div className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Customer Selection</label>
                  <Controller
                    control={control}
                    name="customerId"
                    render={({ field }) => (
                      <SearchableSelect
                        options={customers.map(c => ({ value: c.id!, label: c.name, subLabel: c.nickname || undefined }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Customer"
                        icon={<Building2 className="w-5 h-5 text-indigo-400" />}
                        onAddNew={() => setQuickAdd({ type: 'customer', onCreated: (id) => { field.onChange(id); refreshCustomers(); } })}
                        addNewLabel="Add New Customer"
                      />
                    )}
                  />
                  {errors.customerId && <p className="text-[10px] font-bold text-rose-600 px-1">{errors.customerId.message}</p>}
               </div>

               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Invoice Identity</label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      {...register('invoiceNo')}
                      placeholder="INV-XXXXXX"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-black text-gray-900 uppercase"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Invoice Date</label>
                    <input type="date" {...register('date')} className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl text-gray-900 font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50" />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">Due Date</label>
                    <input type="date" {...register('dueDate')} className="w-full bg-amber-50 border border-amber-200 p-4 rounded-2xl text-gray-900 font-bold text-sm outline-none focus:ring-1 focus:ring-amber-500/50" />
                  </div>
               </div>

                <div className="space-y-3">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Fiscal Status</label>
                   <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                     {(['draft', 'sent', 'paid', 'overdue'] as const).map(s => (
                       <button
                         key={s}
                         type="button"
                         onClick={() => setValue('status', s)}
                         className={cn(
                           "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                           watchStatus === s 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                            : "text-gray-400 hover:text-gray-600 hover:bg-white"
                         )}
                       >
                         {s === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                         {s === 'overdue' && <AlertCircle className="w-3 h-3" />}
                         {s === 'sent' && <Clock className="w-3 h-3" />}
                         {s === 'draft' && <FileText className="w-3 h-3" />}
                         {s}
                       </button>
                     ))}
                   </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="lg:col-span-2 space-y-8">
               <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-indigo-500" />
                    Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={() => append({ description: '', quantity: 1, rate: 0, amount: 0 })}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/10"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Initial Item</span>
                  </button>
               </div>

               <div className="space-y-6">
                  {fields.map((field, index) => {
                    const item = watchItems?.[index];
                    const itemTotal = (item?.quantity || 0) * (item?.rate || 0);
                    
                    return (
                      <div key={field.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 relative group hover:bg-gray-100/50 transition-all">
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="grid grid-cols-12 gap-6 items-start">
                           <div className="col-span-12 md:col-span-7 space-y-3">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Item Description</label>
                              <input
                                {...register(`items.${index}.description` as const)}
                                placeholder="Service code, trip details, or equipment lease description..."
                                className="w-full bg-white border border-gray-200 p-4 rounded-xl text-gray-900 font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50"
                              />
                           </div>
                           <div className="col-span-6 md:col-span-2 space-y-3">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Quantity</label>
                              <input
                                type="number"
                                {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                                placeholder="Qty"
                                className="w-full bg-white border border-gray-200 p-4 rounded-xl text-gray-900 font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50 text-center"
                              />
                           </div>
                           <div className="col-span-6 md:col-span-3 space-y-3">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 flex justify-between px-1">
                                <span>Unit Rate</span>
                                <span className="text-indigo-600 font-mono">LKR</span>
                              </label>
                              <input
                                type="number"
                                {...register(`items.${index}.rate` as const, { valueAsNumber: true })}
                                placeholder="Rate"
                                className="w-full bg-white border border-gray-200 p-4 rounded-xl text-gray-900 font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50 text-right"
                              />
                           </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
                           <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Purge Item</span>
                              </button>
                           </div>
                           
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-gray-400 uppercase">Subtotal:</span>
                              <span className="text-lg font-black text-gray-900 font-mono">
                                LKR {itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
               </div>

               <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={() => append({ description: '', quantity: 1, rate: 0, amount: 0 })}
                    className="flex items-center gap-2 px-10 py-5 bg-gray-50 text-gray-600 border border-dashed border-gray-300 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-gray-100 hover:border-indigo-500/50 transition-all group"
                  >
                    <Plus className="w-4 h-4 text-indigo-500 group-hover:scale-125 transition-transform" />
                    <span>Expand Billing Grid</span>
                  </button>
               </div>

               {/* Total Section */}
               <div className="pt-12 border-t border-gray-200 flex flex-col md:flex-row gap-12">
                  <div className="flex-1 space-y-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Bank Payment Details</label>
                       <textarea 
                        {...register('bankDetails')}
                        rows={3} 
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold text-gray-600 outline-none resize-none shadow-inner" 
                        placeholder="Recipient Bank, Acc No, Branch..."
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Customer Notes / Directives</label>
                       <textarea 
                        {...register('notes')}
                        rows={2} 
                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold text-gray-600 outline-none resize-none shadow-inner" 
                        placeholder="Thank you for your business..."
                       />
                    </div>
                  </div>

                  <div className="w-full md:w-80 space-y-4">
                     <div className="flex justify-between items-center px-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                        <span className="font-bold text-gray-600 font-mono">LKR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     
                     <div className="flex justify-between items-center px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tax Rate (%)</span>
                           <input 
                            type="number" 
                            {...register('taxRate', { valueAsNumber: true })} 
                            className="w-12 bg-white border border-gray-200 px-2 py-1 rounded-lg text-[10px] font-black text-right outline-none focus:ring-1 focus:ring-indigo-500"
                           />
                        </div>
                        <span className="font-bold text-gray-600 font-mono">LKR {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>

                     <div className="pt-6 border-t border-gray-200 flex flex-col items-end space-y-2">
                        <div className="px-4 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                           <p className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.2em]">Aggregate Fiscal Liability</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-black text-gray-300">LKR</span>
                          <h2 className="text-4xl font-black text-gray-900 font-mono tracking-tighter">
                             {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </h2>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="pt-10 border-t border-gray-200 flex justify-end gap-4">
            <button
              type="button"
              onClick={handleSubmit(data => onSubmit(data, true))}
              disabled={loading}
              className="bg-gray-100 hover:bg-indigo-50 text-gray-700 border border-gray-200 font-black px-10 py-5 rounded-2xl transition-all flex items-center gap-3 disabled:opacity-50 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                   <span className="uppercase tracking-[0.3em] text-[10px]">{id ? "Update & Export" : "Commit & Export PDF"}</span>
                   <Printer className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>

            <button
              onClick={handleSubmit(data => onSubmit(data, false))}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-5 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3 disabled:opacity-50 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                   <span className="uppercase tracking-[0.3em] text-[10px]">{id ? "Update Record" : "Commit Record"}</span>
                   <Save className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

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

export default InvoiceFormPage;

