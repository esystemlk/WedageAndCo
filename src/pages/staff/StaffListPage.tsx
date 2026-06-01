import React, { useState } from 'react';
import { useStaff } from '../../hooks/useStaff';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import FileUpload from '../../components/shared/FileUpload';
import { 
  UserPlus, 
  Search, 
  ChevronRight, 
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { deleteStaffMember, updateStaffMember } from '../../services/staffService';

const StaffListPage: React.FC = () => {
  const { staff, loading, refresh } = useStaff();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Driver' | 'Helper' | 'Cleaner' | 'Office Staff' | 'Garage'>('All');
  const [activeTab, setActiveTab] = useState<'registry' | 'dossier'>('registry');
  const navigate = useNavigate();
  const toast = useToast();

  const dossierStaff = staff.filter(member => {
    if (!member.active) return false;
    const missingPolice = member.policeReportAddLater && !member.policeReportUrl;
    const missingGrama = member.gramaNiladariAddLater && !member.gramaNiladariUrl;
    const missingBirth = member.birthCertificateAddLater && !member.birthCertificateUrl;
    const missingCv = member.cvAddLater && !member.cvUrl;
    const missingCerts = member.additionalCertificatesAddLater && (!member.certificatesUrls || member.certificatesUrls.length === 0);
    return missingPolice || missingGrama || missingBirth || missingCv || missingCerts;
  });
  const pendingDossierCount = dossierStaff.length;

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          member.phone.includes(searchTerm);
    const matchesFilter = activeFilter === 'All' || member.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from records?`)) {
      try {
        await deleteStaffMember(id);
        refresh();
        toast.success('Staff removed', `${name} was removed from the directory.`);
      } catch {
        toast.error('Delete failed', `Could not remove ${name}.`);
      }
    }
  };

  const getBadgeStyles = (category: string) => {
    switch (category) {
      case 'Driver': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Helper': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'Cleaner': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Office Staff': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Garage': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Staff Registry" 
        subtitle={`Human Resources • ${staff.length} Total Personnel`}
        actions={
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-11 pr-5 py-2.5 text-sm w-full sm:w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-gray-900 shadow-sm placeholder:text-gray-400"
              />
            </div>
            <PermissionGate permission="edit_staff">
              <Link 
                to="/staff/new" 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Member</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-[60vh]">
        {/* Primary Sub-navigation Tabs */}
        <div className="flex border-b border-gray-150 overflow-x-auto gap-6 scrollbar-none pb-px shrink-0 px-8 pt-6 bg-gray-50/20">
          <button
            onClick={() => setActiveTab('registry')}
            className={cn(
              "text-xs font-black uppercase tracking-widest pb-3 border-b-2 px-4 transition-all shrink-0",
              activeTab === 'registry'
                ? "text-indigo-600 border-indigo-600"
                : "text-gray-400 border-transparent hover:text-gray-600"
            )}
          >
            Staff Directory ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('dossier')}
            className={cn(
              "text-xs font-black uppercase tracking-widest pb-3 border-b-2 px-4 transition-all shrink-0 flex items-center gap-2",
              activeTab === 'dossier'
                ? "text-indigo-600 border-indigo-600"
                : "text-gray-400 border-transparent hover:text-gray-600"
            )}
          >
            <span>Dossier Ledger</span>
            {pendingDossierCount > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">
                {pendingDossierCount} PENDING
              </span>
            )}
          </button>
        </div>

        {activeTab === 'registry' ? (
          <>
            <div className="bg-gray-50 px-8 pt-4 pb-0 border-b border-gray-100 flex items-center gap-8 overflow-x-auto scrollbar-hide">
              {(['All', 'Driver', 'Helper', 'Cleaner', 'Office Staff', 'Garage'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "text-sm font-bold capitalize transition-all pb-4 border-b-2 whitespace-nowrap",
                    activeFilter === filter 
                      ? "text-gray-900 border-indigo-500" 
                      : "text-gray-400 hover:text-gray-600 border-transparent"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 font-bold">Name & Identifier</th>
                      <th className="px-8 py-5 font-bold">Role / Type</th>
                      <th className="px-8 py-5 font-bold">License / Credential</th>
                      <th className="px-8 py-5 font-bold">Status</th>
                      <th className="px-8 py-5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredStaff.map((member, i) => (
                      <motion.tr
                        key={member.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/staff/${member.id}`)}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100 shadow-sm">
                              {member.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{member.fullName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">IDX-{member.id?.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "px-2 py-1 text-[10px] uppercase font-black tracking-widest rounded border",
                            getBadgeStyles(member.category)
                          )}>
                            {member.category}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-mono text-gray-400 italic">
                            {member.category === 'Driver' ? (member.licenseNo || 'Not Verified') : 'Not Applicable'}
                          </p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              member.active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-gray-300"
                            )}></div>
                            <span className={cn(
                              "text-xs",
                              member.active ? "text-emerald-600" : "text-gray-400"
                            )}>
                              {member.active ? 'Ready' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                            <PermissionGate permission="edit_staff">
                              <Link to={`/staff/${member.id}/edit`} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button 
                                onClick={() => handleDelete(member.id!, member.fullName)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </PermissionGate>
                            <ChevronRight className="w-4 h-4 text-gray-300 ml-2" />
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {filteredStaff.length === 0 && (
                  <div className="py-24 text-center">
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No staff members found in this category.</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-8 space-y-8">
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest">Document Auditing Ledger</h4>
                <p className="text-[10px] font-bold text-indigo-500 uppercase mt-0.5">
                  Track and upload outstanding documentation for personnel allowed to onboard with grace periods.
                </p>
              </div>
              <div className="px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider text-center shrink-0">
                {pendingDossierCount} Personnel Audits Pending
              </div>
            </div>

            {dossierStaff.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">🎉 All staff members have complete dossiers!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {dossierStaff.map((member) => {
                  const items: { label: string; field: string; deadline?: string }[] = [];
                  if (member.policeReportAddLater && !member.policeReportUrl) {
                    items.push({ label: 'Police Report', field: 'policeReportUrl', deadline: member.policeReportDeadline });
                  }
                  if (member.gramaNiladariAddLater && !member.gramaNiladariUrl) {
                    items.push({ label: 'Grama Niladari Certificate', field: 'gramaNiladariUrl', deadline: member.gramaNiladariDeadline });
                  }
                  if (member.birthCertificateAddLater && !member.birthCertificateUrl) {
                    items.push({ label: 'Birth Certificate Copy', field: 'birthCertificateUrl', deadline: member.birthCertificateDeadline });
                  }
                  if (member.cvAddLater && !member.cvUrl) {
                    items.push({ label: 'Copy of CV', field: 'cvUrl', deadline: member.cvDeadline });
                  }
                  if (member.additionalCertificatesAddLater && (!member.certificatesUrls || member.certificatesUrls.length === 0)) {
                    items.push({ label: 'Additional Certificates', field: 'certificatesUrls', deadline: member.additionalCertificatesDeadline });
                  }

                  return (
                    <div key={member.id} className="p-6 bg-white border border-gray-150 rounded-[2rem] shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100 shadow-sm">
                            {member.fullName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-gray-900">{member.fullName}</h4>
                            <p className="text-[10px] text-gray-400 font-mono">IDX-{member.id?.slice(-6).toUpperCase()} • {member.category}</p>
                          </div>
                        </div>
                        <Link
                          to={`/staff/${member.id}`}
                          className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          View Profile
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {items.map((item) => {
                          const isOverdue = item.deadline ? new Date(item.deadline) < new Date() : false;
                          const deadlineDate = item.deadline ? new Date(item.deadline).toLocaleDateString() : 'No deadline';
                          return (
                            <div key={item.label} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col justify-between gap-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-wider">{item.label}</p>
                                  <p className={cn(
                                    "text-[9px] font-black uppercase tracking-widest mt-1",
                                    isOverdue ? "text-red-500 animate-pulse" : "text-amber-500"
                                  )}>
                                    {isOverdue ? '⚠️ Overdue' : '⏳ Grace Period'} • {deadlineDate}
                                  </p>
                                </div>
                              </div>

                              <FileUpload
                                path={`staff/docs`}
                                onUploadComplete={async (url) => {
                                  if (item.field === 'certificatesUrls') {
                                    await updateStaffMember(member.id!, {
                                      certificatesUrls: [url],
                                      additionalCertificatesAddLater: false
                                    });
                                  } else {
                                    await updateStaffMember(member.id!, {
                                      [item.field]: url,
                                      [item.field.replace('Url', 'AddLater')]: false
                                    });
                                  }
                                  refresh();
                                }}
                                showPreview={false}
                                label={`Click to Upload ${item.label}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffListPage;
