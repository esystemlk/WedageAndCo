import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Clock, 
  Navigation,
  FileText,
  ChevronRight,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getGatePasses, GatePass } from '../../services/gatePassService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const GatePassListPage: React.FC = () => {
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Open' | 'Returned' | 'Cancelled'>('All');
  const navigate = useNavigate();

  useEffect(() => {
    loadGatePasses();
  }, []);

  const loadGatePasses = async () => {
    try {
      const data = await getGatePasses();
      setGatePasses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPasses = gatePasses.filter(gp => {
    const matchesSearch = gp.gatePassNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         gp.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         gp.driverName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'All' || gp.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-10 group/page pb-20">
      <PageHeader 
        title="Security Book" 
        subtitle="Vehicle Gate Pass & Movement Control Ledger"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-indigo-600 w-4 h-4 transition-colors" />
            <input 
              type="text" 
              placeholder="Search Pass No, Vehicle, Driver..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-full pl-11 pr-5 py-3 text-xs w-72 focus:outline-none focus:border-indigo-500/30 focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400 shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-full">
            {['All', 'Open', 'Returned'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s as any)}
                className={cn(
                  "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                  filter === s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => navigate('/security/new')}
          className="group/btn bg-indigo-600 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20 flex items-center gap-3 active:scale-95"
        >
          <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90" />
          Issue Gate Pass
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 text-[10px] uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100">
              <tr>
                <th className="px-10 py-6 font-black">Pass Details</th>
                <th className="px-10 py-6 font-black">Vehicle & Driver</th>
                <th className="px-10 py-6 font-black">Timeline</th>
                <th className="px-10 py-6 font-black text-center">Status</th>
                <th className="px-10 py-6 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode='popLayout'>
                {filteredPasses.map((gp, i) => (
                   <motion.tr 
                    key={gp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group hover:bg-gray-50 transition-all cursor-pointer"
                    onClick={() => navigate(`/security/${gp.id}`)}
                  >
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-100 group-hover:scale-110 transition-transform shadow-sm">
                          {gp.gatePassNo}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">Ref: {gp.linkedLogSheetNo}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-widest">{gp.reason}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">{gp.vehicleNo}</p>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{gp.driverName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Out: {gp.timeOut}</span>
                        </div>
                        {gp.timeIn && (
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-3 h-3 text-rose-600" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In: {gp.timeIn}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex justify-center">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-sm",
                            gp.status === 'Open' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            gp.status === 'Returned' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                            "bg-rose-50 text-rose-600 border border-rose-100"
                          )}>
                            {gp.status}
                          </span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button 
                            className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/security/${gp.id}/edit`);
                            }}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredPasses.length === 0 && (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto border border-gray-100">
              <ShieldCheck className="w-8 h-8 text-gray-200" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Security Records Found</p>
              <p className="text-[10px] text-gray-400 font-medium italic">All vehicle movements are strictly monitored via gate passes.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GatePassListPage;
