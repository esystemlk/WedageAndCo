import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'wedage_install_dismissed';

/** Floating "Install app" prompt shown when the browser offers installation. */
const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => setShow(false));
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  };

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="fixed bottom-4 left-4 z-[9990] w-[min(92vw,340px)] bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-gray-900/10 p-4 flex items-start gap-3"
        >
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900">Install Wedage & Co.</p>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Add the app to your device for faster access and offline use.</p>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={install}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                Install
              </button>
              <button onClick={dismiss}
                className="px-3.5 py-2 text-gray-400 hover:text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Not now
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="text-gray-300 hover:text-gray-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
