import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Truck, 
  Settings, 
  Fuel, 
  ShieldCheck, 
  Edit, 
  Trash2, 
  ArrowLeft,
  ChevronRight,
  Info,
  Calendar,
  Activity,
  Wrench,
  DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';
import { getVehicle, deleteVehicle, Vehicle } from '../../services/fleetService';
import { useMaintenance } from '../../hooks/useMaintenance';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';

const VehicleDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const { records: maintenance, loading: maintLoading } = useMaintenance(id);

  const totalMaintCost = maintenance.reduce((sum, rec) => sum + rec.cost, 0);

  useEffect(() => {
    if (id) {
      const fetchVehicle = async () => {
        try {
          const data = await getVehicle(id);
          setVehicle(data || null);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchVehicle();
    }
  }, [id]);

  const handleDelete = async () => {
    if (id && vehicle && window.confirm(`Permanently decommission vehicle "${vehicle.plateNo}"?`)) {
      try {
        await deleteVehicle(id);
        navigate('/fleet');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading || maintLoading) return <LoadingSpinner />;
  if (!vehicle) return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-xl font-bold text-white mb-4">Asset not found in current fleet registry.</h2>
      <Link to="/fleet" className="text-indigo-400 font-bold hover:underline">Return to Fleet</Link>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header Navigation */}
      <div className="flex items-center justify-between px-1">
        <button onClick={() => navigate('/fleet')} className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Fleet</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <PermissionGate permission="edit_fleet">
            <Link 
              to={`/fleet/${id}/edit`} 
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-indigo-500/50 transition-all font-bold flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest hidden md:inline">Edit Specs</span>
            </Link>
            <button 
              onClick={handleDelete}
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all font-bold flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest hidden md:inline">Decommission</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Status Display */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-3 bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden"
        >
           <div className="absolute top-0 right-0 p-12 opacity-5">
              <Truck className="w-48 h-48 text-white" />
           </div>

           <div className="relative z-10">
              <div className="flex items-start justify-between mb-12">
                 <div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block border",
                      vehicle.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50" : "bg-amber-500/10 text-amber-400 border-amber-500/50"
                    )}>
                      Operational: {vehicle.status}
                    </span>
                    <h1 className="text-5xl font-black text-white mt-4 uppercase tracking-tighter">{vehicle.plateNo}</h1>
                    <p className="text-sm font-bold text-gray-500 mt-2 uppercase tracking-widest">{vehicle.make} {vehicle.model} • {vehicle.type}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Ownership Type</p>
                    <p className="text-xl font-bold text-white uppercase">{vehicle.ownership}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-white/5">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Fuel Core</p>
                    <div className="flex items-center gap-2 text-white">
                       <Fuel className="w-4 h-4 text-amber-400" />
                       <span className="font-bold uppercase">{vehicle.fuelType}</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Efficiency Status</p>
                    <div className="flex items-center gap-2 text-white">
                       <Activity className="w-4 h-4 text-emerald-400" />
                       <span className="font-bold">N/A</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Last Inspected</p>
                    <div className="flex items-center gap-2 text-white">
                       <Calendar className="w-4 h-4 text-indigo-400" />
                       <span className="font-bold">Not Tracked</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Mileage Index</p>
                    <div className="flex items-center gap-2 text-white">
                       <Settings className="w-4 h-4 text-gray-400" />
                       <span className="font-bold font-mono text-xs">000,000 KM</span>
                    </div>
                 </div>
              </div>
           </div>
        </motion.div>

        <div className="lg:col-span-1 space-y-6">
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-white/5 border border-white/10 rounded-3xl p-8"
           >
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-2">
                 <DollarSign className="w-3 h-3" />
                 Financial Footprint
              </h3>
              <div className="space-y-2">
                 <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Total Maintenance Cost</p>
                 <p className="text-2xl font-black text-white font-mono">
                    <span className="text-xs text-indigo-400 mr-2">LKR</span>
                    {totalMaintCost.toLocaleString()}
                 </p>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-white/5 border border-white/10 rounded-3xl p-8"
           >
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-2">
                 <Info className="w-3 h-3" />
                 Structural Identity
              </h3>
              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Chassis Identifier</p>
                    <p className="text-sm font-mono text-white break-all">{vehicle.chassisNo || 'Not Provided'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Engine Blueprint</p>
                    <p className="text-sm font-mono text-white break-all">{vehicle.engineNo || 'Not Provided'}</p>
                 </div>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-indigo-600 rounded-3xl p-8 relative overflow-hidden group cursor-pointer"
             onClick={() => navigate('/logs')}
           >
              <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
                 <Truck className="w-32 h-32 text-white" />
              </div>
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] mb-4">Real-time Deployment</p>
              <h3 className="text-xl font-bold text-white mb-6">Current Location & Assignment</h3>
              <div className="flex items-center justify-between text-indigo-100 text-sm font-bold">
                 <span>View Log Sheets</span>
                 <ChevronRight className="w-4 h-4" />
              </div>
           </motion.div>
        </div>
      </div>

      {/* Maintenance History Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Maintenance History</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Lifecycle Mechanical Logs</p>
           </div>
           <Link 
             to="/garage/new" 
             className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all"
           >
             Log New Intervention
           </Link>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                 <tr>
                    <th className="px-8 py-5 font-bold">Service Sequence</th>
                    <th className="px-8 py-5 font-bold">Intervention Narration</th>
                    <th className="px-8 py-5 font-bold text-right">Fiscal Impact</th>
                    <th className="px-8 py-5 font-bold text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                 {maintenance.map((record, i) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => navigate(`/garage/${record.id}`)}
                    >
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/20">
                                <Wrench className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white uppercase tracking-tight">
                                   {new Date(record.date).toLocaleDateString()}
                                </p>
                                <p className="text-[10px] text-gray-600 font-mono italic">Ref: {record.id?.slice(-6).toUpperCase()}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-sm text-gray-300 font-medium truncate max-w-[300px]">{record.description}</p>
                          <p className="text-[10px] text-gray-600 font-bold uppercase truncate max-w-[200px]">{record.partsReplaced || 'General Service'}</p>
                       </td>
                       <td className="px-8 py-5 text-right font-mono text-sm font-black text-amber-400">
                          {record.cost.toLocaleString()}
                       </td>
                       <td className="px-8 py-5 text-right">
                          <ChevronRight className="w-4 h-4 text-gray-700 ml-auto" />
                       </td>
                    </tr>
                 ))}
                 {maintenance.length === 0 && (
                   <tr>
                     <td colSpan={4} className="py-20 text-center text-gray-600 text-xs font-black uppercase tracking-widest">
                        No mechanical interventions recorded for this asset.
                     </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </motion.div>
    </div>
  );
};

export default VehicleDetailPage;
