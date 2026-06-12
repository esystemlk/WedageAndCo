import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';
import InstallPrompt from './InstallPrompt';
import { motion, AnimatePresence } from 'motion/react';
import { Menu } from 'lucide-react';

const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  // User Management needs the extra width for its permission matrix; let it use a wider canvas.
  const wideLayout = location.pathname.startsWith('/users');

  // Global ⌘K / Ctrl+K to open the command palette.
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <InstallPrompt />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex items-center border-b border-[var(--border-main)] bg-[var(--bg-surface)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <Header onSearchClick={openPalette} />
          </div>
        </div>
        
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={wideLayout ? 'max-w-[1800px] mx-auto' : 'max-w-7xl mx-auto'}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AppShell;
