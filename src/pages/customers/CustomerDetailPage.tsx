import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Phone, 
  Tag, 
  Calendar, 
  FileText, 
  ArrowLeft,
  Briefcase,
  Wallet,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User,
  MapPin,
  Clock
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { getCustomer, Customer } from '../../services/customerService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';

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
          setCustomer(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchCustomer();
    }
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!customer) return <div className="text-center py-20 font-black text-gray-400 uppercase tracking-widest">Account Not Found</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/customers')}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title={customer.name} 
          subtitle={customer.nickname ? `"${customer.nickname}" • Logistical Partner` : 'Logistical Partner'}
        />
        <div className="ml-auto flex items-center gap-3">
           <span className={cn(
             "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
             customer.customerType === 'permanent' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-amber-50 text-amber-600 border-amber-100"
           )}>
              {customer.customerType}
           </span>
           <span className={cn(
             "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
             customer.paysVat ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100"
           )}>
              {customer.paysVat ? 'VAT Registered' : 'Non-VAT'}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Identity & Documentation */}
        <div className="lg:col-span-2 space-y-8">
           <section className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Building2 className="w-32 h-32 text-indigo-600" />
              </div>

              <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-8">Corporate Identity</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Registered Entity Name</p>
                       <p className="text-lg font-black text-gray-900">{customer.name}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Business Registration (BR)</p>
                       <p className="text-sm font-bold text-indigo-600 font-mono">{customer.brNo}</p>
                    </div>
                    {customer.vatNo && (
                       <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">VAT/SVAT Identification</p>
                          <p className="text-sm font-bold text-emerald-600 font-mono">{customer.vatNo}</p>
                       </div>
                    )}
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Legal Artifacts</p>
                    <div className="grid grid-cols-1 gap-3">
                       <DocLink label="Business Registration (BR)" url={customer.brImage} icon={<Building2 className="w-4 h-4 text-indigo-600" />} />
                       <DocLink label="Logistics Master Agreement" url={customer.agreementUrl} icon={<FileText className="w-4 h-4 text-emerald-600" />} />
                    </div>
                    
                    <div className="mt-6 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                       <div className="flex items-center gap-3 mb-4">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Contract Cycle</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <div>
                             <p className="text-[9px] font-black text-indigo-300 uppercase">Commencement</p>
                             <p className="text-xs font-bold text-indigo-900">{customer.agreementStart}</p>
                          </div>
                          <div className="h-8 w-px bg-indigo-200" />
                          <div className="text-right">
                             <p className="text-[9px] font-black text-indigo-300 uppercase">Expiration</p>
                             <p className="text-xs font-bold text-rose-600">{customer.agreementEnd}</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </section>

           <section className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em] mb-8">Official HQ Address</h3>
              <div className="flex items-start gap-4">
                 <div className="p-4 bg-gray-50 rounded-2xl">
                    <MapPin className="w-6 h-6 text-gray-400" />
                 </div>
                 <p className="text-lg font-bold text-gray-700 leading-relaxed">
                    {customer.officialContact}
                 </p>
              </div>
           </section>
        </div>

        {/* Stakeholder Network */}
        <div className="space-y-8">
           <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-50 pb-2">Operational Liaison</h3>
              <div className="space-y-6">
                 <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                       <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                       <p className="text-sm font-black text-gray-900">{customer.opsContactName || 'None Assigned'}</p>
                       <p className="text-xs font-bold text-gray-400">{customer.opsContactNumber || '---'}</p>
                    </div>
                 </div>

                 {customer.additionalOpsContacts && customer.additionalOpsContacts.map((contact, i) => (
                    <div key={i} className="flex items-start gap-3 pl-2 border-l-2 border-emerald-100 ml-5">
                       <div className="flex-1">
                          <p className="text-xs font-bold text-gray-700">{contact.name}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{contact.phone}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </section>

           <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-50 pb-2">Financial Stakeholders</h3>
              <div className="space-y-6">
                 <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                       <Wallet className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                       <p className="text-sm font-black text-gray-900">{customer.billingContactName || 'None Assigned'}</p>
                       <p className="text-xs font-bold text-gray-400">{customer.billingContactNumber || '---'}</p>
                    </div>
                 </div>

                 {customer.additionalBillingContacts && customer.additionalBillingContacts.map((contact, i) => (
                    <div key={i} className="flex items-start gap-3 pl-2 border-l-2 border-amber-100 ml-5">
                       <div className="flex-1">
                          <p className="text-xs font-bold text-gray-700">{contact.name}</p>
                          <p className="text-[10px] font-bold text-amber-600">{contact.phone}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </section>

           {customer.additionalContacts && customer.additionalContacts.length > 0 && (
              <section className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-xl text-white">
                 <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-indigo-400">Other Generic Stakeholders</h3>
                 <div className="space-y-4">
                    {customer.additionalContacts.map((contact, i) => (
                       <div key={i} className="p-4 bg-gray-800/50 rounded-2xl border border-gray-700">
                          <div className="flex items-center justify-between mb-1">
                             <p className="text-xs font-black text-white">{contact.name}</p>
                             <span className="text-[8px] font-black uppercase tracking-tighter text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{contact.role || 'GUEST'}</span>
                          </div>
                          <p className="text-[10px] font-bold text-gray-400">{contact.phone}</p>
                       </div>
                    ))}
                 </div>
              </section>
           )}
        </div>
      </div>
    </div>
  );
};

const DocLink = ({ label, url, icon }: { label: string, url?: string, icon: React.ReactNode }) => (
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
         {icon}
         <span className="text-[10px] font-black uppercase text-gray-600 group-hover:text-indigo-600">{label}</span>
      </div>
      {url ? <Download className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-300" />}
   </a>
);

export default CustomerDetailPage;
