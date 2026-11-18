import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  ArrowUp, 
  Smile, 
  MoreVertical, 
  Loader2, 
  Check, 
  Clock, 
  ShoppingBag, 
  Store, 
  User, 
  LogOut, 
  Sparkles, 
  RefreshCw, 
  PhoneCall, 
  ShieldCheck, 
  UserCheck 
} from 'lucide-react';
import { getOrCreateVisitorSession, resetVisitorSession, VisitorSession } from '../utils/visitorSession';

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
  type?: string;
  cartSummary?: string;
  productInfo?: string;
}

export interface ActiveConversation {
  clientId: string;
  clientName: string;
  device?: string;
  cartSummary?: string;
  status: string;
  lastMessage?: string;
  lastTimestamp: string;
  unreadCount: number;
}

interface TruperChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  cartCount?: number;
  cartTotal?: number;
  initialProduct?: { code: string; clave: string; name: string };
}

const QUICK_EMOJIS = ['😊', '👋', '👍', '🔨', '🔧', '📦', '❓', '✅', '📍'];

function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.1);
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.debug('[CHAT SOUND]', e);
  }
}

export const TruperChatWidget: React.FC<TruperChatWidgetProps> = ({
  isOpen,
  onClose,
  cartCount = 0,
  cartTotal = 0,
  initialProduct
}) => {
  // Estado de modo: Mostrador (operador) vs Cliente
  const [isMostradorMode, setIsMostradorMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fx_chat_mode') === 'mostrador';
    } catch {
      return false;
    }
  });

  // Lista de conversaciones activas (Burbujas para mostrador)
  const [activeConversations, setActiveConversations] = useState<ActiveConversation[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Sesión de cliente
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'closed'>('active');
  const [closedNotice, setClosedNotice] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [confirmEndModal, setConfirmEndModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKnownMsgIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [maxChatHeight, setMaxChatHeight] = useState<number | undefined>(undefined);

  // Guardar preferencia de modo
  useEffect(() => {
    try {
      localStorage.setItem('fx_chat_mode', isMostradorMode ? 'mostrador' : 'cliente');
    } catch {}
  }, [isMostradorMode]);

  // Adaptación a teclados virtuales móviles
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (window.visualViewport) {
        const vvHeight = window.visualViewport.height;
        const offset = Math.max(0, window.innerHeight - vvHeight);
        setKeyboardOffset(offset);
        setMaxChatHeight(vvHeight);
      } else {
        setKeyboardOffset(0);
        setMaxChatHeight(window.innerHeight);
      }
    };

    handleResize();
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Inicializar o refrescar sesión al abrir
  useEffect(() => {
    if (isOpen) {
      const current = getOrCreateVisitorSession();
      setSession(current);
      setSessionStatus('active');
      setClosedNotice(null);

      if (isMostradorMode) {
        fetchActiveConversations();
      } else {
        fetchMessages(current.clientId, false);
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, isMostradorMode]);

  // Si hay producto inicial al abrir
  useEffect(() => {
    if (isOpen && initialProduct && !isMostradorMode) {
      setInputText(`Hola, me interesa información sobre ${initialProduct.name} (Clave: ${initialProduct.clave})`);
    }
  }, [isOpen, initialProduct, isMostradorMode]);

  // Polling continuo cada 3 segundos
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      if (isMostradorMode) {
        fetchActiveConversations();
        if (selectedClientId) {
          fetchMessages(selectedClientId, true);
        }
      } else if (session?.clientId) {
        fetchMessages(session.clientId, false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, isMostradorMode, selectedClientId, session?.clientId]);

  // Auto-scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Consultar lista de conversaciones activas para las burbujas
  const fetchActiveConversations = async () => {
    try {
      const res = await fetch('/api/v1/chat/active-conversations');
      const data = await res.json();
      if (data.ok && Array.isArray(data.conversations)) {
        setActiveConversations(data.conversations);

        // Si el cliente seleccionado ya no está en la lista activa, seleccionar el primero disponible
        setSelectedClientId((current) => {
          const exists = data.conversations.some((c: ActiveConversation) => c.clientId === current);
          if (exists) return current;
          return data.conversations.length > 0 ? data.conversations[0].clientId : null;
        });
      }
    } catch (err) {
      console.warn('[CHAT] Error al consultar conversaciones activas:', err);
    }
  };

  // Cargar mensajes de un cliente
  const fetchMessages = async (targetClientId: string, asMostrador: boolean) => {
    if (!targetClientId) return;

    try {
      const res = await fetch(`/api/v1/chat/messages?clientId=${encodeURIComponent(targetClientId)}`);
      const data = await res.json();
      const rawMessages = data.messages || [];

      // Verificar estado de la sesión
      if (data.session) {
        if (data.session.status === 'closed') {
          setSessionStatus('closed');
          const who = data.session.closedBy === 'operator' ? 'el Asesor de Mostrador' : 'el Cliente';
          setClosedNotice(`Esta conversación fue finalizada por ${who}.`);
        } else {
          setSessionStatus('active');
          setClosedNotice(null);
        }
      }

      if (Array.isArray(rawMessages) && (data.success || data.ok)) {
        const cleanList: ChatMessageItem[] = [];
        const clientSender = `usr_${targetClientId.replace('usr_', '')}`;

        for (const m of rawMessages) {
          let cleanContent = (m.content || '').trim();
          let cartSummary: string | undefined = undefined;
          let productInfo: string | undefined = undefined;

          if (cleanContent.includes('💬 *[ATENCIÓN DIRECTA')) {
            const cartMatch = cleanContent.match(/🛒 \*Cotización actual:\*\s*(.+)/);
            if (cartMatch) cartSummary = cartMatch[1].trim();

            const prodMatch = cleanContent.match(/🔧 \*Producto:\*\s*(.+)/);
            if (prodMatch) productInfo = prodMatch[1].trim();

            if (cleanContent.includes('📝 *Mensaje:*')) {
              const parts = cleanContent.split('📝 *Mensaje:*');
              cleanContent = parts[parts.length - 1].trim();
            }
          }

          if (cleanContent.includes('🔒 *[ATENCIÓN FINALIZADA]*')) {
            cleanContent = cleanContent.replace(/[*_#`]/g, '');
          }

          if (!cleanContent && !cartSummary && !productInfo) continue;

          // Definir si el mensaje es "mío" según el rol
          const isFromClient = m.senderId === clientSender;
          const isMe = asMostrador ? !isFromClient : isFromClient;

          cleanList.push({
            id: m.id,
            senderId: m.senderId,
            senderName: isFromClient ? (asMostrador ? (m.senderName || 'Cliente') : 'Tú') : (asMostrador ? 'Tú (Mostrador)' : 'Ventas Mostrador'),
            content: cleanContent || (cartSummary ? `Cotización: ${cartSummary}` : 'Consulta'),
            timestamp: m.timestamp,
            isFromMe: isMe,
            type: m.type,
            cartSummary,
            productInfo
          });
        }

        // Sonido de notificación si llega mensaje nuevo
        if (cleanList.length > 0) {
          const latest = cleanList[cleanList.length - 1];
          if (!isFirstLoadRef.current && lastKnownMsgIdRef.current && latest.id !== lastKnownMsgIdRef.current) {
            if (!latest.isFromMe) {
              playChimeSound();
            }
          }
          lastKnownMsgIdRef.current = latest.id;
          isFirstLoadRef.current = false;
        }

        setMessages(cleanList);
      }
    } catch (err) {
      console.warn('[CHAT] Error al cargar mensajes:', err);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sending || sessionStatus === 'closed') return;

    setSending(true);

    if (isMostradorMode) {
      // Modo Mostrador responde a selectedClientId
      if (!selectedClientId) {
        alert('Seleccione un chat activo para responder.');
        setSending(false);
        return;
      }

      try {
        const res = await fetch('/api/v1/chat/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: selectedClientId,
            message: textToSend,
            senderName: 'Ventas Mostrador (Flexivor)'
          })
        });

        const data = await res.json();
        if (data.ok) {
          setInputText('');
          fetchMessages(selectedClientId, true);
        } else {
          alert(data.error || 'No se pudo enviar la respuesta.');
        }
      } catch (err) {
        console.error('Error al responder desde mostrador:', err);
      } finally {
        setSending(false);
      }
    } else {
      // Modo Cliente envía consulta
      const currentSession = session || getOrCreateVisitorSession();
      try {
        const cartSummary = cartCount > 0 ? `${cartCount} producto(s) por $${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` : undefined;

        const res = await fetch('/api/v1/chat/direct-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: currentSession.clientId,
            name: currentSession.clientAlias,
            deviceInfo: currentSession.deviceInfo,
            message: textToSend,
            cartSummary,
            productCode: initialProduct?.code,
            productClave: initialProduct?.clave,
            productName: initialProduct?.name
          })
        });

        const data = await res.json();
        if (data.success) {
          setInputText('');
          fetchMessages(currentSession.clientId, false);
        }
      } catch (err) {
        console.error('Error al enviar mensaje del cliente:', err);
      } finally {
        setSending(false);
      }
    }
  };

  // Finalizar Conversación ("Fin de Chat")
  const handleEndChat = async () => {
    const targetId = isMostradorMode ? selectedClientId : session?.clientId;
    if (!targetId) return;

    try {
      const res = await fetch('/api/v1/chat/end-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: targetId,
          closedBy: isMostradorMode ? 'operator' : 'client'
        })
      });

      const data = await res.json();
      if (data.ok) {
        setConfirmEndModal(false);
        if (isMostradorMode) {
          // Remover la burbuja inmediatamente del mostrador
          setActiveConversations((prev) => prev.filter((c) => c.clientId !== targetId));
          setSelectedClientId(null);
          setMessages([]);
          fetchActiveConversations();
        } else {
          // Modo cliente: marcar cerrado
          setSessionStatus('closed');
          setClosedNotice('Has dado por terminada esta consulta.');
          fetchMessages(targetId, false);
        }
      }
    } catch (err) {
      console.error('Error al finalizar chat:', err);
    }
  };

  // Iniciar nueva consulta (Lado Cliente)
  const handleStartNewConsultation = () => {
    const newSession = resetVisitorSession();
    setSession(newSession);
    setSessionStatus('active');
    setClosedNotice(null);
    setMessages([]);
    setInputText('');
    fetchMessages(newSession.clientId, false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  const currentClient = session || getOrCreateVisitorSession();
  const activeTargetConv = activeConversations.find((c) => c.clientId === selectedClientId);

  return (
    <div 
      className="fixed inset-x-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full sm:w-[410px] max-w-full flex flex-col justify-end pointer-events-none transition-[bottom,height] duration-150"
      style={{
        bottom: `${keyboardOffset}px`,
        height: maxChatHeight ? `${Math.min(maxChatHeight, 620)}px` : '620px',
        maxHeight: maxChatHeight ? `${maxChatHeight}px` : '100dvh'
      }}
    >
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col pointer-events-auto h-full max-h-full animate-in fade-in slide-in-from-bottom-5 duration-150">
        
        {/* Cabecera Principal */}
        <div className="relative bg-gradient-to-r from-[#e52421] via-[#ea2b28] to-[#d61e1b] text-white px-4 py-3 flex items-center justify-between shadow-md select-none">
          
          {/* Botón Circular Cerrar Widget */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-90"
            title="Minimizar chat"
          >
            <X className="w-4 h-4 stroke-[2.8]" />
          </button>

          {/* Título Central */}
          <div className="flex-1 text-center px-2">
            <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight flex items-center justify-center space-x-1.5">
              <span>{isMostradorMode ? 'Panel Ventas Mostrador' : 'Envíenos un mensaje'}</span>
            </h3>
            <p className="text-[11px] text-white/90 font-medium flex items-center justify-center space-x-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {isMostradorMode 
                  ? `${activeConversations.length} chat(s) en espera`
                  : `Conectado como ${currentClient.clientAlias}`}
              </span>
            </p>
          </div>

          {/* Switch de Modo Mostrador / Cliente */}
          <button
            onClick={() => {
              const nextMode = !isMostradorMode;
              setIsMostradorMode(nextMode);
              if (nextMode) {
                fetchActiveConversations();
              } else {
                fetchMessages(currentClient.clientId, false);
              }
            }}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase border transition-all flex items-center space-x-1 ${
              isMostradorMode 
                ? 'bg-[#0b2f68] text-white border-blue-400 shadow' 
                : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
            }`}
            title={isMostradorMode ? 'Cambiar a vista de Cliente' : 'Cambiar a vista de Mostrador / Asesor'}
          >
            <Store className="w-3 h-3" />
            <span>{isMostradorMode ? 'Mostrador' : 'Cliente'}</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* BARRA DE BURBUJAS DE CHATS ACTIVOS (Solo Modo Mostrador)      */}
        {/* ============================================================== */}
        {isMostradorMode && (
          <div className="bg-slate-900 border-b border-slate-800 px-3 py-2.5 flex items-center space-x-2 overflow-x-auto scrollbar-none select-none">
            <div className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 pr-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Activos:</span>
            </div>

            {activeConversations.map((c) => {
              const isSelected = selectedClientId === c.clientId;
              return (
                <button
                  key={c.clientId}
                  onClick={() => {
                    setSelectedClientId(c.clientId);
                    fetchMessages(c.clientId, true);
                  }}
                  className={`group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#e52421] to-[#cb1e1b] text-white shadow-md ring-2 ring-red-400 scale-102'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title={`${c.clientName} (${c.device || 'Móvil'}) - Clic para ver`}
                >
                  <span className="text-[11px]">{c.device === 'Escritorio' ? '💻' : '📱'}</span>
                  <span className="truncate max-w-[110px]">{c.clientName}</span>
                </button>
              );
            })}

            {activeConversations.length === 0 && (
              <span className="text-xs text-slate-500 italic py-1">
                No hay clientes activos en este momento
              </span>
            )}
          </div>
        )}

        {/* Sub-barra de Estado del Chat Seleccionado (con botón Fin de Chat) */}
        <div className="bg-white border-b border-gray-100 px-3.5 py-1.5 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-1.5 truncate">
            {isMostradorMode ? (
              activeTargetConv ? (
                <>
                  <span className="font-extrabold text-gray-900">{activeTargetConv.clientName}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                    {activeTargetConv.device || 'Móvil'}
                  </span>
                </>
              ) : (
                <span className="text-gray-400 italic">Selecciona una burbuja arriba</span>
              )
            ) : (
              <div className="flex items-center space-x-1 text-[11px] text-gray-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Atención directa · Sin registro previo</span>
              </div>
            )}
          </div>

          {/* Botón Fin de Chat */}
          {((isMostradorMode && activeTargetConv) || (!isMostradorMode && sessionStatus === 'active')) && (
            <button
              onClick={() => setConfirmEndModal(true)}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
              title="Terminar esta atención"
            >
              <LogOut className="w-3 h-3" />
              <span>Fin de Chat</span>
            </button>
          )}
        </div>

        {/* Cuerpo del Chat */}
        <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-[#f8fafc]">
          
          {/* Mensaje de Bienvenida */}
          <div className="flex items-start max-w-[90%]">
            <div className="bg-white text-[#2d3748] p-3 rounded-2xl rounded-tl-sm text-xs sm:text-[13px] leading-relaxed shadow-xs border border-gray-200/80">
              <div className="flex items-center space-x-1.5 mb-1 text-[#e52421] font-bold">
                <Store className="w-3.5 h-3.5" />
                <span>{isMostradorMode ? 'Atención al Cliente Truper' : 'Asesor Truper Mostrador'}</span>
              </div>
              <p className="text-gray-700">
                {isMostradorMode
                  ? 'Aquí recibes las consultas en tiempo real de los clientes navegando el catálogo.'
                  : '¡Hola! Escribe tu duda o consulta de productos y te responderemos de inmediato.'}
              </p>
            </div>
          </div>

          {/* Mensajes del Historial */}
          {messages.map((msg) => {
            const isMe = msg.isFromMe;
            return (
              <div
                key={msg.id}
                className={`flex items-end space-x-2 ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
              >
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shadow-xs shrink-0 mb-1">
                    {isMostradorMode ? '👤' : '🏪'}
                  </div>
                )}

                <div
                  className={`max-w-[84%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-gradient-to-br from-[#e52421] to-[#cb1e1b] text-white rounded-br-xs'
                      : 'bg-white text-[#1f2937] rounded-bl-xs border border-gray-200/80'
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-extrabold text-[#0b2f68] mb-0.5">
                      {msg.senderName}
                    </p>
                  )}

                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                  <div
                    className={`text-[9px] mt-1 text-right font-medium flex items-center justify-end space-x-1 ${
                      isMe ? 'text-white/80' : 'text-gray-400'
                    }`}
                  >
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Banner de Chat Finalizado */}
          {sessionStatus === 'closed' && (
            <div className="py-4 px-3 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2 animate-in fade-in">
              <div className="text-amber-800 font-extrabold text-xs">
                🔒 {closedNotice || 'Esta conversación ha sido finalizada.'}
              </div>
              <p className="text-[11px] text-amber-700">
                La sesión anterior quedó archivada. Puedes iniciar una nueva consulta cuando gustes.
              </p>
              {!isMostradorMode && (
                <button
                  type="button"
                  onClick={handleStartNewConsultation}
                  className="px-4 py-2 bg-[#e52421] hover:bg-[#c91d1a] text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Iniciar Nueva Consulta</span>
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Modal de Confirmación Fin de Chat */}
        {confirmEndModal && (
          <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-4 shadow-xl border border-gray-200 max-w-xs w-full text-center space-y-3 animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <LogOut className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-gray-900">¿Finalizar conversación?</h4>
              <p className="text-xs text-gray-500">
                {isMostradorMode 
                  ? 'La conversación se cerrará y la burbuja desaparecerá del panel de mostrador.'
                  : 'Se dará por terminada la sesión de asesoría.'}
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmEndModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEndChat}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-sm"
                >
                  Sí, Finalizar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selector de Emojis */}
        {showEmojiPicker && (
          <div className="px-3 py-2 bg-white border-t border-gray-200 flex items-center space-x-2 overflow-x-auto shadow-inner">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleAddEmoji(emoji)}
                className="text-lg p-1.5 hover:bg-gray-100 rounded-lg transition-transform cursor-pointer active:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Pie / Input Bar */}
        <div className="p-2.5 sm:p-3 bg-white border-t border-gray-200/80">
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-2xl px-3 py-1 border border-gray-200 focus-within:border-gray-400 focus-within:bg-white transition-all">
              
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-600 ${showEmojiPicker ? 'text-[#e52421]' : ''}`}
                title="Emojis"
              >
                <Smile className="w-4 h-4" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                disabled={sessionStatus === 'closed' || (isMostradorMode && !selectedClientId)}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  sessionStatus === 'closed'
                    ? 'Chat finalizado. Pulse Iniciar Nueva Consulta.'
                    : isMostradorMode
                    ? (selectedClientId ? 'Escribir respuesta de mostrador...' : 'Selecciona una burbuja arriba...')
                    : 'Escriba aquí su consulta...'
                }
                className="flex-1 bg-transparent text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-1.5 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || sending || sessionStatus === 'closed' || (isMostradorMode && !selectedClientId)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                  inputText.trim() && !sending && sessionStatus === 'active' && (!isMostradorMode || selectedClientId)
                    ? 'bg-[#e52421] text-white hover:bg-[#c91d1a] shadow-xs cursor-pointer active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Enviar"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[2.8]" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] text-gray-400">
              <span className="font-semibold text-gray-500">
                {isMostradorMode ? '⚡ Despacho Ventas Mostrador' : 'Flexivor Direct Chat'}
              </span>
              <span>Horario L-V 9:00 a 18:30</span>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
