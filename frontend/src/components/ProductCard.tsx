import React, { useState } from 'react';
import { Product } from '../types.js';
import { MessageCircle, ShoppingCart, Check, ImageOff, Share2 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  sellerPhone?: string;
}

const BRAND_BADGES: Record<string, { bg: string; text: string }> = {
  Truper: { bg: 'bg-orange-100', text: 'text-orange-800' },
  Pretul: { bg: 'bg-amber-100', text: 'text-amber-900' },
  Volteck: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Foset: { bg: 'bg-teal-100', text: 'text-teal-800' },
  Fiero: { bg: 'bg-red-100', text: 'text-red-800' },
  Hermex: { bg: 'bg-slate-200', text: 'text-slate-800' },
  Expert: { bg: 'bg-neutral-900', text: 'text-orange-400' },
  Klintek: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  sellerPhone = '5215500000000'
}) => {
  const [imageError, setImageError] = useState(false);
  const [added, setAdded] = useState(false);

  const formattedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(product.price);

  const brandStyle = BRAND_BADGES[product.brand] || { bg: 'bg-gray-100', text: 'text-gray-800' };

  // Handle single product WhatsApp share
  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const productUrl = `${window.location.origin}/p/${product.code}`;
    let msg = `¡Hola! Me interesa este producto del *Catálogo Digital Truper*:\n\n`;
    msg += `📌 *${product.description}*\n`;
    msg += `• Código: *${product.code}*\n`;
    msg += `• Clave: *${product.clave}*\n`;
    msg += `• Marca: *${product.brand}*\n`;
    msg += `• Precio público con IVA: *${formattedPrice} MXN*\n\n`;
    msg += `🔗 Ver foto y detalles: ${productUrl}\n\n`;
    msg += `¿Tienen existencias disponibles?`;

    const waUrl = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article
      id={`product-${product.code}`}
      className="group bg-white rounded-2xl border border-[#dce4ec] shadow-sm hover:border-[#1456b8]/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden hover:-translate-y-1"
    >
      {/* Top Header: Brand & Clave */}
      <div className="p-3.5 pb-0 flex items-center justify-between">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${brandStyle.bg} ${brandStyle.text}`}>
          {product.brand}
        </span>
        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
          {product.clave}
        </span>
      </div>

      {/* Product Image */}
      <div className="relative w-full aspect-square p-4 flex items-center justify-center bg-white overflow-hidden">
        {!imageError ? (
          <img
            src={product.image_url}
            alt={product.description}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
            <ImageOff className="w-8 h-8 mb-2 stroke-1" />
            <span className="text-xs font-medium">Foto oficial Truper</span>
            <span className="text-[10px] text-gray-400 font-mono mt-0.5">{product.clave}</span>
          </div>
        )}

        {/* Quick share hover button on image */}
        <button
          onClick={handleShareWhatsApp}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-gray-600 hover:text-emerald-600 shadow-md backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-all active:scale-90"
          title="Compartir por WhatsApp"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-4 pt-1 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-semibold text-gray-400 mb-0.5 flex items-center space-x-1">
            <span>Cód:</span>
            <span className="font-mono font-bold text-gray-700">{product.code}</span>
            {product.family && (
              <>
                <span>·</span>
                <span className="truncate max-w-[120px]">{product.family}</span>
              </>
            )}
          </div>

          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug line-clamp-2 min-h-[2.5rem]" title={product.description}>
            {product.description}
          </h3>
        </div>

        {/* Price & Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Precio Público
              </span>
              <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {formattedPrice}
              </span>
              <span className="text-[10px] font-bold text-gray-500 ml-1">IVA incl.</span>
            </div>
            {product.unit && (
              <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                x {product.unit}
              </span>
            )}
          </div>

          {/* Buttons: WhatsApp Direct + Add to Cart */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all"
              title="Pedir o consultar por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-white shrink-0" />
              <span className="truncate">WhatsApp</span>
            </button>

            <button
              onClick={handleAdd}
              className={`w-full py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 active:scale-95 transition-all ${
                added
                  ? 'bg-gray-900 text-white'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">¡Agregado!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 shrink-0 text-orange-600" />
                  <span className="truncate">Al pedido</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
