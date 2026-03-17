/**
 * ChatScreen - Conversation individuelle
 * Chat temps réel avec pièces jointes, accusés de lecture, etc.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { messagingApi, MessagingWebSocket } from '../../services/messaging';
import { CONFIG, COLORS } from '../../config';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId } = route.params;
  const { user, token } = useAuth();
  
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  
  const flatListRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize WebSocket
  useEffect(() => {
    if (!token) return;

    wsRef.current = new MessagingWebSocket(token, {
      onConnected: () => setIsConnected(true),
      onDisconnected: () => setIsConnected(false),
      onNewMessage: (message) => {
        if (message.conversation_id === conversationId) {
          setMessages(prev => [...prev, message]);
          // Mark as read
          wsRef.current?.markAsRead(conversationId);
        }
      },
      onTyping: (data) => {
        if (data.conversation_id === conversationId) {
          setTypingUser(data.is_typing ? data.user_name : null);
        }
      },
      onMessagesRead: (data) => {
        if (data.conversation_id === conversationId) {
          setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
        }
      },
      onMessageSent: (data) => {
        console.log('Message sent:', data.message_id);
      },
    });

    wsRef.current.connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, [token, conversationId]);

  // Load conversation and messages
  const loadConversation = useCallback(async () => {
    try {
      const [convResponse, msgResponse] = await Promise.all([
        messagingApi.getConversation(conversationId),
        messagingApi.getMessages(conversationId),
      ]);
      
      setConversation(convResponse.data);
      setMessages(msgResponse.data.messages);
      
      // Mark as read via WebSocket
      if (wsRef.current?.isConnected) {
        wsRef.current.markAsRead(conversationId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert('Erreur', 'Impossible de charger la conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Scroll to bottom when new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    // Send via WebSocket
    if (wsRef.current?.isConnected) {
      const sent = wsRef.current.sendMessage(
        conversationId,
        content,
        'text',
        null,
        replyTo?.message_id
      );

      if (sent) {
        // Add optimistic message
        const optimisticMessage = {
          message_id: `temp-${Date.now()}`,
          sender_id: user?._id,
          sender_name: user?.full_name,
          content,
          message_type: 'text',
          is_read: false,
          is_mine: true,
          created_at: new Date().toISOString(),
          reply_to_id: replyTo?.message_id,
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setReplyTo(null);
      }
    } else {
      Alert.alert('Erreur', 'Connexion perdue. Veuillez réessayer.');
    }

    setSending(false);
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!wsRef.current?.isConnected) return;

    wsRef.current.sendTyping(conversationId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      wsRef.current?.sendTyping(conversationId, false);
    }, 2000);
  };

  // Pick image - utilise le System Photo Picker Android (pas de permission READ_MEDIA requise)
  const pickImage = async () => {
    try {
      // launchImageLibraryAsync utilise le photo picker système 
      // qui ne nécessite aucune permission READ_MEDIA_IMAGES/VIDEO
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndSendFile(result.assets[0].uri, 'photo.jpg', 'image/jpeg');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  // Take photo with camera (nécessite CAMERA permission uniquement)
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Accès à la caméra nécessaire');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndSendFile(result.assets[0].uri, 'photo.jpg', 'image/jpeg');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  // Pick document
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadAndSendFile(asset.uri, asset.name, asset.mimeType);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  };

  // Upload and send file
  const uploadAndSendFile = async (uri, name, type) => {
    try {
      setSending(true);
      const response = await messagingApi.uploadAttachment(uri, name, type);
      const attachment = response.data;

      if (wsRef.current?.isConnected) {
        wsRef.current.sendMessage(
          conversationId,
          name,
          attachment.type,
          attachment
        );
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le fichier');
    } finally {
      setSending(false);
      setShowOptions(false);
    }
  };

  // Pin/Unpin message
  const handlePinMessage = (message) => {
    if (wsRef.current?.isConnected) {
      wsRef.current.pinMessage(message.message_id, !message.is_pinned);
      setMessages(prev => prev.map(m =>
        m.message_id === message.message_id ? { ...m, is_pinned: !m.is_pinned } : m
      ));
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      'Supprimer le message',
      'Voulez-vous vraiment supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagingApi.deleteMessage(messageId);
              setMessages(prev => prev.map(m =>
                m.message_id === messageId ? { ...m, content: '[Message supprimé]', is_deleted: true } : m
              ));
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le message');
            }
          },
        },
      ]
    );
  };

  // Report message
  const handleReportMessage = (message) => {
    Alert.alert(
      'Signaler le message',
      'Pourquoi signalez-vous ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Spam', onPress: () => submitReport(message.message_id, 'spam') },
        { text: 'Harcèlement', onPress: () => submitReport(message.message_id, 'harassment') },
        { text: 'Fraude', onPress: () => submitReport(message.message_id, 'fraud') },
      ]
    );
  };

  const submitReport = async (messageId, reason) => {
    try {
      await messagingApi.reportMessage(messageId, reason);
      Alert.alert('Signalement envoyé', 'Merci pour votre signalement');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le signalement');
    }
  };

  // Block user
  const handleBlockUser = () => {
    Alert.alert(
      'Bloquer l\'utilisateur',
      `Voulez-vous bloquer ${conversation?.other_user?.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagingApi.blockUser(conversation.other_user.id);
              Alert.alert('Utilisateur bloqué', 'Vous ne recevrez plus de messages de cet utilisateur');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de bloquer l\'utilisateur');
            }
          },
        },
      ]
    );
  };

  // Archive conversation
  const handleArchiveConversation = async () => {
    try {
      await messagingApi.archiveConversation(conversationId);
      Alert.alert('Conversation archivée');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'archiver la conversation');
    }
  };

  // Format time
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Get initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Render message
  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.is_mine;
    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.is_mine);

    return (
      <TouchableOpacity
        style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}
        onLongPress={() => {
          Alert.alert(
            'Options',
            '',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Répondre', onPress: () => setReplyTo(item) },
              { text: item.is_pinned ? 'Désépingler' : 'Épingler', onPress: () => handlePinMessage(item) },
              ...(isMyMessage ? [{ text: 'Supprimer', style: 'destructive', onPress: () => handleDeleteMessage(item.message_id) }] : []),
              ...(!isMyMessage ? [{ text: 'Signaler', onPress: () => handleReportMessage(item) }] : []),
            ]
          );
        }}
        activeOpacity={0.8}
      >
        {showAvatar && (
          <View style={[styles.messageAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{getInitials(item.sender_name)}</Text>
          </View>
        )}
        {!showAvatar && !isMyMessage && <View style={styles.avatarSpacer} />}

        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
          {item.is_pinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={12} color={COLORS.warning} />
            </View>
          )}

          {item.reply_to_id && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyText}>↩ En réponse...</Text>
            </View>
          )}

          {item.message_type === 'image' && item.attachment_url && (
            <TouchableOpacity onPress={() => Linking.openURL(`${CONFIG.API_URL}${item.attachment_url}`)}>
              <Image
                source={{ uri: `${CONFIG.API_URL}${item.attachment_url}` }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {item.message_type === 'document' && item.attachment_url && (
            <TouchableOpacity
              style={styles.documentAttachment}
              onPress={() => Linking.openURL(`${CONFIG.API_URL}${item.attachment_url}`)}
            >
              <Ionicons name="document" size={24} color={isMyMessage ? COLORS.white : COLORS.primary} />
              <Text style={[styles.documentName, isMyMessage && styles.myDocumentName]}>
                {item.attachment_name || 'Document'}
              </Text>
              <Ionicons name="download-outline" size={20} color={isMyMessage ? COLORS.white : COLORS.primary} />
            </TouchableOpacity>
          )}

          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.content}
          </Text>

          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
              {formatTime(item.created_at)}
            </Text>
            {isMyMessage && (
              <Ionicons
                name={item.is_read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.is_read ? '#10B981' : 'rgba(255,255,255,0.6)'}
                style={styles.readIcon}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={() => {/* Show user profile */}}>
          <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{getInitials(conversation?.other_user?.name)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversation?.other_user?.name}
            </Text>
            <Text style={styles.headerStatus}>
              {isConnected ? (
                conversation?.other_user?.is_online ? (
                  <Text style={styles.onlineText}>En ligne</Text>
                ) : 'Hors ligne'
              ) : 'Connexion...'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            Alert.alert(
              'Options',
              '',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Archiver', onPress: handleArchiveConversation },
                { text: 'Bloquer', style: 'destructive', onPress: handleBlockUser },
              ]
            );
          }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Listing Info */}
      {conversation?.listing && (
        <TouchableOpacity style={styles.listingBanner}>
          <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
          <Text style={styles.listingText} numberOfLines={1}>
            {conversation.listing.crop_type} - {conversation.listing.quantity_kg?.toLocaleString()} kg
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Security Banner */}
      <View style={styles.securityBanner}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
        <Text style={styles.securityBannerText}>Messages chiffrés de bout en bout</Text>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Typing Indicator */}
        {typingUser && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
            <Text style={styles.typingText}>{typingUser} écrit...</Text>
          </View>
        )}

        {/* Reply Preview */}
        {replyTo && (
          <View style={styles.replyBar}>
            <View style={styles.replyContent}>
              <Text style={styles.replyLabel}>Répondre à {replyTo.sender_name}</Text>
              <Text style={styles.replyMessage} numberOfLines={1}>{replyTo.content}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowOptions(!showOptions)}
          >
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Écrivez votre message..."
            placeholderTextColor={COLORS.textSecondary}
            value={messageText}
            onChangeText={(text) => {
              setMessageText(text);
              handleTyping();
            }}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* Attachment Options */}
        {showOptions && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color={COLORS.primary} />
              <Text style={styles.optionText}>Caméra</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
              <Ionicons name="image" size={24} color={COLORS.primary} />
              <Text style={styles.optionText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={pickDocument}>
              <Ionicons name="document" size={24} color={COLORS.primary} />
              <Text style={styles.optionText}>Document</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primaryDark || '#0D9466',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  onlineText: {
    color: '#10B981',
  },
  menuButton: {
    padding: 8,
  },
  listingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listingText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  securityBannerText: {
    marginLeft: 6,
    fontSize: 12,
    color: COLORS.primary,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarSpacer: {
    width: 40,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    position: 'relative',
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  pinnedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
  },
  replyPreview: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.3)',
    paddingLeft: 8,
    marginBottom: 8,
  },
  replyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentName: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  myDocumentName: {
    color: COLORS.white,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  myMessageText: {
    color: COLORS.white,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  readIcon: {
    marginLeft: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  typingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyContent: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: 12,
  },
  replyLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  replyMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachButton: {
    padding: 4,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  optionButton: {
    alignItems: 'center',
    padding: 12,
  },
  optionText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.text,
  },
});

export default ChatScreen;
