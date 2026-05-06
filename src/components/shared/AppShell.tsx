import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'motion/react';

const AppShell: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AppShell;
