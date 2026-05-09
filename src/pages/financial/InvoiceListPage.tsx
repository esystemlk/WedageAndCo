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
  DollarSign,
  Printer,
  XCircle,
  Edit2,
  History,
  Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { PermissionGate } from '../../components/auth/RouteGuards';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { generateInvoicePDF } from '../../lib/pdfUtils';
import { Invoice } from '../../services/invoiceService';

const SEARCH_HISTORY_KEY = 'invoice_search_history';

const InvoiceListPage: React.FC = () => {
  const { invoices, loading } = useInvoices();
  const { customers } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const navigate = useNavigate();

  const saveSearch = (term: string) => {
    if (!term || term.length < 2) return;
    const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  };

  const removeSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(t => t !== term);
    setRecentSearches(updated);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSearch(searchTerm);
    setShowHistory(false);
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Entity';
  const getCustomer = (id: string) => customers.find(c => c.id === id) || null;

  const filteredInvoices = invoices.filter(inv => {
    const custName = getCustomerName(inv.customerId).toLowerCase();
    const invNo = inv.invoiceNo.toLowerCase();
    return custName.includes(searchTerm.toLowerCase()) || invNo.includes(searchTerm.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'sent': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'overdue': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'draft': return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-3 h-3" />;
      case 'overdue': return <AlertCircle className="w-3 h-3" />;
      case 'sent': return <Clock className="w-3 h-3" />;
      case 'draft': return <FileText className="w-3 h-3" />;
      default: return null;
    }
  };

  const { updateStatus } = useInvoices();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const handleUpdateStatus = async (id: string, newStatus: Invoice['status']) => {
    try {
      setUpdatingId(id);
      await updateStatus(id, newStatus);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = {
    total: filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    paid: filteredInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0),
    pending: filteredInvoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((sum, inv) => sum + inv.totalAmount, 0),
    overdue: filteredInvoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.totalAmount, 0),
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(inv => inv.id as string));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExportOne = (inv: Invoice) => {
    const customer = getCustomer(inv.customerId);
    generateInvoicePDF(inv, customer);
  };

  const handleBulkExport = () => {
    selectedIds.forEach(id => {
      const inv = invoices.find(i => i.id === id);
      if (inv) {
        handleExportOne(inv);
      }
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Financial Ledger" 
        subtitle={`Billing & Revenue • ${invoices.length} Total Records`}
        actions={
          <div className="flex gap-4">
            <form onSubmit={handleSearchSubmit} className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search invoice no or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowHistory(true)}
                className="bg-white/50 border border-gray-200 rounded-full pl-11 pr-5 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-500/50 transition-all font-medium text-gray-900"
              />
              
              <AnimatePresence>
                {showHistory && recentSearches.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowHistory(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-20"
                    >
                      <div className="p-3 border-b border-gray-50 flex items-center justify-between">
                         <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Recent Searches</span>
                         <History className="w-3 h-3 text-gray-300" />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {recentSearches.map((term, i) => (
                          <button
                            key={term}
                            onClick={() => {
                              setSearchTerm(term);
                              setShowHistory(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between group/item transition-colors"
                          >
                            <span className="text-xs font-bold text-gray-700">{term}</span>
                            <button
                              onClick={(e) => removeSearch(e, term)}
                              className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-rose-500 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </form>
            <PermissionGate permission="edit_accounts">
              <Link 
                to="/invoices/new" 
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/10 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Invoice</span>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Volume', value: stats.total, color: 'text-gray-900', icon: DollarSign, bg: 'bg-white' },
          { label: 'Collected', value: stats.paid, color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' },
          { label: 'Pending Coverage', value: stats.pending, color: 'text-indigo-600', icon: Clock, bg: 'bg-indigo-50' },
          { label: 'Overdue Liability', value: stats.overdue, color: 'text-rose-600', icon: AlertCircle, bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn("p-6 rounded-[2rem] border border-gray-100 shadow-sm", stat.bg)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl border border-white bg-white/50 shadow-sm", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase">LKR</span>
              <h3 className={cn("text-2xl font-black font-mono", stat.color)}>
                {stat.value.toLocaleString()}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-500/20"
          >
            <div className="flex items-center gap-4 px-2">
              <span className="text-sm font-black text-white uppercase tracking-widest">{selectedIds.length} Records Selected</span>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-white/60 hover:text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleBulkExport}
                className="bg-white text-indigo-600 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-lg overflow-hidden relative group"
              >
                <Printer className="w-4 h-4" />
                <span>Export to PDF bundle</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-[60vh]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-widest text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-8 py-5">
                    <button 
                      onClick={toggleSelectAll}
                      className={cn(
                        "w-5 h-5 rounded border transition-all flex items-center justify-center",
                        selectedIds.length === filteredInvoices.length ? "bg-indigo-500 border-indigo-500" : "bg-gray-100 border-gray-200"
                      )}
                    >
                      {selectedIds.length === filteredInvoices.length && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </button>
                  </th>
                  <th className="px-8 py-5 font-bold">Document Identity</th>
                  <th className="px-8 py-5 font-bold">Contractor</th>
                  <th className="px-8 py-5 font-bold">Timeline</th>
                  <th className="px-8 py-5 font-bold text-right">Financial Impact</th>
                  <th className="px-8 py-5 font-bold">Status</th>
                  <th className="px-8 py-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredInvoices.map((inv, i) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      "hover:bg-gray-50 transition-colors group cursor-pointer",
                      selectedIds.includes(inv.id!) && "bg-indigo-50/50 hover:bg-indigo-50"
                    )}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="px-8 py-5" onClick={e => e.stopPropagation()}>
                       <button 
                        onClick={() => toggleSelectOne(inv.id!)}
                        className={cn(
                          "w-5 h-5 rounded border transition-all flex items-center justify-center",
                          selectedIds.includes(inv.id!) ? "bg-indigo-500 border-indigo-500" : "bg-gray-100 border-gray-200"
                        )}
                      >
                        {selectedIds.includes(inv.id!) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                            {inv.invoiceNo}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono italic">Ref: {inv.id?.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-700 font-bold uppercase tracking-widest">{getCustomerName(inv.customerId)}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Plus className="w-2 h-2" /> Generated: {new Date(inv.date).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-2 h-2" /> Due: {new Date(inv.dueDate).toLocaleDateString()}
                          </p>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase">LKR</span>
                          <span className="text-sm font-black text-gray-900 font-mono">
                            {inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-5" onClick={e => e.stopPropagation()}>
                       <div className="relative">
                          <button 
                            onClick={() => setOpenDropdownId(openDropdownId === inv.id ? null : inv.id!)}
                            disabled={updatingId === inv.id}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
                              getStatusColor(inv.status)
                            )}
                          >
                            {updatingId === inv.id ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : getStatusIcon(inv.status)}
                            {inv.status}
                          </button>
                          
                          <AnimatePresence>
                            {openDropdownId === inv.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)} />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 z-20 w-32"
                                >
                                  {(['draft', 'sent', 'paid', 'overdue'] as const).map(s => (
                                    <button
                                      key={s}
                                      onClick={() => {
                                        handleUpdateStatus(inv.id!, s);
                                        setOpenDropdownId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 transition-colors",
                                        inv.status === s ? "text-indigo-600 bg-indigo-50/50" : "text-gray-400"
                                      )}
                                    >
                                      <span className={cn("w-1.5 h-1.5 rounded-full", 
                                        s === 'paid' ? "bg-emerald-500" :
                                        s === 'overdue' ? "bg-rose-500" :
                                        s === 'sent' ? "bg-indigo-500" : "bg-gray-400"
                                      )}></span>
                                      {s}
                                    </button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                         <button 
                          onClick={() => handleExportOne(inv)}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Export PDF"
                         >
                            <Download className="w-4 h-4" />
                         </button>
                         <button 
                          onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                          className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                          title="Edit Document"
                         >
                            <Edit2 className="w-4 h-4" />
                         </button>
                         <ChevronRight className="w-4 h-4 text-gray-300" />
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

