import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSystemAlerts, SystemAlert } from '../services/alertService';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  alertsLoading: boolean;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  refreshAlerts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

// Map alert severity → notification type
function alertToNotifType(sev: SystemAlert['severity']): NotificationType {
  if (sev === 'expired' || sev === 'critical') return 'error';
  if (sev === 'warning') return 'warning';
  return 'info';
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  // Track which alert IDs have already been added to avoid duplicates on re-render
  const [loadedAlertIds] = useState<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [{
      ...n,
      id: `manual-${Date.now()}`,
      timestamp: new Date(),
      read: false,
    }, ...prev]);
  }, []);

  const markAsRead     = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllAsRead  = ()          => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const removeNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const clearAll       = ()          => setNotifications([]);

  // Load real system alerts from Firestore and inject into notification list
  const refreshAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const alerts = await getSystemAlerts();
      const newNotifs: Notification[] = [];
      for (const alert of alerts) {
        if (loadedAlertIds.has(alert.id)) continue; // don't re-add
        loadedAlertIds.add(alert.id);
        newNotifs.push({
          id:         alert.id,
          type:       alertToNotifType(alert.severity),
          title:      alert.title,
          message:    alert.message,
          timestamp:  new Date(),
          read:       false,
          actionUrl:  alert.actionUrl,
          actionLabel: alert.actionLabel,
        });
      }
      if (newNotifs.length > 0) {
        setNotifications(prev => [...newNotifs, ...prev]);
      }
    } catch (e) {
      console.warn('NotificationProvider: could not load alerts', e);
    } finally {
      setAlertsLoading(false);
    }
  }, [loadedAlertIds]);

  // Load on mount (with a small delay so auth + Firestore are ready)
  useEffect(() => {
    const t = setTimeout(() => { refreshAlerts(); }, 2000);
    return () => clearTimeout(t);
  }, [refreshAlerts]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      alertsLoading,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
      refreshAlerts,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
