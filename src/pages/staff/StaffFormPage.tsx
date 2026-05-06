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
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['driver', 'helper', 'cleaning', 'office']),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  licenseNo: z.string().optional(),
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
      type: 'driver',
      name: '',
      phone: '',
      email: '',
      licenseNo: ''
    }
  });

  const selectedType = watch('type');
  const isActive = watch('active');

  useEffect(() => {
    if (id) {
      const fetchMember = async () => {
        try {
          const data = await getStaffMember(id);
          if (data) {
            setValue('name', data.name);
            setValue('type', data.type);
            setValue('phone', data.phone);
            setValue('email', data.email || '');
            setValue('licenseNo', data.licenseNo || '');
            setValue('active', data.active ?? true);
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
        className="bg-[#0a0a0a] p-8 lg:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <User className="w-32 h-32 text-white" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Legal Full Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                   <User className="w-5 h-5" />
                </div>
                <input
                  {...register('name')}
                  placeholder="e.g. Johnathan Doe"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600",
                    errors.name && "border-red-500/50 bg-red-500/5"
                  )}
                />
              </div>
              {errors.name && <p className="mt-1 text-[10px] font-bold text-red-400 px-1 uppercase tracking-tighter">{errors.name.message}</p>}
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Operational Role</label>
              <div className="grid grid-cols-2 gap-3">
                {(['driver', 'helper', 'cleaning', 'office'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue('type', type)}
                    className={cn(
                      "px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      selectedType === type 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                        : "bg-white/5 border-white/5 text-gray-500 hover:border-white/10"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Primary Contact</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                   <Phone className="w-5 h-5" />
                </div>
                <input
                  {...register('phone')}
                  placeholder="+94 77 XXXXXXX"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600",
                    errors.phone && "border-red-500/50 bg-red-500/5"
                  )}
                />
              </div>
              {errors.phone && <p className="mt-1 text-[10px] font-bold text-red-400 px-1 uppercase tracking-tighter">{errors.phone.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Enterprise Email (Optional)</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                   <Mail className="w-5 h-5" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="internal@wedage.com"
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-bold text-white placeholder:text-gray-600",
                    errors.email && "border-red-500/50 bg-red-500/5"
                  )}
                />
              </div>
              {errors.email && <p className="mt-1 text-[10px] font-bold text-red-400 px-1 uppercase tracking-tighter">{errors.email.message}</p>}
            </div>

            {selectedType === 'driver' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="md:col-span-2 space-y-3"
              >
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Heavy Vehicle License No.</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 w-5 h-5" />
                  <input
                    {...register('licenseNo')}
                    placeholder="SL-12345/WP"
                    className="w-full pl-12 pr-4 py-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl focus:ring-1 focus:ring-indigo-400 outline-none transition-all font-mono font-bold text-indigo-400 placeholder:text-indigo-900"
                  />
                </div>
              </motion.div>
            )}
          </div>

          <div className="pt-10 border-t border-white/10 flex items-center justify-between">
            <div 
              className="flex items-center space-x-4 cursor-pointer group"
              onClick={() => setValue('active', !isActive)}
            >
              <div className={cn(
                "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                isActive ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-gray-800 border border-white/5"
              )}>
                <motion.div 
                  animate={{ x: isActive ? 24 : 0 }}
                  className={cn(
                    "w-4 h-4 rounded-full transition-colors shadow-lg",
                    isActive ? "bg-emerald-400 shadow-emerald-500/50" : "bg-gray-600"
                  )} 
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Active Status</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Available for operations</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/10 flex items-center space-x-3 disabled:bg-indigo-900 disabled:text-gray-500 group"
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
