import React, { useMemo, useState } from 'react';
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
  Area,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Truck, 
  Users, 
  Wrench,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLogs } from '../../hooks/useLogs';
import { useMaintenance } from '../../hooks/useMaintenance';
import { useInvoices } from '../../hooks/useInvoices';
import { useFleet } from '../../hooks/useFleet';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { cn } from '../../lib/utils';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

const ReportsPage: React.FC = () => {
  const { logs, loading: logsLoading } = useLogs();
  const { records: maintenance, loading: maintLoading } = useMaintenance();
  const { invoices, loading: invLoading } = useInvoices();
  const { vehicles } = useFleet();
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const loading = logsLoading || maintLoading || invLoading;

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalMaintenance = maintenance.reduce((sum, rec) => sum + rec.cost, 0);
    const totalTrips = logs.length;
    const completedTrips = logs.filter(l => l.status === 'completed').length;
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;

    return { totalRevenue, totalMaintenance, totalTrips, completedTrips, activeVehicles };
  }, [logs, maintenance, invoices, vehicles]);

  const revenueData = useMemo(() => {
    const months: Record<string, number> = {};
    invoices.forEach(inv => {
      const month = new Date(inv.date).toLocaleString('default', { month: 'short' });
      months[month] = (months[month] || 0) + inv.totalAmount;
    });
    return Object.entries(months).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const tripStatusData = useMemo(() => {
    const statuses = logs.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(statuses).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [logs]);

  const vehicleStatusData = useMemo(() => {
    const statuses = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(statuses).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [vehicles]);

  const monthlyTrendData = useMemo(() => {
    const data: Array<{ month: string; revenue: number; trips: number; maintenance: number }> = [];
    const monthMap = new Map<string, { revenue: number; trips: number; maintenance: number }>();

    invoices.forEach(inv => {
      const month = new Date(inv.date).toLocaleString('default', { month: 'short' });
      const entry = monthMap.get(month) || { revenue: 0, trips: 0, maintenance: 0 };
      entry.revenue += inv.totalAmount;
      monthMap.set(month, entry);
    });

    logs.forEach(log => {
      const month = new Date(log.date || log.createdAt || Date.now()).toLocaleString('default', { month: 'short' });
      const entry = monthMap.get(month) || { revenue: 0, trips: 0, maintenance: 0 };
      entry.trips += 1;
      monthMap.set(month, entry);
    });

    maintenance.forEach(rec => {
      const month = new Date(rec.date || rec.createdAt || Date.now()).toLocaleString('default', { month: 'short' });
      const entry = monthMap.get(month) || { revenue: 0, trips: 0, maintenance: 0 };
      entry.maintenance += rec.cost;
      monthMap.set(month, entry);
    });

    monthMap.forEach((values, month) => {
      data.push({ month, ...values });
    });

    return data;
  }, [invoices, logs, maintenance]);

  // Compute maintenance breakdown from real records by keyword in description
  const maintenanceData = useMemo(() => {
    const KEYWORDS: Record<string, string[]> = {
      Engine: ['engine', 'motor', 'cylinder', 'piston', 'timing', 'oil'],
      Tyres: ['tyre', 'tire', 'wheel', 'puncture', 'rim'],
      Service: ['service', 'filter', 'grease', 'lube', 'wash', 'inspection'],
      Brakes: ['brake', 'pad', 'disc', 'caliper'],
      Electrical: ['battery', 'alternator', 'fuse', 'wiring', 'electric', 'light', 'sensor'],
      Body: ['body', 'dent', 'paint', 'glass', 'door', 'mirror'],
    };
    const counts: Record<string, number> = {};
    maintenance.forEach(rec => {
      const desc = (rec.description || '').toLowerCase();
      let matched = false;
      for (const [cat, keywords] of Object.entries(KEYWORDS)) {
        if (keywords.some(k => desc.includes(k))) {
          counts[cat] = (counts[cat] || 0) + 1;
          matched = true;
          break;
        }
      }
      if (!matched) counts['Other'] = (counts['Other'] || 0) + 1;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    if (total === 0) return [];
    return Object.entries(counts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
    }));
  }, [maintenance]);

  const handleExport = () => {
    const csvContent = [
      ['Metric', 'Value', 'Unit'].join(','),
      ['Total Revenue', stats.totalRevenue.toLocaleString(), 'LKR'].join(','),
      ['Maintenance Cost', stats.totalMaintenance.toLocaleString(), 'LKR'].join(','),
      ['Total Trips', stats.totalTrips, ''].join(','),
      ['Completed Trips', stats.completedTrips, ''].join(','),
      ['Active Vehicles', stats.activeVehicles, ''].join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'wedage-report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="Advanced Analytics" 
        subtitle="Operational Intelligence & Fiscal Oversight"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
              {(['7d', '30d', '90d', '1y'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
                    dateRange === range
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
            >
               <Download className="w-4 h-4" />
               <span>Export</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Revenue', value: stats.totalRevenue, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', suffix: 'LKR', trend: `${invoices.length} invoices` },
          { label: 'Maintenance Cost', value: stats.totalMaintenance, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', suffix: 'LKR', trend: `${maintenance.length} records`, negative: true },
          { label: 'Total Trips', value: stats.totalTrips, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', suffix: 'Trips', trend: `${logs.length} log sheets` },
          { label: 'Completed', value: stats.completedTrips, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', suffix: 'Trips', trend: stats.totalTrips > 0 ? `${Math.round((stats.completedTrips / stats.totalTrips) * 100)}% rate` : '0% rate' },
          { label: 'Active Fleet', value: stats.activeVehicles, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', suffix: 'Vehicles', trend: `of ${vehicles.length} total` },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-100 p-6 rounded-3xl relative overflow-hidden group shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex justify-between items-start relative z-10">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h4 className="text-2xl font-black text-gray-900">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</h4>
                  <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">{stat.suffix}</p>
               </div>
               <div className={cn("p-3 rounded-2xl border shadow-sm", stat.bg, stat.border, stat.color)}>
                  <stat.icon className="w-5 h-5" />
               </div>
            </div>
            <div className={cn("mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest relative z-10", stat.negative ? 'text-rose-600' : 'text-emerald-600')}>
               {stat.negative ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
               <span>{stat.trend} VS PREV</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <motion.div 
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm lg:col-span-2"
         >
            <div className="flex items-center justify-between">
               <div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Monthly Performance</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Revenue vs Trips vs Maintenance</p>
               </div>
            </div>
            
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData.length ? monthlyTrendData : [{ month: 'N/A', revenue: 0, trips: 0, maintenance: 0 }]}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      fontWeight="bold"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      fontWeight="bold"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} name="Revenue" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="trips" stroke="#10b981" strokeWidth={3} name="Trips" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="maintenance" stroke="#f59e0b" strokeWidth={3} name="Maintenance" dot={{ r: 4 }} />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </motion.div>

         <motion.div 
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
           className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm"
         >
            <div>
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Trip Status</h3>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Current Distribution</p>
            </div>

            <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tripStatusData.length ? tripStatusData : [{ name: 'No Data', value: 100 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {tripStatusData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {tripStatusData.slice(0, 4).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{item.name}</span>
                   </div>
                   <span className="text-xs font-black text-gray-900 font-mono">{item.value}</span>
                </div>
              ))}
            </div>
         </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm"
         >
            <div>
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Revenue Pipeline</h3>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Monthly Revenue</p>
            </div>

            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData.length ? revenueData : [{ name: 'N/A', value: 0 }]}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </motion.div>

         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm"
         >
            <div>
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Maintenance Cost</h3>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Cost by Category</p>
            </div>

            <div className="h-[300px] w-full">
               {maintenanceData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold uppercase tracking-widest">
                    No maintenance records yet
                  </div>
               ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={maintenanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: number) => [`${v}%`, 'Share']}
                      />
                      <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
               )}
            </div>
         </motion.div>
      </div>
    </div>
  );
};

export default ReportsPage;
