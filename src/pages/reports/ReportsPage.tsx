import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Truck, 
  Users, 
  Wrench,
  Download,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLogs } from '../../hooks/useLogs';
import { useMaintenance } from '../../hooks/useMaintenance';
import { useInvoices } from '../../hooks/useInvoices';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const ReportsPage: React.FC = () => {
  const { logs, loading: logsLoading } = useLogs();
  const { records: maintenance, loading: maintLoading } = useMaintenance();
  const { invoices, loading: invLoading } = useInvoices();

  const loading = logsLoading || maintLoading || invLoading;

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalMaintenance = maintenance.reduce((sum, rec) => sum + rec.cost, 0);
    const totalTrips = logs.length;
    const completedTrips = logs.filter(l => l.status === 'completed').length;

    return { totalRevenue, totalMaintenance, totalTrips, completedTrips };
  }, [logs, maintenance, invoices]);

  // Aggregate revenue by month
  const revenueData = useMemo(() => {
    const months: Record<string, number> = {};
    invoices.forEach(inv => {
      const month = new Date(inv.date).toLocaleString('default', { month: 'short' });
      months[month] = (months[month] || 0) + inv.totalAmount;
    });
    return Object.entries(months).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  // Aggregate maintenance by category (mock/derived from description for demo)
  const maintenanceData = [
    { name: 'Engine', value: 45 },
    { name: 'Tyres', value: 25 },
    { name: 'Service', value: 20 },
    { name: 'Other', value: 10 },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-10 pb-20">
      <PageHeader 
        title="Command Analytics" 
        subtitle="Operational Intelligence & Fiscal Oversight"
        actions={
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/20 transition-all">
             <Download className="w-4 h-4" />
             <span>Export Intelligence</span>
          </button>
        }
      />

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Projected Revenue', value: stats.totalRevenue, icon: DollarSign, color: 'text-emerald-400', suffix: 'LKR' },
          { label: 'Maintenance Cost', value: stats.totalMaintenance, icon: Wrench, color: 'text-amber-400', suffix: 'LKR' },
          { label: 'Trip Velocity', value: stats.totalTrips, icon: Truck, color: 'text-indigo-400', suffix: 'Log Entries' },
          { label: 'Staff Efficiency', value: stats.completedTrips, icon: Users, color: 'text-rose-400', suffix: 'Completed' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-white/10 p-6 rounded-3xl relative overflow-hidden group"
          >
            <div className="flex justify-between items-start relative z-10">
               <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h4 className="text-2xl font-black text-white">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</h4>
                  <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase tracking-tighter">{stat.suffix}</p>
               </div>
               <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/5", stat.color)}>
                  <stat.icon className="w-5 h-5" />
               </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest relative z-10">
               <TrendingUp className="w-3 h-3" />
               <span>+12.5% VS PREV CYCLE</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Financial Trajectory */}
         <motion.div 
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 space-y-8"
         >
            <div className="flex items-center justify-between">
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">Fiscal Trajectory</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Revenue Pipeline (Monthly)</p>
               </div>
               <Calendar className="w-5 h-5 text-gray-700" />
            </div>
            
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData.length ? revenueData : [{ name: 'N/A', value: 0 }]}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#4b5563" 
                      fontSize={11} 
                      fontWeight="bold"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      fontSize={11} 
                      fontWeight="bold"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </motion.div>

         {/* Maintenance Breakdown */}
         <motion.div 
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
           className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 space-y-8"
         >
            <div className="flex items-center justify-between">
               <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">Cost Allocation</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Maintenance Distribution</p>
               </div>
               <Wrench className="w-5 h-5 text-gray-700" />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
               <div className="h-[250px] w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={maintenanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={10}
                        dataKey="value"
                      >
                        {maintenanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex-1 space-y-4">
                  {maintenanceData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.name}</span>
                       </div>
                       <span className="text-xs font-black text-white font-mono">{item.value}%</span>
                    </div>
                  ))}
               </div>
            </div>
         </motion.div>
      </div>

      {/* Operational Efficiency (Bar Chart) */}
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 space-y-8"
      >
         <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Logistics Throughput</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Trip Intensity by Cycle</p>
         </div>

         <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </motion.div>
    </div>
  );
};

export default ReportsPage;
