import { tokenService } from "../services/tokenService";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, MapPin, Leaf, AlertTriangle, X, ShoppingCart, Wheat, ShieldAlert, GraduationCap, ClipboardCheck, Users, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getNotifIcon = (type) => {
  switch (type) {
    case 'audit_upcoming':
      return <ClipboardCheck className="h-4 w-4 text-purple-600" />;
    case 'formation_missing':
      return <GraduationCap className="h-4 w-4 text-emerald-600" />;
    case 'nc_critique':
      return <ShieldAlert className="h-4 w-4 text-red-600" />;
    case 'risque_critique':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case 'members_pending':
      return <Users className="h-4 w-4 text-blue-600" />;
    case 'pdc_renouveler':
      return <FileText className="h-4 w-4 text-amber-600" />;
    case 'new_parcel_to_verify':
      return <MapPin className="h-4 w-4 text-blue-500" />;
    case 'parcel_verified':
      return <Check className="h-4 w-4 text-green-600" />;
    case 'ssrte_critical_alert':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'payment_received':
    case 'carbon_update':
      return <Leaf className="h-4 w-4 text-emerald-500" />;
    case 'harvest_to_validate':
    case 'harvest_validated':
    case 'harvest_rejected':
    case 'harvest':
      return <Wheat className="h-4 w-4 text-amber-500" />;
    case 'order':
      return <ShoppingCart className="h-4 w-4 text-purple-500" />;
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
  const dropdownRef = useRef(null);
  const sseRef = useRef(null);
  const navigate = useNavigate();

  const token = tokenService.getToken();
  const headers = { Authorization: `Bearer ${token}` };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/web/unread-count`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.non_lues || 0);
      }
    } catch (e) { console.warn('[Notifications] Error:', e.message); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/web?limit=20`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.non_lues || 0);
      }
    } catch (e) { console.warn('[Notifications] Error:', e.message); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/notifications/web/${id}/read`, {
        method: 'PUT', headers
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.warn('[Notifications] Error:', e.message); }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/web/read-all`, {
        method: 'PUT', headers
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) { console.warn('[Notifications] Error:', e.message); }
  };

  // SSE real-time connection
  useEffect(() => {
    if (!token) return;

    const connectSSE = () => {
      const url = `${API_URL}/api/notifications/stream`;
      const eventSource = new EventSource(url);

      // SSE doesn't natively support auth headers, so we use a workaround:
      // Close the EventSource and use fetch-based SSE instead
      eventSource.close();

      // Use fetch-based SSE with auth headers
      const controller = new AbortController();
      fetch(url, {
        headers: { ...headers, Accept: 'text/event-stream' },
        signal: controller.signal
      }).then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) return;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            let eventType = '';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7);
              } else if (line.startsWith('data: ')) {
                eventData = line.slice(6);
              } else if (line === '' && eventData) {
                try {
                  const parsed = JSON.parse(eventData);
                  if (eventType === 'notification') {
                    setNotifications(prev => [parsed, ...prev.slice(0, 19)]);
                    setUnreadCount(prev => prev + 1);
                  } else if (eventType === 'unread_count') {
                    setUnreadCount(parsed.non_lues || 0);
                  }
                } catch (e) { console.warn('[Notifications] Parse error:', e.message); }
                eventType = '';
                eventData = '';
              }
            }
            readStream();
          }).catch((e) => { console.debug('[Notifications] Stream closed:', e?.message); });
        };
        readStream();
      }).catch((e) => { console.warn('[Notifications] SSE fallback to polling:', e?.message); });

      sseRef.current = controller;
    };

    connectSSE();

    return () => {
      if (sseRef.current) sseRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Fallback polling for unread count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClick = (e) => {
      const inBell = ref.current && ref.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inBell && !inDropdown) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {open && createPortal(
        <div
          className="fixed inset-x-2 top-16 sm:right-4 sm:left-auto sm:top-16 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden max-h-[85vh] flex flex-col"
          data-testid="notification-dropdown"
          ref={dropdownRef}
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

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 flex-1">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm" data-testid="no-notifications">
                Aucune notification
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    notif.is_read ? 'bg-white' : 'bg-green-50/60'
                  } hover:bg-gray-50`}
                  onClick={() => {
                    if (!notif.is_read) markAsRead(notif.id);
                    if (notif.action_url) {
                      setOpen(false);
                      navigate(notif.action_url);
                    }
                  }}
                  data-testid={`notification-item-${notif.id}`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notif.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && (
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
          <div className="px-4 py-2 border-t bg-gray-50">
            <button
              onClick={() => { setOpen(false); navigate('/cooperative/notifications'); }}
              className="w-full text-center text-xs text-emerald-700 font-semibold hover:underline"
              data-testid="view-all-notifications-btn"
            >
              Voir toutes les notifications →
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
