import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
  Wallet,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle
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
  customerType: z.enum(['permanent', 'temporary']),
  paysVat: z.boolean(),
  opsContactName: z.string().optional(),
  opsContactNumber: z.string().optional(),
  additionalOpsContacts: z.array(z.object({
    name: z.string(),
    phone: z.string()
  })).optional(),
  billingContactName: z.string().optional(),
  billingContactNumber: z.string().optional(),
  additionalBillingContacts: z.array(z.object({
    name: z.string(),
    phone: z.string()
  })).optional(),
  additionalContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    role: z.string().optional()
  })).optional(),
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
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitted } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      brNo: '',
      officialContact: '',
      agreementStart: new Date().toISOString().split('T')[0],
      agreementEnd: '',
      customerType: 'permanent',
      paysVat: true,
      additionalOpsContacts: [],
      additionalBillingContacts: [],
      additionalContacts: []
    }
  });

  const { fields: opsFields, append: appendOps, remove: removeOps } = useFieldArray({ control, name: 'additionalOpsContacts' });
  const { fields: billFields, append: appendBill, remove: removeBill } = useFieldArray({ control, name: 'additionalBillingContacts' });
  const { fields: extraFields, append: appendExtra, remove: removeExtra } = useFieldArray({ control, name: 'additionalContacts' });

  const brImage = watch('brImage');
  const agreementUrl = watch('agreementUrl');
  const customerType = watch('customerType');
  const paysVat = watch('paysVat');

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
    setFormError(null);
    try {
      setLoading(true);
      if (id) {
        await updateCustomer(id, data);
      } else {
        await createCustomer(data);
      }
      navigate('/customers');
    } catch (err: any) {
      console.error(err);
      setFormError(
        err?.message?.includes('Missing or insufficient permissions')
          ? 'Permission denied. You may not have access to save customers.'
          : err?.message || 'Failed to save customer. Please check your connection and try again.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Building2 className="w-32 h-32 text-indigo-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">

          {/* Save error banner */}
          {formError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-700">Save Failed</p>
                <p className="text-xs text-red-600 mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {/* Validation summary */}
          {isSubmitted && Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-700">Please fix the errors below before saving</p>
                <p className="text-xs text-amber-600 mt-0.5">Required fields are highlighted in red.</p>
              </div>
            </div>
          )}

          {/* Company Identity */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Corporate Identity</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Registered Company Name</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('name')}
                    placeholder="e.g. Acme Logistics PLC"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                      errors.name && "border-red-500/50"
                    )}
                  />
                </div>
                {errors.name && <p className="mt-1 text-[10px] font-bold text-red-500 px-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Common Alias / Nickname</label>
                <div className="relative group">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('nickname')}
                    placeholder="e.g. Acme"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Customer Type Toggle */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Customer Classification</label>
                <div className="flex gap-2">
                   {['permanent', 'temporary'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setValue('customerType', type as any)}
                        className={cn(
                          "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          customerType === type ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-gray-50 border-gray-200 text-gray-400"
                        )}
                      >
                        {type}
                      </button>
                   ))}
                </div>
              </div>

              {/* VAT Toggle */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tax Liability (VAT)</label>
                <button
                  type="button"
                  onClick={() => setValue('paysVat', !paysVat)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                    paysVat ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-400"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{paysVat ? 'VAT REGISTERED' : 'NON-VAT ENTITY'}</span>
                  {paysVat ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-200" />}
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Business Registration (BR) No.</label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('brNo')}
                    placeholder="PV-123456"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                      errors.brNo && "border-red-500"
                    )}
                  />
                </div>
                {errors.brNo && (
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 px-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.brNo.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">VAT / SVAT Identification</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-black">%</div>
                  <input
                    {...register('vatNo')}
                    placeholder="Optional Identification"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Contact Details */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Contact Infrastructure</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
               <div className="md:col-span-2 space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">HQ Official Address &amp; Contact</label>
                <textarea
                  {...register('officialContact')}
                  rows={2}
                  placeholder="Official Address, Phone, Email..."
                  className={cn(
                    "w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400 resize-none",
                    errors.officialContact && "border-red-500"
                  )}
                />
                {errors.officialContact && (
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 px-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.officialContact.message}
                  </p>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2 p-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Operations Liaison</span>
                  </div>
                  <button type="button" onClick={() => appendOps({ name: '', phone: '' })} className="p-1 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <input
                  {...register('opsContactName')}
                  placeholder="Primary Officer Name"
                  className="w-full px-4 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none font-bold text-gray-900 placeholder:text-gray-400 mb-4"
                />
                <input
                  {...register('opsContactNumber')}
                  placeholder="Direct Extension / Mobile"
                  className="w-full px-4 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none font-bold text-gray-900 placeholder:text-gray-400"
                />
                {opsFields.map((field, index) => (
                  <div key={field.id} className="space-y-4 p-4 bg-white border border-emerald-100 rounded-2xl relative group">
                    <button type="button" onClick={() => removeOps(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <input {...register(`additionalOpsContacts.${index}.name`)} placeholder="Additional Name" className="w-full px-3 py-2 bg-emerald-50 rounded-xl outline-none text-xs font-bold" />
                    <input {...register(`additionalOpsContacts.${index}.phone`)} placeholder="Additional Phone" className="w-full px-3 py-2 bg-emerald-50 rounded-xl outline-none text-xs font-bold" />
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2 p-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-600" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Billing & Finance</span>
                  </div>
                  <button type="button" onClick={() => appendBill({ name: '', phone: '' })} className="p-1 hover:bg-amber-100 rounded-full text-amber-600 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <input
                  {...register('billingContactName')}
                  placeholder="Primary Accounts Manager"
                  className="w-full px-4 py-4 bg-amber-50 border border-amber-100 rounded-2xl outline-none font-bold text-gray-900 placeholder:text-gray-400 mb-4"
                />
                <input
                  {...register('billingContactNumber')}
                  placeholder="Financial Direct Line"
                  className="w-full px-4 py-4 bg-amber-50 border border-amber-100 rounded-2xl outline-none font-bold text-gray-900 placeholder:text-gray-400"
                />
                {billFields.map((field, index) => (
                  <div key={field.id} className="space-y-4 p-4 bg-white border border-amber-100 rounded-2xl relative group">
                    <button type="button" onClick={() => removeBill(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <input {...register(`additionalBillingContacts.${index}.name`)} placeholder="Additional Name" className="w-full px-3 py-2 bg-amber-50 rounded-xl outline-none text-xs font-bold" />
                    <input {...register(`additionalBillingContacts.${index}.phone`)} placeholder="Additional Phone" className="w-full px-3 py-2 bg-amber-50 rounded-xl outline-none text-xs font-bold" />
                  </div>
                ))}
              </div>

              <div className="md:col-span-2 space-y-6 pt-6 border-t border-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Other Generic Contacts</p>
                  <button type="button" onClick={() => appendExtra({ name: '', phone: '', role: '' })} className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase hover:bg-indigo-100 transition-colors">
                    <Plus className="w-3 h-3" /> Add Contact
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {extraFields.map((field, index) => (
                    <div key={field.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 relative group">
                      <button type="button" onClick={() => removeExtra(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="space-y-4">
                        <input {...register(`additionalContacts.${index}.name`)} placeholder="Name" className="w-full px-4 py-3 bg-white rounded-xl outline-none text-xs font-bold border border-gray-200" />
                        <input {...register(`additionalContacts.${index}.phone`)} placeholder="Phone" className="w-full px-4 py-3 bg-white rounded-xl outline-none text-xs font-bold border border-gray-200" />
                        <input {...register(`additionalContacts.${index}.role`)} placeholder="Role (e.g. CEO)" className="w-full px-4 py-3 bg-white rounded-xl outline-none text-xs font-bold border border-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Verification & Agreements */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Legal Assets</h3>
              <div className="h-px bg-gray-100 flex-1"></div>
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
                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Contract Activation Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('agreementStart')}
                    type="date"
                    className="w-full pl-12 pr-4 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Contract Expiration Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('agreementEnd')}
                    type="date"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-rose-50 border rounded-2xl focus:ring-1 focus:ring-rose-500/50 outline-none transition-all font-bold text-gray-900",
                      errors.agreementEnd ? "border-red-500" : "border-rose-100"
                    )}
                  />
                </div>
                {errors.agreementEnd && (
                  <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 px-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.agreementEnd.message}
                  </p>
                )}
              </div>
            </div>
          </section>

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
