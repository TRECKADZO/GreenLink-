/**
 * Messagerie API Service
 * Gestion des conversations et messages temps réel
 */
import axios from 'axios';
import logger from './logger';
import { tokenService } from './tokenService';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/messaging`;

// Récupérer le token d'authentification
const getAuthHeaders = () => {
  const token = tokenService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const messagingApi = {
  // ============= CONVERSATIONS =============
  
  /**
   * Créer une nouvelle conversation liée à une annonce
   */
  createConversation: async (listingId, recipientId, initialMessage) => {
    try {
      const response = await axios.post(`${API}/conversations`, {
        listing_id: listingId,
        recipient_id: recipientId,
        initial_message: initialMessage
      }, { headers: getAuthHeaders() });
      return response.data;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  },

  /**
   * Créer une conversation directe (sans annonce)
   */
  createDirectConversation: async (recipientId, initialMessage, subject = null) => {
    try {
      const response = await axios.post(`${API}/conversations/direct`, {
        recipient_id: recipientId,
        initial_message: initialMessage,
        subject
      }, { headers: getAuthHeaders() });
      return response.data;
    } catch (error) {
      logger.error('Error creating direct conversation:', error);
      throw error;
    }
  },

  /**
   * Récupérer les contacts disponibles
   */
  getContacts: async (search = null) => {
    try {
      const params = {};
      if (search) params.search = search;
      const response = await axios.get(`${API}/contacts`, {
        params,
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching contacts:', error);
      throw error;
    }
  },

  /**
   * Récupérer la liste des conversations
   */
  getConversations: async (archived = false) => {
    try {
      const response = await axios.get(`${API}/conversations`, {
        params: { archived },
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching conversations:', error);
      throw error;
    }
  },

  /**
   * Récupérer les détails d'une conversation
   */
  getConversation: async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching conversation:', error);
      throw error;
    }
  },

  /**
   * Récupérer les messages d'une conversation
   */
  getMessages: async (conversationId, before = null, limit = 50) => {
    try {
      const params = { limit };
      if (before) params.before = before;
      
      const response = await axios.get(`${API}/conversations/${conversationId}/messages`, {
        params,
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching messages:', error);
      throw error;
    }
  },

  /**
   * Récupérer les messages épinglés
   */
  getPinnedMessages: async (conversationId) => {
    try {
      const response = await axios.get(`${API}/conversations/${conversationId}/pinned`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching pinned messages:', error);
      throw error;
    }
  },

  /**
   * Archiver une conversation
   */
  archiveConversation: async (conversationId) => {
    try {
      const response = await axios.put(`${API}/conversations/${conversationId}/archive`, {}, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      throw error;
    }
  },

  // ============= MESSAGES =============

  /**
   * Supprimer un message
   */
  deleteMessage: async (messageId) => {
    try {
      const response = await axios.delete(`${API}/messages/${messageId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  },

  // ============= SIGNALEMENT & BLOCAGE =============

  /**
   * Signaler un message
   */
  reportMessage: async (messageId, reason, details = null) => {
    try {
      const response = await axios.post(`${API}/report`, {
        message_id: messageId,
        reason,
        details
      }, { headers: getAuthHeaders() });
      return response.data;
    } catch (error) {
      logger.error('Error reporting message:', error);
      throw error;
    }
  },

  /**
   * Bloquer un utilisateur
   */
  blockUser: async (userId, reason = null) => {
    try {
      const response = await axios.post(`${API}/block`, {
        user_id: userId,
        reason
      }, { headers: getAuthHeaders() });
      return response.data;
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  },

  /**
   * Débloquer un utilisateur
   */
  unblockUser: async (userId) => {
    try {
      const response = await axios.delete(`${API}/block/${userId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  },

  /**
   * Récupérer la liste des utilisateurs bloqués
   */
  getBlockedUsers: async () => {
    try {
      const response = await axios.get(`${API}/blocked`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching blocked users:', error);
      throw error;
    }
  },

  // ============= UPLOAD =============

  /**
   * Upload une pièce jointe
   */
  uploadAttachment: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error uploading attachment:', error);
      throw error;
    }
  },

  // ============= STATISTIQUES =============

  /**
   * Récupérer les statistiques de messagerie
   */
  getStats: async () => {
    try {
      const response = await axios.get(`${API}/stats`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching messaging stats:', error);
      throw error;
    }
  }
};

// ============= WEBSOCKET CLASS =============

export class MessagingWebSocket {
  constructor(onMessage, onTyping, onRead, onError) {
    this.ws = null;
    this.onMessage = onMessage;
    this.onTyping = onTyping;
    this.onRead = onRead;
    this.onError = onError;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    const token = tokenService.getToken();
    if (!token) {
      logger.error('No token for WebSocket connection');
      return;
    }

    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    this.ws = new WebSocket(`${wsUrl}/api/messaging/ws?token=${token}`);

    this.ws.onopen = () => {
      logger.log('[Messaging WS] Connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        logger.error('[Messaging WS] Parse error:', e);
      }
    };

    this.ws.onclose = (event) => {
      logger.log('[Messaging WS] Disconnected:', event.code);
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      logger.error('[Messaging WS] Error:', error);
      if (this.onError) this.onError(error);
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'new_message':
        if (this.onMessage) this.onMessage(data.message);
        break;
      case 'typing':
        if (this.onTyping) this.onTyping(data);
        break;
      case 'messages_read':
        if (this.onRead) this.onRead(data);
        break;
      case 'new_conversation':
        if (this.onMessage) this.onMessage({ type: 'new_conversation', ...data.conversation });
        break;
      case 'connected':
        logger.log('[Messaging WS] Session established, unread:', data.unread_count);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        logger.log('[Messaging WS] Unknown message type:', data.type);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.log(`[Messaging WS] Reconnecting attempt ${this.reconnectAttempts}...`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  sendMessage(conversationId, content, messageType = 'text', attachment = null, replyToId = null) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'send_message',
        conversation_id: conversationId,
        content,
        message_type: messageType,
        attachment,
        reply_to_id: replyToId
      }));
    }
  }

  sendTyping(conversationId, isTyping = true) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        is_typing: isTyping
      }));
    }
  }

  markAsRead(conversationId, messageIds = []) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'read',
        conversation_id: conversationId,
        message_ids: messageIds
      }));
    }
  }

  pinMessage(messageId, isPinned = true) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'pin',
        message_id: messageId,
        is_pinned: isPinned
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default messagingApi;
