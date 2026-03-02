import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, 
  CheckCheck, 
  Send, 
  Users, 
  AlertTriangle,
  RefreshCw,
  Megaphone,
  CheckCircle,
  Clock,
  X,
  TrendingUp,
  Building2,
  Leaf,
  Settings,
  ChevronLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminNotifications = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [refreshing, setRefreshing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({ 
    title: '', 
    body: '',
    target: 'all', // all, cooperatives, farmers
    priority: 'normal' // low, normal, high
  });
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({
    total_sent: 0,
    pending_sms: 0,
    devices_registered: 0
  });

  const fetchNotifications = useCallback(async () => {
    try {
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
  }, [token]);

  const fetchStats = useCallback(async () => {
    try {
      // Récupérer les SMS en attente
      const smsResponse = await fetch(`${API_URL}/api/notifications/pending-sms?limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (smsResponse.ok) {
        const smsData = await smsResponse.json();
        setStats(prev => ({ ...prev, pending_sms: smsData.count || 0 }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [fetchNotifications, fetchStats]);

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

  const handleTriggerWeeklyReminders = async () => {
    if (!confirm('Êtes-vous sûr de vouloir envoyer les rappels hebdomadaires à tous les producteurs ?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/notifications/trigger-weekly-reminders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Rappels hebdomadaires lancés avec succès!');
      }
    } catch (error) {
      console.error('Error triggering reminders:', error);
      alert('Erreur lors de l\'envoi des rappels');
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
    return date.toLocaleDateString('fr-FR');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-900" data-testid="admin-notifications-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Bell className="w-7 h-7 text-amber-400" />
                Centre de Notifications Admin
              </h1>
              <p className="text-gray-400 mt-1">
                Gestion des notifications système GreenLink
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleTriggerWeeklyReminders}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                <Clock className="w-4 h-4" />
                Rappels Hebdo
              </button>
              
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition"
              >
                <Megaphone className="w-5 h-5" />
                Notification Système
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <Bell className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-white">{notifications.length}</p>
              <p className="text-sm text-gray-400">Notifications reçues</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <Clock className="w-6 h-6 text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-white">{unreadCount}</p>
              <p className="text-sm text-gray-400">Non lues</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <Send className="w-6 h-6 text-emerald-400 mb-2" />
              <p className="text-2xl font-bold text-white">{stats.pending_sms}</p>
              <p className="text-sm text-gray-400">SMS en attente</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <TrendingUp className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-2xl font-bold text-white">98%</p>
              <p className="text-sm text-gray-400">Taux de livraison</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-semibold text-white mb-3">Navigation</h3>
              <nav className="space-y-1">
                {[
                  { id: 'inbox', label: 'Boîte de réception', icon: Bell, count: notifications.length },
                  { id: 'alerts', label: 'Alertes critiques', icon: AlertTriangle, count: notifications.filter(n => n.type === 'alert').length },
                  { id: 'sms', label: 'File SMS', icon: Send, count: stats.pending_sms },
                  { id: 'settings', label: 'Paramètres', icon: Settings },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition ${
                      activeTab === item.id 
                        ? 'bg-emerald-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    {item.count !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        activeTab === item.id ? 'bg-white/20' : 'bg-gray-600'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-semibold text-white mb-3">Actions Rapides</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSendForm({
                      title: 'Maintenance prévue',
                      body: 'Une maintenance est prévue le [DATE]. Le service sera indisponible pendant 2 heures.',
                      target: 'all',
                      priority: 'high'
                    });
                    setShowSendModal(true);
                  }}
                  className="w-full p-3 bg-red-900/30 hover:bg-red-900/50 border border-red-700 rounded-lg text-left transition"
                >
                  <p className="font-medium text-red-400">Maintenance</p>
                  <p className="text-xs text-gray-400">Notifier une maintenance</p>
                </button>
                
                <button
                  onClick={() => {
                    setSendForm({
                      title: 'Nouvelle fonctionnalité',
                      body: '',
                      target: 'all',
                      priority: 'normal'
                    });
                    setShowSendModal(true);
                  }}
                  className="w-full p-3 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-700 rounded-lg text-left transition"
                >
                  <p className="font-medium text-emerald-400">Nouveauté</p>
                  <p className="text-xs text-gray-400">Annoncer une fonctionnalité</p>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Actions bar */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {activeTab === 'inbox' && 'Boîte de réception'}
                {activeTab === 'alerts' && 'Alertes critiques'}
                {activeTab === 'sms' && 'File d\'attente SMS'}
                {activeTab === 'settings' && 'Paramètres'}
              </h2>
              
              {unreadCount > 0 && activeTab === 'inbox' && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
                >
                  <CheckCheck className="w-4 h-4" />
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-400">Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Aucune notification</h3>
                <p className="text-gray-400">Les notifications système apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications
                  .filter(n => {
                    if (activeTab === 'alerts') return n.type === 'alert' || n.type === 'ssrte';
                    return true;
                  })
                  .map((notification) => (
                  <div
                    key={notification._id}
                    className={`bg-gray-800 rounded-xl p-4 border transition ${
                      notification.read 
                        ? 'border-gray-700 hover:border-gray-600' 
                        : 'border-emerald-600 bg-emerald-900/10'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${
                        notification.type === 'alert' ? 'bg-red-900/50 text-red-400' :
                        notification.type === 'payment' ? 'bg-emerald-900/50 text-emerald-400' :
                        notification.type === 'ssrte' ? 'bg-orange-900/50 text-orange-400' :
                        'bg-blue-900/50 text-blue-400'
                      }`}>
                        {notification.type === 'alert' || notification.type === 'ssrte' ? 
                          <AlertTriangle className="w-5 h-5" /> :
                          <Bell className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className={`font-semibold ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">Nouveau</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{notification.body || notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">{formatTime(notification.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-lg w-full p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-amber-400" />
                Notification Système
              </h2>
              <button onClick={() => setShowSendModal(false)} className="p-2 hover:bg-gray-700 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cible</label>
                  <select
                    value={sendForm.target}
                    onChange={(e) => setSendForm({ ...sendForm, target: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">Tous les utilisateurs</option>
                    <option value="cooperatives">Coopératives</option>
                    <option value="farmers">Producteurs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Priorité</label>
                  <select
                    value={sendForm.priority}
                    onChange={(e) => setSendForm({ ...sendForm, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Titre</label>
                <input
                  type="text"
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  placeholder="Titre de la notification"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                <textarea
                  value={sendForm.body}
                  onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })}
                  placeholder="Contenu du message..."
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    alert('Notification envoyée! (Fonctionnalité en cours d\'intégration)');
                    setShowSendModal(false);
                  }}
                  disabled={!sendForm.title || !sendForm.body}
                  className="flex-1 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
