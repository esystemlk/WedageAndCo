import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Phone, 
  FileText, 
  Calendar, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Briefcase,
  Wallet,
  ExternalLink,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { getCustomer, deleteCustomer, Customer } from '../../services/customerService';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchCustomer = async () => {
        try {
          const data = await getCustomer(id);
          setCustomer(data || null);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchCustomer();
    }
  }, [id]);

  const handleDelete = async () => {
    if (id && customer && window.confirm(`Permanently delete client "${customer.name}"?`)) {
      try {
        await deleteCustomer(id);
        navigate('/customers');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer) return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Client registry not found.</h2>
      <Link to="/customers" className="text-indigo-600 font-bold hover:underline">Return to Directory</Link>
    </div>
  );

  const isAgreementExpired = customer.agreementEnd && new Date(customer.agreementEnd) < new Date();

  return (
    <div className="space-y-8 pb-20">
      {/* Header Navigation */}
      <div className="flex items-center justify-between px-1">
        <button onClick={() => navigate('/customers')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Directory</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <PermissionGate permission="edit_customers">
            <Link 
              to={`/customers/${id}/edit`} 
              className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-900 hover:border-indigo-500/50 transition-all shadow-sm"
            >
              <Edit className="w-4 h-4" />
            </Link>
            <button 
              onClick={handleDelete}
              className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-600 hover:border-red-500/50 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-gray-200 p-8 rounded-3xl relative overflow-hidden shadow-sm"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <Building2 className="w-24 h-24 text-indigo-600" />
            </div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 border border-indigo-100">
                <Building2 className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1 uppercase tracking-tight">{customer.name}</h1>
              <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">{customer.nickname || 'Standard Account'}</p>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                   <ShieldCheck className="w-4 h-4 text-emerald-600" />
                   <span className="font-mono">{customer.brNo}</span>
                </div>
                {customer.vatNo && (
                   <div className="flex items-center gap-3 text-sm text-gray-500">
                      <div className="w-4 h-4 flex items-center justify-center text-[10px] font-black text-amber-600">%</div>
                      <span className="font-mono">{customer.vatNo}</span>
                   </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 p-8 rounded-3xl space-y-6 shadow-sm"
          >
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100 pb-4">Agreement Context</h3>
             
             <div className="space-y-6">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Activation Date</p>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-gray-900 font-mono">{customer.agreementStart}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Cycle Conclusion</p>
                  <div className="flex items-center gap-3">
                    <Clock className={cn("w-4 h-4", isAgreementExpired ? "text-rose-600" : "text-emerald-600")} />
                    <span className={cn("text-sm font-mono", isAgreementExpired ? "text-rose-600" : "text-emerald-600 font-bold")}>
                      {customer.agreementEnd}
                    </span>
                  </div>
                </div>

                {customer.agreementUrl && (
                  <a 
                    href={customer.agreementUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl group hover:bg-indigo-100 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">Contract Document</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition-transform" />
                  </a>
                )}
             </div>
          </motion.div>
        </div>

        {/* Main Content Areas */}
        <div className="lg:col-span-2 space-y-8">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white border border-gray-200 p-10 rounded-[2.5rem] space-y-10 shadow-sm"
           >
              {/* HQ Info */}
              <section className="space-y-6">
                 <div className="flex items-center gap-4">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-gray-900">Official Presence</h2>
                 </div>
                 <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl">
                    <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{customer.officialContact}</p>
                 </div>
              </section>

              {/* Liaison Personnel */}
              <section className="space-y-6">
                 <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Authorized Personnel</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Operations */}
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl relative overflow-hidden group shadow-sm">
                       <Briefcase className="absolute -bottom-4 -right-4 w-20 h-20 text-emerald-600/10 group-hover:scale-110 transition-transform" />
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Operations Interface</p>
                       <h3 className="text-lg font-bold text-gray-900">{customer.opsContactName || 'Not Assigned'}</h3>
                       <div className="mt-4 flex items-center gap-2 text-emerald-600">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm font-bold font-mono">{customer.opsContactNumber || '---'}</span>
                       </div>
                    </div>

                    {/* Billing */}
                    <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl relative overflow-hidden group shadow-sm">
                       <Wallet className="absolute -bottom-4 -right-4 w-20 h-20 text-amber-600/10 group-hover:scale-110 transition-transform" />
                       <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Accounts Interface</p>
                       <h3 className="text-lg font-bold text-gray-900">{customer.billingContactName || 'Not Assigned'}</h3>
                       <div className="mt-4 flex items-center gap-2 text-amber-600">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm font-bold font-mono">{customer.billingContactNumber || '---'}</span>
                       </div>
                    </div>
                 </div>
              </section>

              {/* Verification Assets */}
              {customer.brImage && (
                <section className="space-y-6">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Identity Verification Asset</h2>
                  <div className="relative group rounded-3xl overflow-hidden border border-gray-200 bg-gray-50">
                     <img 
                        src={customer.brImage} 
                        alt="BR Visual" 
                        className="w-full h-auto max-h-[500px] object-contain p-4 group-hover:scale-[1.02] transition-transform duration-700" 
                        referrerPolicy="no-referrer"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                        <a 
                          href={customer.brImage} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-6 py-3 bg-white text-gray-900 font-bold text-[10px] uppercase tracking-widest rounded-full shadow-lg"
                        >
                          Enlarge Asset
                        </a>
                     </div>
                  </div>
                </section>
              )}
           </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
