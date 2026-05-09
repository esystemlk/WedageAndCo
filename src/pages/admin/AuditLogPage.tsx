import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Clock, 
  User as UserIcon, 
  Database, 
  AlertCircle,
  ChevronDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { getAuditLogs, AuditLog } from '../../services/auditService';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const AuditLogPage: React.FC = () => {
  const { can } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    const data = await getAuditLogs(200);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    if (can('view_audit_logs')) {
      fetchLogs();
    }
  }, []);

  if (!can('view_audit_logs')) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredLogs = logs.filter(log => {
    const searchMatch = 
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.collection.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const typeMatch = filterType === 'all' || log.action === filterType;
    
    return searchMatch && typeMatch;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'update': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'delete': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="System Audit Ledger" 
        subtitle="Critical Infrastructure Monitoring • Immutable Change Records"
        actions={
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Query actor or entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              />
            </div>
            <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200">
               {['all', 'create', 'update', 'delete'].map(type => (
                 <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                    filterType === type ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                 >
                   {type}
                 </button>
               ))}
            </div>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-32 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-6">Identity / Actor</th>
                  <th className="px-8 py-6">Operation</th>
                  <th className="px-8 py-6">Resource Target</th>
                  <th className="px-8 py-6">Mutation Details</th>
                  <th className="px-8 py-6 text-right">Synchronization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {filteredLogs.map((log, i) => (
                  <motion.tr 
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.01 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{log.userEmail}</p>
                          <p className="text-[10px] text-gray-400 font-mono italic">UID: {log.userId.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        getActionColor(log.action)
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-indigo-400" />
                        <div>
                          <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{log.collection}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {log.entityId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs text-gray-600 font-bold max-w-md">
                       <div className="flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                          <span>{log.details || 'No additional metadata captured.'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                             <Clock className="w-3 h-3 text-gray-400" />
                             {new Date(log.timestamp.toDate()).toLocaleTimeString()}
                          </div>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                             {new Date(log.timestamp.toDate()).toLocaleDateString()}
                          </p>
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="py-24 text-center">
                 <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-4" />
                 <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">No audit signatures found reflecting this query.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
