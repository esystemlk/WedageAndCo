import React, { useEffect } from 'react';
import { LayoutDashboard, Users, Users2, Package, Truck, UserSquare2, ShieldCheck, Wrench, ClipboardList, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLogs } from '../hooks/useLogs';
import { useFleet } from '../hooks/useFleet';
import { useStaff } from '../hooks/useStaff';
import { useCustomers } from '../hooks/useCustomers';
import { useNotifications } from '../contexts/NotificationContext';
import PageHeader from '../components/shared/PageHeader';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const DashboardPage: React.FC = () => {
  const { user, role, can } = useAuth();
  const { logs } = useLogs();
  const { vehicles } = useFleet();
  const { staff } = useStaff();
  const { customers } = useCustomers();
  const { addNotification } = useNotifications();

  const activeTrips = logs.filter(l => l.status === 'on-trip').length;
  const operationalVehicles = vehicles.filter(v => v.status === 'active').length;
  const driversCount = staff.filter(s => s.type === 'driver').length;
  const customersCount = customers.length;

  const stats = [
    { label: 'Active Drivers', value: driversCount.toString(), icon: UserSquare2, color: 'text-indigo-600', progress: 100, progressColor: 'bg-indigo-600', trackColor: 'bg-indigo-50' },
    { label: 'Fleet Assets', value: operationalVehicles.toString(), icon: Truck, color: 'text-emerald-600', progress: (operationalVehicles / (vehicles.length || 1) * 100), progressColor: 'bg-emerald-600', trackColor: 'bg-emerald-50' },
    { label: 'Live Engagement', value: activeTrips.toString(), icon: ClipboardList, color: 'text-amber-600', progress: activeTrips > 0 ? 100 : 0, progressColor: 'bg-amber-600', trackColor: 'bg-amber-50' },
    { label: 'Client Base', value: customersCount.toString(), icon: Users, color: 'text-purple-600', progress: 100, progressColor: 'bg-purple-600', trackColor: 'bg-purple-50' },
  ];

  const modules = [
    { name: 'Customers', icon: Users, path: '/customers', permission: 'view_customers', desc: 'Client profiles and delivery agreements' },
    { name: 'Suppliers', icon: Package, path: '/suppliers', permission: 'view_suppliers', desc: 'External vendors and logistics data' },
    { name: 'Staff HR', icon: UserSquare2, path: '/staff', permission: 'view_staff', desc: 'Driver records and personnel management' },
    { name: 'Fleet Manager', icon: Truck, path: '/fleet', permission: 'view_fleet', desc: 'Vehicle specs and fuel tracking' },
    { name: 'Operation Logs', icon: ClipboardList, path: '/logs', permission: 'view_logs', desc: 'Daily trip monitoring and mileage' },
    { name: 'User Management', icon: ShieldCheck, path: '/users', permission: 'manage_users', desc: 'Permissions and system access' },
  ];

  return (
    <div>
      <PageHeader 
        title={`Welcome, ${user?.email?.split('@')[0]}`} 
        subtitle="Operational Intelligence & Fleet Overview"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[var(--bg-surface)] border border-[var(--border-main)] p-6 rounded-2xl relative overflow-hidden group shadow-sm hover:shadow-xl hover:border-indigo-500/20 transition-all duration-500"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-black mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-[var(--text-main)] italic">{stat.value}</h3>
              </div>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            
            <div className="mt-4 flex items-center gap-3">
              <div className={cn("h-1 flex-1 rounded-full overflow-hidden", stat.trackColor)}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.progress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={cn("h-full", stat.progressColor)} 
                />
              </div>
              <span className="text-[10px] font-black text-[var(--text-muted)]">{stat.progress}%</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-8 px-1">
        <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Quick Actions</h2>
        <div className="h-[1px] bg-[var(--border-main)] flex-1 mx-6"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod, i) => {
          if (mod.permission && !can(mod.permission as any)) return null;
          return (
            <motion.div
              key={mod.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link 
                to={mod.path}
                className="block p-8 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-3xl hover:border-indigo-500/30 hover:bg-gray-50 transition-all group shadow-sm"
              >
                <div className="flex items-center space-x-5 mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all border border-gray-100">
                    <mod.icon className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-widest group-hover:text-indigo-600 transition-colors">{mod.name}</h3>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed italic">
                  {mod.desc}
                </p>
                <div className="mt-6 flex items-center text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                  <span>Enter Module</span>
                  <LayoutDashboard className="w-3 h-3 ml-2" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPage;
