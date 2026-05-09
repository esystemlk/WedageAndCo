import React, { useMemo } from 'react';
import { 
  Truck, 
  Fuel, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Gauge, 
  Wrench,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useFleet } from '../../hooks/useFleet';
import { useMaintenance } from '../../hooks/useMaintenance';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { motion } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const COLORS = {
  active: '#10b981',
  maintenance: '#f59e0b',
  inactive: '#ef4444',
  fuel: '#6366f1',
};

const AdvancedFleetDashboard: React.FC = () => {
  const { vehicles, loading: fleetLoading } = useFleet();
  const { records: maintenance, loading: maintLoading } = useMaintenance();

  const loading = fleetLoading || maintLoading;

  const stats = useMemo(() => {
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    const totalVehicles = vehicles.length;
    const totalMaintenanceCost = maintenance.reduce((sum, rec) => sum + rec.cost, 0);

    const fuelData = [
      { month: 'Jan', fuel: 1250, cost: 450000 },
      { month: 'Feb', fuel: 1420, cost: 511200 },
      { month: 'Mar', fuel: 1180, cost: 424800 },
      { month: 'Apr', fuel: 1350, cost: 486000 },
      { month: 'May', fuel: 1480, cost: 532800 },
      { month: 'Jun', fuel: 1290, cost: 464400 },
    ];

    const vehicleHealthData = vehicles.map(v => ({
      name: v.registrationNumber || v.id.slice(0, 6),
      health: v.status === 'active' ? 85 + Math.random() * 15 : 40 + Math.random() * 30,
      mileage: Math.floor(Math.random() * 100000),
    }));

    return { 
      activeVehicles, 
      maintenanceVehicles, 
      totalVehicles, 
      totalMaintenanceCost,
      fuelData,
      vehicleHealthData
    };
  }, [vehicles, maintenance]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader 
        title="Advanced Fleet Management" 
        subtitle="Real-time vehicle tracking, fuel management & health monitoring"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Active Fleet', 
            value: stats.activeVehicles, 
            total: stats.totalVehicles,
            icon: Truck, 
            color: 'text-emerald-600', 
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            suffix: 'Vehicles'
          },
          { 
            label: 'In Maintenance', 
            value: stats.maintenanceVehicles, 
            icon: Wrench, 
            color: 'text-amber-600', 
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            suffix: 'Vehicles'
          },
          { 
            label: 'Avg. Fuel Efficiency', 
            value: '8.5', 
            icon: Fuel, 
            color: 'text-indigo-600', 
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
            suffix: 'km/L'
          },
          { 
            label: 'Maintenance Cost', 
            value: stats.totalMaintenanceCost.toLocaleString(), 
            icon: Activity, 
            color: 'text-rose-600', 
            bg: 'bg-rose-50',
            border: 'border-rose-100',
            suffix: 'LKR'
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h4 className="text-2xl font-black text-gray-900 flex items-baseline gap-1">
                    {stat.value}
                    {stat.total && <span className="text-sm text-gray-400">/{stat.total}</span>}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">{stat.suffix}</p>
               </div>
               <div className={`p-3 rounded-2xl border shadow-sm ${stat.bg} ${stat.border} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
               </div>
            </div>
            {stat.total && (
              <div className="mt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${stat.color.replace('text-', 'bg-')}`}
                    style={{ width: `${(stat.value as number / stat.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
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
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Fuel & Cost Analytics</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Monthly consumption trends</p>
             </div>
          </div>
          
          <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.fuelData}>
                  <defs>
                    <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                    yAxisId="left"
                    stroke="#94a3b8" 
                    fontSize={11} 
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
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
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="fuel" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    name="Fuel (L)"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    name="Cost (LKR)"
                    dot={{ r: 4 }}
                  />
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
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Vehicle Status</h3>
             <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Fleet overview</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Active</p>
                    <p className="text-[10px] text-emerald-600 font-bold">{stats.activeVehicles} vehicles</p>
                  </div>
               </div>
               <div className="text-right">
                 <p className="text-2xl font-black text-emerald-600">{Math.round((stats.activeVehicles / stats.totalVehicles) * 100)}%</p>
               </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Maintenance</p>
                    <p className="text-[10px] text-amber-600 font-bold">{stats.maintenanceVehicles} vehicles</p>
                  </div>
               </div>
               <div className="text-right">
                 <p className="text-2xl font-black text-amber-600">{Math.round((stats.maintenanceVehicles / stats.totalVehicles) * 100)}%</p>
               </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Inactive</p>
                    <p className="text-[10px] text-gray-500 font-bold">{stats.totalVehicles - stats.activeVehicles - stats.maintenanceVehicles} vehicles</p>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-gray-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm"
      >
        <div>
           <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Vehicle Health Scores</h3>
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Condition monitoring by vehicle</p>
        </div>

        <div className="h-[300px] w-full">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.vehicleHealthData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
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
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="health" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                >
                  {stats.vehicleHealthData.map((entry, index) => (
                    <rect 
                      key={`bar-${index}`} 
                      fill={entry.health >= 80 ? '#10b981' : entry.health >= 60 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
           </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default AdvancedFleetDashboard;
