import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useNavigate } from 'react-router-dom';
import { createStaffMember, updateStaffMember, getStaffMember, StaffMember } from '../../services/staffService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Save, User, Phone, Mail, FileCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const staffSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required'),
  category: z.enum(['Driver', 'Helper', 'Cleaner', 'Office Staff', 'Garage', 'Security', 'Management']),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  nicNumber: z.string().min(10, 'NIC Number is required'),
  licenseNo: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  active: z.boolean()
});

type StaffFormData = z.infer<typeof staffSchema>;

const StaffFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      active: true,
      category: 'Driver',
      fullName: '',
      phone: '',
      email: '',
      nicNumber: '',
      licenseNo: '',
      department: 'Operations'
    }
  });

  const selectedCategory = watch('category');
  const isActive = watch('active');

  useEffect(() => {
    if (id) {
      const fetchMember = async () => {
        try {
          const data = await getStaffMember(id);
          if (data) {
            setValue('fullName', data.fullName);
            setValue('category', data.category);
            setValue('phone', data.phone);
            setValue('email', data.email || '');
            setValue('nicNumber', data.nicNumber);
            setValue('licenseNo', data.licenseNo || '');
            setValue('active', data.active ?? true);
            setValue('department', data.department || 'Operations');
          }
        } catch (err) {
          console.error(err);
          navigate('/staff');
        } finally {
          setInitialLoading(false);
        }
      };
      fetchMember();
    }
  }, [id, setValue, navigate]);

  const onSubmit = async (data: StaffFormData) => {
    setLoading(true);
    try {
      if (id) {
        await updateStaffMember(id, data);
      } else {
        await createStaffMember(data);
      }
      navigate('/staff');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader 
        title={id ? 'Refine Personnel Record' : 'Onboard New Staff'} 
        subtitle={id ? 'Updating credentials and system permissions.' : 'Establishing new identity in the fleet ecosystem.'}
        back="/staff"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <User className="w-32 h-32 text-indigo-600" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Legal Full Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                   <User className="w-5 h-5" />
                </div>
                <input
                  {...register('fullName')}
                  placeholder="e.g. Johnathan Doe"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                    errors.fullName && "border-red-500/50 bg-red-50"
                  )}
                />
              </div>
              {errors.fullName && <p className="mt-1 text-[10px] font-bold text-red-500 px-1 uppercase tracking-tighter">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Operational Role</label>
              <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-48 scrollbar-hide pr-2">
                {(['Driver', 'Helper', 'Cleaner', 'Office Staff', 'Garage', 'Security', 'Management'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setValue('category', cat)}
                    className={cn(
                      "px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      selectedCategory === cat 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100" 
                        : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">NIC Number (National ID)</label>
                <input
                  {...register('nicNumber')}
                  placeholder="e.g. 200312345678"
                  className={cn(
                    "w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                    errors.nicNumber && "border-red-500/50 bg-red-50"
                  )}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Department</label>
                <select
                  {...register('department')}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="Operations" className="bg-white">Operations</option>
                  <option value="Accounts" className="bg-white">Accounts</option>
                  <option value="HR" className="bg-white">HR</option>
                  <option value="Garage" className="bg-white">Garage</option>
                  <option value="Security" className="bg-white">Security</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Primary Contact</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    {...register('phone')}
                    placeholder="+94 77 XXXXXXX"
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                      errors.phone && "border-red-500/50 bg-red-50"
                    )}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-[10px] font-bold text-red-500 px-1 uppercase tracking-tighter">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Enterprise Email (Optional)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                   <Mail className="w-5 h-5" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="internal@wedage.com"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400",
                    errors.email && "border-red-500/50 bg-red-50"
                  )}
                />
              </div>
              {errors.email && <p className="mt-1 text-[10px] font-bold text-red-500 px-1 uppercase tracking-tighter">{errors.email.message}</p>}
            </div>

            {selectedCategory === 'Driver' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="md:col-span-2 space-y-3"
              >
                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest px-1">Heavy Vehicle License No.</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 w-5 h-5" />
                  <input
                    {...register('licenseNo')}
                    placeholder="SL-12345/WP"
                    className="w-full pl-12 pr-4 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl focus:ring-1 focus:ring-indigo-400 outline-none transition-all font-mono font-bold text-indigo-600 placeholder:text-indigo-200"
                  />
                </div>
              </motion.div>
            )}
          </div>

          <div className="pt-10 border-t border-gray-100 flex items-center justify-between">
            <div 
              className="flex items-center space-x-4 cursor-pointer group"
              onClick={() => setValue('active', !isActive)}
            >
              <div className={cn(
                "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                isActive ? "bg-emerald-50 border border-emerald-200" : "bg-gray-100 border border-gray-200"
              )}>
                <motion.div 
                  animate={{ x: isActive ? 24 : 0 }}
                  className={cn(
                    "w-4 h-4 rounded-full transition-colors shadow-sm",
                    isActive ? "bg-emerald-500 shadow-emerald-500/20" : "bg-gray-400"
                  )} 
                />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Active Status</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Available for operations</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/10 flex items-center space-x-3 disabled:bg-indigo-200 disabled:text-gray-500 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-xs px-2">{id ? 'Commit Changes' : 'Initialize Record'}</span>
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

export default StaffFormPage;
