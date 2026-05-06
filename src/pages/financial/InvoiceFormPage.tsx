import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { createInvoice, InvoiceItem } from '../../services/invoiceService';
import { useCustomers } from '../../hooks/useCustomers';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

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
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const InvoiceFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { customers } = useCustomers();
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
      status: 'draft',
      items: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch('items');
  const watchStatus = watch('status');

  const totalAmount = watchItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        totalAmount,
        items: data.items.map(item => ({
          ...item,
          amount: item.quantity * item.rate
        }))
      };
      await createInvoice(payload);
      navigate('/invoices');
    } catch (err) {
      console.error(err);
      alert('Failed to generate invoice document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="Fiscal Documentation" 
        subtitle="Generating new account receivable record for customer billing."
        back="/invoices"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 lg:p-14 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <DollarSign className="w-48 h-48 text-white" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Context Sidebar */}
            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Customer Selection</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 w-5 h-5" />
                    <select
                      {...register('customerId')}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-black text-white uppercase appearance-none"
                    >
                      <option value="" className="bg-[#0a0a0a]">-- Entity Selection --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#0a0a0a]">{c.name}</option>
                      ))}
                    </select>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Invoice Identity</label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      {...register('invoiceNo')}
                      placeholder="INV-XXXXXX"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-black text-white uppercase"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Invoice Date</label>
                    <input type="date" {...register('date')} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50" />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest px-1">Due Date</label>
                    <input type="date" {...register('dueDate')} className="w-full bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-amber-500/50" />
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Fiscal Status</label>
                  <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    {['draft', 'sent', 'paid', 'overdue'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setValue('status', s as any)}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          watchStatus === s ? "bg-indigo-600 text-white shadow-lg" : "text-gray-600 hover:text-gray-400"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            {/* Line Items */}
            <div className="lg:col-span-2 space-y-8">
               <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Line Items</h3>
                  <button
                    type="button"
                    onClick={() => append({ description: '', quantity: 1, rate: 0, amount: 0 })}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
               </div>

               <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-4 items-start group">
                       <div className="col-span-12 md:col-span-6">
                          <input
                            {...register(`items.${index}.description` as const)}
                            placeholder="Service/Trip description..."
                            className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50"
                          />
                       </div>
                       <div className="col-span-4 md:col-span-2">
                          <input
                            type="number"
                            {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                            placeholder="Qty"
                            className="w-full bg-white/5 border border-white/5 p-4 rounded-xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50"
                          />
                       </div>
                       <div className="col-span-5 md:col-span-3">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500">LKR</span>
                            <input
                              type="number"
                              {...register(`items.${index}.rate` as const, { valueAsNumber: true })}
                              placeholder="Rate"
                              className="w-full bg-white/5 border border-white/5 pl-10 pr-4 py-4 rounded-xl text-white font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500/50 text-right"
                            />
                          </div>
                       </div>
                       <div className="col-span-3 md:col-span-1 flex items-center justify-center pt-4">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>

               {/* Total Section */}
               <div className="pt-8 border-t border-white/10 flex flex-col items-end space-y-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Fiscal Obligation</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-black text-indigo-400">LKR</span>
                    <h2 className="text-5xl font-black text-white font-mono tracking-tighter">
                       {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>
                  </div>
               </div>
            </div>
          </div>

          <div className="pt-10 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-16 py-5 rounded-2xl transition-all shadow-2xl shadow-indigo-500/20 flex items-center gap-3 disabled:opacity-50 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                   <span className="uppercase tracking-[0.3em] text-xs px-2">Commit Fiscal Document</span>
                   <Save className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default InvoiceFormPage;
