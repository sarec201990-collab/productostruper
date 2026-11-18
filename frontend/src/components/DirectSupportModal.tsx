import React, { useState } from 'react';
import { X, MessageCircle, Send, CheckCircle2, Loader2, ExternalLink, ShieldCheck, User, Phone } from 'lucide-react';

interface DirectSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerPhone?: string;
  initialProduct?: { code: string; clave: string; name: string };
}

export const DirectSupportModal: React.FC<DirectSupportModalProps> = ({
  isOpen,
  onClose,
  sellerPhone = '5215500000000',
  initialProduct
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(
    initialProduct
      ? `Hola, me interesa información sobre el producto ${initialProduct.name} (Clave: ${initialProduct.clave}). ¿Tienen disponibilidad?`
      : 'Hola, me gustaría recibir atención y asesoría sobre los productos del catálogo Truper.'
  );
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [chatUrl, setChatUrl] = useState('https://bridge.flexivor.com.mx/?room=general');

  if (!isOpen) return null;

  const handleSendToChatSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/v1/chat/direct-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Cliente Web',
          phone: phone.trim(),
          message: message.trim(),
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

  const handleWhatsAppFallback = () => {
    const text = encodeURIComponent(message);
    window.open(`https://wa.me/${sellerPhone}?text=${text}`, '_blank');
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
              <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto">
                Tu solicitud ya llegó a la sala principal de los asesores en el <b>Sistema de Chat Flexivor</b>.
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#1456b8] hover:bg-[#10428e] text-white font-bold text-xs sm:text-sm shadow-md inline-flex items-center justify-center space-x-2"
                >
                  <span>Abrir Chat en Vivo Flexivor</span>
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
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tu Nombre o Razón Social:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Adrian / Ferretería San José"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456b8]/40 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Teléfono / WhatsApp de contacto (opcional):
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: 55 1234 5678"
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456b8]/40 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mensaje o Consulta:
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="Escribe aquí tu duda, pedido o consulta técnica..."
                  className="w-full p-3 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456b8]/40 focus:bg-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0b2f68] to-[#1456b8] hover:from-[#0a2754] hover:to-[#10428e] active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-900/20 flex items-center justify-center space-x-2 transition-all"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Conectando con Chat System...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Mensaje a Asesor Flexivor</span>
                    </>
                  )}
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-gray-400 uppercase font-bold tracking-wider">o también</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button
                  type="button"
                  onClick={handleWhatsAppFallback}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span>Contactar directamente por WhatsApp</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
