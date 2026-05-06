import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Truck, 
  ChevronRight, 
  Edit,
  Trash2,
  Filter,
  Fuel,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteVehicle } from '../../services/fleetService';
import { useFleet } from '../../hooks/useFleet';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const FleetListPage: React.FC = () => {
  const { vehicles, loading, refresh } = useFleet();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'maintenance' | 'unavailable'>('all');
  const navigate = useNavigate();

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.plateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || v.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'maintenance': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'unavailable': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const handleDelete = async (id: string, plate: string) => {
    if (window.confirm(`Permanently remove vehicle "${plate}" from fleet?`)) {
      try {
        await deleteVehicle(id);
        refresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Fleet Inventory" 
        subtitle={`Asset Management • ${vehicles.length} Total Vehicles`}
        actions={
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search plate no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-white"
              />
            </div>
            <PermissionGate permission="edit_fleet">
              <Link 
                to="/fleet/new" 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vehicle</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl min-h-[60vh]">
        <div className="bg-white/5 px-8 pt-4 border-b border-white/10 flex items-center gap-8">
          {(['all', 'active', 'maintenance', 'unavailable'] as const).map((s) => (
             <button
               key={s}
               onClick={() => setFilter(s)}
               className={cn(
                 "text-sm font-bold capitalize transition-all pb-4 border-b-2",
                 filter === s ? "text-white border-indigo-500" : "text-gray-500 hover:text-gray-300 border-transparent"
               )}
             >
               {s}
             </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                <tr>
                  <th className="px-8 py-5 font-bold">Plate Number</th>
                  <th className="px-8 py-5 font-bold">Type / Specs</th>
                  <th className="px-8 py-5 font-bold">Ownership</th>
                  <th className="px-8 py-5 font-bold">Status</th>
                  <th className="px-8 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredVehicles.map((vehicle, i) => (
                  <motion.tr
                    key={vehicle.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/fleet/${vehicle.id}`)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{vehicle.plateNo}</p>
                          <p className="text-[10px] text-gray-500 font-mono italic">{vehicle.make} {vehicle.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-xs text-gray-300 uppercase font-black tracking-tighter">{vehicle.type}</span>
                       <div className="flex items-center gap-2 mt-1">
                          <Fuel className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] text-gray-500 uppercase font-bold">{vehicle.fuelType}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className={cn(
                         "px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest border",
                         vehicle.ownership === 'owned' ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" : "border-purple-500/20 text-purple-400 bg-purple-500/5"
                       )}>
                         {vehicle.ownership}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                       <span className={cn(
                         "px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest border",
                         getStatusStyles(vehicle.status)
                       )}>
                         {vehicle.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                        <PermissionGate permission="edit_fleet">
                          <Link to={`/fleet/${vehicle.id}/edit`} className="p-2 text-gray-500 hover:text-white transition-colors">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(vehicle.id!, vehicle.plateNo)}
                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                        <ChevronRight className="w-4 h-4 text-gray-700 ml-2" />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredVehicles.length === 0 && (
              <div className="py-24 text-center">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No vehicles found matching criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetListPage;
