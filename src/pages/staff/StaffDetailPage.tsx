import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStaffMember, StaffMember, deleteStaffMember } from '../../services/staffService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { 
  Phone, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  User, 
  Edit, 
  Trash2, 
  Briefcase,
  History,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const StaffDetailPage: React.FC = () => {
  const { id } = useParams();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchMember = async () => {
        try {
          const data = await getStaffMember(id);
          setMember(data || null);
        } catch (err) {
          console.error(err);
          navigate('/staff');
        } finally {
          setLoading(false);
        }
      };
      fetchMember();
    }
  }, [id, navigate]);

  const handleDelete = async () => {
    if (id && window.confirm(`Are you sure you want to delete ${member?.fullName}?`)) {
      await deleteStaffMember(id);
      navigate('/staff');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!member) return null;

  return (
    <div className="max-w-4xl">
      <PageHeader 
        title={member.fullName} 
        subtitle={`Staff Record - ${member.category.toUpperCase()}`}
        back="/staff"
        actions={
          <PermissionGate permission="edit_staff">
            <Link 
              to={`/staff/${id}/edit`} 
              className="inline-flex items-center space-x-2 bg-white border border-gray-100 hover:border-indigo-200 text-indigo-600 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm"
            >
              <Edit className="w-5 h-5" />
              <span>Edit Details</span>
            </Link>
            <button 
              onClick={handleDelete}
              className="inline-flex items-center space-x-2 bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm text-center"
          >
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-sm border border-indigo-100">
              {member.fullName.charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{member.fullName}</h2>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-6">{member.category}</p>
            
            <div className={cn(
              "inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold shadow-sm",
              member.active 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                : "bg-rose-50 text-rose-700 border border-rose-100"
            )}>
              {member.active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{member.active ? 'ACTIVE & DUTY-READY' : 'INACTIVE / LEAVE'}</span>
            </div>
          </motion.div>
        </div>

        {/* Details Grid */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-sm"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-8 border-b border-gray-50 pb-4">Personal & Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              <DetailItem icon={User} label="NIC Number" value={member.nicNumber} />
              <DetailItem icon={Briefcase} label="Department" value={member.department} />
              <DetailItem icon={Phone} label="Primary Phone" value={member.phone} href={`tel:${member.phone}`} />
              <DetailItem icon={Mail} label="Email Address" value={member.email || "No email provided"} href={member.email ? `mailto:${member.email}` : undefined} />
              <DetailItem icon={Calendar} label="Registered On" value={member.createdAt?.toDate ? format(member.createdAt.toDate(), 'PPP') : 'Recently Added'} />
              <DetailItem icon={Briefcase} label="Deployment Status" value={member.active ? "Ready for dispatch" : "Restricted / Off-duty"} />
            </div>

            {member.category === 'Driver' && (
              <div className="mt-12 pt-8 border-t border-gray-50">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-3">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                  <span>Driving Credentials</span>
                </h3>
                <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest mb-1">License Verified</p>
                      <p className="text-xl font-bold text-indigo-900">{member.licenseNo || 'Pending Verification'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ icon: Icon, label, value, href }: { icon: any, label: string, value: string, href?: string }) => (
  <div className="flex items-start space-x-4">
    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      {href ? (
        <a href={href} className="text-base font-bold text-indigo-600 hover:underline">{value}</a>
      ) : (
        <p className="text-base font-bold text-gray-900">{value}</p>
      )}
    </div>
  </div>
);

export default StaffDetailPage;
