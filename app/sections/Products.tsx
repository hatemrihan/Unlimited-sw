"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '../../models/product';
import { useCart } from '../../contexts/CartContext';
import Image from "next/image";
import Link from "next/link";

/**
 * Products Section — Homepage product grid
 * 
 * Architecture:
 * - Receives `initialProducts` from the Server Component (direct MongoDB, zero fetch)
 * - Hydrates client-side, then does ONE background refresh to pick up real-time stock changes
 * - "Load More" fetches additional pages from `/api/products` (MongoDB-only, no static fallback)
 * - All product links use MongoDB `_id` — never slugs or static IDs
 */

interface ProductsProps {
  initialProducts: Product[];
  initialHasMore?: boolean;
}

const Products = ({ initialProducts = [], initialHasMore = false }: ProductsProps) => {
  const router = useRouter();
  const { addItem } = useCart();

  // Product state — initialized from server, refreshed on mount
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const isMounted = useRef(true);

  // Background refresh on mount — picks up stock/price changes since server render
  useEffect(() => {
    isMounted.current = true;

    const refreshProducts = async () => {
      try {
        const res = await fetch(`/api/products?page=1&limit=6`, { cache: 'no-store' });
        if (!res.ok) return; // Don't override good server data with an error
        
        const data = await res.json();
        if (isMounted.current && data.success && data.products?.length > 0) {
          setProducts(data.products);
          setHasMore(data.hasMore);
        }
      } catch {
        // Silent — keep using server-rendered data
      }
    };

    refreshProducts();
    return () => { isMounted.current = false; };
  }, []);

  // ── Load More — paginated fetch ────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/products?page=${nextPage}&limit=6`, { cache: 'no-store' });

      if (!res.ok) throw new Error('API returned error');

      const data = await res.json();
      if (isMounted.current && data.success) {
        setProducts(prev => [...prev, ...(data.products || [])]);
        setHasMore(data.hasMore);
        setPage(nextPage);
      }
    } catch {
      if (isMounted.current) {
        setLoadMoreError('فشل تحميل المنتجات. جرب تاني.');
      }
    } finally {
      if (isMounted.current) setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page]);

  // ── Stock Map — O(1) lookups during render ─────────────────────────────────
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (!p._id) continue;
      const stock = (Array.isArray(p.variants) && p.variants.length > 0)
        ? p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : (p.stock || 0);
      map.set(p._id, stock);
    }
    return map;
  }, [products]);

  // ── Buy Now — add to cart + go straight to checkout ────────────────────────
  const handleBuyNow = useCallback((e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();

    const stock = stockMap.get(product._id!) || 0;
    if (stock <= 0) return;

    addItem({
      id: product._id!,
      name: product.name,
      image: product.mainImage,
      price: product.price,
      stock,
    }, 1);

    router.push('/checkout');
  }, [addItem, stockMap, router]);

  return (
    <section
      className="relative bg-stone-900 text-[#b3b3b3] pt-24 pb-8 sm:pt-28 sm:pb-12 lg:pt-36 lg:pb-12 xl:pt-48 xl:pb-16"
      id="products"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-lg sm:text-xl font-bold tracking-[0.2em] uppercase mb-12 lg:mb-16 text-center text-[#b3b3b3]">
          — OUR PRODUCTS
        </div>

        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {products.map((product, index) => {
                const availableStock = stockMap.get(product._id!) || 0;

                return (
                  <article key={product._id} className="h-full">
                    <Link
                      href={`/product/${product._id}`}
                      className="group flex flex-col h-full"
                    >
                      {/* Product Image */}
                      <div
                        className="mb-2 lg:mb-3 overflow-hidden bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto relative w-full"
                        style={{ aspectRatio: '1080 / 1350' }}
                      >
                        <Image
                          src={product.mainImage}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 140px, (max-width: 1024px) 160px, 180px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          priority={index < 3}
                        />

                        {/* Badges */}
                        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                          {Number(product.discount) > 0 && !!product.originalPrice && (
                            <div className="bg-stone-900 text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                              {product.discount}% OFF
                            </div>
                          )}

                          {product.customOutOfStockMessage && (
                            <div className="bg-stone-900 text-white px-1.5 py-0.5 text-[10px] font-medium uppercase w-fit" dir="auto">
                              {product.customOutOfStockMessage}
                            </div>
                          )}

                          {availableStock === 0 && !product.customOutOfStockMessage && (
                            product.showPreorderBadge ? (
                              <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase w-fit">
                                PREORDER
                              </div>
                            ) : (
                              <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase w-fit">
                                OUT OF STOCK
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="text-center flex flex-col flex-grow">
                        <h3 className="text-white text-xs sm:text-sm lg:text-base font-medium mb-1 group-hover:text-gray-300 transition-colors duration-300 line-clamp-2">
                          {product.name}
                        </h3>

                        <div className="mb-2">
                          <span className="text-white font-bold text-sm lg:text-base">
                            {product.price.toLocaleString()} L.E
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <div className="text-gray-400 line-through text-xs lg:text-sm mt-1">
                              {product.originalPrice.toLocaleString()} L.E
                            </div>
                          )}
                        </div>

                        {/* Buy Now */}
                        <div className="mt-auto pt-4 pb-2">
                          {availableStock > 0 ? (
                            <button
                              onClick={(e) => handleBuyNow(e, product)}
                              className="inline-block pb-1 border-b border-[#b3b3b3] text-[#b3b3b3] hover:text-white hover:border-white uppercase tracking-[0.15em] text-[10px] sm:text-xs font-bold transition-colors duration-300"
                            >
                              BUY NOW
                            </button>
                          ) : (
                            <span className="inline-block pb-1 border-b border-stone-600 text-stone-600 uppercase tracking-[0.15em] text-[10px] sm:text-xs font-bold cursor-not-allowed">
                              OUT OF STOCK
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-12 text-center flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="bg-transparent border border-white text-white px-8 py-3 text-sm font-medium uppercase tracking-[0.1em] hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 flex items-center gap-3"
                >
                  {isLoadingMore && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isLoadingMore ? 'LOADING...' : 'LOAD MORE'}
                </button>
              </div>
            )}
            {loadMoreError && (
              <p className="text-red-400 text-sm text-center mt-3">{loadMoreError}</p>
            )}
          </>
        ) : (
          /* Skeleton placeholders while loading */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-square mb-2 lg:mb-3 bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto rounded" />
                <div className="text-center">
                  <div className="h-4 bg-gray-800 rounded mb-2 w-3/4 mx-auto" />
                  <div className="h-4 bg-gray-800 rounded mb-2 w-1/2 mx-auto" />
                  <div className="h-8 bg-gray-800 rounded w-20 mx-auto" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Products;