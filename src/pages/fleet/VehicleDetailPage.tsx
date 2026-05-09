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
  DollarSign,
  Maximize,
  Weight
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
      <h2 className="text-xl font-bold text-gray-900 mb-4">Asset not found in current fleet registry.</h2>
      <Link to="/fleet" className="text-indigo-600 font-bold hover:underline">Return to Fleet</Link>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header Navigation */}
      <div className="flex items-center justify-between px-1">
        <button onClick={() => navigate('/fleet')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Fleet</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <PermissionGate permission="edit_fleet">
            <Link 
              to={`/fleet/${id}/edit`} 
              className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-900 hover:border-indigo-500/50 transition-all font-bold flex items-center gap-2 shadow-sm"
            >
              <Edit className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest hidden md:inline">Edit Specs</span>
            </Link>
            <button 
              onClick={handleDelete}
              className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-red-600 hover:border-red-500/50 transition-all font-bold flex items-center gap-2 shadow-sm"
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
          className="lg:col-span-3 bg-white border border-gray-200 rounded-[2.5rem] p-10 relative overflow-hidden shadow-sm"
        >
           <div className="absolute top-0 right-0 p-12 opacity-5">
              <Truck className="w-48 h-48 text-indigo-600" />
           </div>

           <div className="relative z-10">
              <div className="flex items-start justify-between mb-12">
                 <div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block border",
                      vehicle.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                    )}>
                      Operational: {vehicle.status}
                    </span>
                    <h1 className="text-5xl font-black text-gray-900 mt-4 uppercase tracking-tighter">{vehicle.plateNo}</h1>
                    <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">{vehicle.make} {vehicle.model} • {vehicle.type}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ownership Type</p>
                    <p className="text-xl font-bold text-gray-900 uppercase">{vehicle.ownership}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-gray-100">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fuel Core</p>
                    <div className="flex items-center gap-2 text-gray-900">
                       <Fuel className="w-4 h-4 text-amber-600" />
                       <span className="font-bold uppercase">{vehicle.fuelType}</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficiency Status</p>
                    <div className="flex items-center gap-2 text-gray-900">
                       <Activity className="w-4 h-4 text-emerald-600" />
                       <span className="font-bold">N/A</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Inspected</p>
                    <div className="flex items-center gap-2 text-gray-900">
                       <Calendar className="w-4 h-4 text-indigo-600" />
                       <span className="font-bold">Not Tracked</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mileage Index</p>
                    <div className="flex items-center gap-2 text-gray-900">
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
             className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm"
           >
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                 <DollarSign className="w-3 h-3" />
                 Financial Footprint
              </h3>
              <div className="space-y-2">
                 <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Total Maintenance Cost</p>
                 <p className="text-2xl font-black text-gray-900 font-mono">
                    <span className="text-xs text-indigo-600 mr-2">LKR</span>
                    {totalMaintCost.toLocaleString()}
                 </p>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm"
           >
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                 <Info className="w-3 h-3" />
                 Structural Identity
              </h3>
              <div className="space-y-6">
                 <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Chassis Identifier</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{vehicle.chassisNo || 'Not Provided'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Engine Blueprint</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{vehicle.engineNo || 'Not Provided'}</p>
                 </div>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm"
           >
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                 <Maximize className="w-3 h-3" />
                 Logistics Dimensionality
              </h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                 <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Dimensions (L×W×H)</p>
                    <div className="flex items-baseline gap-1 text-gray-900 font-mono text-xs font-bold">
                       <span>{vehicle.length || '-'}</span>
                       <span className="text-[8px] text-gray-400">×</span>
                       <span>{vehicle.width || '-'}</span>
                       <span className="text-[8px] text-gray-400">×</span>
                       <span>{vehicle.height || '-'}</span>
                       <span className="text-[8px] text-indigo-600 font-black ml-1">FT</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Max Load</p>
                    <div className="flex items-baseline gap-1 text-gray-900 font-mono text-xs font-bold">
                       <Weight className="w-3 h-3 text-emerald-600 mr-1" />
                       <span>{vehicle.weightCapacity || '0.0'}</span>
                       <span className="text-[8px] text-emerald-600 font-black ml-1">TONS</span>
                    </div>
                 </div>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-indigo-600 rounded-3xl p-8 relative overflow-hidden group cursor-pointer shadow-lg shadow-indigo-200"
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
        className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
           <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Maintenance History</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Lifecycle Mechanical Logs</p>
           </div>
           <Link 
             to="/garage/new" 
             className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all shadow-sm"
           >
             Log New Intervention
           </Link>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-widest text-gray-500 border-b border-gray-100">
                 <tr>
                    <th className="px-8 py-5 font-bold">Service Sequence</th>
                    <th className="px-8 py-5 font-bold">Intervention Narration</th>
                    <th className="px-8 py-5 font-bold text-right">Fiscal Impact</th>
                    <th className="px-8 py-5 font-bold text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                 {maintenance.map((record, i) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-gray-50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/garage/${record.id}`)}
                    >
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm border border-amber-100 shadow-sm">
                                <Wrench className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                                   {new Date(record.date).toLocaleDateString()}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono italic">Ref: {record.id?.slice(-6).toUpperCase()}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-sm text-gray-600 font-medium truncate max-w-[300px]">{record.description}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[200px]">{record.partsReplaced || 'General Service'}</p>
                       </td>
                       <td className="px-8 py-5 text-right font-mono text-sm font-black text-amber-600">
                          {record.cost.toLocaleString()}
                       </td>
                       <td className="px-8 py-5 text-right">
                          <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                       </td>
                    </tr>
                 ))}
                 {maintenance.length === 0 && (
                   <tr>
                     <td colSpan={4} className="py-20 text-center text-gray-400 text-xs font-black uppercase tracking-widest">
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
