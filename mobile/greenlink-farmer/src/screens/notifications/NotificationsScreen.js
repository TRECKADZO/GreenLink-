import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useOffline } from '../../context/OfflineContext';
import { Loader, EmptyState } from '../../components/UI';
import { farmerApi } from '../../services/api';
import { COLORS, FONTS, SPACING } from '../../config';

const NotificationsScreen = ({ navigation }) => {
  const { isOnline, getCachedData, cacheData } = useOffline();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      if (!isOnline) {
        const cached = await getCachedData('notifications');
        if (cached) {
          setNotifications(cached);
          setLoading(false);
          return;
        }
      }

      const response = await farmerApi.getNotifications();
      setNotifications(response.data || []);
      await cacheData('notifications', response.data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      const cached = await getCachedData('notifications');
      if (cached) setNotifications(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (id) => {
    try {
      await farmerApi.markNotificationRead(id);
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'payment': return '💰';
      case 'parcel': return '🌳';
      case 'harvest': return '🌾';
      case 'carbon': return '🌱';
      case 'alert': return '⚠️';
      default: return '📬';
    }
  };

  if (loading) {
    return <Loader message="Chargement des notifications..." />;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est à jour'}
        </Text>
      </View>

      {/* Liste */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <EmptyState 
            message="Aucune notification" 
            icon="🔔"
          />
        ) : (
          notifications.map((notification, index) => (
            <TouchableOpacity
              key={notification._id || index}
              style={[
                styles.notificationCard,
                !notification.is_read && styles.notificationUnread,
              ]}
              onPress={() => markAsRead(notification._id)}
            >
              <View style={styles.notificationIcon}>
                <Text style={styles.iconText}>
                  {getIcon(notification.type)}
                </Text>
              </View>
              <View style={styles.notificationContent}>
                <Text style={[
                  styles.notificationTitle,
                  !notification.is_read && styles.notificationTitleUnread,
                ]}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationDate}>
                  {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              {!notification.is_read && (
                <View style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          ))
        )}
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
    padding: SPACING.lg,
    paddingTop: 60,
  },
  backButton: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  listContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationUnread: {
    backgroundColor: COLORS.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  iconText: {
    fontSize: 22,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[700],
    marginBottom: 2,
  },
  notificationTitleUnread: {
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  notificationMessage: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  notificationDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    marginTop: SPACING.xs,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
  },
});

export default NotificationsScreen;
