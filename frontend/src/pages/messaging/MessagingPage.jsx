import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { messagingApi, MessagingWebSocket } from '../../services/messagingApi';
import { pushService } from '../../services/pushService';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Paperclip, Search, MoreVertical, Pin,
  Trash2, Flag, Ban, Archive, Check, CheckCheck, ChevronLeft,
  X, File, Download, Users, Plus, Building2, UserCircle, Sprout, Shield, Bell, BellOff
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import Navbar from '../../components/Navbar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/* ── role helpers ── */
const ROLE_CONFIG = {
  admin: { label: 'Admin', color: 'bg-red-500/20 text-red-300', icon: Shield },
  cooperative: { label: 'Coopérative', color: 'bg-emerald-500/20 text-emerald-300', icon: Building2 },
  field_agent: { label: 'Agent', color: 'bg-blue-500/20 text-blue-300', icon: Users },
  producteur: { label: 'Agriculteur', color: 'bg-amber-500/20 text-amber-300', icon: Sprout },
  acheteur: { label: 'Acheteur', color: 'bg-purple-500/20 text-purple-300', icon: UserCircle },
  buyer: { label: 'Acheteur', color: 'bg-purple-500/20 text-purple-300', icon: UserCircle },
  fournisseur: { label: 'Fournisseur', color: 'bg-cyan-500/20 text-cyan-300', icon: UserCircle },
  carbon_auditor: { label: 'Auditeur', color: 'bg-orange-500/20 text-orange-300', icon: UserCircle },
};

