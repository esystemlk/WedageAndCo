import React, { useEffect, useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  ShieldCheck, 
  ArrowLeft,
  Calendar,
  Briefcase,
  FileText,
  Download,
  AlertCircle,
  Heart,
  Activity,
  Droplets
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { getStaffMember, StaffMember } from '../../services/staffService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';

const StaffDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchMember = async () => {
        try {
          const data = await getStaffMember(id);
          setMember(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchMember();
    }
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!member) return <div className="text-center py-20 font-black text-gray-400 uppercase tracking-widest">Personnel Not Found</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/staff')}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title={member.fullName} 
          subtitle={member.nickname ? `"${member.nickname}" • ${member.category}` : member.category}
        />
        <div className="ml-auto">
          <span className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
            member.active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
          )}>
            {member.active ? 'Operational' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
           <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl text-center"
           >
              {member.profilePicture ? (
                <img src={member.profilePicture} alt="Profile" className="w-40 h-40 rounded-[2rem] object-cover mx-auto mb-6 border-4 border-indigo-50 shadow-lg" />
              ) : (
                <div className="w-40 h-40 rounded-[2rem] bg-gray-50 flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-gray-200">
                   <User className="w-16 h-16 text-gray-200" />
                </div>
              )}
              <h3 className="text-lg font-black text-gray-900">{member.fullName}</h3>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">{member.department}</p>
              
              <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
                 <div className="p-4 bg-gray-50 rounded-2xl">
                    <Droplets className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Blood</p>
                    <p className="text-xs font-black text-gray-900">{member.bloodType || 'N/A'}</p>
                 </div>
                 <div className="p-4 bg-gray-50 rounded-2xl">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">ID</p>
                    <p className="text-xs font-black text-gray-900 truncate">{member.nicNumber}</p>
                 </div>
              </div>
           </motion.div>

           <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100 shadow-xl">
              <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Heart className="w-3 h-3" /> Emergency Protocol
              </h4>
              <div className="space-y-3">
                 <div>
                    <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Primary Contact</p>
                    <p className="text-xs font-black text-gray-900">{member.emergencyContactName || '---'}</p>
                 </div>
                 <div className="flex justify-between items-end">
                    <div>
                       <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Phone</p>
                       <p className="text-xs font-black text-gray-900">{member.emergencyContactPhone || '---'}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Relation</p>
                       <p className="text-xs font-black text-gray-900">{member.emergencyContactRelation || '---'}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Detailed Info */}
        <div className="lg:col-span-3 space-y-8">
           <section className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <div>
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 border-b border-gray-50 pb-2">Communication Hub</h4>
                       <div className="space-y-6">
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-indigo-50 rounded-xl">
                                <Phone className="w-5 h-5 text-indigo-600" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Connection</p>
                                <p className="text-sm font-bold text-gray-900">{member.phone}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-emerald-50 rounded-xl">
                                <Mail className="w-5 h-5 text-emerald-600" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enterprise Email</p>
                                <p className="text-sm font-bold text-gray-900">{member.email || 'NO EMAIL REGISTERED'}</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    {member.category === 'Driver' && (
                       <div>
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 border-b border-indigo-50 pb-2">Heavy Machinery Ops</h4>
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-indigo-50 rounded-xl">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Driving License No.</p>
                                <p className="text-sm font-bold text-indigo-600 font-mono">{member.licenseNo || 'NOT RECORDED'}</p>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>

                 <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6 border-b border-gray-50 pb-2">Document Dossier</h4>
                    <div className="grid grid-cols-1 gap-3">
                       <DocLink label="Police Report" url={member.policeReportUrl} />
                       <DocLink label="Grama Niladari" url={member.gramaNiladariUrl} />
                       <DocLink label="Birth Certificate" url={member.birthCertificateUrl} />
                       <DocLink label="National ID Copy" url={member.idCopyUrl} />
                       
                       {member.certificatesUrls && member.certificatesUrls.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-50">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Academic & Vocational</p>
                             <div className="grid grid-cols-2 gap-3">
                                {member.certificatesUrls.map((url, i) => (
                                   <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-2xl overflow-hidden border border-gray-100 hover:ring-2 hover:ring-indigo-500 transition-all">
                                      <img src={url} alt="Cert" className="w-full h-full object-cover" />
                                   </a>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </section>

           <section className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Operational Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Commencement Date</p>
                    <p className="text-sm font-bold text-gray-900">{member.joinDate || 'NOT RECORDED'}</p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Compensation</p>
                    <p className="text-sm font-bold text-gray-900">LKR {member.basicSalary?.toLocaleString() || '---'}</p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Disbursement</p>
                    <p className="text-sm font-bold text-gray-900 font-mono truncate">{member.bankAccountNo || '---'}</p>
                 </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

const DocLink = ({ label, url }: { label: string, url?: string }) => (
   <a 
    href={url || '#'} 
    target={url ? "_blank" : undefined}
    rel="noreferrer"
    className={cn(
      "flex items-center justify-between p-4 rounded-2xl border transition-all group",
      url ? "bg-gray-50 border-gray-100 hover:bg-indigo-50 hover:border-indigo-200" : "bg-gray-50/50 border-transparent opacity-40 cursor-not-allowed"
    )}
   >
      <div className="flex items-center gap-3">
         <FileText className={cn("w-4 h-4", url ? "text-indigo-600" : "text-gray-400")} />
         <span className="text-[10px] font-black uppercase text-gray-600 group-hover:text-indigo-600">{label}</span>
      </div>
      {url ? <Download className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-300" />}
   </a>
);

export default StaffDetailPage;
