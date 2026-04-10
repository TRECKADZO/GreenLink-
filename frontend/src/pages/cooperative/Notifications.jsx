import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, 
  CheckCheck, 
  Send, 
  Users, 
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  Megaphone,
  Calendar,
  CheckCircle,
  Clock,
  X,
  ChevronLeft
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CooperativeNotifications = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('received');
  const [refreshing, setRefreshing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({ title: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sentNotifications, setSentNotifications] = useState([]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchNotifications();
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

  const handleSendToAllMembers = async () => {
    if (!sendForm.title || !sendForm.body) {
      alert('Veuillez remplir le titre et le message');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/notifications/send-to-all-members`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: sendForm.title,
          body: sendForm.body,
          data: { type: 'coop_announcement' }
        })
      });

      if (response.ok) {
        alert('Notifications envoyées avec succès à tous les membres!');
        setSendForm({ title: '', body: '' });
        setShowSendModal(false);
        
        // Ajouter à l'historique des envois
        setSentNotifications(prev => [{
          id: Date.now(),
          title: sendForm.title,
          body: sendForm.body,
          sent_at: new Date().toISOString(),
          status: 'sent'
        }, ...prev]);
      } else {
        alert('Erreur lors de l\'envoi des notifications');
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      alert('Erreur de connexion');
    } finally {
      setSending(false);
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
    <div className="min-h-screen bg-gray-50" data-testid="coop-notifications-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/cooperative/dashboard')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <Bell className="w-7 h-7" />
                  Centre de Notifications
                </h1>
                <p className="text-emerald-200 mt-1">
                  Gérez les notifications de votre coopérative
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg transition font-medium"
                data-testid="send-notification-btn"
              >
                <Megaphone className="w-5 h-5" />
                Envoyer aux membres
              </button>
              
              <button
                onClick={() => { setRefreshing(true); fetchNotifications(); }}
                disabled={refreshing}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-emerald-200" />
              <p className="text-2xl font-bold">{notifications.length}</p>
              <p className="text-sm text-emerald-200">Total reçues</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-amber-300" />
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-sm text-emerald-200">Non lues</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Send className="w-8 h-8 mx-auto mb-2 text-cyan-300" />
              <p className="text-2xl font-bold">{sentNotifications.length}</p>
              <p className="text-sm text-emerald-200">Envoyées</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('received')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              filter === 'received' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            Reçues ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              filter === 'sent' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Send className="w-4 h-4" />
            Envoyées ({sentNotifications.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {filter === 'received' ? (
              <>
                {/* Actions */}
                {unreadCount > 0 && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition shadow-sm"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Tout marquer lu
                    </button>
                  </div>
                )}

                {/* Notifications List */}
                {loading ? (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-500">Chargement...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Aucune notification</h3>
                    <p className="text-gray-500">Les nouvelles notifications apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => !notification.read && handleMarkRead(notification._id)}
                        className={`bg-white rounded-xl shadow-sm p-4 transition cursor-pointer ${
                          notification.read 
                            ? 'hover:shadow-md' 
                            : 'border-l-4 border-emerald-500 bg-emerald-50/50 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-full ${
                            notification.type === 'alert' ? 'bg-red-100 text-red-600' :
                            notification.type === 'payment' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {notification.type === 'alert' ? <AlertTriangle className="w-5 h-5" /> :
                             notification.type === 'payment' ? <CheckCircle className="w-5 h-5" /> :
                             <Bell className="w-5 h-5" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h3 className={`font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded-full">Nouveau</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.body || notification.message}</p>
                            <p className="text-xs text-gray-400 mt-2">{formatTime(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Sent Notifications */
              <div className="space-y-3">
                {sentNotifications.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Aucun envoi</h3>
                    <p className="text-gray-500">Envoyez votre première notification aux membres</p>
                  </div>
                ) : (
                  sentNotifications.map((sent) => (
                    <div key={sent.id} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-cyan-100 text-cyan-600">
                          <Send className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{sent.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{sent.body}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Envoyé
                            </span>
                            <span className="text-xs text-gray-400">{formatTime(sent.sent_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Quick Send */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                Envoi rapide
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSendForm({
                      title: 'Rappel de collecte',
                      body: 'N\'oubliez pas la collecte de cacao prévue cette semaine!'
                    });
                    setShowSendModal(true);
                  }}
                  className="w-full p-3 bg-amber-50 hover:bg-amber-100 rounded-lg text-left transition"
                >
                  <p className="font-medium text-amber-800">Rappel de collecte</p>
                  <p className="text-xs text-amber-600 mt-1">Notifier les membres d'une collecte</p>
                </button>
                
                <button
                  onClick={() => {
                    setSendForm({
                      title: 'Information importante',
                      body: ''
                    });
                    setShowSendModal(true);
                  }}
                  className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition"
                >
                  <p className="font-medium text-blue-800">Annonce générale</p>
                  <p className="text-xs text-blue-600 mt-1">Envoyer une information à tous</p>
                </button>
                
                <button
                  onClick={() => {
                    setSendForm({
                      title: 'Prime carbone disponible!',
                      body: 'Vos primes carbone du trimestre sont disponibles pour retrait.'
                    });
                    setShowSendModal(true);
                  }}
                  className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-left transition"
                >
                  <p className="font-medium text-emerald-800">Prime carbone</p>
                  <p className="text-xs text-emerald-600 mt-1">Annoncer les primes disponibles</p>
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
              <h3 className="font-semibold text-emerald-800 mb-3">Conseils</h3>
              <ul className="space-y-2 text-sm text-emerald-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-500" />
                  Les notifications push sont envoyées aux membres avec l'application mobile
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-500" />
                  Un SMS sera envoyé aux membres sans smartphone
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-amber-500" />
                Envoyer une notification
              </h2>
              <button onClick={() => setShowSendModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  type="text"
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  placeholder="Ex: Rappel de collecte"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={sendForm.body}
                  onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })}
                  placeholder="Écrivez votre message ici..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Cette notification sera envoyée à tous les membres de votre coopérative
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendToAllMembers}
                  disabled={sending || !sendForm.title || !sendForm.body}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CooperativeNotifications;
