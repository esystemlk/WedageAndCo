import React, { useState } from 'react';
import { 
  Wrench, 
  Search, 
  Truck, 
  ChevronRight, 
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteMaintenanceRecord } from '../../services/maintenanceService';
import { useMaintenance } from '../../hooks/useMaintenance';
import { useFleet } from '../../hooks/useFleet';
import { useSuppliers } from '../../hooks/useSuppliers';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const GaragePage: React.FC = () => {
  const { records, loading, refresh } = useMaintenance();
  const { vehicles } = useFleet();
  const { suppliers } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const getVehiclePlate = (id: string) => vehicles.find(v => v.id === id)?.plateNo || '---';
  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Internal / Other';

  const clearFilters = () => {
    setSearchTerm('');
    setVehicleFilter('');
    setSupplierFilter('');
    setStartDate('');
    setEndDate('');
  };

  const filteredRecords = records.filter(r => {
    const plate = getVehiclePlate(r.vehicleId).toLowerCase();
    const desc = r.description.toLowerCase();
    const parts = (r.partsReplaced || '').toLowerCase();
    
    const matchesSearch = plate.includes(searchTerm.toLowerCase()) || 
                          desc.includes(searchTerm.toLowerCase()) || 
                          parts.includes(searchTerm.toLowerCase());
    
    const matchesVehicle = !vehicleFilter || r.vehicleId === vehicleFilter;
    const matchesSupplier = !supplierFilter || r.supplierId === supplierFilter;

    // Date range filtering
    const recordDate = new Date(r.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start) {
      start.setHours(0, 0, 0, 0);
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    const matchesStartDate = !start || recordDate >= start;
    const matchesEndDate = !end || recordDate <= end;

    return matchesSearch && matchesVehicle && matchesSupplier && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const hasActiveFilters = searchTerm || vehicleFilter || supplierFilter || startDate || endDate;

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this maintenance record from history?')) {
      try {
        await deleteMaintenanceRecord(id);
        refresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-10 group/page">
      <PageHeader 
        title="Garage Operations" 
        subtitle={`Fleet Maintenance • ${records.length} Mechanical Interventions`}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-indigo-600 w-4 h-4 transition-colors" />
              <input 
                type="text"
                placeholder="Search maintenance registry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-11 pr-5 py-3 text-xs w-64 focus:outline-none focus:border-indigo-500/50 focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400"
              />
            </div>
            
            <div className="flex items-center gap-2 p-1 bg-gray-50 border border-gray-200 rounded-full">
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="bg-transparent px-4 py-2 text-[10px] text-gray-500 focus:outline-none font-black uppercase tracking-widest cursor-pointer hover:text-gray-900 transition-colors appearance-none"
              >
                <option value="" className="bg-white">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id} className="bg-white">{v.plateNo}</option>
                ))}
              </select>

              <div className="w-[1px] h-4 bg-gray-200" />

              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="bg-transparent px-4 py-2 text-[10px] text-gray-500 focus:outline-none font-black uppercase tracking-widest cursor-pointer hover:text-gray-900 transition-colors appearance-none"
              >
                <option value="" className="bg-white">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id} className="bg-white">{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5">
              <Calendar className="w-3 h-3 text-indigo-600 opacity-50" />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[10px] text-indigo-600 focus:outline-none font-black uppercase"
                title="Start Date"
              />
              <span className="text-gray-300 font-bold">—</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[10px] text-indigo-600 focus:outline-none font-black uppercase"
                title="End Date"
              />
            </div>

            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
              >
                Reset Filters
              </button>
            )}

            <PermissionGate permission="edit_fleet">
              <Link 
                to="/garage/new" 
                className="group/btn bg-indigo-600 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20 flex items-center gap-3 active:scale-95"
              >
                <Wrench className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform" />
                <span>New Intervention</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />
      <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm min-h-[60vh] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.01] to-transparent pointer-events-none" />
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto relative z-10 scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-10 py-6 font-black">Timeline</th>
                  <th className="px-10 py-6 font-black">Asset Identity</th>
                  <th className="px-10 py-6 font-black">Service Provider</th>
                  <th className="px-10 py-6 font-black">Intervention Detail</th>
                  <th className="px-10 py-6 font-black">Fiscal Impact</th>
                  <th className="px-10 py-6 font-black text-right">Utility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredRecords.map((record, i) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-gray-50 transition-all group cursor-pointer border-l-2 border-transparent hover:border-indigo-500/50"
                    onClick={() => navigate(`/garage/${record.id}`)}
                  >
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100 group-hover:bg-indigo-100 group-hover:border-indigo-200 transition-all duration-500">
                          <Wrench className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                            {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5 tracking-widest uppercase">Index: {record.id?.slice(-4)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-gray-100 border border-gray-200">
                            <Truck className="w-3 h-3 text-gray-400 group-hover:text-amber-500 transition-colors" />
                          </div>
                          <span className="text-[11px] text-gray-900 font-black uppercase tracking-[0.1em]">{getVehiclePlate(record.vehicleId)}</span>
                       </div>
                    </td>
                    <td className="px-10 py-6">
                       <p className="text-[10px] text-indigo-600/80 font-black uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">
                         {getSupplierName(record.supplierId || '')}
                       </p>
                    </td>
                    <td className="px-10 py-6">
                       <div className="max-w-[180px] space-y-1">
                          <p className="text-xs text-gray-500 font-medium truncate italic leading-relaxed group-hover:text-gray-900 transition-colors">
                            "{record.description}"
                          </p>
                          <p className="text-[9px] text-gray-400 truncate font-black uppercase tracking-widest">{record.partsReplaced || 'General Diagnostic'}</p>
                       </div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Valuation</span>
                          <div className="flex items-center gap-1.5 text-gray-900">
                             <span className="text-[10px] font-black text-indigo-600 opacity-60">LKR</span>
                             <span className="text-sm font-black font-mono tracking-tighter">
                               {record.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                             </span>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <PermissionGate permission="edit_fleet">
                          <Link 
                            to={`/garage/${record.id}/edit`} 
                            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all outline-none"
                            title="Amend Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(record.id!)}
                            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all outline-none"
                            title="Purge Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </PermissionGate>
                        <div className="w-8 flex justify-center">
                          <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredRecords.length === 0 && (
              <div className="py-32 text-center relative z-10">
                 <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-6 h-6 text-gray-300" />
                 </div>
                 <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Lifecycle ledger remains untarnished.</p>
                 <p className="text-gray-400 text-[9px] font-medium mt-2">Modify active filters to expand search parameters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GaragePage;
