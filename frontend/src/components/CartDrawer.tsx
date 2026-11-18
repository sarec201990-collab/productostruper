import React, { useState } from 'react';
import { CartItem } from '../types.js';
import { X, Trash2, Plus, Minus, MessageCircle, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  sellerPhone?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  sellerPhone = '5215500000000'
}) => {
  const [clientName, setClientName] = useState('');

  if (!isOpen) return null;

  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const formattedTotal = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(totalAmount);

  const handleSendWhatsAppOrder = () => {
    if (items.length === 0) return;

    const name = clientName.trim() || 'Cliente Web';
    let msg = `¡Hola! 👋 Quiero solicitar una cotización desde el *Catálogo Digital Truper*:\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *DETALLE DEL PEDIDO:*\n`;

    items.forEach((item) => {
      const p = item.product;
      const subtotal = p.price * item.quantity;
      const unitFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(p.price);
      const subFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(subtotal);

      msg += `• *${item.quantity}x* ${p.description}\n`;
      msg += `  ↳ Cód: ${p.code} | Clave: ${p.clave} | ${unitFmt} c/u = ${subFmt}\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📦 *Total de piezas:* ${totalPieces}\n`;
    msg += `💰 *Importe estimado con IVA:* ${formattedTotal} MXN\n`;
    msg += `👤 *Cliente:* ${name}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `¿Me confirmas disponibilidad y método de entrega o recolección? Muchas gracias.`;

    const waUrl = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Mi Pedido / Cotización
              </h2>
              <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                {totalPieces} pzs
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <ShoppingBag className="w-16 h-16 stroke-1 text-gray-300 mb-3" />
                <p className="font-bold text-gray-700 text-base">Tu lista está vacía</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Agrega productos desde el catálogo para generar tu pedido de cotización y enviarlo por WhatsApp.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-orange-600 transition-all"
                >
                  Explorar catálogo
                </button>
              </div>
            ) : (
              items.map((item) => {
                const subtotal = item.product.price * item.quantity;
                const formattedSub = new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN'
                }).format(subtotal);

                return (
                  <div key={item.product.id} className="py-4 flex space-x-3 items-center">
                    <img
                      src={item.product.image_url}
                      alt={item.product.description}
                      className="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-white p-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-gray-400">
                          {item.product.clave}
                        </span>
                        <span className="font-black text-sm text-gray-900">
                          {formattedSub}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-800 line-clamp-1">
                        {item.product.description}
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        ${item.product.price.toFixed(2)} c/u
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1.5 bg-gray-100 rounded-lg p-0.5">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 rounded flex items-center justify-center bg-white text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 rounded flex items-center justify-center bg-white text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & WhatsApp Checkout */}
          {items.length > 0 && (
            <div className="p-5 border-t border-gray-200 bg-gray-50 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Tu nombre (opcional para el mensaje):
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Total de piezas:</span>
                  <span className="font-bold text-gray-800">{totalPieces}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t border-gray-200">
                  <span>Importe Estimado con IVA:</span>
                  <span className="text-xl text-orange-600">{formattedTotal}</span>
                </div>
              </div>

              <button
                onClick={handleSendWhatsAppOrder}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Enviar cotización por WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onClearCart}
                className="w-full py-1.5 text-center text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors"
              >
                Vaciar lista de pedido
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
