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

  const startTime = log.outTime;
  const endTime = log.inTime;
  const totalMileage = log.totalKm || (log.endMileage && log.startMileage ? log.endMileage - log.startMileage : null);

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
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-indigo-500/50 transition-all font-black text-[10px] flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              EDIT LOG
            </Link>
            <button 
              onClick={handleDelete}
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all font-black text-[10px] flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              DELETE
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
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                 <ClipboardList className="w-48 h-48 text-white" />
              </div>

              <div className="relative z-10 space-y-12">
                 <div className="flex justify-between items-start">
                    <div>
                       <div className="flex items-center gap-3">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg",
                          statusStyles[log.status as keyof typeof statusStyles] || statusStyles['On Trip']
                        )}>
                          Status: {log.status}
                        </span>
                        {log.isApproved && (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 shadow-lg flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                       </div>
                       <h1 className="text-4xl font-black text-white mt-6 uppercase tracking-widest">
                          {log.logSheetCode || 'N/A'}
                       </h1>
                       <p className="text-[10px] font-bold text-indigo-400 mt-2 uppercase tracking-[0.4em]">Operation Engagement Sequence</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Authenticated Entry</p>
                       <p className="text-xs font-bold text-white lowercase bg-white/5 px-3 py-1 rounded-full border border-white/5">{log.enteredBy || '---'}</p>
                    </div>
                 </div>

                 {/* Key Actors */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                       <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Deployment Target</span>
                       </div>
                       <div>
                          <p className="text-lg font-bold text-white uppercase">{customer?.name || 'Unknown Entity'}</p>
                          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{log.representative || 'No Rep Assigned'}</p>
                       </div>
                    </div>

                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                       <div className="flex items-center gap-3">
                          <Truck className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Operational Asset</span>
                       </div>
                       <div>
                          <p className="text-lg font-bold text-white uppercase">{vehicle?.plateNo || 'Unknown Asset'}</p>
                          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{vehicle?.type} • Freezer: {log.vehicleHasFreezer ? 'YES' : 'NO'}</p>
                       </div>
                    </div>
                 </div>

                 {/* Telemetry Visual */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-white/5">
                    <div className="space-y-6">
                       <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Departure Vector</span>
                       </div>
                       <div className="space-y-4 font-mono">
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest leading-none mb-1">Starting Hub Meter</p>
                            <p className="text-2xl font-black text-white">{log.startMileage?.toLocaleString() || '---'} <span className="text-xs text-gray-700">KM</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest leading-none mb-1">Time Departure</p>
                            <p className="text-sm text-gray-400 font-black uppercase tracking-tight">{log.date} • {log.outTime}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Return Logic</span>
                       </div>
                       <div className="space-y-4 font-mono">
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest leading-none mb-1">Arrival Hub Meter</p>
                            <p className="text-2xl font-black text-white">{log.endMileage?.toLocaleString() || '---'} <span className="text-xs text-gray-700">KM</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest leading-none mb-1">Time Arrival</p>
                            <p className="text-sm text-gray-400 font-black uppercase tracking-tight">{log.inTime ? `${log.date} • ${log.inTime}` : 'IN TRANSIT'}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Meter Status Info */}
                 {log.meterStatus === 'Not Working' && (
                    <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-2xl flex items-center gap-4">
                       <Activity className="w-6 h-6 text-rose-500" />
                       <div>
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Telemetry Malfunction</p>
                          <p className="text-xs font-bold text-white mt-1">Reason: {log.meterNonWorkingReason || 'Telemetery fault detected and logged.'}</p>
                       </div>
                    </div>
                 )}

                 {/* Purpose Remarks */}
                 <div className="bg-white/5 p-8 rounded-3xl space-y-4">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2">Operational Scope / Narrative</p>
                    <p className="text-sm text-gray-300 leading-relaxed font-medium italic">
                       "{log.remarks || 'No qualitative data was captured for this logistics engagement.'}"
                    </p>
                 </div>
              </div>
           </motion.div>
        </div>

        {/* Personnel & Freezer Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 space-y-8"
           >
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-4">Active Personnel</h3>
              
              <div className="space-y-6">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 font-black">
                       {driver?.fullName.charAt(0)}
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">Assigned Driver</p>
                       <p className="text-sm font-bold text-white">{driver?.fullName || '---'}</p>
                       <p className="text-[10px] text-gray-600 font-mono italic tracking-tighter">{driver?.licenseNo}</p>
                    </div>
                 </div>

                 {helper && (
                    <div className="flex items-center gap-5 pt-4 border-t border-white/5">
                       <div className="w-12 h-12 bg-gray-500/10 rounded-xl flex items-center justify-center text-gray-400 border border-white/5 font-black">
                         {helper?.fullName.charAt(0)}
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Active Helper</p>
                         <p className="text-sm font-bold text-white">{helper?.fullName}</p>
                         <p className="text-[10px] text-gray-600 font-mono italic tracking-tighter">Support Unit</p>
                       </div>
                    </div>
                 )}
              </div>
           </motion.div>

           {/* Freezer Control Analytics */}
           {log.vehicleHasFreezer && (
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 space-y-6"
             >
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Freezer Control</h3>
                   <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                      log.freezerStatus === 'ON' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                   )}>
                      {log.freezerStatus || 'OFF'}
                   </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Temperature</p>
                      <p className="text-lg font-black text-white">{log.freezerTemp || '---'}°C</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl">
                      <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Active Hours</p>
                      <p className="text-lg font-black text-white">{log.freezerTotalHours || '---'}H</p>
                   </div>
                </div>

                <div className="space-y-3 font-mono text-[10px] font-bold text-gray-500 pt-2">
                   <div className="flex justify-between">
                      <span>ON TIME:</span>
                      <span className="text-white">{log.freezerOnTime || '---'}</span>
                   </div>
                   <div className="flex justify-between">
                      <span>OFF TIME:</span>
                      <span className="text-white">{log.freezerOffTime || '---'}</span>
                   </div>
                </div>
             </motion.div>
           )}

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-gradient-to-br from-indigo-900/40 via-black to-black border border-indigo-500/20 rounded-3xl p-8"
           >
              <div className="flex items-center gap-2 mb-6">
                 <Activity className="w-4 h-4 text-indigo-400" />
                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Trip Analytics</span>
              </div>
              <div className="space-y-8">
                 <div>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Aggregate Distance</p>
                    <p className="text-3xl font-black text-white">{totalMileage !== null ? totalMileage : '---'} <span className="text-xs text-gray-700 uppercase">KM</span></p>
                 </div>
                 <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-2">Protocol Adherence</p>
                    <div className="flex flex-wrap gap-2">
                       <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold text-gray-500 uppercase">GPS-SYNCED</span>
                       <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold text-gray-500 uppercase">METER-VERIFIED</span>
                    </div>
                 </div>
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
};

const statusStyles = {
  'On Trip': 'bg-blue-500/10 text-blue-400 border-blue-500/40 shadow-blue-500/5',
  'Completed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-emerald-500/5',
  'Breakdown': 'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-rose-500/5',
  'Cancelled': 'bg-gray-500/10 text-gray-400 border-gray-500/40 shadow-gray-500/5',
};

export default LogDetailPage;
