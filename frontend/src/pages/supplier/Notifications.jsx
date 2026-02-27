import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import SupplierSidebar from '../../components/SupplierSidebar';
import { marketplaceApi } from '../../services/marketplaceApi';
import { Bell, ShoppingCart, MessageSquare, Package, CheckCheck } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.user_type !== 'fournisseur') {
      navigate('/');
      return;
    }
    fetchNotifications();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await marketplaceApi.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await marketplaceApi.markNotificationRead(notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await marketplaceApi.markAllNotificationsRead();
      toast({
        title: 'Succès',
        description: 'Toutes les notifications ont été marquées comme lues'
      });
      fetchNotifications();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer les notifications',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      order: ShoppingCart,
      message: MessageSquare,
      product: Package,
      system: Bell
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      order: 'text-blue-600',
      message: 'text-purple-600',
      product: 'text-green-600',
      system: 'text-gray-600'
    };
    return colors[type] || 'text-gray-600';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Maintenant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    return date.toLocaleDateString('fr-FR');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SupplierSidebar />
      
      <div className="ml-64 pt-20 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                {unreadCount > 0 
                  ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                  : 'Toutes vos notifications sont à jour'
                }
              </p>
            </div>
            
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllRead}
                variant="outline"
                className="text-[#2d5a4d] border-[#2d5a4d] hover:bg-[#2d5a4d] hover:text-white"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-400 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Chargement des notifications...</p>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune notification</h3>
            <p className="text-gray-600">Vous n'avez pas encore de notifications</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const NotificationIcon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);
              
              return (
                <Card
                  key={notification._id}
                  className={`p-4 transition-all duration-200 cursor-pointer ${
                    notification.is_read 
                      ? 'bg-white hover:shadow-md' 
                      : 'bg-blue-50 border-l-4 border-[#2d5a4d] hover:shadow-lg'
                  }`}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkRead(notification._id);
                    }
                    if (notification.action_url) {
                      navigate(notification.action_url);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full bg-gray-100 ${iconColor}`}>
                      <NotificationIcon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={`font-semibold ${
                          notification.is_read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <Badge className="bg-[#2d5a4d] text-white">Nouveau</Badge>
                        )}
                      </div>
                      
                      <p className={`text-sm mb-2 ${
                        notification.is_read ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>
                      
                      <p className="text-xs text-gray-400">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;