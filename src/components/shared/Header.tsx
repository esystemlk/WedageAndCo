import React from 'react';
import { Search, Settings } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { NavLink } from 'react-router-dom';

const Header: React.FC<{ onSearchClick?: () => void }> = ({ onSearchClick }) => {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[var(--bg-surface)]">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onSearchClick}
          className="relative hidden sm:flex items-center gap-2 pl-10 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 hover:border-indigo-500/30 hover:bg-white transition-colors w-72 text-left"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <span className="flex-1">Search anything...</span>
          <kbd className="text-[10px] font-black text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded-md">⌘K</kbd>
        </button>
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
