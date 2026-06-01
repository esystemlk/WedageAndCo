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
  UserCheck,
  Package,
  ShieldCheck,
  DollarSign,
  Settings,
  Wallet,
  Activity,
  X,
  Calendar as CalendarIcon,
  Folder,
  ShoppingCart,
  ClipboardCheck,
  UserMinus,
  BarChart3,
  ScrollText,
  BookOpen,
  ClipboardSignature,
  Receipt,
  CalendarCheck,
  Utensils,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { auth } from '../../firebase/config';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type MenuItem =
  | { type: 'header'; name: string }
  | { type?: never; name: string; path: string; icon: React.ElementType; permission: string | null }

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const { user, role, can } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
    onClose?.();
  };

  const menuItems: MenuItem[] = [
    // ── Top-level ──────────────────────────────────────────────────────────
    { name: 'Dashboard',           path: '/',                  icon: LayoutDashboard,   permission: null },

    // ── CRM ────────────────────────────────────────────────────────────────
    { type: 'header', name: 'CRM' },
    { name: 'Customers',           path: '/customers',         icon: Users,             permission: 'view_customers' },

    // ── HRM & Payroll ──────────────────────────────────────────────────────
    { type: 'header', name: 'HRM & Payroll' },
    { name: 'Staff Directory',     path: '/staff',             icon: UserSquare2,       permission: 'view_staff' },
    { name: 'Attendance Board',    path: '/staff/attendance',  icon: UserCheck,         permission: 'view_staff' },
    { name: 'Holiday Requests',    path: '/payroll/leaves',    icon: CalendarIcon,      permission: 'view_staff' },
    { name: 'Payroll',             path: '/payroll',           icon: ClipboardList,     permission: 'view_staff' },
    { name: 'Meal Management',     path: '/meals',             icon: Utensils,          permission: 'view_staff' },
    { name: 'Exit Registry',       path: '/payroll',           icon: UserMinus,         permission: 'view_staff' },

    // ── Procurement ────────────────────────────────────────────────────────
    { type: 'header', name: 'Procurement' },
    { name: 'Suppliers',           path: '/suppliers',         icon: Package,           permission: 'view_suppliers' },
    { name: 'Inventory',           path: '/inventory',         icon: ShoppingCart,      permission: 'view_suppliers' },
    { name: 'Purchase Orders',     path: '/purchase-orders',   icon: ClipboardSignature,permission: 'view_logs' },
    { name: 'GRN Registry',        path: '/grn',               icon: BookOpen,          permission: 'view_logs' },

    // ── Operations ─────────────────────────────────────────────────────────
    { type: 'header', name: 'Operations' },
    { name: 'Calendar',            path: '/calendar',          icon: CalendarIcon,      permission: 'view_logs' },
    { name: 'Daily Updates',       path: '/daily-updates',     icon: LayoutDashboard,   permission: 'view_logs' },
    { name: 'Documents',           path: '/documents',         icon: Folder,            permission: 'view_logs' },
    { name: 'Fleet',               path: '/fleet',             icon: Truck,             permission: 'view_fleet' },
    { name: 'Vehicle Bookings',    path: '/fleet/bookings',    icon: CalendarCheck,     permission: 'view_fleet' },
    { name: 'Log Sheets',          path: '/logs',              icon: ScrollText,        permission: 'view_logs' },
    { name: 'Security Book',       path: '/security',          icon: ShieldCheck,       permission: 'view_logs' },
    { name: 'Garage',              path: '/garage',            icon: Wrench,            permission: 'view_garage' },
    { name: 'Job Cards',           path: '/garage/job-cards',  icon: ClipboardCheck,    permission: 'view_garage' },

    // ── Accounting ─────────────────────────────────────────────────────────
    { type: 'header', name: 'Accounting' },
    { name: 'Invoices',            path: '/invoices',          icon: Receipt,           permission: 'view_reports' },

    // ── Analytics ──────────────────────────────────────────────────────────
    { type: 'header', name: 'Analytics' },
    { name: 'Fleet Analytics',     path: '/fleet/analytics',   icon: Activity,          permission: 'view_fleet' },
    { name: 'Financial Analytics', path: '/financial-dashboard',icon: Wallet,           permission: 'view_reports' },
    { name: 'Reports',             path: '/reports',           icon: FileBarChart,      permission: 'view_reports' },

    // ── System ─────────────────────────────────────────────────────────────
    { type: 'header', name: 'System' },
    { name: 'User Management',     path: '/users',             icon: Users,             permission: 'manage_users' },
    { name: 'System Logs',         path: '/audit',             icon: BarChart3,         permission: 'view_audit_logs' },
  ];

  const sidebarContent = (
    <div className="flex flex-col w-64 bg-[var(--bg-nav)] border-r border-[var(--border-main)] h-screen sticky top-0 overflow-hidden shadow-sm transition-colors duration-300">

      {/* Logo */}
      <div className="p-6 flex items-center space-x-3">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm overflow-hidden border border-gray-100">
          <img src="/logo.png.JPEG" alt="Wedage Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black tracking-tight text-[var(--text-main)] leading-tight uppercase italic truncate">
            Wedage &amp; Company
          </h1>
          <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest leading-none opacity-60">
            (PVT) LTD
          </p>
        </div>
        <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item, idx) => {

          if (item.type === 'header') {
            return (
              <p key={idx}
                className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 pt-5 pb-1.5 px-3 opacity-50 first:pt-0"
              >
                {item.name}
              </p>
            );
          }

          if (item.permission && !can(item.permission as any)) return null;

          return (
            <NavLink
              key={`${item.path}-${item.name}`}
              to={item.path}
              end={item.path === '/'}
              onClick={() => onClose?.()}
              className={({ isActive }) => cn(
                "group flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150",
                isActive
                  ? "text-indigo-500 bg-indigo-500/5 border border-indigo-500/10 font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 font-medium"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-indigo-500 transition-colors" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-main)] space-y-3">
        <div className="flex items-center justify-end px-1">
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

        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-indigo-500/20 flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-[var(--text-main)] truncate tracking-tight">{user?.email}</p>
            <p className="text-[8px] text-indigo-500 font-black uppercase tracking-[0.2em]">{role || 'USER'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-red-500/20"
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.div
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
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
