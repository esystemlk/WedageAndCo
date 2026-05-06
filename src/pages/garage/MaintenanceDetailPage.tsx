import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  Truck, 
  Calendar, 
  DollarSign, 
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  ExternalLink,
  Package,
  ShieldCheck,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import { getMaintenanceRecord, deleteMaintenanceRecord, Maintenance } from '../../services/maintenanceService';
import { useFleet } from '../../hooks/useFleet';
import { useSuppliers } from '../../hooks/useSuppliers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';

const MaintenanceDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Maintenance | null>(null);
  const [loading, setLoading] = useState(true);
  const { vehicles } = useFleet();
  const { suppliers } = useSuppliers();

  useEffect(() => {
    if (id) {
      const fetchRecord = async () => {
        try {
          const data = await getMaintenanceRecord(id);
          setRecord(data || null);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchRecord();
    }
  }, [id]);

  const handleDelete = async () => {
    if (id && window.confirm('Permanently remove this maintenance record from history?')) {
      try {
        await deleteMaintenanceRecord(id);
        navigate('/garage');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const vehicle = vehicles.find(v => v.id === record?.vehicleId);
  const supplier = suppliers.find(s => s.id === record?.supplierId);

  if (loading) return <LoadingSpinner />;
  if (!record) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-bold text-white mb-4">Maintenance record not located.</h2>
      <Link to="/garage" className="text-indigo-400 font-bold hover:underline">Return to Garage Ledger</Link>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between px-1">
        <button onClick={() => navigate('/garage')} className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Garage Ledger</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <PermissionGate permission="edit_fleet">
            <Link 
              to={`/garage/${id}/edit`} 
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-indigo-500/50 transition-all font-bold flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest px-1">Amend Record</span>
            </Link>
            <button 
              onClick={handleDelete}
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Service Context */}
        <div className="lg:col-span-2 space-y-8">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                 <Wrench className="w-48 h-48 text-white" />
              </div>

              <div className="relative z-10 space-y-12">
                 <div className="flex justify-between items-start">
                    <div>
                       <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/50 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-500/10">
                         Mechanical Intervention
                       </span>
                       <h1 className="text-4xl font-black text-white mt-6 uppercase tracking-widest">
                          Service Log #{record.id?.slice(-4).toUpperCase()}
                       </h1>
                       <p className="text-[10px] font-bold text-indigo-400 mt-2 uppercase tracking-[0.4em]">Historical Fleet Recalibration</p>
                    </div>
                 </div>

                 {/* Fleet & Provider Identity */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                       <div className="flex items-center gap-3">
                          <Truck className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Deployment Asset</span>
                       </div>
                       <div>
                          <p className="text-xl font-black text-white uppercase tracking-tight">{vehicle?.plateNo || 'Unknown'}</p>
                          <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">{vehicle?.type} • {vehicle?.ownership}</p>
                       </div>
                    </div>

                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                       <div className="flex items-center gap-3">
                          <History className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Service Timeline</span>
                       </div>
                       <div>
                          <p className="text-xl font-black text-white uppercase tracking-tight">{new Date(record.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">Intervention Date</p>
                       </div>
                    </div>
                 </div>

                 {/* Work Description */}
                 <div className="bg-white/5 p-8 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Technical Narrative</p>
                       <ShieldCheck className="w-4 h-4 text-indigo-400/50" />
                    </div>
                    <div className="space-y-4">
                       <p className="text-lg text-gray-200 leading-relaxed font-medium italic">
                          "{record.description}"
                       </p>
                       {record.partsReplaced && (
                         <div className="pt-4 flex flex-col gap-2">
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Components Exchanged</span>
                            <div className="flex flex-wrap gap-2">
                               {record.partsReplaced.split(',').map((part, i) => (
                                 <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 uppercase">
                                   {part.trim()}
                                 </span>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           </motion.div>
        </div>

        {/* Financial & Logistics Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-gradient-to-br from-[#0a0a0a] to-black border border-white/10 rounded-[2rem] p-8 space-y-8"
           >
              <div className="space-y-6">
                 <div>
                    <div className="flex items-center gap-2 mb-2">
                       <DollarSign className="w-4 h-4 text-amber-400" />
                       <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Fiscal Impact</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <span className="text-sm font-black text-gray-600">LKR</span>
                       <p className="text-4xl font-black text-white font-mono tracking-tighter">
                         {record.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                       </p>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                       <Package className="w-4 h-4 text-gray-600" />
                       <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Authorized Workshop</span>
                    </div>
                    <p className="text-sm font-bold text-white uppercase">{supplier?.name || record.supplierId || 'Internal Facility'}</p>
                 </div>
              </div>

              {/* Bill Attachment Preview */}
              <div className="pt-4">
                 {record.billUrl ? (
                   <a 
                     href={record.billUrl} 
                     target="_blank" 
                     rel="no-referrer"
                     className="w-full flex items-center justify-between p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl group hover:bg-indigo-600/20 transition-all"
                   >
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                            <FileText className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-xs font-black text-white uppercase tracking-tight">Invoice Linked</p>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase">View Original Bill</p>
                         </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                   </a>
                 ) : (
                   <div className="w-full p-6 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <FileText className="w-8 h-8 text-gray-800 mb-2" />
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest leading-relaxed">
                         No digital billing<br/>was archived for this log.
                      </p>
                   </div>
                 )}
              </div>
           </motion.div>

           {/* Asset Health Context */}
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-indigo-900/10 border border-indigo-500/20 rounded-[2rem] p-8"
           >
              <div className="flex items-center gap-2 mb-4">
                 <ShieldCheck className="w-4 h-4 text-indigo-400" />
                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Post-Service Audit</span>
              </div>
              <p className="text-[10px] text-indigo-300 font-medium leading-relaxed italic">
                Mechanical intervention complete. Asset is cleared for operational deployment. Maintenance cycle historical index updated.
              </p>
           </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDetailPage;
