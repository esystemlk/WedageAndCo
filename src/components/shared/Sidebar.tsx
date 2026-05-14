import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Users, 
  LayoutDashboard, 
  Truck, 
  UserSquare2, 
  ClipboardList, 
  Wrench, 
  FileBarChart, 
  LogOut,
  ChevronRight,
  Package,
  ShieldCheck,
  DollarSign,
  Settings,
  Wallet,
  Activity,
  Menu,
  X,
  Calendar as CalendarIcon,
  Folder,
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { auth } from '../../firebase/config';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../../config/roles';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const { user, role, can } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
    onClose?.();
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: null },
    { type: 'header', name: 'CRM & Workforce' },
    { name: 'Customers', path: '/customers', icon: Users, permission: 'view_customers' },
    { name: 'Staff / HR', path: '/staff', icon: UserSquare2, permission: 'view_staff' },
    
    { type: 'header', name: 'Procurement' },
    { name: 'Inventory', path: '/inventory', icon: ShoppingCart, permission: 'view_suppliers' },
    { name: 'Suppliers', path: '/suppliers', icon: Package, permission: 'view_suppliers' },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList, permission: 'view_logs' },
    { name: 'GRN Registry', path: '/grn', icon: Package, permission: 'view_logs' },

    { type: 'header', name: 'Operations' },
    { name: 'Calendar', path: '/calendar', icon: CalendarIcon, permission: 'view_logs' },
    { name: 'Documents', path: '/documents', icon: Folder, permission: 'view_logs' },
    { name: 'Daily Updates', path: '/daily-updates', icon: LayoutDashboard, permission: 'view_logs' },
    { name: 'Fleet', path: '/fleet', icon: Truck, permission: 'view_fleet' },
    { name: 'Log Sheets', path: '/logs', icon: ClipboardList, permission: 'view_logs' },
    { name: 'Security Book', path: '/security', icon: ShieldCheck, permission: 'view_logs' },
    { name: 'Garage', path: '/garage', icon: Wrench, permission: 'view_garage' },
    
    { type: 'header', name: 'Analytics' },
    { name: 'Invoices', path: '/invoices', icon: DollarSign, permission: 'view_reports' },
    { name: 'Financial Dashboard', path: '/financial-dashboard', icon: Wallet, permission: 'view_reports' },
    { name: 'Fleet Analytics', path: '/fleet/analytics', icon: Activity, permission: 'view_fleet' },
    { name: 'Reports', path: '/reports', icon: FileBarChart, permission: 'view_reports' },
    { name: 'User Management', path: '/users', icon: ShieldCheck, permission: 'manage_users' },
    { name: 'System Logs', path: '/audit', icon: ClipboardList, permission: 'view_audit_logs' },
  ];

  const sidebarContent = (
    <div className="flex flex-col w-64 bg-[var(--bg-nav)] border-r border-[var(--border-main)] h-screen sticky top-0 overflow-hidden shadow-sm transition-colors duration-300">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm overflow-hidden border border-gray-100">
          <img src="/logo.png.JPEG" alt="Wedage Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black tracking-tight text-[var(--text-main)] leading-tight uppercase italic truncate">Wedage & Co.</h1>
          <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-none opacity-60">Company PVT LTD</p>
        </div>
        <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item, idx) => {
          if (item.type === 'header') {
            return (
              <p key={idx} className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 pt-6 pb-2 px-3 opacity-50">
                {item.name}
              </p>
            );
          }

          if (item.permission && !can(item.permission as any)) return null;
          
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              onClick={() => onClose?.()}
              className={({ isActive }) => cn(
                "group flex items-center justify-between px-3 py-2 text-sm transition-all duration-200 rounded-lg",
                isActive 
                  ? "text-indigo-500 bg-indigo-500/5 border border-indigo-500/10 font-bold" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon className={cn(
                  "w-4 h-4 transition-colors",
                  "group-hover:text-indigo-500"
                )} />
                <span>{item.name}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-[var(--border-main)] space-y-4">
        <div className="flex items-center justify-end px-2">
          <NavLink 
            to="/settings"
            onClick={() => onClose?.()}
            className={({ isActive }) => cn(
              "p-2 rounded-lg transition-all",
              isActive 
                ? "text-indigo-500 bg-indigo-500/5" 
                : "text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/5"
            )}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </NavLink>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-indigo-500/20">
             {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-[var(--text-main)] truncate tracking-tight">{user?.email}</p>
            <p className="text-[8px] text-indigo-500 font-black uppercase tracking-[0.2em]">{role || 'USER'}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
