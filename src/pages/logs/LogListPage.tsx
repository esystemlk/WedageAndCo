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
  Building2,
  Plus,
  FileText
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
  const getStaffName = (id: string) => staff.find(s => s.id === id)?.fullName || '---';

  const filteredLogs = logs.filter(l => {
    const custName = getCustomerName(l.customerId).toLowerCase();
    const plate = getVehiclePlate(l.vehicleId).toLowerCase();
    const driver = getStaffName(l.driverId).toLowerCase();
    const code = (l.logSheetCode || '').toLowerCase();
    return custName.includes(searchTerm.toLowerCase()) || 
           plate.includes(searchTerm.toLowerCase()) ||
           driver.includes(searchTerm.toLowerCase()) ||
           code.includes(searchTerm.toLowerCase());
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

  const statusStyles = {
    'On Trip': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Completed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Breakdown': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Cancelled': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
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
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/50 border border-gray-200 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-gray-900"
              />
            </div>
            <PermissionGate permission="edit_logs">
              <Link 
                to="/logs/new" 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/10 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Initialize Log</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col shadow-sm min-h-[60vh]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-black tracking-widest text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-6">Engagement</th>
                  <th className="px-8 py-6">Vehicle & Driver</th>
                  <th className="px-8 py-6">Client & Remarks</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/logs/${log.id}`)}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                            {log.logSheetCode || 'PENDING'}
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{log.date} @ {log.outTime}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 mb-1.5">
                          <Truck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs text-gray-900 font-black uppercase tracking-tight">{getVehiclePlate(log.vehicleId)}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <UserSquare2 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{getStaffName(log.driverId)}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 mb-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] text-amber-600 font-black uppercase tracking-widest">{getCustomerName(log.customerId)}</span>
                       </div>
                       <p className="text-[10px] text-gray-400 truncate max-w-[200px] font-medium">{log.remarks || 'Operational trip log record'}</p>
                    </td>
                    <td className="px-8 py-6">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border",
                         statusStyles[log.status as keyof typeof statusStyles] || statusStyles['On Trip']
                       )}>
                         {log.status}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                        <PermissionGate permission="edit_logs">
                          <Link to={`/logs/${log.id}/edit`} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(log.id!)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGate>
                        <ChevronRight className="w-4 h-4 text-gray-200 ml-2" />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="py-24 text-center">
                 <p className="text-gray-700 text-xs font-black uppercase tracking-[0.2em]">No operational logs matched your search filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogListPage;
