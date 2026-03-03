/**
 * Messagerie Sécurisée - Page principale
 * Interface de messagerie temps réel entre acheteurs et vendeurs
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { messagingApi, MessagingWebSocket } from '../../services/messagingApi';
import { toast } from 'sonner';
import { 
  MessageSquare, Send, Paperclip, Image, File, Search, 
  MoreVertical, Pin, Trash2, Flag, Ban, Archive, 
  Check, CheckCheck, Clock, ChevronLeft, Phone, 
  Info, X, Smile, Mic, Download, ExternalLink,
  Shield, Lock, AlertTriangle, User, Store
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import Navbar from '../../components/Navbar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function MessagingPage() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // États
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Initialisation WebSocket
  useEffect(() => {
    if (!token) return;
    
    wsRef.current = new MessagingWebSocket(
      // onMessage
      (message) => {
        if (message.type === 'new_conversation') {
          loadConversations();
        } else {
          setMessages(prev => [...prev, message]);
          // Mettre à jour la conversation dans la liste
          setConversations(prev => prev.map(c => 
            c.conversation_id === message.conversation_id 
              ? { ...c, last_message: message.content, last_message_at: message.created_at, unread_count: c.unread_count + 1 }
              : c
          ));
        }
      },
      // onTyping
      (data) => {
        if (data.conversation_id === activeConversation?.conversation_id) {
          setTypingUser(data.is_typing ? data.user_name : null);
        }
      },
      // onRead
      (data) => {
        if (data.conversation_id === activeConversation?.conversation_id) {
          setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
        }
      },
      // onError
      (error) => {
        console.error('WebSocket error:', error);
      }
    );
    
    wsRef.current.connect();
    
    return () => {
      if (wsRef.current) wsRef.current.disconnect();
    };
  }, [token]);
  
  // Charger les conversations
  const loadConversations = useCallback(async () => {
    try {
      const data = await messagingApi.getConversations(showArchived);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);
  
  useEffect(() => {
    if (token) loadConversations();
  }, [token, loadConversations]);
  
  // Charger une conversation
  const loadConversation = useCallback(async (convId) => {
    setLoadingMessages(true);
    try {
      const [convData, msgData, pinnedData] = await Promise.all([
        messagingApi.getConversation(convId),
        messagingApi.getMessages(convId),
        messagingApi.getPinnedMessages(convId)
      ]);
      setActiveConversation(convData);
      setMessages(msgData.messages);
      setPinnedMessages(pinnedData);
      
      // Marquer comme lu via WebSocket
      if (wsRef.current) {
        wsRef.current.markAsRead(convId);
      }
      
      // Mettre à jour le compteur non lu
      setConversations(prev => prev.map(c => 
        c.conversation_id === convId ? { ...c, unread_count: 0 } : c
      ));
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Erreur lors du chargement de la conversation');
    } finally {
      setLoadingMessages(false);
    }
  }, []);
  
  // Effet pour charger la conversation active
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
      setMobileShowChat(true);
    }
  }, [conversationId, loadConversation]);
  
  // Créer une nouvelle conversation (depuis le marketplace)
  useEffect(() => {
    const listingId = searchParams.get('listing');
    const sellerId = searchParams.get('seller');
    
    if (listingId && sellerId && !conversationId) {
      // Créer ou ouvrir la conversation
      const initConversation = async () => {
        try {
          const result = await messagingApi.createConversation(
            listingId, 
            sellerId, 
            "Bonjour, je suis intéressé par votre annonce."
          );
          navigate(`/messages/${result.conversation_id}`, { replace: true });
        } catch (error) {
          console.error('Error creating conversation:', error);
          toast.error('Erreur lors de la création de la conversation');
        }
      };
      initConversation();
    }
  }, [searchParams, conversationId, navigate]);
  
  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Envoyer un message
  const sendMessage = async () => {
    if (!messageText.trim() || !activeConversation) return;
    
    const content = messageText.trim();
    setMessageText('');
    setReplyTo(null);
    
    // Envoyer via WebSocket
    if (wsRef.current) {
      wsRef.current.sendMessage(
        activeConversation.conversation_id,
        content,
        'text',
        null,
        replyTo?.message_id
      );
    }
    
    // Ajouter optimistiquement
    const optimisticMessage = {
      message_id: `temp-${Date.now()}`,
      sender_id: user?._id,
      sender_name: user?.full_name,
      content,
      message_type: 'text',
      is_read: false,
      is_mine: true,
      created_at: new Date().toISOString(),
      reply_to_id: replyTo?.message_id
    };
    setMessages(prev => [...prev, optimisticMessage]);
  };
  
  // Gérer la frappe
  const handleTyping = () => {
    if (!wsRef.current || !activeConversation) return;
    
    wsRef.current.sendTyping(activeConversation.conversation_id, true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      wsRef.current.sendTyping(activeConversation.conversation_id, false);
    }, 2000);
  };
  
  // Upload fichier
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeConversation) return;
    
    setUploadingFile(true);
    try {
      const attachment = await messagingApi.uploadAttachment(file);
      
      if (wsRef.current) {
        wsRef.current.sendMessage(
          activeConversation.conversation_id,
          file.name,
          attachment.type,
          attachment
        );
      }
      
      toast.success('Fichier envoyé');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du fichier');
    } finally {
      setUploadingFile(false);
    }
  };
  
  // Épingler un message
  const handlePinMessage = async (message) => {
    if (wsRef.current) {
      wsRef.current.pinMessage(message.message_id, !message.is_pinned);
      setMessages(prev => prev.map(m => 
        m.message_id === message.message_id ? { ...m, is_pinned: !m.is_pinned } : m
      ));
      toast.success(message.is_pinned ? 'Message désépinglé' : 'Message épinglé');
    }
  };
  
  // Supprimer un message
  const handleDeleteMessage = async (messageId) => {
    try {
      await messagingApi.deleteMessage(messageId);
      setMessages(prev => prev.map(m => 
        m.message_id === messageId ? { ...m, content: '[Message supprimé]', is_deleted: true } : m
      ));
      toast.success('Message supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };
  
  // Signaler un message
  const handleReportMessage = async () => {
    if (!selectedMessage || !reportReason) return;
    
    try {
      await messagingApi.reportMessage(selectedMessage.message_id, reportReason);
      toast.success('Signalement envoyé');
      setShowReportDialog(false);
      setReportReason('');
      setSelectedMessage(null);
    } catch (error) {
      toast.error('Erreur lors du signalement');
    }
  };
  
  // Bloquer un utilisateur
  const handleBlockUser = async () => {
    if (!activeConversation) return;
    
    try {
      await messagingApi.blockUser(activeConversation.other_user.id);
      toast.success('Utilisateur bloqué');
      setShowBlockDialog(false);
      loadConversations();
    } catch (error) {
      toast.error('Erreur lors du blocage');
    }
  };
  
  // Archiver conversation
  const handleArchiveConversation = async () => {
    if (!activeConversation) return;
    
    try {
      await messagingApi.archiveConversation(activeConversation.conversation_id);
      toast.success('Conversation archivée');
      setActiveConversation(null);
      navigate('/messages');
      loadConversations();
    } catch (error) {
      toast.error('Erreur lors de l\'archivage');
    }
  };
  
  // Filtrer les conversations
  const filteredConversations = conversations.filter(c => 
    c.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.listing_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Formater la date
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };
  
  // Obtenir les initiales
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center text-white">
            <Lock className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
            <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
            <p className="text-slate-400 mb-4">Connectez-vous pour accéder à la messagerie</p>
            <Button onClick={() => navigate('/login')} className="bg-emerald-600 hover:bg-emerald-700">
              Se connecter
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Messagerie</h1>
              <p className="text-slate-400 text-sm">Conversations sécurisées</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
              <Shield className="w-3 h-3 mr-1" />
              Chiffré
            </Badge>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden h-[calc(100vh-200px)]">
          <div className="flex h-full">
            {/* Liste des conversations */}
            <div className={`w-full md:w-96 border-r border-slate-700/50 flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
              {/* Recherche */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher une conversation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant={!showArchived ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowArchived(false)}
                    className={!showArchived ? "bg-emerald-600" : "text-slate-400 border-slate-600"}
                  >
                    Actives
                  </Button>
                  <Button
                    variant={showArchived ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowArchived(true)}
                    className={showArchived ? "bg-emerald-600" : "text-slate-400 border-slate-600"}
                  >
                    <Archive className="w-4 h-4 mr-1" />
                    Archivées
                  </Button>
                </div>
              </div>
              
              {/* Liste */}
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="w-12 h-12 rounded-full bg-slate-700" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4 bg-slate-700" />
                          <Skeleton className="h-3 w-1/2 bg-slate-700" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-400">Aucune conversation</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Contactez un vendeur depuis le marketplace
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.conversation_id}
                        data-testid={`conversation-${conv.conversation_id}`}
                        onClick={() => {
                          navigate(`/messages/${conv.conversation_id}`);
                          setMobileShowChat(true);
                        }}
                        className={`p-4 cursor-pointer transition-colors hover:bg-slate-700/30 ${
                          conversationId === conv.conversation_id ? 'bg-slate-700/50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={conv.other_user?.avatar} />
                              <AvatarFallback className="bg-emerald-600 text-white">
                                {getInitials(conv.other_user?.name)}
                              </AvatarFallback>
                            </Avatar>
                            {conv.other_user?.is_online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-white truncate">
                                {conv.other_user?.name}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatTime(conv.last_message_at)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400 truncate">
                              {conv.listing_title}
                            </p>
                            <p className="text-sm text-slate-500 truncate">
                              {conv.last_message}
                            </p>
                          </div>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-emerald-600 text-white h-5 min-w-[20px] flex items-center justify-center">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Zone de chat */}
            <div className={`flex-1 flex flex-col ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
              {!activeConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-10 h-10 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">Messagerie GreenLink</h3>
                    <p className="text-slate-400 max-w-sm">
                      Sélectionnez une conversation ou contactez un vendeur depuis le marketplace des récoltes
                    </p>
                    <Button 
                      onClick={() => navigate('/marketplace/harvest')}
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Store className="w-4 h-4 mr-2" />
                      Voir le Marketplace
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header du chat */}
                  <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="md:hidden text-slate-400"
                        onClick={() => setMobileShowChat(false)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={activeConversation.other_user?.avatar} />
                        <AvatarFallback className="bg-emerald-600 text-white">
                          {getInitials(activeConversation.other_user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-white">
                          {activeConversation.other_user?.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {activeConversation.other_user?.is_online ? (
                            <span className="text-emerald-400">En ligne</span>
                          ) : (
                            'Hors ligne'
                          )}
                          {typingUser && (
                            <span className="text-emerald-400 ml-2">écrit...</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeConversation.listing && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-slate-400 border-slate-600 hidden sm:flex"
                          onClick={() => navigate(`/marketplace/harvest?id=${activeConversation.listing.listing_id}`)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Voir l'annonce
                        </Button>
                      )}
                      
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400">
                            <Pin className="w-5 h-5" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="bg-slate-800 border-slate-700">
                          <SheetHeader>
                            <SheetTitle className="text-white">Messages épinglés</SheetTitle>
                            <SheetDescription className="text-slate-400">
                              {pinnedMessages.length} message(s) épinglé(s)
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-4 space-y-3">
                            {pinnedMessages.map(msg => (
                              <div key={msg.message_id} className="p-3 bg-slate-700/50 rounded-lg">
                                <p className="text-sm text-slate-300">{msg.content}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {msg.sender_name} • {formatTime(msg.created_at)}
                                </p>
                              </div>
                            ))}
                            {pinnedMessages.length === 0 && (
                              <p className="text-slate-500 text-center py-4">
                                Aucun message épinglé
                              </p>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem 
                            className="text-slate-300 focus:bg-slate-700"
                            onClick={handleArchiveConversation}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem 
                            className="text-red-400 focus:bg-slate-700"
                            onClick={() => setShowBlockDialog(true)}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Bloquer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Annonce liée */}
                  {activeConversation.listing && (
                    <div className="px-4 py-2 bg-slate-700/30 border-b border-slate-700/50">
                      <div className="flex items-center gap-3">
                        {activeConversation.listing.photos?.[0] && (
                          <img 
                            src={activeConversation.listing.photos[0]} 
                            alt="" 
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {activeConversation.listing.crop_type} - {activeConversation.listing.grade}
                          </p>
                          <p className="text-xs text-slate-400">
                            {activeConversation.listing.quantity_kg?.toLocaleString()} kg • {activeConversation.listing.price_per_kg?.toLocaleString()} FCFA/kg
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                            <Skeleton className="h-16 w-64 rounded-2xl bg-slate-700" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Message de sécurité */}
                        <div className="flex justify-center mb-6">
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-emerald-400">
                              Messages chiffrés de bout en bout
                            </span>
                          </div>
                        </div>
                        
                        {messages.map((msg, index) => (
                          <div
                            key={msg.message_id}
                            data-testid={`message-${msg.message_id}`}
                            className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`group max-w-[70%] ${msg.is_mine ? 'items-end' : 'items-start'}`}>
                              {/* Réponse à */}
                              {msg.reply_to_id && (
                                <div className="text-xs text-slate-500 mb-1 pl-3 border-l-2 border-slate-600">
                                  En réponse à un message
                                </div>
                              )}
                              
                              <div className="flex items-end gap-2">
                                {!msg.is_mine && (
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-slate-600 text-white text-xs">
                                      {getInitials(msg.sender_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                
                                <div className={`relative rounded-2xl px-4 py-2 ${
                                  msg.is_mine 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-slate-700 text-slate-100'
                                }`}>
                                  {/* Contenu du message */}
                                  {msg.message_type === 'image' && msg.attachment_url && (
                                    <img 
                                      src={`${BACKEND_URL}${msg.attachment_url}`}
                                      alt={msg.attachment_name}
                                      className="max-w-full rounded-lg mb-2"
                                    />
                                  )}
                                  {msg.message_type === 'document' && msg.attachment_url && (
                                    <a 
                                      href={`${BACKEND_URL}${msg.attachment_url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2 bg-slate-600/50 rounded-lg mb-2"
                                    >
                                      <File className="w-5 h-5" />
                                      <span className="text-sm">{msg.attachment_name}</span>
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                  
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  
                                  {/* Épingle */}
                                  {msg.is_pinned && (
                                    <Pin className="absolute -top-2 -right-2 w-4 h-4 text-yellow-400" />
                                  )}
                                </div>
                                
                                {/* Menu contextuel */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="opacity-0 group-hover:opacity-100 h-8 w-8 text-slate-400"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                    <DropdownMenuItem 
                                      className="text-slate-300 focus:bg-slate-700"
                                      onClick={() => setReplyTo(msg)}
                                    >
                                      Répondre
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-slate-300 focus:bg-slate-700"
                                      onClick={() => handlePinMessage(msg)}
                                    >
                                      <Pin className="w-4 h-4 mr-2" />
                                      {msg.is_pinned ? 'Désépingler' : 'Épingler'}
                                    </DropdownMenuItem>
                                    {msg.is_mine && (
                                      <DropdownMenuItem 
                                        className="text-red-400 focus:bg-slate-700"
                                        onClick={() => handleDeleteMessage(msg.message_id)}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    )}
                                    {!msg.is_mine && (
                                      <DropdownMenuItem 
                                        className="text-orange-400 focus:bg-slate-700"
                                        onClick={() => {
                                          setSelectedMessage(msg);
                                          setShowReportDialog(true);
                                        }}
                                      >
                                        <Flag className="w-4 h-4 mr-2" />
                                        Signaler
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              
                              {/* Heure et statut */}
                              <div className={`flex items-center gap-1 mt-1 text-xs text-slate-500 ${msg.is_mine ? 'justify-end' : ''}`}>
                                <span>{formatTime(msg.created_at)}</span>
                                {msg.is_mine && (
                                  msg.is_read ? (
                                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Indicateur de frappe */}
                        {typingUser && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-sm">{typingUser} écrit...</span>
                          </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Réponse en cours */}
                  {replyTo && (
                    <div className="px-4 py-2 bg-slate-700/50 border-t border-slate-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-8 bg-emerald-500 rounded-full" />
                        <div>
                          <p className="text-xs text-emerald-400">Répondre à {replyTo.sender_name}</p>
                          <p className="text-sm text-slate-400 truncate max-w-[200px]">{replyTo.content}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}>
                        <X className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Zone de saisie */}
                  <div className="p-4 border-t border-slate-700/50">
                    <div className="flex items-end gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-emerald-400"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                      >
                        <Paperclip className="w-5 h-5" />
                      </Button>
                      
                      <div className="flex-1 relative">
                        <Textarea
                          data-testid="message-input"
                          placeholder="Écrivez votre message..."
                          value={messageText}
                          onChange={(e) => {
                            setMessageText(e.target.value);
                            handleTyping();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          className="min-h-[44px] max-h-32 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 resize-none pr-12"
                          rows={1}
                        />
                      </div>
                      
                      <Button
                        data-testid="send-message-btn"
                        onClick={sendMessage}
                        disabled={!messageText.trim()}
                        className="bg-emerald-600 hover:bg-emerald-700 h-11 w-11"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog de signalement */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Signaler ce message</DialogTitle>
            <DialogDescription className="text-slate-400">
              Indiquez la raison du signalement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { id: 'spam', label: 'Spam', icon: '🚫' },
              { id: 'harassment', label: 'Harcèlement', icon: '😤' },
              { id: 'fraud', label: 'Fraude / Arnaque', icon: '⚠️' },
              { id: 'other', label: 'Autre', icon: '📋' }
            ].map((reason) => (
              <Button
                key={reason.id}
                variant={reportReason === reason.id ? "default" : "outline"}
                className={`w-full justify-start ${reportReason === reason.id ? 'bg-emerald-600' : 'border-slate-600 text-slate-300'}`}
                onClick={() => setReportReason(reason.id)}
              >
                <span className="mr-2">{reason.icon}</span>
                {reason.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)} className="border-slate-600 text-slate-300">
              Annuler
            </Button>
            <Button 
              onClick={handleReportMessage}
              disabled={!reportReason}
              className="bg-red-600 hover:bg-red-700"
            >
              <Flag className="w-4 h-4 mr-2" />
              Signaler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de blocage */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Bloquer cet utilisateur ?
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Vous ne pourrez plus recevoir de messages de {activeConversation?.other_user?.name}. 
              Cette action peut être annulée depuis vos paramètres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)} className="border-slate-600 text-slate-300">
              Annuler
            </Button>
            <Button 
              onClick={handleBlockUser}
              className="bg-red-600 hover:bg-red-700"
            >
              <Ban className="w-4 h-4 mr-2" />
              Bloquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
