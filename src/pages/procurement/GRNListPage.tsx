import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Truck,
  ArrowRight,
  Filter,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getGRNs, GRN } from '../../services/grnService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const GRNListPage: React.FC = () => {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadGrns();
  }, []);

  const loadGrns = async () => {
    try {
      const data = await getGRNs();
      setGrns(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGrns = grns.filter(g => 
    g.grnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.purchaseOrderRef?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-10">
      <PageHeader 
        title="Goods Reception Registry" 
        subtitle="Verifying physical delivery against procurement intent and quality standards."
        actions={
          <button 
            onClick={() => navigate('/grn/new')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-2xl shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Registry Delivered Goods
          </button>
        }
      />

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by GRN#, Supplier, or PO Ref..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 pl-14 pr-6 py-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-400"
            />
         </div>
      </div>

      {/* GRN Table */}
      <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Registry Reference</th>
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Logistics Source</th>
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Acquisition Intel</th>
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Location & Voucher</th>
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filteredGrns.map((grn, i) => (
                     <motion.tr 
                        key={grn.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="group hover:bg-gray-50 transition-all cursor-pointer"
                        onClick={() => navigate(`/grn/${grn.id}`)}
                     >
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform shadow-sm">
                                 <Package className="w-6 h-6 text-emerald-600" />
                              </div>
                              <div>
                                 <p className="text-sm font-black text-gray-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{grn.grnNo}</p>
                                 <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{format(new Date(grn.date), 'MMM dd, yyyy')}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div>
                              <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{grn.supplierName}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">INV: {grn.supplierInvoiceNo || 'N/A'}</p>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div>
                              <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{grn.purchaseOrderRef || 'Direct Inbound'}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{grn.items.length} Units Logged</p>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div>
                              <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{grn.warehouseLocation || 'Main Yard'}</p>
                              {grn.voucherNo && <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">VOUCHER: {grn.voucherNo}</p>}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 group-hover:text-white group-hover:bg-emerald-600 transition-all shadow-sm">
                              <ArrowRight className="w-4 h-4" />
                           </button>
                        </td>
                     </motion.tr>
                  ))}
               </tbody>
            </table>

            {filteredGrns.length === 0 && (
               <div className="py-32 flex flex-col items-center justify-center space-y-4">
                  <Package className="w-16 h-16 text-gray-100" />
                  <div className="text-center">
                     <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">No Delivery Intel Registered</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Registry delivered goods to maintain inventory data integrity.</p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default GRNListPage;