const getRoleBadge = (type) => ROLE_CONFIG[type] || { label: type || '', color: 'bg-slate-500/20 text-slate-300', icon: UserCircle };
const getInitials = (n) => (n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?');

const formatTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const diff = Date.now() - date;
  if (diff < 60000) return "A l'instant";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

/* ══════════ NewConversationDialog ══════════ */
function NewConversationDialog({ open, onClose, onCreated }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const debounceRef = useRef(null);

  const loadContacts = useCallback(async (q) => {
    setLoading(true);
    try {
      const data = await messagingApi.getContacts(q || null);
      setContacts(data);
    } catch (e) { console.warn('[Messaging] Load error:', e?.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) { loadContacts(); setSelected(null); setMessage(''); setSearch(''); } }, [open, loadContacts]);

  const handleSearch = (v) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadContacts(v), 300);
  };

  const handleSend = async () => {
    if (!selected || !message.trim()) return;
    setSending(true);
    try {
      if (selected.existing_conversation) {
        onCreated(selected.existing_conversation);
      } else {
        const res = await messagingApi.createDirectConversation(selected.id, message.trim());
        onCreated(res.conversation_id);
      }
      onClose();
    } catch (err) {
      toast.error("Erreur lors de la creation de la conversation");
    } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a3a30] border-[#2d5a4d] max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#d4a574]" />
            Nouvelle conversation
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Choisissez un contact et envoyez votre premier message
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                data-testid="contact-search"
                placeholder="Rechercher par nom, email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-[#2d5a4d]/60 border-[#2d5a4d] text-white placeholder:text-white/40"
              />
            </div>
            <ScrollArea className="flex-1 max-h-[45vh] -mx-1">
              {loading ? (
                <div className="space-y-3 p-2">{[1,2,3].map(i => <Skeleton key={`el-${i}`} className="h-14 bg-[#2d5a4d]/40 rounded-lg" />)}</div>
              ) : contacts.length === 0 ? (
                <p className="text-white/50 text-center py-8 text-sm">Aucun contact trouvé</p>
              ) : (
                <div className="space-y-1 p-1">
                  {contacts.map(c => {
                    const role = getRoleBadge(c.user_type);
                    return (
                      <button
                        key={c.id}
                        data-testid={`contact-${c.id}`}
                        onClick={() => setSelected(c)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#2d5a4d]/50 transition-colors text-left"
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={c.avatar} />
                          <AvatarFallback className="bg-[#d4a574]/30 text-[#d4a574] text-sm font-semibold">
                            {getInitials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate text-sm">{c.name}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${role.color}`}>{c.user_type_label}</span>
                        </div>
                        {c.existing_conversation && (
                          <Badge variant="outline" className="border-[#d4a574]/40 text-[#d4a574] text-xs shrink-0">Existant</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-[#2d5a4d]/40 rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-[#d4a574]/30 text-[#d4a574] text-sm font-semibold">
                  {getInitials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{selected.name}</p>
                <p className="text-white/50 text-xs">{selected.user_type_label}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="text-white/50 hover:text-white h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {!selected.existing_conversation && (
              <textarea
                data-testid="new-conv-message"
                placeholder="Ecrivez votre message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-[#2d5a4d]/60 border border-[#2d5a4d] rounded-lg p-3 text-white placeholder:text-white/40 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#d4a574]"
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} className="border-[#2d5a4d] text-white/70 hover:bg-[#2d5a4d]/50">Annuler</Button>
              <Button
                data-testid="send-new-conv-btn"
                onClick={handleSend}
                disabled={sending || (!selected.existing_conversation && !message.trim())}
                className="bg-[#d4a574] hover:bg-[#c49564] text-[#1a3a30] font-semibold"
              >
                <Send className="w-4 h-4 mr-2" />
                {selected.existing_conversation ? 'Ouvrir' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ══════════ Main Page ══════════ */
export default function MessagingPage() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [pushState, setPushState] = useState('loading'); // loading, prompt, granted, denied, unsupported

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  /* ── Push notifications init ── */
  useEffect(() => {
    if (!token) return;
    if (!pushService.isSupported()) { setPushState('unsupported'); return; }
    const perm = pushService.getPermissionState();
    if (perm === 'granted') {
      pushService.init().then(() => setPushState('granted'));
    } else if (perm === 'denied') {
      setPushState('denied');
    } else {
      setPushState('prompt');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleEnablePush = async () => {
    const ok = await pushService.requestPermission();
    setPushState(ok ? 'granted' : 'denied');
    if (ok) toast.success('Notifications activees');
  };

  /* ── WebSocket ── */
  useEffect(() => {
    if (!token) return;
    wsRef.current = new MessagingWebSocket(
      (msg) => {
        if (msg.type === 'new_conversation') { loadConversations(); }
        else {
          setMessages(prev => [...prev, msg]);
          setConversations(prev => prev.map(c =>
            c.conversation_id === msg.conversation_id
              ? { ...c, last_message: msg.content, last_message_at: msg.created_at, unread_count: c.unread_count + 1 }
              : c
          ));
        }
      },
      (data) => { if (data.conversation_id === activeConversation?.conversation_id) setTypingUser(data.is_typing ? data.user_name : null); },
      (data) => { if (data.conversation_id === activeConversation?.conversation_id) setMessages(prev => prev.map(m => ({ ...m, is_read: true }))); },
      () => {}
    );
    wsRef.current.connect();
    return () => { if (wsRef.current) wsRef.current.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Load conversations ── */
  const loadConversations = useCallback(async () => {
    try {
      const data = await messagingApi.getConversations(showArchived);
      setConversations(data);
    } catch (e) { console.warn('[Messaging] Load error:', e?.message); } finally { setLoading(false); }
  }, [showArchived]);

  useEffect(() => { if (token) loadConversations(); }, [token, loadConversations]);

  /* ── Auto-refresh conversations every 30s ── */
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loadConversations]);

  /* ── Load single conversation ── */
  const loadConversation = useCallback(async (convId) => {
    setLoadingMessages(true);
    try {
      const [convData, msgData] = await Promise.all([
        messagingApi.getConversation(convId),
        messagingApi.getMessages(convId)
      ]);
      setActiveConversation(convData);
      setMessages(msgData.messages);
      if (wsRef.current) wsRef.current.markAsRead(convId);
      setConversations(prev => prev.map(c => c.conversation_id === convId ? { ...c, unread_count: 0 } : c));
    } catch {
      toast.error('Erreur lors du chargement');
    } finally { setLoadingMessages(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (token && conversationId) { loadConversation(conversationId); setMobileShowChat(true); } }, [token, conversationId, loadConversation]);

  /* ── Deep-link from marketplace ── */
  useEffect(() => {
    if (!token) return;
    const listingId = searchParams.get('listing');
    const sellerId = searchParams.get('seller');
    if (listingId && sellerId && !conversationId) {
      (async () => {
        try {
          const res = await messagingApi.createConversation(listingId, sellerId, "Bonjour, je suis interesse par votre annonce.");
          navigate(`/messages/${res.conversation_id}`, { replace: true });
        } catch { toast.error("Erreur lors de la creation"); }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, conversationId, navigate]);

  /* ── Scroll to bottom ── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ── Send message ── */
  const sendMessage = () => {
    if (!messageText.trim() || !activeConversation) return;
    const content = messageText.trim();
    setMessageText('');
    setReplyTo(null);
    if (wsRef.current) wsRef.current.sendMessage(activeConversation.conversation_id, content, 'text', null, replyTo?.message_id);
    setMessages(prev => [...prev, {
      message_id: `temp-${Date.now()}`, sender_id: user?._id, sender_name: user?.full_name,
      content, message_type: 'text', is_read: false, is_mine: true, created_at: new Date().toISOString(), reply_to_id: replyTo?.message_id
    }]);
  };

  /* ── Typing indicator ── */
  const handleTyping = () => {
    if (!wsRef.current || !activeConversation) return;
    wsRef.current.sendTyping(activeConversation.conversation_id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => wsRef.current.sendTyping(activeConversation.conversation_id, false), 2000);
  };

  /* ── File upload ── */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;
    setUploadingFile(true);
    try {
      const att = await messagingApi.uploadAttachment(file);
      if (wsRef.current) wsRef.current.sendMessage(activeConversation.conversation_id, file.name, att.type, att);
      toast.success('Fichier envoye');
    } catch { toast.error("Erreur lors de l'envoi"); }
    finally { setUploadingFile(false); }
  };

  const handlePinMessage = (msg) => {
    if (!wsRef.current) return;
    wsRef.current.pinMessage(msg.message_id, !msg.is_pinned);
    setMessages(prev => prev.map(m => m.message_id === msg.message_id ? { ...m, is_pinned: !m.is_pinned } : m));
    toast.success(msg.is_pinned ? 'Message desepingle' : 'Message epingle');
  };

  const handleDeleteMessage = async (id) => {
    try {
      await messagingApi.deleteMessage(id);
      setMessages(prev => prev.map(m => m.message_id === id ? { ...m, content: '[Message supprime]', is_deleted: true } : m));
    } catch { toast.error('Erreur'); }
  };

  const handleReportMessage = async () => {
    if (!selectedMessage || !reportReason) return;
    try {
      await messagingApi.reportMessage(selectedMessage.message_id, reportReason);
      toast.success('Signalement envoye');
      setShowReportDialog(false); setReportReason(''); setSelectedMessage(null);
    } catch { toast.error('Erreur'); }
  };

  const handleBlockUser = async () => {
    if (!activeConversation) return;
    try {
      await messagingApi.blockUser(activeConversation.other_user.id);
      toast.success('Utilisateur bloque');
      setShowBlockDialog(false); setActiveConversation(null); navigate('/messages'); loadConversations();
    } catch { toast.error('Erreur'); }
  };

  const handleArchive = async () => {
    if (!activeConversation) return;
    try {
      await messagingApi.archiveConversation(activeConversation.conversation_id);
      toast.success('Conversation archivee');
      setActiveConversation(null); navigate('/messages'); loadConversations();
    } catch { toast.error('Erreur'); }
  };

  const filteredConversations = conversations.filter(c =>
    c.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.listing_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Auth guard ── */
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f2920]">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[#d4a574]" />
            <h2 className="text-2xl font-bold text-white mb-2">Connexion requise</h2>
            <p className="text-white/50 mb-4">Connectez-vous pour acceder a la messagerie</p>
            <Button data-testid="login-redirect-btn" onClick={() => navigate('/login')} className="bg-[#d4a574] text-[#1a3a30] hover:bg-[#c49564]">Se connecter</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f2920]">
      <Navbar />
      <div className="pt-[72px]">
        <div className="h-[calc(100vh-72px)] flex">

          {/* ═══ Sidebar ═══ */}
          <div className={`w-full md:w-[380px] bg-[#132f25] border-r border-[#2d5a4d]/40 flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="p-4 border-b border-[#2d5a4d]/40">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-bold text-white">Messagerie</h1>
                <Button
                  data-testid="new-conversation-btn"
                  onClick={() => setShowNewConv(true)}
                  size="sm"
                  className="bg-[#d4a574] hover:bg-[#c49564] text-[#1a3a30] font-semibold h-8 gap-1"
                >
                  <Plus className="w-4 h-4" /> Nouveau
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  data-testid="conversation-search"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-[#2d5a4d]/40 border-[#2d5a4d]/60 text-white placeholder:text-white/30 text-sm"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  data-testid="tab-active"
                  onClick={() => setShowArchived(false)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${!showArchived ? 'bg-[#d4a574] text-[#1a3a30]' : 'text-white/50 hover:bg-[#2d5a4d]/40'}`}
                >Actives</button>
                <button
                  data-testid="tab-archived"
                  onClick={() => setShowArchived(true)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${showArchived ? 'bg-[#d4a574] text-[#1a3a30]' : 'text-white/50 hover:bg-[#2d5a4d]/40'}`}
                ><Archive className="w-3 h-3" />Archivees</button>
              </div>
              {/* Push notification prompt */}
              {pushState === 'prompt' && (
                <button
                  data-testid="enable-push-btn"
                  onClick={handleEnablePush}
                  className="w-full mt-3 flex items-center gap-2 p-2 bg-[#d4a574]/10 border border-[#d4a574]/30 rounded-lg text-xs text-[#d4a574] hover:bg-[#d4a574]/20 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span>Activer les notifications pour ne rien manquer</span>
                </button>
              )}
            </div>

            {/* Conversation list */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-3 space-y-2">{[1,2,3,4].map(i => <Skeleton key={`el-${i}`} className="h-16 rounded-lg bg-[#2d5a4d]/30" />)}</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-white/20" />
                  <p className="text-white/40 text-sm">Aucune conversation</p>
                  <p className="text-white/25 text-xs mt-1">Cliquez sur "Nouveau" pour commencer</p>
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conv) => {
                    const isActive = conversationId === conv.conversation_id;
                    const role = getRoleBadge(conv.other_user?.user_type);
                    return (
                      <button
                        key={conv.conversation_id}
                        data-testid={`conversation-${conv.conversation_id}`}
                        onClick={() => { navigate(`/messages/${conv.conversation_id}`); setMobileShowChat(true); }}
                        className={`w-full text-left px-4 py-3 transition-colors border-b border-[#2d5a4d]/20 ${isActive ? 'bg-[#2d5a4d]/50' : 'hover:bg-[#2d5a4d]/25'}`}
                      >
                        <div className="flex gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="w-11 h-11">
                              <AvatarImage src={conv.other_user?.avatar} />
                              <AvatarFallback className="bg-[#d4a574]/20 text-[#d4a574] text-sm font-semibold">{getInitials(conv.other_user?.name)}</AvatarFallback>
                            </Avatar>
                            {conv.other_user?.is_online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#132f25]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-white truncate">{conv.other_user?.name}</span>
                              <span className="text-[10px] text-white/30 shrink-0">{formatTime(conv.last_message_at)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${role.color}`}>{conv.other_user?.user_type_label || role.label}</span>
                              {conv.conversation_type === 'marketplace' && conv.listing_title && (
                                <span className="text-[10px] text-white/25 truncate">{conv.listing_title}</span>
                              )}
                            </div>
                            <p className="text-xs text-white/40 mt-1 truncate">{conv.last_message}</p>
                          </div>
                          {conv.unread_count > 0 && (
                            <div className="shrink-0 self-center">
                              <span className="bg-[#d4a574] text-[#1a3a30] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{conv.unread_count}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ═══ Chat area ═══ */}
          <div className={`flex-1 flex flex-col bg-[#0f2920] ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
            {!activeConversation ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[#2d5a4d]/30 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-[#d4a574]/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Messagerie GreenLink</h3>
                  <p className="text-white/40 text-sm max-w-xs mx-auto mb-4">
                    Selectionnez une conversation ou demarrez-en une nouvelle
                  </p>
                  <Button
                    data-testid="new-conversation-empty-btn"
                    onClick={() => setShowNewConv(true)}
                    className="bg-[#d4a574] hover:bg-[#c49564] text-[#1a3a30] font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Nouvelle conversation
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* ── Chat header ── */}
                <div className="px-4 py-3 border-b border-[#2d5a4d]/40 bg-[#132f25] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden text-white/60 h-8 w-8" onClick={() => { setMobileShowChat(false); }}>
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={activeConversation.other_user?.avatar} />
                      <AvatarFallback className="bg-[#d4a574]/20 text-[#d4a574] text-sm font-semibold">{getInitials(activeConversation.other_user?.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{activeConversation.other_user?.name}</h3>
                        {(() => { const r = getRoleBadge(activeConversation.other_user?.user_type); return <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.color}`}>{activeConversation.other_user?.user_type_label || r.label}</span>; })()}
                      </div>
                      <p className="text-[11px] text-white/40">
                        {activeConversation.other_user?.is_online
                          ? <span className="text-emerald-400">En ligne</span>
                          : 'Hors ligne'}
                        {typingUser && <span className="text-[#d4a574] ml-2 animate-pulse">ecrit...</span>}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white/50 h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a3a30] border-[#2d5a4d]">
                      <DropdownMenuItem className="text-white/70 focus:bg-[#2d5a4d] focus:text-white" onClick={handleArchive}><Archive className="w-4 h-4 mr-2" />Archiver</DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#2d5a4d]" />
                      <DropdownMenuItem className="text-red-400 focus:bg-[#2d5a4d] focus:text-red-300" onClick={() => setShowBlockDialog(true)}><Ban className="w-4 h-4 mr-2" />Bloquer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* ── Listing banner (marketplace only) ── */}
                {activeConversation.listing && (
                  <div className="px-4 py-2 bg-[#2d5a4d]/20 border-b border-[#2d5a4d]/30 flex items-center gap-3">
                    {activeConversation.listing.photos?.[0] && <img src={activeConversation.listing.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{activeConversation.listing.crop_type} - {activeConversation.listing.grade}</p>
                      <p className="text-[11px] text-white/40">{activeConversation.listing.quantity_kg?.toLocaleString()} kg - {activeConversation.listing.price_per_kg?.toLocaleString()} FCFA/kg</p>
                    </div>
                  </div>
                )}

                {/* ── Messages ── */}
                <ScrollArea className="flex-1 px-4 py-4">
                  {loadingMessages ? (
                    <div className="space-y-4">{[1,2,3].map(i => <div key={`el-${i}`} className={`flex ${i%2?'':'justify-end'}`}><Skeleton className="h-14 w-56 rounded-2xl bg-[#2d5a4d]/30" /></div>)}</div>
                  ) : (
                    <div className="space-y-3">
                      {/* E2E notice */}
                      <div className="flex justify-center mb-4">
                        <div className="bg-[#2d5a4d]/20 rounded-full px-3 py-1 flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-emerald-400/70" />
                          <span className="text-[10px] text-emerald-400/70">Messages chiffres</span>
                        </div>
                      </div>

                      {messages.map((msg) => (
                        <div key={msg.message_id} data-testid={`message-${msg.message_id}`} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`group max-w-[75%] ${msg.is_mine ? 'items-end' : 'items-start'}`}>
                            {msg.reply_to_id && (
                              <div className="text-[10px] text-white/30 mb-1 pl-2 border-l-2 border-white/10">En reponse</div>
                            )}
                            <div className="flex items-end gap-1.5">
                              {!msg.is_mine && (
                                <Avatar className="w-7 h-7 shrink-0">
                                  <AvatarFallback className="bg-[#2d5a4d] text-white/60 text-[10px]">{getInitials(msg.sender_name)}</AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`relative rounded-2xl px-3.5 py-2 ${msg.is_mine ? 'bg-[#d4a574] text-[#1a3a30]' : 'bg-[#2d5a4d]/60 text-white/90'}`}>
                                {msg.message_type === 'image' && msg.attachment_url && (
                                  <img src={`${BACKEND_URL}${msg.attachment_url}`} alt="" className="max-w-full rounded-lg mb-1.5" />
                                )}
                                {msg.message_type === 'document' && msg.attachment_url && (
                                  <a href={`${BACKEND_URL}${msg.attachment_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/10 rounded-lg mb-1.5">
                                    <File className="w-4 h-4" /><span className="text-xs">{msg.attachment_name}</span><Download className="w-3 h-3" />
                                  </a>
                                )}
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                {msg.is_pinned && <Pin className="absolute -top-1.5 -right-1.5 w-3 h-3 text-[#d4a574]" />}
                              </div>
                              {/* Context menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-6 w-6 text-white/30"><MoreVertical className="w-3 h-3" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#1a3a30] border-[#2d5a4d]">
                                  <DropdownMenuItem className="text-white/70 focus:bg-[#2d5a4d] text-xs" onClick={() => setReplyTo(msg)}>Repondre</DropdownMenuItem>
                                  <DropdownMenuItem className="text-white/70 focus:bg-[#2d5a4d] text-xs" onClick={() => handlePinMessage(msg)}>
                                    <Pin className="w-3 h-3 mr-1.5" />{msg.is_pinned ? 'Desepingler' : 'Epingler'}
                                  </DropdownMenuItem>
                                  {msg.is_mine && <DropdownMenuItem className="text-red-400 focus:bg-[#2d5a4d] text-xs" onClick={() => handleDeleteMessage(msg.message_id)}><Trash2 className="w-3 h-3 mr-1.5" />Supprimer</DropdownMenuItem>}
                                  {!msg.is_mine && <DropdownMenuItem className="text-orange-400 focus:bg-[#2d5a4d] text-xs" onClick={() => { setSelectedMessage(msg); setShowReportDialog(true); }}><Flag className="w-3 h-3 mr-1.5" />Signaler</DropdownMenuItem>}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-white/25 ${msg.is_mine ? 'justify-end' : ''}`}>
                              <span>{formatTime(msg.created_at)}</span>
                              {msg.is_mine && (msg.is_read ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Check className="w-3 h-3" />)}
                            </div>
                          </div>
                        </div>
                      ))}

                      {typingUser && (
                        <div className="flex items-center gap-2 text-white/40">
                          <div className="flex gap-0.5">
                            <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs">{typingUser} ecrit...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* ── Reply bar ── */}
                {replyTo && (
                  <div className="px-4 py-2 bg-[#2d5a4d]/20 border-t border-[#2d5a4d]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-0.5 h-6 bg-[#d4a574] rounded-full" />
                      <div>
                        <p className="text-[10px] text-[#d4a574]">Repondre a {replyTo.sender_name}</p>
                        <p className="text-xs text-white/40 truncate max-w-[180px]">{replyTo.content}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)} className="h-6 w-6 text-white/30"><X className="w-3 h-3" /></Button>
                  </div>
                )}

                {/* ── Input area ── */}
                <div className="p-3 border-t border-[#2d5a4d]/40 bg-[#132f25]">
                  <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                    <Button variant="ghost" size="icon" className="text-white/40 hover:text-[#d4a574] h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}>
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                      <textarea
                        data-testid="message-input"
                        placeholder="Ecrivez votre message..."
                        value={messageText}
                        onChange={(e) => { setMessageText(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        rows={1}
                        className="w-full bg-[#2d5a4d]/40 border border-[#2d5a4d]/60 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#d4a574]/50 max-h-28"
                      />
                    </div>
                    <Button
                      data-testid="send-message-btn"
                      onClick={sendMessage}
                      disabled={!messageText.trim()}
                      className="bg-[#d4a574] hover:bg-[#c49564] text-[#1a3a30] h-9 w-9 shrink-0 rounded-xl"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ New conversation dialog ═══ */}
      <NewConversationDialog open={showNewConv} onClose={() => setShowNewConv(false)} onCreated={(id) => { navigate(`/messages/${id}`); loadConversations(); }} />

      {/* ═══ Report dialog ═══ */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-[#1a3a30] border-[#2d5a4d]">
          <DialogHeader>
            <DialogTitle className="text-white">Signaler ce message</DialogTitle>
            <DialogDescription className="text-white/50">Indiquez la raison du signalement</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {[{ id: 'spam', label: 'Spam' }, { id: 'harassment', label: 'Harcelement' }, { id: 'fraud', label: 'Fraude / Arnaque' }, { id: 'other', label: 'Autre' }].map(r => (
              <Button
                key={r.id}
                variant={reportReason === r.id ? "default" : "outline"}
                className={`w-full justify-start text-sm ${reportReason === r.id ? 'bg-[#d4a574] text-[#1a3a30]' : 'border-[#2d5a4d] text-white/60'}`}
                onClick={() => setReportReason(r.id)}
              >{r.label}</Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)} className="border-[#2d5a4d] text-white/60">Annuler</Button>
            <Button onClick={handleReportMessage} disabled={!reportReason} className="bg-red-600 hover:bg-red-700 text-white"><Flag className="w-4 h-4 mr-2" />Signaler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Block dialog ═══ */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="bg-[#1a3a30] border-[#2d5a4d]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><Ban className="w-5 h-5 text-red-400" />Bloquer cet utilisateur ?</DialogTitle>
            <DialogDescription className="text-white/50">Vous ne pourrez plus recevoir de messages de {activeConversation?.other_user?.name}.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)} className="border-[#2d5a4d] text-white/60">Annuler</Button>
            <Button onClick={handleBlockUser} className="bg-red-600 hover:bg-red-700 text-white"><Ban className="w-4 h-4 mr-2" />Bloquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
