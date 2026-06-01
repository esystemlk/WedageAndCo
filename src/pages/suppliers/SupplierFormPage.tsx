import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Package, 
  User, 
  Mail, 
  Phone, 
  Save, 
  ShieldCheck, 
  Tag,
  Plus,
  Trash2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { getSupplier, createSupplier, updateSupplier } from '../../services/supplierService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  nickname: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  additionalPhones: z.array(z.string()).optional(),
  businessEmails: z.array(z.string()).optional(),
  brNo: z.string().optional(),
  vatNo: z.string().optional(),
  supplyCategories: z.array(z.string()).optional(),
  description: z.string().optional(),
  additionalContacts: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    role: z.string().optional()
  })).optional()
});

type SupplierFormData = z.infer<typeof supplierSchema>;

const SupplierFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    'Mechanical',
    'Electrical',
    'Office Items',
    'Reconditioned Parts',
    'Alternator Repair Shop',
    'Battery Repair Shop',
    'Tyre Shop'
  ]);
  const [newCategoryText, setNewCategoryText] = useState('');

  const { register, handleSubmit, setValue, getValues, control, formState: { errors } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      additionalPhones: [],
      businessEmails: [],
      supplyCategories: [],
      additionalContacts: []
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'additionalContacts' });
  const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({ control, name: 'additionalPhones' as any });
  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({ control, name: 'businessEmails' as any });

  useEffect(() => {
    if (id) {
      const fetchSupplier = async () => {
        try {
          const data = await getSupplier(id);
          if (data) {
            setValue('name', data.name);
            setValue('contactName', data.contactName || '');
            setValue('email', data.email);
            setValue('phone', data.phone);
            setValue('brNo', data.brNo || '');
            setValue('vatNo', data.vatNo || '');
            setValue('nickname', data.nickname || '');
            setValue('supplyCategories', data.supplyCategories || []);
            setValue('additionalPhones', data.additionalPhones || []);
            setValue('businessEmails', data.businessEmails || []);
            setValue('description', data.description || '');
            setValue('additionalContacts', data.additionalContacts || []);

            if (data.supplyCategories && data.supplyCategories.length > 0) {
              setAvailableCategories(prev => {
                const unique = new Set([...prev, ...(data.supplyCategories || [])]);
                return Array.from(unique);
              });
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchSupplier();
    }
  }, [id, setValue]);

  const onSubmit = async (data: SupplierFormData) => {
    try {
      setLoading(true);
      if (id) {
        await updateSupplier(id, data);
        toast.success('Supplier updated', `${(data as any).name || 'Supplier'} was saved.`);
      } else {
        await createSupplier(data);
        toast.success('Supplier created', `${(data as any).name || 'Supplier'} was added.`);
      }
      navigate('/suppliers');
    } catch (err) {
      console.error(err);
      toast.error('Save failed', 'Could not save the supplier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader 
        title={id ? 'Modify Vendor Record' : 'Register New Vendor'} 
        subtitle={id ? 'Optimizing external supply chain data.' : 'Expanding the logistics partner network.'}
        back="/suppliers"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Package className="w-32 h-32 text-indigo-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Supplier Entity Name</label>
              <div className="relative group">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                <input
                  {...register('name')}
                  placeholder="e.g. Total Energy Solutions"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                    errors.name && "border-red-500/50"
                  )}
                />
              </div>
              {errors.name && <p className="mt-1 text-[10px] font-bold text-red-500 px-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nickname / Short Name</label>
              <div className="relative group">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                <input
                  {...register('nickname')}
                  placeholder="e.g. Total"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Lead Contact Person</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                <input
                  {...register('contactName')}
                  placeholder="Full Name"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Primary & Additional Phones */}
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Primary Phone</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('phone')}
                    placeholder="+94 11 XXXXXXX"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                      errors.phone && "border-red-500/50"
                    )}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-[10px] font-bold text-red-500 px-1">{errors.phone.message}</p>}
              </div>

              {/* Additional Phones */}
              <div className="space-y-3 pl-4 border-l-2 border-indigo-50">
                <div className="flex items-center justify-between">
                  <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-wider">Additional Contact Numbers</label>
                  <button
                    type="button"
                    onClick={() => appendPhone('')}
                    className="text-[9px] font-black uppercase text-indigo-650 hover:text-indigo-850 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Number
                  </button>
                </div>
                <div className="space-y-2">
                  {phoneFields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        {...register(`additionalPhones.${idx}` as any)}
                        placeholder="Additional Phone Number"
                        className="flex-1 px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => removePhone(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary & Additional Business Emails */}
            <div className="space-y-4 md:col-span-2">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Primary Business Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="sales@vendor.com"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                      errors.email && "border-red-500/50"
                    )}
                  />
                </div>
                {errors.email && <p className="mt-1 text-[10px] font-bold text-red-500 px-1">{errors.email.message}</p>}
              </div>

              {/* Additional Emails */}
              <div className="space-y-3 pl-4 border-l-2 border-indigo-50">
                <div className="flex items-center justify-between">
                  <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-wider">Additional Business Emails</label>
                  <button
                    type="button"
                    onClick={() => appendEmail('')}
                    className="text-[9px] font-black uppercase text-indigo-650 hover:text-indigo-850 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Email
                  </button>
                </div>
                <div className="space-y-2">
                  {emailFields.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        {...register(`businessEmails.${idx}` as any)}
                        type="email"
                        placeholder="additional@vendor.com"
                        className="flex-1 px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => removeEmail(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">BR Number (Verification)</label>
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                <input
                  {...register('brNo')}
                  placeholder="Optional"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">VAT Certificate No.</label>
              <div className="relative group">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 w-5 h-5 transition-colors" />
                <input
                  {...register('vatNo')}
                  placeholder="Optional"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Supply Categories</label>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-200">
                  {availableCategories.map(category => (
                    <label key={category} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        value={category}
                        {...register('supplyCategories')}
                        className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500/50 transition-all"
                      />
                      <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">{category}</span>
                    </label>
                  ))}
                </div>

                {/* Dynamic Category Builder */}
                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl max-w-md">
                  <input
                    type="text"
                    value={newCategoryText}
                    onChange={(e) => setNewCategoryText(e.target.value)}
                    placeholder="Enter custom category..."
                    className="flex-1 px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newCategoryText.trim();
                      if (trimmed && !availableCategories.includes(trimmed)) {
                        setAvailableCategories(prev => [...prev, trimmed]);
                        // Automatically check it
                        const currentVal = getValues('supplyCategories') || [];
                        setValue('supplyCategories', [...currentVal, trimmed]);
                        setNewCategoryText('');
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    + Add Category
                  </button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description of Items Supplied</label>
              <textarea
                {...register('description')}
                placeholder="Briefly describe the items or services provided by this supplier..."
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-3xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400 min-h-[120px]"
              />
            </div>

            {/* Additional Contacts */}
            <div className="md:col-span-2 space-y-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Additional Contact Personnel</label>
                <button 
                  type="button" 
                  onClick={() => append({ name: '', phone: '', email: '', role: '' })}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Personnel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 relative group shadow-sm">
                    <button 
                      type="button" 
                      onClick={() => remove(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="space-y-4">
                      <input {...register(`additionalContacts.${index}.name`)} placeholder="Name" className="w-full px-4 py-3 bg-white rounded-xl outline-none text-xs font-bold border border-gray-100 shadow-sm" />
                      <input {...register(`additionalContacts.${index}.phone`)} placeholder="Phone" className="w-full px-4 py-3 bg-white rounded-xl outline-none text-xs font-bold border border-gray-100 shadow-sm" />
                      <input {...register(`additionalContacts.${index}.email`)} placeholder="Email (Optional)" className="w-full px-4 py-3 bg-white rounded-xl outline-none text-xs font-bold border border-gray-100 shadow-sm" />
                      <input {...register(`additionalContacts.${index}.role`)} placeholder="Role (e.g. Sales)" className="w-full px-4 py-3 bg-white rounded-xl outline-none text-xs font-bold border border-gray-100 shadow-sm" />
                    </div>
                  </div>
                ))}
                {fields.length === 0 && (
                  <div className="md:col-span-2 py-8 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No additional contacts defined</p>
                  </div>
                )}
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
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Save Updates' : 'Confirm Registration'}</span>
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

export default SupplierFormPage;
