import React, { useState } from 'react';
import {
  ClipboardCheck, Search, Truck, Edit, Trash2,
  ChevronRight, Calendar, Plus, Clock, CheckCircle2,
  Circle, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteJobCard, JobCardStatus } from '../../services/jobCardService';
import { useJobCards } from '../../hooks/useJobCards';
import { useFleet } from '../../hooks/useFleet';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const STATUS_CONFIG: Record<JobCardStatus, { label: string; color: string; icon: React.FC<any> }> = {
  'open': { label: 'Open', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Circle },
  'in-progress': { label: 'In Progress', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Loader2 },
  'completed': { label: 'Completed', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
};

const JobCardListPage: React.FC = () => {
  const { jobCards, loading, refresh } = useJobCards();
  const { vehicles } = useFleet();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobCardStatus | ''>('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const navigate = useNavigate();

  const getVehiclePlate = (id: string) => vehicles.find(v => v.id === id)?.plateNo || '---';

  const filtered = jobCards.filter(jc => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      jc.workOrderNo.toLowerCase().includes(q) ||
      jc.vehicleNo.toLowerCase().includes(q) ||
      jc.technicianName.toLowerCase().includes(q) ||
      (jc.recentDriverName || '').toLowerCase().includes(q);
    const matchesStatus = !statusFilter || jc.status === statusFilter;
    const matchesVehicle = !vehicleFilter || jc.vehicleId === vehicleFilter;
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  const counts = {
    open: jobCards.filter(j => j.status === 'open').length,
    'in-progress': jobCards.filter(j => j.status === 'in-progress').length,
    completed: jobCards.filter(j => j.status === 'completed').length,
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this job card permanently?')) {
      await deleteJobCard(id);
      refresh();
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Vehicle Repair Job Cards"
        subtitle={`Garage Operations • ${jobCards.length} Total Cards`}
        back="/garage"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-indigo-600 w-4 h-4 transition-colors" />
              <input
                type="text"
                placeholder="Search job cards..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-11 pr-5 py-3 text-xs w-56 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-2 p-1 bg-gray-50 border border-gray-200 rounded-full">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-transparent px-4 py-2 text-[10px] text-gray-500 focus:outline-none font-black uppercase tracking-widest cursor-pointer appearance-none"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <div className="w-[1px] h-4 bg-gray-200" />
              <select
                value={vehicleFilter}
                onChange={e => setVehicleFilter(e.target.value)}
                className="bg-transparent px-4 py-2 text-[10px] text-gray-500 focus:outline-none font-black uppercase tracking-widest cursor-pointer appearance-none"
              >
                <option value="">All Vehicles</option>
                {vehicles.map(v => <option key={v.id} value={v.id!}>{v.plateNo}</option>)}
              </select>
            </div>
            <PermissionGate permission="edit_fleet">
              <Link
                to="/garage/job-cards/new"
                className="bg-indigo-600 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Job Card</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {(['open', 'in-progress', 'completed'] as JobCardStatus[]).map(s => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={cn(
                "bg-white border rounded-2xl p-5 flex items-center gap-4 transition-all hover:shadow-md text-left",
                statusFilter === s ? cfg.color + ' border-current' : 'border-gray-200'
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", cfg.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{counts[s]}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm min-h-[50vh]">
        {loading ? (
          <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5 font-black">Work Order</th>
                  <th className="px-8 py-5 font-black">Date / Time</th>
                  <th className="px-8 py-5 font-black">Vehicle</th>
                  <th className="px-8 py-5 font-black">Technician</th>
                  <th className="px-8 py-5 font-black">Problem Summary</th>
                  <th className="px-8 py-5 font-black">Status</th>
                  <th className="px-8 py-5 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((jc, i) => {
                  const cfg = STATUS_CONFIG[jc.status];
                  const StatusIcon = cfg.icon;
                  const problemSummary = jc.problemDescription?.[0]?.text || '—';
                  return (
                    <motion.tr
                      key={jc.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50 transition-all group cursor-pointer border-l-2 border-transparent hover:border-indigo-500/50"
                      onClick={() => navigate(`/garage/job-cards/${jc.id}/edit`)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <ClipboardCheck className="w-4 h-4 text-indigo-400" />
                          </div>
                          <span className="text-xs font-black text-gray-900 tracking-wider">{jc.workOrderNo}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[11px] font-bold text-gray-900">{jc.date}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{jc.time || '—'}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-gray-100">
                            <Truck className="w-3 h-3 text-gray-400" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-wide text-gray-900">{jc.vehicleNo}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[11px] font-bold text-gray-700">{jc.technicianName}</p>
                        {jc.recentDriverName && (
                          <p className="text-[9px] text-gray-400 mt-0.5">Driver: {jc.recentDriverName}</p>
                        )}
                      </td>
                      <td className="px-8 py-5 max-w-[180px]">
                        <p className="text-[10px] text-gray-500 italic truncate">{problemSummary}</p>
                        {jc.problemDescription?.length > 1 && (
                          <p className="text-[9px] text-gray-400 font-black mt-0.5">+{jc.problemDescription.length - 1} more</p>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", cfg.color)}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <PermissionGate permission="edit_fleet">
                            <Link
                              to={`/garage/job-cards/${jc.id}/edit`}
                              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={e => handleDelete(jc.id!, e)}
                              className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </PermissionGate>
                          <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-32 text-center">
                <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <ClipboardCheck className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">No job cards found.</p>
                <p className="text-gray-400 text-[9px] font-medium mt-2">Create a new job card to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobCardListPage;
