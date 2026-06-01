/**
 * AlertsWidget — shows on Dashboard.
 * Fetches and displays system alerts: expired docs, expiring docs,
 * low stock, maintenance due.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldAlert, Wrench, Package, ChevronRight, RefreshCw, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { getSystemAlerts, SystemAlert, AlertSeverity, countAlertsBySeverity } from '../../services/alertService';

const SEV_CONFIG: Record<AlertSeverity, { bg: string; border: string; badge: string; text: string; dot: string }> = {
  expired:  { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-600 text-white',       text: 'text-red-700',    dot: 'bg-red-500'    },
  critical: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-500 text-white',    text: 'text-orange-700', dot: 'bg-orange-500' },
  warning:  { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-400 text-white',     text: 'text-amber-700',  dot: 'bg-amber-400'  },
  info:     { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-500 text-white',      text: 'text-blue-700',   dot: 'bg-blue-400'   },
};

const SEV_LABEL: Record<AlertSeverity, string> = {
  expired:  'EXPIRED',
  critical: 'CRITICAL',
  warning:  'WARNING',
  info:     'INFO',
};

const CAT_ICON: Record<string, React.ReactNode> = {
  document:    <ShieldAlert className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
  stock:       <Package className="w-4 h-4" />,
  booking:     <CheckCircle className="w-4 h-4" />,
};

const AlertsWidget: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSystemAlerts();
      setAlerts(data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = countAlertsBySeverity(alerts);

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">Checking system alerts…</span>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-black text-emerald-800 text-sm">All Systems Clear</p>
          <p className="text-xs text-emerald-600 font-bold mt-0.5">No document expiries, low stock, or maintenance due.</p>
        </div>
        <button onClick={load} className="ml-auto p-2 hover:bg-emerald-100 rounded-xl transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-emerald-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              "p-2.5 rounded-xl",
              counts.expired > 0 ? 'bg-red-100' : counts.critical > 0 ? 'bg-orange-100' : 'bg-amber-100'
            )}>
              <AlertTriangle className={cn(
                "w-5 h-5",
                counts.expired > 0 ? 'text-red-600' : counts.critical > 0 ? 'text-orange-600' : 'text-amber-600'
              )} />
            </div>
            {counts.expired + counts.critical > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                {counts.expired + counts.critical}
              </span>
            )}
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm">System Alerts</p>
            <div className="flex items-center gap-2 mt-0.5">
              {counts.expired  > 0 && <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{counts.expired} Expired</span>}
              {counts.critical > 0 && <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{counts.critical} Critical</span>}
              {counts.warning  > 0 && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{counts.warning} Warning</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); load(); }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            title="Refresh alerts"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <ChevronRight className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200",
            expanded && "rotate-90"
          )} />
        </div>
      </div>

      {/* Alert list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 max-h-[360px] overflow-y-auto divide-y divide-gray-50">
              {alerts.map((alert, i) => {
                const cfg = SEV_CONFIG[alert.severity];
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn("flex items-start gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors", cfg.bg)}
                  >
                    {/* Category icon */}
                    <div className={cn("flex-shrink-0 p-2 rounded-lg mt-0.5", cfg.border, "border bg-white")}>
                      <span className={cfg.text}>{CAT_ICON[alert.category]}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest", cfg.badge)}>
                          {SEV_LABEL[alert.severity]}
                        </span>
                        <p className={cn("text-xs font-black truncate", cfg.text)}>{alert.title}</p>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{alert.message}</p>
                    </div>

                    {/* Action */}
                    {alert.actionUrl && (
                      <button
                        onClick={() => navigate(alert.actionUrl!)}
                        className={cn(
                          "flex-shrink-0 flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-lg border transition-colors",
                          cfg.border, cfg.text, "hover:bg-white"
                        )}
                      >
                        {alert.actionLabel || 'View'}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {lastRefresh && (
              <div className="px-5 py-2 border-t border-gray-50">
                <p className="text-[9px] text-gray-300 font-bold">
                  Last checked: {lastRefresh.toLocaleTimeString()}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AlertsWidget;
