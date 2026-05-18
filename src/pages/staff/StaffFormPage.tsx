import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useParams, useNavigate } from 'react-router-dom';
import { createStaffMember, updateStaffMember, getStaffMember, getStaffMembers, StaffMember } from '../../services/staffService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import FileUpload from '../../components/shared/FileUpload';
import { Save, User, Phone, Mail, FileCheck, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const staffSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required'),
  nickname: z.string().optional(),
  category: z.enum(['Driver', 'Helper', 'Cleaner', 'Office Staff', 'Garage']),
  phone: z.string().min(10, 'Valid phone number is required'),
  additionalPhones: z.string().optional(),
  landline: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  nicNumber: z.string().min(10, 'NIC Number is required'),
  licenseNo: z.string().optional(),
  department: z.enum(['Operations', 'Accounts/HR/IT']),
  active: z.boolean(),
  bloodType: z.string().optional(),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(1, 'Phone is required'),
    relation: z.string().min(1, 'Relation is required')
  })).optional(),
  
  // HR & Identity
  staffId: z.string().optional(),
  epfNo: z.string().optional(),
  etfNo: z.string().optional(),
  position: z.string().optional(),
  basicSalary: z.any().optional(),
  uniformProvided: z.boolean(),
  
  // Documents
  profilePicture: z.string().optional(),
  policeReportUrl: z.string().optional(),
  policeReportAddLater: z.boolean().optional(),
  policeReportDeadline: z.string().optional().or(z.literal('')),
  gramaNiladariUrl: z.string().optional(),
  gramaNiladariAddLater: z.boolean().optional(),
  gramaNiladariDeadline: z.string().optional().or(z.literal('')),
  birthCertificateUrl: z.string().optional(),
  birthCertificateAddLater: z.boolean().optional(),
  birthCertificateDeadline: z.string().optional().or(z.literal('')),
  idCopyUrl: z.string().optional(),
  cvUrl: z.string().optional(),
  cvAddLater: z.boolean().optional(),
  cvDeadline: z.string().optional().or(z.literal('')),
  certificatesUrls: z.array(z.string()).optional(),
  additionalCertificatesAddLater: z.boolean().optional(),
  additionalCertificatesDeadline: z.string().optional().or(z.literal('')),
});

type StaffFormData = z.infer<typeof staffSchema>;

const StaffFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      active: true,
      category: 'Driver',
      fullName: '',
      nickname: '',
      phone: '',
      additionalPhones: '',
      landline: '',
      address: '',
      email: '',
      nicNumber: '',
      licenseNo: '',
      department: 'Operations',
      certificatesUrls: [],
      emergencyContacts: [],
      staffId: '',
      epfNo: '',
      etfNo: '',
      position: '',
      basicSalary: undefined,
      uniformProvided: false,
      cvUrl: '',
      policeReportAddLater: false,
      policeReportDeadline: '',
      gramaNiladariAddLater: false,
      gramaNiladariDeadline: '',
      birthCertificateAddLater: false,
      birthCertificateDeadline: '',
      cvAddLater: false,
      cvDeadline: '',
      additionalCertificatesAddLater: false,
      additionalCertificatesDeadline: ''
    }
  });

  const { fields: emergencyFields, append: appendEmergency, remove: removeEmergency } = useFieldArray({
    control,
    name: 'emergencyContacts'
  });

  const selectedCategory = watch('category');
  const isActive = watch('active');
  const profilePicture = watch('profilePicture');
  const policeReportUrl = watch('policeReportUrl');
  const policeReportAddLater = watch('policeReportAddLater');
  const gramaNiladariUrl = watch('gramaNiladariUrl');
  const gramaNiladariAddLater = watch('gramaNiladariAddLater');
  const birthCertificateUrl = watch('birthCertificateUrl');
  const birthCertificateAddLater = watch('birthCertificateAddLater');
  const idCopyUrl = watch('idCopyUrl');
  const cvUrl = watch('cvUrl');
  const cvAddLater = watch('cvAddLater');
  const certificatesUrls = watch('certificatesUrls') || [];
  const additionalCertificatesAddLater = watch('additionalCertificatesAddLater');

  useEffect(() => {
    const initForm = async () => {
      try {
        if (id) {
          const data = await getStaffMember(id);
          if (data) {
            setValue('fullName', data.fullName);
            setValue('nickname', data.nickname || '');
            setValue('category', data.category as any);
            setValue('phone', data.phone);
            setValue('additionalPhones', data.additionalPhones?.join(', ') || '');
            setValue('landline', data.landline || '');
            setValue('address', data.address || '');
            setValue('email', data.email || '');
            setValue('nicNumber', data.nicNumber);
            setValue('licenseNo', data.licenseNo || '');
            setValue('active', data.active ?? true);
            setValue('department', (data.department as any) || 'Operations');
            setValue('bloodType', data.bloodType || '');
            setValue('emergencyContacts', data.emergencyContacts || []);
            setValue('profilePicture', data.profilePicture || '');
            setValue('policeReportUrl', data.policeReportUrl || '');
            setValue('policeReportAddLater', data.policeReportAddLater || false);
            setValue('policeReportDeadline', data.policeReportDeadline || '');
            setValue('gramaNiladariUrl', data.gramaNiladariUrl || '');
            setValue('gramaNiladariAddLater', data.gramaNiladariAddLater || false);
            setValue('gramaNiladariDeadline', data.gramaNiladariDeadline || '');
            setValue('birthCertificateUrl', data.birthCertificateUrl || '');
            setValue('birthCertificateAddLater', data.birthCertificateAddLater || false);
            setValue('birthCertificateDeadline', data.birthCertificateDeadline || '');
            setValue('idCopyUrl', data.idCopyUrl || '');
            setValue('cvUrl', data.cvUrl || '');
            setValue('cvAddLater', data.cvAddLater || false);
            setValue('cvDeadline', data.cvDeadline || '');
            setValue('certificatesUrls', data.certificatesUrls || []);
            setValue('additionalCertificatesAddLater', data.additionalCertificatesAddLater || false);
            setValue('additionalCertificatesDeadline', data.additionalCertificatesDeadline || '');
            setValue('staffId', data.staffId || '');
            setValue('epfNo', data.epfNo || '');
            setValue('etfNo', data.etfNo || '');
            setValue('position', data.position || '');
            setValue('basicSalary', data.basicSalary);
            setValue('uniformProvided', data.uniformProvided || false);
          }
        } else {
          // Generate unique sequential employee ID automatically
          const allStaff = await getStaffMembers();
          const nextCount = (allStaff?.length || 0) + 1;
          const generatedId = `EMP-${String(nextCount).padStart(3, '0')}`;
          setValue('staffId', generatedId);
        }
      } catch (err) {
        console.error(err);
        if (id) navigate('/staff');
      } finally {
        setInitialLoading(false);
      }
    };
    initForm();
  }, [id, setValue, navigate]);

  const onSubmit = async (data: StaffFormData) => {
    setLoading(true);
    try {
      const processedData = {
        ...data,
        basicSalary: data.basicSalary ? Number(data.basicSalary) : undefined,
        additionalPhones: data.additionalPhones ? data.additionalPhones.split(',').map(s => s.trim()).filter(Boolean) : [],
        landline: data.landline || '',
        address: data.address || ''
      };
      if (id) {
        await updateStaffMember(id, processedData as any);
      } else {
        await createStaffMember(processedData as any);
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
            {/* Profile Picture Upload */}
            <div className="md:col-span-2 flex justify-center">
              <div className="space-y-4 text-center">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile Picture</label>
                <div className="relative inline-block">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-32 h-32 rounded-3xl object-cover border-4 border-indigo-50 shadow-lg" />
                  ) : (
                    <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2">
                    <FileUpload 
                      path="staff/profiles"
                      onUploadComplete={(url) => setValue('profilePicture', url)}
                      showPreview={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
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

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nickname</label>
              <input
                {...register('nickname')}
                placeholder="e.g. Johnny"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Operational Role</label>
              <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-48 scrollbar-hide pr-2">
                {(['Driver', 'Helper', 'Cleaner', 'Office Staff', 'Garage'] as const).map((cat) => (
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
                  <option value="Accounts/HR/IT" className="bg-white">Accounts/HR/IT</option>
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

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Blood Type</label>
              <select
                {...register('bloodType')}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
              >
                <option value="">Select Blood Type</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
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

            {/* Contact Details Extensions */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 border-t border-gray-100 pt-8 mt-4">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Landline Number (Optional)</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    {...register('landline')}
                    placeholder="e.g. +94 11 2345678"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Additional Contact Numbers (Optional)</label>
                <input
                  {...register('additionalPhones')}
                  placeholder="e.g. +94 71 2345678, +94 72 3456789"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                />
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider px-1">Separate multiple numbers with commas.</p>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Residential Address (Optional)</label>
                <textarea
                  {...register('address')}
                  placeholder="e.g. 123 Temple Road, Colombo 03, Sri Lanka"
                  rows={3}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Emergency Contact Information</p>
                <button 
                  type="button" 
                  onClick={() => appendEmergency({ name: '', phone: '', relation: '' })}
                  className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase hover:bg-rose-100 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Contact
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyFields.map((field, index) => (
                  <div key={field.id} className="p-6 bg-rose-50 rounded-3xl border border-rose-100 relative group">
                    <button 
                      type="button" 
                      onClick={() => removeEmergency(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">Contact Name</label>
                        <input {...register(`emergencyContacts.${index}.name` as const)} className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">Phone Number</label>
                        <input {...register(`emergencyContacts.${index}.phone` as const)} className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">Relation</label>
                        <input {...register(`emergencyContacts.${index}.relation` as const)} className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Employment & Identity Credentials */}
            <div className="md:col-span-2 space-y-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <div className="h-px bg-gray-150 flex-1"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Employment Credentials</h3>
                <div className="h-px bg-gray-150 flex-1"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Staff unique ID No.</label>
                  <input
                    {...register('staffId')}
                    placeholder="e.g. EMP-1001"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Designated Position</label>
                  <input
                    {...register('position')}
                    placeholder="e.g. Operations Coordinator"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Basic Monthly Salary (LKR)</label>
                  <input
                    type="number"
                    {...register('basicSalary')}
                    placeholder="e.g. 85000"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">EPF Registration No.</label>
                  <input
                    {...register('epfNo')}
                    placeholder="e.g. EPF-5678"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ETF Registration No.</label>
                  <input
                    {...register('etfNo')}
                    placeholder="e.g. ETF-5678"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
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

            {/* Document Uploads */}
            <div className="md:col-span-2 space-y-8 pt-6">
              <div className="flex items-center gap-4">
                <div className="h-px bg-gray-150 flex-1"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Document Dossier</h3>
                <div className="h-px bg-gray-150 flex-1"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Police Report */}
                <div className="space-y-4 p-6 bg-gray-50/50 border border-gray-100 rounded-3xl relative flex flex-col justify-between shadow-sm">
                  <FileUpload label="Police Report" path="staff/docs" onUploadComplete={(url) => setValue('policeReportUrl', url)} currentUrl={policeReportUrl} />
                  <div className="pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 cursor-pointer select-none">
                      <input type="checkbox" {...register('policeReportAddLater')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      Submit Later / Grace Period
                    </label>
                    {policeReportAddLater && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest shrink-0">Grace Date:</span>
                        <input type="date" {...register('policeReportDeadline')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl outline-none [color-scheme:light]" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Grama Niladari Certificate */}
                <div className="space-y-4 p-6 bg-gray-50/50 border border-gray-100 rounded-3xl relative flex flex-col justify-between shadow-sm">
                  <FileUpload label="Grama Niladari Certificate" path="staff/docs" onUploadComplete={(url) => setValue('gramaNiladariUrl', url)} currentUrl={gramaNiladariUrl} />
                  <div className="pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 cursor-pointer select-none">
                      <input type="checkbox" {...register('gramaNiladariAddLater')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      Submit Later / Grace Period
                    </label>
                    {gramaNiladariAddLater && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest shrink-0">Grace Date:</span>
                        <input type="date" {...register('gramaNiladariDeadline')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl outline-none [color-scheme:light]" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Birth Certificate Copy */}
                <div className="space-y-4 p-6 bg-gray-50/50 border border-gray-100 rounded-3xl relative flex flex-col justify-between shadow-sm">
                  <FileUpload label="Birth Certificate Copy" path="staff/docs" onUploadComplete={(url) => setValue('birthCertificateUrl', url)} currentUrl={birthCertificateUrl} />
                  <div className="pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 cursor-pointer select-none">
                      <input type="checkbox" {...register('birthCertificateAddLater')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      Submit Later / Grace Period
                    </label>
                    {birthCertificateAddLater && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest shrink-0">Grace Date:</span>
                        <input type="date" {...register('birthCertificateDeadline')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl outline-none [color-scheme:light]" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* NIC/ID Copy - Mandatory! */}
                <div className="space-y-4 p-6 bg-indigo-50/20 border border-indigo-100/50 rounded-3xl relative flex flex-col justify-between shadow-sm">
                  <FileUpload label="NIC/ID Copy" path="staff/docs" onUploadComplete={(url) => setValue('idCopyUrl', url)} currentUrl={idCopyUrl} />
                  <div className="pt-4 border-t border-indigo-100/40 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">
                      🛡️ Mandatory Identity Document
                    </span>
                    <span className="text-[9px] font-bold text-indigo-400">
                      Cannot submit later
                    </span>
                  </div>
                </div>

                {/* Copy of CV */}
                <div className="space-y-4 p-6 bg-gray-50/50 border border-gray-100 rounded-3xl relative flex flex-col justify-between shadow-sm">
                  <FileUpload label="Copy of CV" path="staff/docs" onUploadComplete={(url) => setValue('cvUrl', url)} currentUrl={cvUrl} />
                  <div className="pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 cursor-pointer select-none">
                      <input type="checkbox" {...register('cvAddLater')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      Submit Later / Grace Period
                    </label>
                    {cvAddLater && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest shrink-0">Grace Date:</span>
                        <input type="date" {...register('cvDeadline')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl outline-none [color-scheme:light]" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Additional Certificates */}
                <div className="space-y-4 p-6 bg-gray-50/50 border border-gray-100 rounded-3xl relative flex flex-col justify-between shadow-sm md:col-span-2">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Additional Certificates</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      {certificatesUrls.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="Cert" className="w-full h-32 rounded-2xl object-cover border border-gray-200" />
                          <button 
                            type="button"
                            onClick={() => setValue('certificatesUrls', certificatesUrls.filter((_, idx) => idx !== i))}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <FileUpload 
                        path="staff/certificates" 
                        onUploadComplete={(url) => setValue('certificatesUrls', [...certificatesUrls, url])} 
                        showPreview={false}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 cursor-pointer select-none">
                      <input type="checkbox" {...register('additionalCertificatesAddLater')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                      Submit Later / Grace Period
                    </label>
                    {additionalCertificatesAddLater && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest shrink-0">Grace Date:</span>
                        <input type="date" {...register('additionalCertificatesDeadline')} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl outline-none [color-scheme:light]" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
