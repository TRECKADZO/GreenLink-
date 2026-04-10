import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, 
  CheckCheck, 
  Leaf, 
  Wallet, 
  ShoppingCart, 
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  Trash2,
  Settings,
  Filter
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NotificationsPage = () => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      // Récupérer depuis la collection notifications
      const response = await fetch(`${API_URL}/api/notifications/history?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    
    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNotifications]);

  const handleMarkRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/api/notifications/history/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/history/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const getNotificationIcon = (type) => {
    const icons = {
      payment: Wallet,
      carbon: Leaf,
      order: ShoppingCart,
      alert: AlertTriangle,
      message: MessageSquare,
      welcome: Bell,
      tutorial: Bell,
      ssrte: AlertTriangle,
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      payment: 'text-emerald-600 bg-emerald-100',
      carbon: 'text-green-600 bg-green-100',
      order: 'text-blue-600 bg-blue-100',
      alert: 'text-red-600 bg-red-100',
      message: 'text-purple-600 bg-purple-100',
      welcome: 'text-amber-600 bg-amber-100',
      tutorial: 'text-cyan-600 bg-cyan-100',
      ssrte: 'text-orange-600 bg-orange-100',
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const notificationTypes = [
    { key: 'all', label: 'Toutes', count: notifications.length },
    { key: 'unread', label: 'Non lues', count: unreadCount },
    { key: 'payment', label: 'Paiements', icon: Wallet },
    { key: 'carbon', label: 'Carbone', icon: Leaf },
    { key: 'order', label: 'Commandes', icon: ShoppingCart },
    { key: 'alert', label: 'Alertes', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="notifications-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Bell className="w-7 h-7" />
                Notifications
              </h1>
              <p className="text-emerald-100 mt-1">
                {unreadCount > 0 
                  ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                  : 'Toutes vos notifications sont à jour'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                data-testid="refresh-notifications-btn"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-sm"
                  data-testid="mark-all-read-btn"
                >
                  <CheckCheck className="w-4 h-4" />
                  Tout marquer lu
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4">
        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm p-2 flex gap-2 overflow-x-auto mb-4">
          {notificationTypes.map(type => (
            <button
              key={type.key}
              onClick={() => setFilter(type.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === type.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid={`filter-${type.key}`}
            >
              {type.icon && <type.icon className="w-4 h-4" />}
              {type.label}
              {type.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  filter === type.key ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {type.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Liste des notifications */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-500">Chargement des notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {filter === 'all' ? 'Aucune notification' : 'Aucune notification dans cette catégorie'}
            </h3>
            <p className="text-gray-500">
              Les nouvelles notifications apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const NotificationIcon = getNotificationIcon(notification.type);
              const iconColorClass = getNotificationColor(notification.type);
              
              return (
                <div
                  key={notification._id}
                  onClick={() => !notification.read && handleMarkRead(notification._id)}
                  className={`bg-white rounded-xl shadow-sm p-4 transition cursor-pointer ${
                    notification.read 
                      ? 'hover:shadow-md' 
                      : 'border-l-4 border-emerald-500 bg-emerald-50/50 hover:shadow-lg'
                  }`}
                  data-testid={`notification-${notification._id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${iconColorClass}`}>
                      <NotificationIcon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`font-semibold ${
                          notification.read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">
                            Nouveau
                          </span>
                        )}
                      </div>
                      
                      <p className={`text-sm mb-2 ${
                        notification.read ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {notification.body || notification.message}
                      </p>
                      
                      <p className="text-xs text-gray-400">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spacer bottom */}
      <div className="h-20" />
    </div>
  );
};

export default NotificationsPage;
