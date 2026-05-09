import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  LayoutDashboard,
  MoreVertical,
  User,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getDailyUpdates, DailyVehicleUpdate } from '../../services/dailyUpdateService';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const DailyVehicleUpdatePage: React.FC = () => {
  const [updates, setUpdates] = useState<DailyVehicleUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const navigate = useNavigate();

  useEffect(() => {
    loadUpdates();
  }, [selectedDate]);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      const data = await getDailyUpdates(selectedDate);
      setUpdates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Trip': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Breakdown': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'Yard Parking': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Under Repair': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-10 group/page pb-20">
      <PageHeader 
        title="Fleet Operations Control" 
        subtitle="Daily Status Synchronization & Deployment Matrix"
      />

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-2 flex items-center gap-2 shadow-sm">
               <Calendar className="w-4 h-4 text-gray-400 ml-2" />
               <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-gray-900 text-sm font-bold outline-none [color-scheme:light] pr-4 cursor-pointer"
               />
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
               {updates.length} Assets Logged Today
            </p>
         </div>

         <button 
          onClick={() => navigate('/daily-updates/new')}
          className="group/btn bg-indigo-600 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 shadow-lg shadow-indigo-100"
         >
          <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90" />
          Log Asset Status
         </button>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <AnimatePresence mode='popLayout'>
            {updates.map((update, i) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-gray-100 rounded-[2rem] p-6 space-y-6 hover:border-indigo-200 transition-all group relative overflow-hidden shadow-sm"
              >
                 <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                          <Truck className="w-6 h-6 text-indigo-600" />
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{update.vehicleNo}</h4>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{update.status}</p>
                       </div>
                    </div>
                    <span className={cn(
                       "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm",
                       getStatusColor(update.status)
                    )}>
                       {update.status}
                    </span>
                 </div>

                 <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-3 text-gray-400">
                       <User className="w-3.5 h-3.5" />
                       <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">{update.actualDriverName}</span>
                    </div>
                    {update.customerRoute && (
                       <div className="flex items-center gap-3 text-gray-400">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider truncate text-gray-600">{update.customerRoute}</span>
                       </div>
                    )}
                    <div className="flex gap-4 pt-2 border-t border-gray-50 mt-1">
                       {update.meterReading && (
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Meter</span>
                             <span className="text-[10px] font-black text-indigo-600 font-mono">{update.meterReading.toLocaleString()} KM</span>
                          </div>
                       )}
                       {update.fuelPumped && (
                          <div className="flex flex-col border-l border-gray-100 pl-4">
                             <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Fuel</span>
                             <span className="text-[10px] font-black text-emerald-600 font-mono">{update.fuelPumped.toLocaleString()} L</span>
                          </div>
                       )}
                    </div>
                 </div>

                 {update.breakdownReason && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-3">
                       <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                       <p className="text-[9px] font-bold text-rose-700 uppercase tracking-tight leading-relaxed">{update.breakdownReason}</p>
                    </div>
                 )}

                 <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-gray-400">
                    <div className="flex items-center gap-2">
                       <Clock className="w-3.5 h-3.5" />
                       <span className="text-[9px] font-black uppercase tracking-widest">Logged: {format(update.entryTime?.toDate ? update.entryTime.toDate() : new Date(), 'HH:mm')}</span>
                    </div>
                    <p className="text-[9px] font-bold">@ {update.enteredBy.split('@')[0]}</p>
                 </div>
              </motion.div>
            ))}
         </AnimatePresence>

         {updates.length === 0 && !loading && (
           <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-gray-100 rounded-[3rem]">
              <LayoutDashboard className="w-12 h-12 text-gray-200" />
              <div className="text-center">
                 <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">No Operations Data Recorded</p>
                 <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Status logs are required for all fleet assets daily.</p>
              </div>
           </div>
         )}
      </div>

      {loading && <LoadingSpinner />}
    </div>
  );
};

export default DailyVehicleUpdatePage;
