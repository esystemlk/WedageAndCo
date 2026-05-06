import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Truck, 
  UserSquare2, 
  Building2, 
  Clock, 
  ArrowLeft,
  Edit,
  Trash2,
  Compass,
  Zap,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { getLogSheet, deleteLogSheet, LogSheet } from '../../services/logService';
import { useCustomers } from '../../hooks/useCustomers';
import { useFleet } from '../../hooks/useFleet';
import { useStaff } from '../../hooks/useStaff';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';

const LogDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState<LogSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const { customers } = useCustomers();
  const { vehicles } = useFleet();
  const { staff } = useStaff();

  useEffect(() => {
    if (id) {
      const fetchLog = async () => {
        try {
          const data = await getLogSheet(id);
          setLog(data || null);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchLog();
    }
  }, [id]);

  const handleDelete = async () => {
    if (id && window.confirm('Permanently delete this operational trip log?')) {
      try {
        await deleteLogSheet(id);
        navigate('/logs');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const customer = customers.find(c => c.id === log?.customerId);
  const vehicle = vehicles.find(v => v.id === log?.vehicleId);
  const driver = staff.find(s => s.id === log?.driverId);
  const helper = staff.find(s => s.id === log?.helperId);

  if (loading) return <LoadingSpinner />;
  if (!log) return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-xl font-bold text-white mb-4">Log record not located.</h2>
      <Link to="/logs" className="text-indigo-400 font-bold hover:underline">Go Back</Link>
    </div>
  );

  const totalMileage = log.endMileage && log.startMileage ? log.endMileage - log.startMileage : null;
  const startTime = new Date(log.startTime);
  const endTime = log.endTime ? new Date(log.endTime) : null;
  const durationInHours = endTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) : null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between px-1">
        <button onClick={() => navigate('/logs')} className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Operation Ledger</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <PermissionGate permission="edit_logs">
            <Link 
              to={`/logs/${id}/edit`} 
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-indigo-500/50 transition-all"
            >
              <Edit className="w-4 h-4" />
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
        {/* Core Identity */}
        <div className="lg:col-span-2 space-y-8">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 p-12 opacity-5">
                 <ClipboardList className="w-48 h-48 text-white" />
              </div>

              <div className="relative z-10 space-y-12">
                 <div className="flex justify-between items-start">
                    <div>
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg",
                         log.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-emerald-500/10" : "bg-amber-500/10 text-amber-400 border-amber-500/50 shadow-amber-500/10"
                       )}>
                         Status: {log.status}
                       </span>
                       <h1 className="text-4xl font-black text-white mt-6 uppercase tracking-widest">
                          Trip Log #{log.id?.slice(-4).toUpperCase()}
                       </h1>
                       <p className="text-[10px] font-bold text-indigo-400 mt-2 uppercase tracking-[0.4em]">Operational Sequence</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Authorised By</p>
                       <p className="text-xs font-bold text-white lowercase bg-white/5 px-3 py-1 rounded-full border border-white/5">{log.authorisedBy}</p>
                    </div>
                 </div>

                 {/* Key Actors */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                       <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Client Identification</span>
                       </div>
                       <div>
                          <p className="text-lg font-bold text-white uppercase">{customer?.name || 'Unknown Entity'}</p>
                          <p className="text-[10px] text-gray-600 font-bold uppercase">{customer?.nickname || '---'}</p>
                       </div>
                    </div>

                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                       <div className="flex items-center gap-3">
                          <Truck className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Asset Deployment</span>
                       </div>
                       <div>
                          <p className="text-lg font-bold text-white uppercase">{vehicle?.plateNo || 'Unknown Asset'}</p>
                          <p className="text-[10px] text-gray-600 font-bold uppercase">{vehicle?.type}</p>
                       </div>
                    </div>
                 </div>

                 {/* Telemetry Visual */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-white/5">
                    <div className="space-y-6">
                       <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Entry Telemetry</span>
                       </div>
                       <div className="space-y-4 font-mono">
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Starting Velocity</p>
                            <p className="text-2xl font-black text-white">{log.startMileage?.toLocaleString()} <span className="text-xs text-gray-600">KM</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">T-Zero</p>
                            <p className="text-sm text-gray-400">{new Date(log.startTime).toLocaleString()}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Conclusion Telemetry</span>
                       </div>
                       <div className="space-y-4 font-mono">
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Final Velocity</p>
                            <p className="text-2xl font-black text-white">{log.endMileage?.toLocaleString() || '---'} <span className="text-xs text-gray-600">KM</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Conclusion Time</p>
                            <p className="text-sm text-gray-400">{log.endTime ? new Date(log.endTime).toLocaleString() : '---'}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Purpose Remarks */}
                 <div className="bg-white/5 p-8 rounded-3xl space-y-4">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2">Mission Narrative</p>
                    <p className="text-sm text-gray-300 leading-relaxed font-medium italic">
                       "{log.purpose || 'No qualitative data was captured for this logistics engagement.'}"
                    </p>
                 </div>
              </div>
           </motion.div>
        </div>

        {/* Personnel Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 space-y-8"
           >
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-4">Personnel on Site</h3>
              
              <div className="space-y-6">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 font-black">
                       {driver?.name.charAt(0)}
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">Active Driver</p>
                       <p className="text-sm font-bold text-white">{driver?.name || '---'}</p>
                       <p className="text-[10px] text-gray-600 font-mono italic">{driver?.licenseNo}</p>
                    </div>
                 </div>

                 {helper && (
                   <div className="flex items-center gap-5 pt-4 border-t border-white/5">
                      <div className="w-12 h-12 bg-gray-500/10 rounded-xl flex items-center justify-center text-gray-400 border border-white/5 font-black">
                        {helper?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Support Helper</p>
                        <p className="text-sm font-bold text-white">{helper?.name}</p>
                        <p className="text-[10px] text-gray-600 font-mono italic">ID Verified</p>
                      </div>
                   </div>
                 )}
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-gradient-to-br from-indigo-900/50 to-black border border-indigo-500/30 rounded-3xl p-8"
           >
              <div className="flex items-center gap-2 mb-6">
                 <Activity className="w-4 h-4 text-indigo-400" />
                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Efficiency Analytics</span>
              </div>
              <div className="space-y-8">
                 <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Trip Distance</p>
                    <p className="text-3xl font-black text-white">{totalMileage !== null ? totalMileage : '---'} <span className="text-xs text-gray-600">KM</span></p>
                 </div>
                 <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Time Expenditure</p>
                    <p className="text-3xl font-black text-white">{durationInHours !== null ? durationInHours.toFixed(1) : '---'} <span className="text-xs text-gray-600">HRS</span></p>
                 </div>
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LogDetailPage;
