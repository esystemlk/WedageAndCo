import React from 'react';
import { Search, Settings } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[var(--bg-surface)]">
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/20 w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `p-2 rounded-xl transition-colors ${
              isActive ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'
            }`
          }
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </NavLink>

        <NotificationBell />
      </div>
    </header>
  );
};

export default Header;
