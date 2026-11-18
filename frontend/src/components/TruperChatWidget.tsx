import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowUp, Smile, MoreVertical, Loader2, Check, Clock, ShoppingBag, Store, User } from 'lucide-react';
import { getOrCreateVisitorSession, VisitorSession } from '../utils/visitorSession';

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
  cartSummary?: string;
  productInfo?: string;
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

    // Nota 1 (tono suave 587 Hz - D5)
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

    // Nota 2 (tono alegre 880 Hz - A5)
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
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKnownMsgIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  // Inicializar sesión de visitante
  useEffect(() => {
    if (isOpen) {
      const current = getOrCreateVisitorSession();
      setSession(current);
      fetchMessages(current.clientId);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Si hay un producto seleccionado al abrir
  useEffect(() => {
    if (isOpen && initialProduct) {
      setInputText(`Hola, me interesa información sobre ${initialProduct.name} (Clave: ${initialProduct.clave})`);
    }
  }, [isOpen, initialProduct]);

  // Polling para recibir mensajes de soporte cada 3.5 segundos mientras esté abierto
  useEffect(() => {
    if (!isOpen || !session?.clientId) return;

    const interval = setInterval(() => {
      fetchMessages(session.clientId);
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, session?.clientId]);

  // Auto-scroll al final cuando cambian los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const fetchMessages = async (clientId: string) => {
    try {
      const res = await fetch(`/api/v1/chat/messages?clientId=${encodeURIComponent(clientId)}`);
      const data = await res.json();
      const rawMessages = data.messages || [];
      if (Array.isArray(rawMessages) && (data.success || data.ok)) {
        // Filtrar y limpiar contenido para el cliente
        const targetSender = `usr_${clientId.replace('usr_', '')}`;
        const cleanList: ChatMessageItem[] = [];

        for (const m of rawMessages) {
          let cleanContent = (m.content || m.rawContent || '').trim();
          const isFromClient = (m.senderId === targetSender) || (m.isFromClient === true);
          let cartSummary: string | undefined = undefined;
          let productInfo: string | undefined = undefined;

          // Si es un mensaje inicial estructurado con plantilla
          if (cleanContent.includes('💬 *[ATENCIÓN DIRECTA')) {
            // Extraer cotización si existe
            const cartMatch = cleanContent.match(/🛒 \*Cotización actual:\*\s*(.+)/);
            if (cartMatch) cartSummary = cartMatch[1].trim();

            // Extraer producto si existe
            const prodMatch = cleanContent.match(/🔧 \*Producto:\*\s*(.+)/);
            if (prodMatch) productInfo = prodMatch[1].trim();

            // Extraer texto del mensaje
            if (cleanContent.includes('📝 *Mensaje:*')) {
              const parts = cleanContent.split('📝 *Mensaje:*');
              cleanContent = parts[parts.length - 1].trim();
            }
          }

          // Ignorar mensajes vacíos que solo eran metadatos
          if (!cleanContent && !cartSummary && !productInfo) {
            continue;
          }

          cleanList.push({
            id: m.id,
            senderId: m.senderId,
            senderName: isFromClient ? 'Tú' : (m.senderName || 'Ventas Mostrador'),
            content: cleanContent || (cartSummary ? `Consulta con cotización: ${cartSummary}` : 'Consulta de catálogo'),
            timestamp: m.timestamp,
            isFromMe: isFromClient,
            cartSummary,
            productInfo
          });
        }

        // Detección de mensajes nuevos para el timbre
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
      console.warn('[CHAT] No se pudieron sincronizar mensajes:', err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || sending) return;

    const currentSession = session || getOrCreateVisitorSession();
    setSending(true);

    // Optimistic UI: agregar el mensaje de inmediato
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: ChatMessageItem = {
      id: tempId,
      senderId: `usr_${currentSession.clientId}`,
      senderName: 'Tú',
      content: textToSend,
      timestamp: new Date().toISOString(),
      isFromMe: true
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setShowEmojiPicker(false);
    setShowOptionsMenu(false);

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
      if (!data.success) {
        console.error('Error al enviar mensaje:', data.error);
      } else {
        fetchMessages(currentSession.clientId);
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    } finally {
      setSending(false);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSendCartQuote = () => {
    if (cartCount > 0) {
      setInputText(`Hola, me gustaría cotizar los ${cartCount} productos de mi pedido ($${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN).`);
      setShowOptionsMenu(false);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[390px] max-w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
      
      {/* Contenedor Principal del Widget de Chat */}
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-gray-200/90 overflow-hidden flex flex-col h-[570px] max-h-[92vh]">
        
        {/* Cabecera Roja Truper Mejorada (Degradado elegante con estado) */}
        <div className="relative bg-gradient-to-r from-[#e52421] via-[#ea2b28] to-[#d61e1b] text-white px-4 py-3.5 flex items-center justify-between shadow-md select-none">
          
          {/* Botón Circular de Cierre a la izquierda */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-90 z-10"
            title="Cerrar chat"
            aria-label="Cerrar chat"
          >
            <X className="w-4 h-4 stroke-[2.8]" />
          </button>

          {/* Título Central y Estado en línea */}
          <div className="flex-1 text-center pr-8">
            <h3 className="text-base font-bold tracking-tight text-white leading-tight">
              Envíenos un mensaje
            </h3>
            <p className="text-[11px] text-white/90 font-medium flex items-center justify-center space-x-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span>Atención directa en línea</span>
            </p>
          </div>

          {/* Curva / Sombra Decorativa en la esquina superior derecha */}
          <div className="absolute top-0 right-0 w-14 h-14 bg-black/10 rounded-bl-full pointer-events-none" />
        </div>

        {/* Cuerpo del Chat (Fondo Slate-50 con burbujas modernas) */}
        <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-[#f8fafc]">
          
          {/* Burbuja Inicial de Bienvenida (Estilo Intercom / Truper Oficial) */}
          <div className="flex items-start max-w-[90%]">
            <div className="bg-white text-[#2d3748] p-3.5 rounded-2xl rounded-tl-sm text-xs sm:text-[13px] leading-relaxed shadow-xs border border-gray-200/70">
              <div className="flex items-center space-x-1.5 mb-1.5">
                <Store className="w-3.5 h-3.5 text-[#e52421]" />
                <span className="font-bold text-gray-900 text-xs">Asesor Truper Mostrador</span>
              </div>
              <p className="text-gray-700 mb-2">
                ¡Hola! Deje su mensaje o solicitud y nos pondremos en contacto con usted lo más pronto posible.
              </p>
              <div className="pt-2 border-t border-gray-100 flex items-center space-x-1 text-[11px] text-gray-500 font-medium">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Horario: L-V 9:00 a 18:30 hrs · S 9:00 a 14:00 hrs</span>
              </div>
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
                {/* Avatar del asesor para mensajes recibidos */}
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center text-[10px] font-bold shadow-xs shrink-0 mb-1">
                    🏪
                  </div>
                )}

                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-gradient-to-br from-[#e52421] to-[#cb1e1b] text-white rounded-br-xs'
                      : 'bg-white text-[#1f2937] rounded-bl-xs border border-gray-200/70'
                  }`}
                >
                  {/* Remitente para mensajes del asesor */}
                  {!isMe && (
                    <p className="text-[10px] font-extrabold text-[#0b2f68] mb-1 flex items-center space-x-1">
                      <span>{msg.senderName}</span>
                    </p>
                  )}

                  {/* Contenido principal del mensaje */}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                  {/* Metadatos (Hora y Check) */}
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

          {/* Referencia de Producto Seleccionado si existe */}
          {initialProduct && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 flex items-center space-x-2 text-xs text-amber-950">
              <span className="text-base">🔧</span>
              <div className="flex-1 truncate">
                <span className="font-bold">Consultando:</span> {initialProduct.name} ({initialProduct.clave})
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Selector de Emojis Rápido (Popup contextual) */}
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

        {/* Menú de Opciones Rápidas (Popup contextual) */}
        {showOptionsMenu && (
          <div className="p-2.5 bg-white border-t border-gray-200 text-xs space-y-1.5 shadow-inner animate-in fade-in">
            {cartCount > 0 && (
              <button
                type="button"
                onClick={handleSendCartQuote}
                className="w-full text-left px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100/80 text-orange-900 font-semibold flex items-center space-x-2 border border-orange-200 transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-orange-600" />
                <span>Enviar cotización de mi pedido ({cartCount} artículos)</span>
              </button>
            )}
            <div className="px-3 py-1.5 text-[11px] text-gray-500 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Horario de atención: L-V 9:00 a 18:30 hrs y S 9:00 a 14:00 hrs</span>
            </div>
          </div>
        )}

        {/* Pie / Barra de Entrada (Estilo Intercom / WhatsApp Limpio) */}
        <div className="p-2.5 sm:p-3 bg-white border-t border-gray-200/80">
          <form onSubmit={handleSendMessage} className="space-y-1.5">
            
            {/* Input Cápsula con botones integrados */}
            <div className="flex items-center space-x-2 bg-gray-50/90 rounded-2xl px-3 py-1 border border-gray-200/90 focus-within:border-gray-400/80 focus-within:bg-white focus-within:shadow-xs transition-all">
              
              {/* Botón de Emoji */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker((prev) => !prev);
                  setShowOptionsMenu(false);
                }}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors ${
                  showEmojiPicker ? 'text-[#e52421]' : ''
                }`}
                title="Emojis"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Campo de Texto */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escriba aquí..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-1.5"
              />

              {/* Botón Circular de Enviar (Flecha hacia arriba) */}
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                  inputText.trim() && !sending
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

            {/* Sub-barra de pie sutil */}
            <div className="flex items-center justify-between px-2 pt-0.5 text-[10px] text-gray-400">
              <button
                type="button"
                onClick={() => {
                  setShowOptionsMenu((prev) => !prev);
                  setShowEmojiPicker(false);
                }}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-800 transition-colors"
              >
                <MoreVertical className="w-3 h-3" />
                <span>Opciones de atención</span>
              </button>

              <span className="font-medium text-gray-400">
                Flexivor Direct Chat
              </span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};
