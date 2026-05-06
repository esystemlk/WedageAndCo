import React, { useState } from 'react';
import { 
  ClipboardList, 
  Search, 
  Truck, 
  ChevronRight, 
  Edit,
  Trash2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  UserSquare2,
  Building2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteLogSheet } from '../../services/logService';
import { useLogs } from '../../hooks/useLogs';
import { useCustomers } from '../../hooks/useCustomers';
import { useFleet } from '../../hooks/useFleet';
import { useStaff } from '../../hooks/useStaff';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const LogListPage: React.FC = () => {
  const { logs, loading, refresh } = useLogs();
  const { customers } = useCustomers();
  const { vehicles } = useFleet();
  const { staff } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.nickname || customers.find(c => c.id === id)?.name || '---';
  const getVehiclePlate = (id: string) => vehicles.find(v => v.id === id)?.plateNo || '---';
  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || '---';

  const filteredLogs = logs.filter(l => {
    const custName = getCustomerName(l.customerId).toLowerCase();
    const plate = getVehiclePlate(l.vehicleId).toLowerCase();
    const driver = getStaffName(l.driverId).toLowerCase();
    return custName.includes(searchTerm.toLowerCase()) || 
           plate.includes(searchTerm.toLowerCase()) ||
           driver.includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this operational log?')) {
      try {
        await deleteLogSheet(id);
        refresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Operation Logs" 
        subtitle={`Fleet Intelligence • ${logs.length} Total Trip Records`}
        actions={
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search trip data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-white"
              />
            </div>
            <PermissionGate permission="edit_logs">
              <Link 
                to="/logs/new" 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                <span>New Log</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl min-h-[60vh]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                <tr>
                  <th className="px-8 py-5 font-bold">Trip Identity</th>
                  <th className="px-8 py-5 font-bold">Vehicle & Driver</th>
                  <th className="px-8 py-5 font-bold">Client / Purpose</th>
                  <th className="px-8 py-5 font-bold">Log Status</th>
                  <th className="px-8 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredLogs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/logs/${log.id}`)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                            {new Date(log.startTime).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">IDX-{log.id?.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2 mb-1">
                          <Truck className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs text-white font-bold uppercase tracking-widest">{getVehiclePlate(log.vehicleId)}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <UserSquare2 className="w-3 h-3 text-gray-600" />
                          <span className="text-[10px] text-gray-500 font-bold uppercase">{getStaffName(log.driverId)}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] text-amber-300 font-black uppercase tracking-widest">{getCustomerName(log.customerId)}</span>
                       </div>
                       <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{log.purpose || 'Standard logistics loop'}</p>
                    </td>
                    <td className="px-8 py-5">
                       <span className={cn(
                         "px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest border",
                         log.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                       )}>
                         {log.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                        <PermissionGate permission="edit_logs">
                          <Link to={`/logs/${log.id}/edit`} className="p-2 text-gray-500 hover:text-indigo-400 transition-colors">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(log.id!)}
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
            {filteredLogs.length === 0 && (
              <div className="py-24 text-center">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No trip logs available for current selection.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogListPage;
