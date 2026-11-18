import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, CartItem, BrandInfo, ProductsResponse } from './types.js';
import { Header } from './components/Header.js';
import { SearchBar } from './components/SearchBar.js';
import { FilterBar } from './components/FilterBar.js';
import { ProductCard } from './components/ProductCard.js';
import { CartDrawer } from './components/CartDrawer.js';
import { TruperChatWidget } from './components/TruperChatWidget.js';
import { StartupSplash } from './components/StartupSplash.js';
import { ShoppingCart, Loader2, Sparkles, AlertCircle, ArrowUp, MessageCircle } from 'lucide-react';

const SELLER_WHATSAPP = '5215500000000'; // Número predeterminado o configurable

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<BrandInfo[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Cart state persisted in localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('truper_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Track window scroll for "Scroll to Top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save cart changes
  useEffect(() => {
    localStorage.setItem('truper_cart', JSON.stringify(cart));
  }, [cart]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 280);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch brand list once
  useEffect(() => {
    fetch('/api/v1/brands')
      .then((res) => res.json())
      .then((data: BrandInfo[]) => {
        if (Array.isArray(data)) setBrands(data);
      })
      .catch((err) => console.error('Error loading brands:', err));
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async (currentPage: number, isAppend: boolean = false) => {
    if (isAppend) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedBrand && selectedBrand !== 'Todas') params.set('brand', selectedBrand);
      params.set('page', currentPage.toString());
      params.set('limit', '40'); // Load 40 items per batch for smoother continuous scrolling

      const res = await fetch(`/api/v1/products?${params.toString()}`);
      const data: ProductsResponse = await res.json();

      if (isAppend) {
        setProducts((prev) => {
          // Avoid duplicates by checking existing IDs
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = (data.products || []).filter(p => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
      } else {
        setProducts(data.products || []);
      }

      setTotalPages(data.totalPages || 1);
      setTotalResults(data.total || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, selectedBrand]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [debouncedSearch, selectedBrand, fetchProducts]);

  // Auto Infinite Scroll with IntersectionObserver (No click required)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProducts(nextPage, true);
        }
      },
      { threshold: 0.1, rootMargin: '400px' } // Preload 400px before user hits bottom
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [page, totalPages, loading, loadingMore, fetchProducts]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sort products client-side for immediate responsive feeling
  const sortedProducts = useMemo(() => {
    if (priceSort === 'asc') {
      return [...products].sort((a, b) => a.price - b.price);
    }
    if (priceSort === 'desc') {
      return [...products].sort((a, b) => b.price - a.price);
    }
    return products;
  }, [products, priceSort]);

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#f9fafb]">
      {/* Startup Intro Splash (Ecosistema Flexivor) */}
      <StartupSplash />

      {/* Header */}
      <Header
        totalCartItems={totalCartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        sellerPhone={SELLER_WHATSAPP}
      />

      {/* Hero Banner with Official Flexivor & Truper Aesthetics */}
      <section className="bg-gradient-to-br from-[#0b2f68] via-[#10428e] to-[#1456b8] text-white pt-8 pb-10 px-4 text-center relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="relative max-w-4xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#38bdf8] text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#f07d00]" />
            <span>Catálogo Oficial Vigente · Flexivor</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Herramientas <span className="text-[#f07d00]">Truper</span> al Mejor Precio
          </h1>
          <p className="text-sm sm:text-base text-sky-100 max-w-2xl mx-auto font-medium">
            Explora más de 16,000 productos con precios públicos con IVA. Selecciona lo que necesitas y consulta o pide directamente por WhatsApp.
          </p>
        </div>
      </section>

      {/* Main Catalog View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          totalResults={totalResults}
          loading={loading}
        />

        {/* Filter Bar */}
        <FilterBar
          brands={brands}
          selectedBrand={selectedBrand}
          onSelectBrand={setSelectedBrand}
          priceSort={priceSort}
          onChangePriceSort={setPriceSort}
        />

        {/* Products Grid */}
        {loading && products.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <p className="text-sm font-semibold">Cargando productos de Truper...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-800">No encontramos coincidencias</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Intenta con otra palabra clave, código o restablece los filtros de marca para ver más productos.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBrand('Todas');
              }}
              className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800"
            >
              Ver todos los productos
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  sellerPhone={SELLER_WHATSAPP}
                />
              ))}
            </div>

            {/* Auto Infinite Scroll Sentinel & Status */}
            <div ref={observerTarget} className="mt-8 mb-12 flex flex-col items-center justify-center text-center min-h-[60px]">
              {loadingMore && (
                <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-white border border-[#dce4ec] shadow-sm text-xs font-bold text-[#1456b8]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#f07d00]" />
                  <span>Cargando más productos automáticamente...</span>
                </div>
              )}
              {!loadingMore && page >= totalPages && products.length > 0 && (
                <div className="text-center py-4 text-xs font-semibold text-gray-400">
                  <span>✓ Has explorado los {totalResults.toLocaleString()} productos de este catálogo</span>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 sm:bottom-8 sm:right-8 z-30 p-3.5 bg-white/95 text-[#0b2f68] hover:text-[#f07d00] rounded-full shadow-lg border border-[#dce4ec] backdrop-blur-sm active:scale-90 transition-all hover:shadow-xl"
          title="Volver arriba"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {/* Floating Action Button for Mobile Cart (shifted if chat FAB is present) */}
      {totalCartItems > 0 && (
        <div className="fixed bottom-24 right-6 z-30 sm:hidden">
          <button
            onClick={() => setIsCartOpen(true)}
            className="p-3.5 bg-[#f07d00] text-white rounded-full shadow-2xl flex items-center justify-center space-x-2 active:scale-90 transition-transform border-2 border-white"
            title="Ver pedido"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="bg-[#142230] text-white text-[11px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
              {totalCartItems}
            </span>
          </button>
        </div>
      )}

      {/* Floating Action Button for Truper Live Chat */}
      {!isSupportOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsSupportOpen(true)}
            className="group flex items-center space-x-2 bg-[#e52421] hover:bg-[#c91d1a] text-white px-4 py-3.5 rounded-full shadow-2xl hover:shadow-red-500/30 transition-all active:scale-95 border-2 border-white cursor-pointer"
            title="Envíenos un mensaje"
          >
            <div className="relative">
              <MessageCircle className="w-6 h-6 fill-white stroke-[#e52421]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
            </div>
            <span className="hidden sm:inline-block font-bold text-xs sm:text-sm tracking-tight pr-1">
              Envíenos un mensaje
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        sellerPhone={SELLER_WHATSAPP}
      />

      {/* Truper Live Chat Widget (Diseño exacto de la imagen) */}
      <TruperChatWidget
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        cartCount={totalCartItems}
        cartTotal={totalCartPrice}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-[#dce4ec] py-8 px-4 text-center text-xs text-[#5d6c7b] space-y-3">
        <div className="flex items-center justify-center space-x-2">
          <img src="/icons/logo-flexivor-web.png" alt="Flexivor" className="h-6 w-auto object-contain opacity-80" />
          <span className="font-bold text-[#142230]">Catálogo Digital Truper · Ecosistema Flexivor</span>
        </div>
        <p className="text-gray-400">
          Precios con IVA vigentes sujetos a cambio sin previo aviso. Imágenes oficiales propiedad de Truper, S.A. de C.V.
        </p>
      </footer>
    </div>
  );
};
