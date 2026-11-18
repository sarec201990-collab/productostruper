import React from 'react';
import { ShoppingCart, Wrench, Sparkles, MessageCircle } from 'lucide-react';

interface HeaderProps {
  totalCartItems: number;
  onOpenCart: () => void;
  sellerPhone?: string;
}

export const Header: React.FC<HeaderProps> = ({ totalCartItems, onOpenCart, sellerPhone = '5215500000000' }) => {
  const handleDirectWhatsAppContact = () => {
    const text = encodeURIComponent('¡Hola! Estoy navegando en el Catálogo Digital Truper y me gustaría solicitar información o asesoría general.');
    window.open(`https://wa.me/${sellerPhone}?text=${text}`, '_blank');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr from-orange-600 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20 transform hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">
                  TRUPER<span className="text-orange-500">.</span>
                </span>
                <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 uppercase tracking-wider">
                  Catálogo Oficial
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium hidden sm:block">
                Precios Públicos con IVA · Ecosistema Flexivor
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Direct WhatsApp Contact Button */}
            <button
              onClick={handleDirectWhatsAppContact}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors shadow-sm"
              title="Atención por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span className="hidden md:inline">Atención Directa</span>
            </button>

            {/* Shopping / Quote Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 flex items-center space-x-2 active:scale-95 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline font-semibold">Mi Pedido</span>
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 sm:static sm:top-auto sm:right-auto bg-gray-900 sm:bg-white sm:text-orange-600 text-white text-xs font-black rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center shadow">
                  {totalCartItems}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
