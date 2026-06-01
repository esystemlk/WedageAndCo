import React, { useState } from 'react';
import { Bell, X, Check, Trash2, MessageSquare, AlertCircle, CheckCircle, Info, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification, NotificationType } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertCircle;
    case 'error':
      return AlertCircle;
    case 'info':
    default:
      return Info;
  }
};

const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' };
    case 'warning':
      return { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' };
    case 'error':
      return { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' };
    case 'info':
    default:
      return { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' };
  }
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
  onNavigate: (url: string) => void;
}> = ({ notification, onMarkRead, onRemove, onNavigate }) => {
  const colors = getNotificationColor(notification.type);
  const Icon = getNotificationIcon(notification.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'p-4 border-b last:border-b-0 transition-colors hover:bg-gray-50',
        !notification.read && 'bg-blue-50/50'
      )}
    >
      <div className="flex gap-3">
        <div className={cn('flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', colors.bg, colors.text)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{notification.title}</p>
              <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
            </div>
            <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
              {formatTime(notification.timestamp)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {notification.actionUrl && (
              <button
                onClick={() => { onMarkRead(notification.id); onNavigate(notification.actionUrl!); }}
                className={cn(
                  "text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors",
                  colors.border, colors.text, "hover:bg-white"
                )}
              >
                {notification.actionLabel || 'View'}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            {!notification.read && (
              <button onClick={() => onMarkRead(notification.id)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark read
              </button>
            )}
            <button onClick={() => onRemove(notification.id)}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, alertsLoading, markAsRead, markAllAsRead, removeNotification, clearAll, refreshAlerts } = useNotifications();

  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900">Notifications</h3>
                  <p className="text-xs text-gray-500 font-bold">{unreadCount} unread</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshAlerts()}
                    disabled={alertsLoading}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh alerts"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 text-gray-400", alertsLoading && "animate-spin")} />
                  </button>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-bold">No notifications yet</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onRemove={removeNotification}
                        onNavigate={url => { setIsOpen(false); navigate(url); }}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-100">
                  <button
                    onClick={clearAll}
                    className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
