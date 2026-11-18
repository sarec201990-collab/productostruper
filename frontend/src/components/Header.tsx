import React from 'react';
import { ShoppingCart, MessageCircle, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  totalCartItems: number;
  onOpenCart: () => void;
  sellerPhone?: string;
}

export const Header: React.FC<HeaderProps> = ({ totalCartItems, onOpenCart, sellerPhone = '5215500000000' }) => {
  const handleDirectWhatsAppContact = () => {
    const text = encodeURIComponent('¡Hola! Estoy navegando en el Catálogo Digital Truper (Flexivor) y me gustaría solicitar información o asesoría general.');
    window.open(`https://wa.me/${sellerPhone}?text=${text}`, '_blank');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b2f68] text-white border-b border-[#1456b8]/50 shadow-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <img
                src="/icons/logo-flexivor-web.png"
                alt="Flexivor"
                className="h-9 sm:h-11 w-auto object-contain filter drop-shadow"
                onError={(e) => {
                  // Fallback to SVG icon
                  (e.target as HTMLImageElement).src = '/icons/flexivor-icon.svg';
                }}
              />
              <div className="h-6 w-px bg-white/20 hidden xs:block"></div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-white">
                    TRUPER<span className="text-[#f07d00]">.</span>
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f07d00] text-white uppercase tracking-wider shadow-sm">
                    Catálogo Oficial
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-sky-200/90 font-medium hidden sm:flex">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Precios Públicos con IVA · Ecosistema Flexivor</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Direct WhatsApp Contact Button */}
            <button
              onClick={handleDirectWhatsAppContact}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border border-emerald-500 shadow-sm transition-all"
              title="Atención por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span className="hidden md:inline">Atención Directa</span>
            </button>

            {/* Shopping / Quote Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[#f07d00] hover:bg-[#d96a00] active:bg-[#c55f00] text-white font-bold text-sm shadow-lg shadow-orange-950/20 flex items-center space-x-2 active:scale-95 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline font-semibold">Mi Pedido</span>
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 sm:static sm:top-auto sm:right-auto bg-[#142230] text-white text-xs font-black rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center shadow">
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
