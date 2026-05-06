import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  ChevronRight, 
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Building2,
  DollarSign
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const InvoiceListPage: React.FC = () => {
  const { invoices, loading } = useInvoices();
  const { customers } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Entity';

  const filteredInvoices = invoices.filter(inv => {
    const custName = getCustomerName(inv.customerId).toLowerCase();
    const invNo = inv.invoiceNo.toLowerCase();
    return custName.includes(searchTerm.toLowerCase()) || invNo.includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'sent': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'overdue': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-3 h-3" />;
      case 'overdue': return <AlertCircle className="w-3 h-3" />;
      case 'sent': return <Clock className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Financial Ledger" 
        subtitle={`Billing & Revenue • ${invoices.length} Total Records`}
        actions={
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search invoice no or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-white"
              />
            </div>
            <PermissionGate permission="edit_accounts">
              <Link 
                to="/invoices/new" 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Invoice</span>
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
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                <tr>
                  <th className="px-8 py-5 font-bold">Document Identity</th>
                  <th className="px-8 py-5 font-bold">Contractor</th>
                  <th className="px-8 py-5 font-bold">Timeline</th>
                  <th className="px-8 py-5 font-bold text-right">Financial Impact</th>
                  <th className="px-8 py-5 font-bold">Status</th>
                  <th className="px-8 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {filteredInvoices.map((inv, i) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                            {inv.invoiceNo}
                          </p>
                          <p className="text-[10px] text-gray-600 font-mono italic">Ref: {inv.id?.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-white font-bold uppercase tracking-widest">{getCustomerName(inv.customerId)}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Plus className="w-2 h-2" /> Generated: {new Date(inv.date).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-2 h-2" /> Due: {new Date(inv.dueDate).toLocaleDateString()}
                          </p>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-black text-gray-600 uppercase">LKR</span>
                          <span className="text-sm font-black text-white font-mono">
                            {inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit",
                         getStatusColor(inv.status)
                       )}>
                         {getStatusIcon(inv.status)}
                         {inv.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                         <button className="p-2 text-gray-500 hover:text-white transition-colors">
                            <Download className="w-4 h-4" />
                         </button>
                         <ChevronRight className="w-4 h-4 text-gray-700" />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredInvoices.length === 0 && (
              <div className="py-24 text-center">
                 <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No financial documents archived in current cycle.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceListPage;
