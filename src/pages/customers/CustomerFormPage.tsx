import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Building2, 
  Phone, 
  Tag, 
  Calendar,
  Save, 
  Globe,
  Briefcase,
  Wallet
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { getCustomer, createCustomer, updateCustomer } from '../../services/customerService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import FileUpload from '../../components/shared/FileUpload';

const customerSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  nickname: z.string().optional(),
  brNo: z.string().min(1, 'BR Number is required'),
  brImage: z.string().optional(),
  officialContact: z.string().min(5, 'Official contact info is required'),
  vatNo: z.string().optional(),
  opsContactName: z.string().optional(),
  opsContactNumber: z.string().optional(),
  billingContactName: z.string().optional(),
  billingContactNumber: z.string().optional(),
  agreementUrl: z.string().optional(),
  agreementStart: z.string().min(1, 'Agreement start date is required'),
  agreementEnd: z.string().min(1, 'Agreement end date is required')
});

type CustomerFormData = z.infer<typeof customerSchema>;

const CustomerFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      brNo: '',
      officialContact: '',
      agreementStart: new Date().toISOString().split('T')[0],
      agreementEnd: ''
    }
  });

  const brImage = watch('brImage');
  const agreementUrl = watch('agreementUrl');

  useEffect(() => {
    if (id) {
      const fetchCustomer = async () => {
        try {
          const data = await getCustomer(id);
          if (data) {
            Object.keys(data).forEach(key => {
              const value = (data as any)[key];
              if (key !== 'id' && value !== undefined) {
                setValue(key as any, value);
              }
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchCustomer();
    }
  }, [id, setValue]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setLoading(true);
      if (id) {
        await updateCustomer(id, data);
      } else {
        await createCustomer(data);
      }
      navigate('/customers');
    } catch (err) {
      console.error(err);
      alert('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader 
        title={id ? 'Optimize Client Record' : 'Establish Partnership'} 
        subtitle={id ? 'Refining account metadata and contractual agreements.' : 'Integrating new identity into the logistics ecosystem.'}
        back="/customers"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] p-8 lg:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Building2 className="w-32 h-32 text-white" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
          {/* Company Identity */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-white/10 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Corporate Identity</h3>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Registered Company Name</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
                  <input
                    {...register('name')}
                    placeholder="e.g. Acme Logistics PLC"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600",
                      errors.name && "border-red-500/50"
                    )}
                  />
                </div>
                {errors.name && <p className="mt-1 text-[10px] font-bold text-red-500 px-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Common Alias / Nickname</label>
                <div className="relative group">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
                  <input
                    {...register('nickname')}
                    placeholder="e.g. Acme"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Business Registration (BR) No.</label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
                  <input
                    {...register('brNo')}
                    placeholder="PV-123456"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600",
                      errors.brNo && "border-red-500/50"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">VAT / SVAT Identification</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-black">%</div>
                  <input
                    {...register('vatNo')}
                    placeholder="Optional Identification"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Contact Details */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-white/10 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Contact Infrastructure</h3>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
               <div className="md:col-span-2 space-y-3">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">HQ Official Address & Contact</label>
                <textarea
                  {...register('officialContact')}
                  rows={2}
                  placeholder="Official Address, Phone, Email..."
                  className={cn(
                    "w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600 resize-none",
                    errors.officialContact && "border-red-500/50"
                  )}
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 p-1">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Operations Liaison</span>
                </div>
                <input
                  {...register('opsContactName')}
                  placeholder="Officer Name"
                  className="w-full px-4 py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600 mb-4"
                />
                <input
                  {...register('opsContactNumber')}
                  placeholder="Direct Extension / Mobile"
                  className="w-full px-4 py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600"
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 p-1">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Billing & Finance</span>
                </div>
                <input
                  {...register('billingContactName')}
                  placeholder="Accounts Manager"
                  className="w-full px-4 py-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl focus:ring-1 focus:ring-amber-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600 mb-4"
                />
                <input
                  {...register('billingContactNumber')}
                  placeholder="Financial Direct Line"
                  className="w-full px-4 py-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl focus:ring-1 focus:ring-amber-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600"
                />
              </div>
            </div>
          </section>

          {/* Verification & Agreements */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-white/10 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Legal Assets</h3>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <FileUpload 
                label="BR Document Verification"
                path="customers/br"
                onUploadComplete={(url) => setValue('brImage', url)}
                currentUrl={brImage}
              />
              <FileUpload 
                label="Legal Logistics Agreement (PDF)"
                path="customers/agreements"
                accept="application/pdf"
                onUploadComplete={(url) => setValue('agreementUrl', url)}
                currentUrl={agreementUrl}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Contract Activation Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 w-5 h-5 transition-colors" />
                  <input
                    {...register('agreementStart')}
                    type="date"
                    className="w-full pl-12 pr-4 py-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-white"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest px-1">Contract Expiration Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 w-5 h-5 transition-colors" />
                  <input
                    {...register('agreementEnd')}
                    type="date"
                    className="w-full pl-12 pr-4 py-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl focus:ring-1 focus:ring-rose-500/50 outline-none transition-all font-bold text-white"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="pt-10 border-t border-white/10 flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/10 flex items-center space-x-3 disabled:bg-indigo-900 disabled:text-gray-500 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Synchronize Record' : 'Initialize Partnership'}</span>
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

export default CustomerFormPage;
