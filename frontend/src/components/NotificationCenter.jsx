import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, MapPin, Leaf, AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getNotifIcon = (type) => {
  switch (type) {
    case 'new_parcel_to_verify':
      return <MapPin className="h-4 w-4 text-green-500" />;
    case 'ssrte_alert':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'carbon_update':
      return <Leaf className="h-4 w-4 text-emerald-500" />;
    default:
      return <Bell className="h-4 w-4 text-blue-500" />;
  }
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
};

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/unread-count`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.non_lues || 0);
      }
    } catch (e) { /* silent */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/history?limit=20`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) { /* silent */ }
    setLoading(false);
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/notifications/history/${id}/read`, {
        method: 'PUT', headers
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/history/read-all`, {
        method: 'PUT', headers
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref} data-testid="notification-center">
      <Button
        variant="outline"
        size="icon"
        className="relative border-white/30 text-white hover:bg-white/10"
        onClick={() => setOpen(!open)}
        data-testid="notification-bell-btn"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
          data-testid="notification-dropdown"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs flex items-center gap-1 hover:underline opacity-90"
                  data-testid="mark-all-read-btn"
                >
                  <CheckCheck className="h-3 w-3" /> Tout lire
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm" data-testid="no-notifications">
                Aucune notification
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    notif.read ? 'bg-white' : 'bg-green-50/60'
                  } hover:bg-gray-50`}
                  onClick={() => !notif.read && markAsRead(notif._id)}
                  data-testid={`notification-item-${notif._id}`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.read && (
                    <div className="mt-2 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t text-center">
              <span className="text-xs text-gray-400">
                {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est lu'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
