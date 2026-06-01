import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
}

interface ToastApi {
  toast: (opts: { variant?: ToastVariant; title: string; description?: string; duration?: number }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const VARIANT_CFG: Record<ToastVariant, { icon: React.ReactNode; ring: string; bar: string; iconColor: string }> = {
  success: { icon: <CheckCircle2 className="w-5 h-5" />, ring: 'border-emerald-100', bar: 'bg-emerald-500', iconColor: 'text-emerald-600' },
  error:   { icon: <XCircle className="w-5 h-5" />,      ring: 'border-red-100',     bar: 'bg-red-500',     iconColor: 'text-red-600' },
  warning: { icon: <AlertTriangle className="w-5 h-5" />,ring: 'border-amber-100',   bar: 'bg-amber-500',   iconColor: 'text-amber-600' },
  info:    { icon: <Info className="w-5 h-5" />,         ring: 'border-indigo-100',  bar: 'bg-indigo-500',  iconColor: 'text-indigo-600' },
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((opts: { variant?: ToastVariant; title: string; description?: string; duration?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const toast: Toast = {
      id,
      variant: opts.variant || 'info',
      title: opts.title,
      description: opts.description,
      duration: opts.duration ?? 4000,
    };
    setToasts(prev => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration);
    }
  }, [dismiss]);

  const api: ToastApi = {
    toast: push,
    success: (title, description) => push({ variant: 'success', title, description }),
    error:   (title, description) => push({ variant: 'error', title, description }),
    warning: (title, description) => push({ variant: 'warning', title, description }),
    info:    (title, description) => push({ variant: 'info', title, description }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast viewport — top-right, above everything */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-[min(92vw,380px)] pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const cfg = VARIANT_CFG[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                className={cn(
                  'pointer-events-auto relative overflow-hidden bg-white border rounded-2xl shadow-xl shadow-gray-900/5 flex items-start gap-3 p-4',
                  cfg.ring,
                )}
              >
                <span className={cn('flex-shrink-0 mt-0.5', cfg.iconColor)}>{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 leading-snug">{t.title}</p>
                  {t.description && <p className="text-[12px] text-gray-500 font-medium mt-0.5">{t.description}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <span className={cn('absolute bottom-0 left-0 h-1 rounded-full', cfg.bar)}
                  style={{ animation: t.duration > 0 ? `toastbar ${t.duration}ms linear forwards` : undefined }} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <style>{`@keyframes toastbar { from { width: 100%; } to { width: 0%; } }`}</style>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
