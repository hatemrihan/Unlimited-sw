"use client";

import React, { useState, useMemo } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Product } from '../../models/product';
import { useCart } from '../../contexts/CartContext';
import Image from "next/image";
import Link from "next/link";

const Products = ({ initialProducts = [] }: { initialProducts: Product[] }) => {
  // Cart functionality
  const { addItem, state: cartState } = useCart();
  const [showCartNotification, setShowCartNotification] = useState<boolean>(false);
  const [cartNotificationKey, setCartNotificationKey] = useState<number>(0);

  // Animation ref
  const sectionRef = React.useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Memoize stock calculation for O(1) lookups during render
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    initialProducts.forEach(p => {
      if (!p._id) return;
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        map.set(
          p._id,
          p.variants.reduce((sum, v: any) => sum + (Number((v as any).stock) || 0), 0)
        );
      } else {
        map.set(p._id, Number((p as any).stock) || 0);
      }
    });
    return map;
  }, [initialProducts]);

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

      setCartNotificationKey(prev => prev + 1);
      setShowCartNotification(true);

      setTimeout(() => {
        setShowCartNotification(false);
      }, 3000);

    } catch (error) {
      console.error('❌ Error adding to cart:', error);
    }
  };

  return (
    <section className="relative bg-stone-900 text-[#b3b3b3] pt-22 pb-8 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-12 xl:pb-16" id="products">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div className="text-lg sm:text-xl font-bold tracking-[0.2em] uppercase mb-12 lg:mb-16 text-center text-[#b3b3b3]">
        — OUR PRODUCTS
      </div>

        {initialProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {initialProducts.map((product, index) => {
              const availableStock = getAvailableStock(product._id!);
              
              return (
              <article key={product._id}>
                <Link
                  href={`/product/${product._id}`}
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
                      
                      {availableStock === 0 &&
                        ((product as any).showPreorderBadge ? (
                          <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                            PREORDER
                          </div>
                        ) : (
                          <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                            OUT OF STOCK
                          </div>
                        ))}
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
        <AnimatePresence>
          {showCartNotification && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-4 right-4 bg-stone-900 text-white px-6 py-3 rounded-lg z-50"
            >
              Added to cart!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Products;