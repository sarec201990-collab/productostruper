import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, CartItem, BrandInfo, ProductsResponse } from './types.js';
import { Header } from './components/Header.js';
import { SearchBar } from './components/SearchBar.js';
import { FilterBar } from './components/FilterBar.js';
import { ProductCard } from './components/ProductCard.js';
import { CartDrawer } from './components/CartDrawer.js';
import { ShoppingCart, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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
      params.set('limit', '24');

      const res = await fetch(`/api/v1/products?${params.toString()}`);
      const data: ProductsResponse = await res.json();

      if (isAppend) {
        setProducts((prev) => [...prev, ...(data.products || [])]);
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

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, true);
    }
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

  return (
    <div className="min-h-screen flex flex-col bg-[#f9fafb]">
      {/* Header */}
      <Header
        totalCartItems={totalCartItems}
        onOpenCart={() => setIsCartOpen(true)}
        sellerPhone={SELLER_WHATSAPP}
      />

      {/* Hero Banner with Truper Official Aesthetics */}
      <section className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white pt-8 pb-10 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f07d00_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative max-w-4xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Catálogo Completo y Vigente</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Herramientas <span className="text-orange-500">Truper</span> al Mejor Precio
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
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

            {/* Load More Button */}
            {page < totalPages && (
              <div className="mt-10 mb-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3.5 rounded-2xl bg-white border border-gray-300 hover:border-orange-500 text-gray-800 font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 inline-flex items-center space-x-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span>Cargando más productos...</span>
                    </>
                  ) : (
                    <span>Cargar más productos ({products.length} de {totalResults.toLocaleString()})</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button for Mobile Cart */}
      {totalCartItems > 0 && (
        <div className="fixed bottom-6 right-6 z-30 sm:hidden">
          <button
            onClick={() => setIsCartOpen(true)}
            className="p-4 bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center space-x-2 active:scale-90 transition-transform"
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="bg-gray-900 text-white text-xs font-black rounded-full h-5 px-1.5 flex items-center justify-center">
              {totalCartItems}
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 text-center text-xs text-gray-500 space-y-2">
        <p className="font-semibold text-gray-700">
          Catálogo Digital Truper · Todos los derechos reservados · Flexivor
        </p>
        <p className="text-gray-400">
          Precios sujetos a cambio sin previo aviso. Imágenes oficiales propiedad de Truper, S.A. de C.V.
        </p>
      </footer>
    </div>
  );
};
