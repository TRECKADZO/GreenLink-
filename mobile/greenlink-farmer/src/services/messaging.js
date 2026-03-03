/**
 * Service de Messagerie pour l'App Mobile
 * Gestion des conversations et messages temps réel pour vendeurs (planteurs/coopératives)
 */
import { api } from './api';

export const messagingApi = {
  // ============= CONVERSATIONS =============
  
  /**
   * Créer une nouvelle conversation liée à une annonce
   */
  createConversation: (listingId, recipientId, initialMessage) =>
    api.post('/messaging/conversations', {
      listing_id: listingId,
      recipient_id: recipientId,
      initial_message: initialMessage,
    }),

  /**
   * Récupérer la liste des conversations
   */
  getConversations: (archived = false) =>
    api.get('/messaging/conversations', { params: { archived } }),

  /**
   * Récupérer les détails d'une conversation
   */
  getConversation: (conversationId) =>
    api.get(`/messaging/conversations/${conversationId}`),

  /**
   * Récupérer les messages d'une conversation
   */
  getMessages: (conversationId, before = null, limit = 50) =>
    api.get(`/messaging/conversations/${conversationId}/messages`, {
      params: { before, limit },
    }),

  /**
   * Récupérer les messages épinglés
   */
  getPinnedMessages: (conversationId) =>
    api.get(`/messaging/conversations/${conversationId}/pinned`),

  /**
   * Archiver une conversation
   */
  archiveConversation: (conversationId) =>
    api.put(`/messaging/conversations/${conversationId}/archive`),

  // ============= MESSAGES =============

  /**
   * Supprimer un message
   */
  deleteMessage: (messageId) =>
    api.delete(`/messaging/messages/${messageId}`),

  // ============= SIGNALEMENT & BLOCAGE =============

  /**
   * Signaler un message
   */
  reportMessage: (messageId, reason, details = null) =>
    api.post('/messaging/report', {
      message_id: messageId,
      reason,
      details,
    }),

  /**
   * Bloquer un utilisateur
   */
  blockUser: (userId, reason = null) =>
    api.post('/messaging/block', {
      user_id: userId,
      reason,
    }),

  /**
   * Débloquer un utilisateur
   */
  unblockUser: (userId) =>
    api.delete(`/messaging/block/${userId}`),

  /**
   * Récupérer la liste des utilisateurs bloqués
   */
  getBlockedUsers: () =>
    api.get('/messaging/blocked'),

  // ============= UPLOAD =============

  /**
   * Upload une pièce jointe
   */
  uploadAttachment: async (fileUri, fileName, fileType) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    return api.post('/messaging/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // ============= STATISTIQUES =============

  /**
   * Récupérer les statistiques de messagerie
   */
  getStats: () =>
    api.get('/messaging/stats'),
};

// ============= WEBSOCKET CLASS =============

import { CONFIG } from '../config';

export class MessagingWebSocket {
  constructor(token, callbacks = {}) {
    this.token = token;
    this.ws = null;
    this.callbacks = callbacks;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.isConnected = false;
    this.pingInterval = null;
  }

  connect() {
    if (!this.token) {
      console.error('[MessagingWS] No token provided');
      return;
    }

    const wsUrl = CONFIG.API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const fullUrl = `${wsUrl}/messaging/ws?token=${this.token}`;
    
    console.log('[MessagingWS] Connecting...');
    
    this.ws = new WebSocket(fullUrl);

    this.ws.onopen = () => {
      console.log('[MessagingWS] Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Start ping interval to keep connection alive
      this.startPingInterval();
      
      if (this.callbacks.onConnected) {
        this.callbacks.onConnected();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        console.error('[MessagingWS] Parse error:', e);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[MessagingWS] Disconnected:', event.code);
      this.isConnected = false;
      this.stopPingInterval();
      
      if (this.callbacks.onDisconnected) {
        this.callbacks.onDisconnected();
      }
      
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[MessagingWS] Error:', error.message);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'connected':
        console.log('[MessagingWS] Session established, unread:', data.unread_count);
        if (this.callbacks.onSessionStart) {
          this.callbacks.onSessionStart(data);
        }
        break;
        
      case 'new_message':
        console.log('[MessagingWS] New message received');
        if (this.callbacks.onNewMessage) {
          this.callbacks.onNewMessage(data.message);
        }
        break;
        
      case 'typing':
        if (this.callbacks.onTyping) {
          this.callbacks.onTyping(data);
        }
        break;
        
      case 'messages_read':
        if (this.callbacks.onMessagesRead) {
          this.callbacks.onMessagesRead(data);
        }
        break;
        
      case 'new_conversation':
        if (this.callbacks.onNewConversation) {
          this.callbacks.onNewConversation(data.conversation);
        }
        break;
        
      case 'message_sent':
        if (this.callbacks.onMessageSent) {
          this.callbacks.onMessageSent(data);
        }
        break;
        
      case 'message_pinned':
        if (this.callbacks.onMessagePinned) {
          this.callbacks.onMessagePinned(data);
        }
        break;
        
      case 'pong':
        // Keep-alive response
        break;
        
      case 'error':
        console.error('[MessagingWS] Server error:', data.message);
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error(data.message));
        }
        break;
        
      default:
        console.log('[MessagingWS] Unknown message type:', data.type);
    }
  }

  startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000); // Ping every 30 seconds
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[MessagingWS] Reconnecting attempt ${this.reconnectAttempts}...`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.log('[MessagingWS] Max reconnect attempts reached');
      if (this.callbacks.onMaxReconnectReached) {
        this.callbacks.onMaxReconnectReached();
      }
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
        reply_to_id: replyToId,
      }));
      return true;
    }
    return false;
  }

  sendTyping(conversationId, isTyping = true) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        is_typing: isTyping,
      }));
    }
  }

  markAsRead(conversationId, messageIds = []) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'read',
        conversation_id: conversationId,
        message_ids: messageIds,
      }));
    }
  }

  pinMessage(messageId, isPinned = true) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'pin',
        message_id: messageId,
        is_pinned: isPinned,
      }));
    }
  }

  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  disconnect() {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export default messagingApi;
