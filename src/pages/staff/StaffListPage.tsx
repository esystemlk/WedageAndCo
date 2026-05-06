import React, { useState } from 'react';
import { useStaff } from '../../hooks/useStaff';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { 
  UserPlus, 
  Search, 
  ChevronRight, 
  Edit,
  Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteStaffMember } from '../../services/staffService';

const StaffListPage: React.FC = () => {
  const { staff, loading, refresh } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'driver' | 'helper' | 'cleaning' | 'office'>('all');
  const navigate = useNavigate();

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          member.phone.includes(searchTerm);
    const matchesFilter = activeFilter === 'all' || member.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from records?`)) {
      await deleteStaffMember(id);
      refresh();
    }
  };

  const getBadgeStyles = (type: string) => {
    switch (type) {
      case 'driver': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'helper': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'cleaning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Staff Registry" 
        subtitle={`Human Resources • ${staff.length} Total Personnel`}
        actions={
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-white"
              />
            </div>
            <PermissionGate permission="edit_staff">
              <Link 
                to="/staff/new" 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Member</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl min-h-[60vh]">
        <div className="bg-white/5 px-8 pt-4 pb-0 border-b border-white/10 flex items-center gap-8 overflow-x-auto scrollbar-hide">
          {(['all', 'driver', 'helper', 'cleaning', 'office'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "text-sm font-bold capitalize transition-all pb-4 border-b-2",
                activeFilter === filter 
                  ? "text-white border-indigo-500" 
                  : "text-gray-500 hover:text-gray-300 border-transparent"
              )}
            >
              {filter}
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
                  <th className="px-8 py-5 font-bold">Name & Identifier</th>
                  <th className="px-8 py-5 font-bold">Role / Type</th>
                  <th className="px-8 py-5 font-bold">License / Credential</th>
                  <th className="px-8 py-5 font-bold">Status</th>
                  <th className="px-8 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredStaff.map((member, i) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/staff/${member.id}`)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{member.name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">IDX-{member.id?.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-2 py-1 text-[10px] uppercase font-black tracking-widest rounded border",
                        getBadgeStyles(member.type)
                      )}>
                        {member.type}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-mono text-gray-400 italic">
                        {member.type === 'driver' ? (member.licenseNo || 'Not Verified') : 'Not Applicable'}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(var(--color))] shadow-indigo-500/30",
                          member.active ? "bg-emerald-500 shadow-emerald-500/50" : "bg-gray-600 shadow-none"
                        )}></div>
                        <span className={cn(
                          "text-xs",
                          member.active ? "text-emerald-400" : "text-gray-500"
                        )}>
                          {member.active ? 'Ready' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                        <PermissionGate permission="edit_staff">
                          <Link to={`/staff/${member.id}/edit`} className="p-2 text-gray-500 hover:text-white transition-colors">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(member.id!, member.name)}
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
            {filteredStaff.length === 0 && (
              <div className="py-24 text-center">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No staff members found in this category.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffListPage;
