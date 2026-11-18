import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Send, CheckCircle2, Loader2, ExternalLink, ShieldCheck, UserCheck } from 'lucide-react';
import { getOrCreateVisitorSession, VisitorSession } from '../utils/visitorSession';

interface DirectSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerPhone?: string;
  cartCount?: number;
  cartTotal?: number;
  initialProduct?: { code: string; clave: string; name: string };
}

export const DirectSupportModal: React.FC<DirectSupportModalProps> = ({
  isOpen,
  onClose,
  cartCount = 0,
  cartTotal = 0,
  initialProduct
}) => {
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [message, setMessage] = useState(
    initialProduct
      ? `Hola, me interesa información sobre el producto ${initialProduct.name} (Clave: ${initialProduct.clave}). ¿Tienen disponibilidad?`
      : 'Hola, me gustaría recibir atención y asesoría sobre los productos del catálogo Truper.'
  );
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [chatUrl, setChatUrl] = useState('https://bridge.flexivor.com.mx/?room=general');

  useEffect(() => {
    if (isOpen) {
      setSession(getOrCreateVisitorSession());
      if (initialProduct) {
        setMessage(`Hola, me interesa información sobre el producto ${initialProduct.name} (Clave: ${initialProduct.clave}). ¿Tienen disponibilidad?`);
      }
    }
  }, [isOpen, initialProduct]);

  if (!isOpen) return null;

  const currentSession = session || getOrCreateVisitorSession();

  const handleSendToChatSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      const cartSummary = cartCount > 0 ? `${cartCount} producto(s) por $${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` : undefined;

      const res = await fetch('/api/v1/chat/direct-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: currentSession.clientId,
          name: currentSession.clientAlias,
          deviceInfo: currentSession.deviceInfo,
          message: message.trim(),
          cartSummary,
          productCode: initialProduct?.code,
          productClave: initialProduct?.clave,
          productName: initialProduct?.name
        })
      });

      const data = await res.json();
      if (data.success) {
        setSentSuccess(true);
        if (data.chatUrl) setChatUrl(data.chatUrl);
      } else {
        alert(data.error || 'No se pudo enviar el mensaje.');
      }
    } catch (err) {
      console.error('Error enviando mensaje a chat_system:', err);
      alert('Error de conexión con el sistema de chat.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0b2f68] to-[#1456b8] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <MessageCircle className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">Atención Directa Flexivor</h3>
              <p className="text-xs text-sky-200/90 font-medium flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Conectado a Flexivor Chat System</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {sentSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-black text-gray-900">¡Mensaje Entregado!</h4>
              <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                Tu solicitud fue recibida por los asesores con tu identificador anónimo <span className="font-extrabold text-[#0b2f68] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{currentSession.clientAlias}</span>.
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#1456b8] hover:bg-[#10428e] text-white font-bold text-xs sm:text-sm shadow-md inline-flex items-center justify-center space-x-2 transition-transform active:scale-95"
                >
                  <span>Abrir Chat en Vivo</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => {
                    setSentSuccess(false);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-200"
                >
                  Volver al Catálogo
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendToChatSystem} className="space-y-4">
              
              {/* Anonymous Identification Banner */}
              <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-3.5 flex items-start space-x-3">
                <div className="p-2 bg-[#0b2f68] text-white rounded-xl mt-0.5">
                  <UserCheck className="w-4 h-4 text-sky-300" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#0b2f68] flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Identificado como: {currentSession.clientAlias}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                      {currentSession.deviceInfo}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-1 leading-snug">
                    No necesitas registrarte ni dejar tus datos personales. Tu consulta se envía y se identifica directamente en el chat.
                  </p>
                </div>
              </div>

              {/* Message field */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Mensaje o Consulta:</span>
                  <span className="text-[11px] font-normal text-gray-400">Atención directa</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="Escribe aquí tu duda, pedido o consulta técnica..."
                  className="w-full p-3.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456b8]/40 focus:bg-white resize-none leading-relaxed"
                />
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0b2f68] to-[#1456b8] hover:from-[#0a2754] hover:to-[#10428e] active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-900/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Conectando con Asesor...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Mensaje Directo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
