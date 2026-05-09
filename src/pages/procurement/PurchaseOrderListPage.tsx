import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Truck,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getPurchaseOrders, PurchaseOrder } from '../../services/poService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const PurchaseOrderListPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getPurchaseOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-50 text-gray-400 border-gray-100';
      case 'Sent': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Partially Received': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Fully Received': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Cancelled': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-10">
      <PageHeader 
        title="Procurement & Acquisitions" 
        subtitle="Managing supply chain intent and purchase order tracking."
        actions={
          <button 
            onClick={() => navigate('/purchase-orders/new')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-2xl shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Issue Purchase Order
          </button>
        }
      />

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by PO# or Supplier..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 pl-14 pr-6 py-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-400"
            />
         </div>
         <div className="flex items-center gap-4 px-4 overflow-x-auto scrollbar-hide">
            {['All', 'Draft', 'Sent', 'Received'].map(f => (
               <button key={f} className="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 px-4 py-2 transition-colors">
                  {f}
               </button>
            ))}
         </div>
      </div>

      {/* PO Table */}
      <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Order Reference</th>
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Acquisition Target</th>
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Financial Value</th>
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Deployment Status</th>
                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map((po, i) => (
                     <motion.tr 
                        key={po.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group hover:bg-gray-50 transition-all cursor-pointer"
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                     >
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform shadow-sm">
                                 <FileText className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{po.poNumber}</p>
                                 <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{format(new Date(po.date), 'MMM dd, yyyy')}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div>
                              <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{po.supplierName}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{po.paymentTerms}</p>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <p className="text-sm font-black text-gray-900 font-mono uppercase tracking-tight">LKR {po.grandTotal.toLocaleString()}</p>
                           <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{po.items.length} Line Items</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <span className={cn(
                              "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm",
                              getStatusStyles(po.status)
                           )}>
                              {po.status}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 group-hover:text-white group-hover:bg-indigo-600 transition-all shadow-sm">
                              <ArrowRight className="w-4 h-4" />
                           </button>
                        </td>
                     </motion.tr>
                  ))}
               </tbody>
            </table>

            {filteredOrders.length === 0 && (
               <div className="py-32 flex flex-col items-center justify-center space-y-4">
                  <ShoppingCart className="w-16 h-16 text-gray-100" />
                  <div className="text-center">
                     <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">No Active Procurement Records</p>
                     <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Issue a new Purchase Order to begin supply chain tracking.</p>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default PurchaseOrderListPage;
