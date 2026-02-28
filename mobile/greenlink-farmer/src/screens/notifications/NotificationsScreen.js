import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { Loader, EmptyState } from '../../components/UI';
import { COLORS, FONTS, SPACING, API_URL } from '../../config';

const NotificationsScreen = ({ navigation }) => {
  const { token } = useAuth();
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('notifications');
        if (cached) {
          setNotifications(cached);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(`${API_URL}/api/notifications/history?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        await cacheData('notifications', data.notifications || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      const cached = await getCachedData('notifications');
      if (cached) setNotifications(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isOnline]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/notifications/history/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/history/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      Alert.alert('Succès', 'Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'payment': return { name: 'wallet', color: '#10b981' };
      case 'carbon': return { name: 'leaf', color: '#22c55e' };
      case 'parcel': return { name: 'map', color: '#3b82f6' };
      case 'harvest': return { name: 'basket', color: '#f59e0b' };
      case 'alert': return { name: 'warning', color: '#ef4444' };
      case 'ssrte': return { name: 'alert-circle', color: '#f97316' };
      case 'welcome': return { name: 'happy', color: '#8b5cf6' };
      case 'tutorial': return { name: 'book', color: '#06b6d4' };
      case 'message': return { name: 'chatbubble', color: '#6366f1' };
      default: return { name: 'notifications', color: '#64748b' };
    }
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

  if (loading) {
    return <Loader message="Chargement des notifications..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="notifications" size={28} color={COLORS.white} />
          </View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 
              ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Tout est à jour'
            }
          </Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
            <Text style={styles.markAllText}>Tout lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Toutes', count: notifications.length },
            { key: 'unread', label: 'Non lues', count: unreadCount },
            { key: 'payment', label: 'Paiements', icon: 'wallet' },
            { key: 'carbon', label: 'Carbone', icon: 'leaf' },
            { key: 'alert', label: 'Alertes', icon: 'warning' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.filterTab,
                filter === item.key && styles.filterTabActive
              ]}
              onPress={() => setFilter(item.key)}
            >
              {item.icon && (
                <Ionicons 
                  name={item.icon} 
                  size={14} 
                  color={filter === item.key ? COLORS.white : COLORS.gray[600]} 
                />
              )}
              <Text style={[
                styles.filterTabText,
                filter === item.key && styles.filterTabTextActive
              ]}>
                {item.label}
              </Text>
              {item.count !== undefined && (
                <View style={[
                  styles.filterBadge,
                  filter === item.key && styles.filterBadgeActive
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    filter === item.key && styles.filterBadgeTextActive
                  ]}>
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={64} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? 'Aucune notification' : 'Aucune notification dans cette catégorie'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Les nouvelles notifications apparaîtront ici
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification, index) => {
            const iconConfig = getIcon(notification.type);
            
            return (
              <TouchableOpacity
                key={notification._id || index}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.notificationUnread,
                ]}
                onPress={() => markAsRead(notification._id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.notificationIcon,
                  { backgroundColor: iconConfig.color + '20' }
                ]}>
                  <Ionicons 
                    name={iconConfig.name} 
                    size={22} 
                    color={iconConfig.color} 
                  />
                </View>
                
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.read && styles.notificationTitleUnread,
                    ]} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    {!notification.read && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>Nouveau</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.body || notification.message}
                  </Text>
                  
                  <Text style={styles.notificationDate}>
                    {formatTime(notification.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    marginBottom: SPACING.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    marginTop: 4,
  },
  markAllButton: {
    position: 'absolute',
    top: 50,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  markAllText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.sm,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  filterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.gray[200],
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  filterBadgeTextActive: {
    color: COLORS.white,
  },
  listContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: SPACING.xs,
  },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationUnread: {
    backgroundColor: COLORS.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    color: COLORS.gray[700],
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  newBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: SPACING.sm,
  },
  newBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.gray[600],
    lineHeight: 18,
  },
  notificationDate: {
    fontSize: 11,
    color: COLORS.gray[400],
    marginTop: SPACING.xs,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default NotificationsScreen;
