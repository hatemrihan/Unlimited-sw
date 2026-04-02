"use client";

import React, { useState, useMemo } from 'react';
import { Product } from '../../models/product';
import { useCart } from '../../contexts/CartContext';
import { nameToSlug } from '../../data/products';
import Image from "next/image";
import Link from "next/link";

const Products = ({ 
  initialProducts = [], 
  initialHasMore = false 
}: { 
  initialProducts: Product[]; 
  initialHasMore?: boolean;
}) => {
  // Cart functionality
  const { addItem } = useCart();
  const [showCartNotification, setShowCartNotification] = useState<boolean>(false);

  // Pagination state
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Load more function
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/products?page=${nextPage}&limit=6`);
      if (res.ok) {
        const data = await res.json();
        if (isMounted.current) {
          setProducts(prev => [...prev, ...data.products]);
          setHasMore(data.hasMore);
          setPage(nextPage);
        }
      }
    } catch (error) {
      if (isMounted.current) {
        setLoadMoreError('Failed to load more products. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingMore(false);
      }
    }
  };

  // Memoize stock calculation for O(1) lookups during render
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => {
      if (!p._id) return;
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        map.set(
          p._id,
          p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        );
      } else {
        map.set(p._id, p.stock || 0);
      }
    });
    return map;
  }, [products]);

  const getAvailableStock = (productId: string): number => {
    return stockMap.get(productId) || 0;
  };

  // Handle add to cart with beautiful animation
  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();
    
    try {
      const availableStock = getAvailableStock(product._id!);
      
      if (availableStock <= 0) return;

      addItem({
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price: product.price,
        stock: availableStock 
      }, 1);

      setShowCartNotification(true);

      setTimeout(() => {
        setShowCartNotification(false);
      }, 3000);

    } catch (error) {
      console.error('Add to cart failed:', error);
    }
  };

  return (
    <section className="relative bg-stone-900 text-[#b3b3b3] pt-22 pb-8 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-12 xl:pb-16" id="products">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div className="text-lg sm:text-xl font-bold tracking-[0.2em] uppercase mb-12 lg:mb-16 text-center text-[#b3b3b3]">
        — OUR PRODUCTS
      </div>

        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {products.map((product, index) => {
                const availableStock = getAvailableStock(product._id!);
                
                return (
                <article key={product._id}>
                  <Link
                    href={`/product/${nameToSlug(product.name)}`}
                    className="group block"
                  >
                    {/* Product Image */}
                    <div 
                      className="mb-2 lg:mb-3 overflow-hidden bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto relative"
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
                      
                      {/* Badges Container - Stacked Vertically */}
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        {Number(product.discount) > 0 && !!product.originalPrice && (
                          <div className="bg-stone-900 text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                            {product.discount}% OFF
                          </div>
                        )}
                        
                        {availableStock === 0 && (
                          <>
                            {product.customOutOfStockMessage && (
                              <div className="bg-red-600 border border-red-500 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest animate-pulse shadow-md rounded-sm w-fit" dir="auto">
                                {product.customOutOfStockMessage}
                              </div>
                            )}
                            {product.showPreorderBadge ? (
                              <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase w-fit">
                                PREORDER
                              </div>
                            ) : (
                              <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase w-fit">
                                OUT OF STOCK
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div className="text-center">
                      <h3 className="text-white text-xs sm:text-sm lg:text-base font-medium mb-1 group-hover:text-gray-300 transition-colors duration-300 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      {/* Price */}
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
                      
                      {/* Add to Cart Button */}
                      {availableStock > 0 ? (
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          className="bg-transparent border border-white text-white px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-white hover:text-black transition-all duration-300 whitespace-nowrap"
                        >
                          ADD TO CART
                        </button>
                      ) : (
                        <button
                          disabled
                          onClick={(e) => e.preventDefault()}
                          className="bg-gray-700 border border-gray-600 text-gray-400 px-3 py-1.5 text-xs font-medium uppercase tracking-wider cursor-not-allowed whitespace-nowrap opacity-60"
                        >
                          OUT OF STOCK
                        </button>
                      )}
                    </div>
                  </Link>
                </article>
              )})}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-12 text-center flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="bg-transparent border border-white text-white px-8 py-3 text-sm font-medium uppercase tracking-[0.1em] hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 flex items-center gap-3"
                >
                  {isLoadingMore && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
          /* Skeleton Loading or No Products State */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-square mb-2 lg:mb-3 bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto rounded"></div>
                <div className="text-center">
                  <div className="h-4 bg-gray-800 rounded mb-2 w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-800 rounded mb-2 w-1/2 mx-auto"></div>
                  <div className="h-8 bg-gray-800 rounded w-20 mx-auto"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Added to Cart Animation */}
        {showCartNotification && (
          <div className="fixed top-4 right-4 bg-stone-900 text-white px-6 py-3 rounded-lg z-50 animate-fade-in transition-opacity duration-300">
            Added to cart!
          </div>
        )}
      </div>
    </section>
  );
};

export default Products;