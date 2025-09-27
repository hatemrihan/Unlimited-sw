"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Product } from '../../models/product';
import { useCart } from '../../contexts/CartContext';

const FeaturedProducts = () => {
  // COMPLETELY SEPARATE STATE - No conflicts with regular products
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Start with false for instant display
  const [error, setError] = useState<string | null>(null);

  // Cart functionality
  const { addItem, state: cartState } = useCart();
  const [showCartNotification, setShowCartNotification] = useState<boolean>(false);
  const [cartNotificationKey, setCartNotificationKey] = useState<number>(0);

  // Animation ref
  const sectionRef = React.useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // COMPLETELY SEPARATE API CALL - Independent from regular products with instant loading
  useEffect(() => {
    const fetchOnlyFeaturedProducts = async () => {
      try {
        // Fast fetch without showing loading state
        const response = await fetch('/api/products?featured=true');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.products && Array.isArray(data.products)) {
          setFeaturedProducts(data.products);
        } else {
          setFeaturedProducts([]);
        }
      } catch (err) {
        console.error('🎯 FEATURED: Error fetching:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setFeaturedProducts([]);
      }
    };

    // Immediate fetch without loading state
    fetchOnlyFeaturedProducts();
  }, []);

  // Handle product card click
  const handleProductClick = (productId: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/product/${productId}`;
    }
  };

  // Handle add to cart
  const handleAddToCart = (product: Product) => {
    try {
      // Calculate total available stock from variants or use product stock
      const availableStock = Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.reduce((sum: number, v: any) => sum + (Number((v as any).stock) || 0), 0)
        : Number((product as any).stock) || 0;
      
      // Don't add if no stock available
      if (availableStock <= 0) {
        console.log('❌ Cannot add to cart - no stock available for:', product.name);
        return;
      }

      addItem({
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price: product.price,
        stock: availableStock // Use calculated total stock
      }, 1);

      // Show cart notification
      setCartNotificationKey(prev => prev + 1);
      setShowCartNotification(true);

      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowCartNotification(false);
      }, 3000);

      console.log('✅ Added to cart:', product.name, `(Stock: ${availableStock})`);
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
    }
  };

  // Remove loading screen - show content immediately

  // Error state
  if (error) {
  return (
      <section className="relative bg-black text-[#b3b3b3] py-16" id="featured">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-red-400 mb-4">Error loading featured products: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-black text-[#b3b3b3] pt-22 pb-8 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-12 xl:pb-16 border-t border-gray-800" id="featured" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div className="text-lg sm:text-xl font-bold tracking-[0.2em] uppercase mb-12 lg:mb-16 text-center text-[#b3b3b3]">
        — OUR FEATURED PRODUCTS
      </div>



        {/* Featured Products Grid - Calisthenics Equipment Style */}
        {featuredProducts.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
            initial={{opacity: 0}}
            animate={isInView ? {opacity: 1} : {opacity: 1}}
            transition={{duration: 0.2, delay: 0.3}}
          >
            {featuredProducts.map((product, index) => (
              <motion.div
                key={product._id || index}
                className="group cursor-pointer"
                onClick={() => handleProductClick(product._id!)}
                initial={{opacity: 0, y: 50}}
                animate={isInView ? {opacity: 1, y: 0} : {opacity: 1, y: 0}}
                transition={{duration: 0.2, delay: 0.4 + index * 0.05}}
              >
                {/* Product Image */}
                <div 
                  className="mb-2 lg:mb-3 overflow-hidden bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto relative"
                  style={{ aspectRatio: '1080 / 1350' }} // 1080px width × 1350px height
                >
                  <img
                    src={product.mainImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ aspectRatio: '1080 / 1350' }}
                    onError={(e) => {
                      console.error('❌ Featured product image load error:', product.name);
                      e.currentTarget.style.backgroundColor = '#333';
                    }}
                  />
                  
                  {/* Badges Container - Stacked Vertically */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    {/* Discount Badge */}
                    {product.discount && Number(product.discount) > 0 && product.originalPrice && (
                      <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                        {product.discount}% OFF
                      </div>
                    )}
                    
                    {/* Admin-controlled badges (only when total available stock is 0) */}
                    {(() => {
                      // Calculate total available stock from variants or main stock
                      const variantStock = Array.isArray(product.variants) && product.variants.length > 0
                        ? product.variants.reduce((sum: number, v: any) => sum + (Number((v as any).stock) || 0), 0)
                        : Number((product as any).stock) || 0;
                      return variantStock === 0;
                    })() && (
                      <>
                        {(product as any).showOutOfStockBadge && (
                          <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                            OUT OF STOCK
                          </div>
                        )}
                        {(product as any).showPreorderBadge && (
                          <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                            PREORDER
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Product Info */}
                <div className="text-center">
                  <h3 className="text-[#b3b3b3] text-xs sm:text-sm lg:text-base font-medium mb-1 group-hover:text-[#b3b3b3]/70 transition-colors duration-300 line-clamp-2">
                    {product.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-2">
                    <span className="text-[#b3b3b3] font-bold text-sm lg:text-base">
                      {product.price.toLocaleString()} L.E
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <div className="text-[#b3b3b3]/50 line-through text-xs lg:text-sm mt-1">
                        {product.originalPrice.toLocaleString()} L.E
                      </div>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className="bg-transparent border border-[#b3b3b3] text-[#b3b3b3] px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-[#b3b3b3] hover:text-black transition-all duration-300 whitespace-nowrap"
                  >
                    ADD TO CART
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* Skeleton Loading for Featured Products */
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
            initial={{opacity: 0}}
            animate={isInView ? {opacity: 1} : {opacity: 1}}
            transition={{duration: 0.2, delay: 0.3}}
          >
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-square mb-2 lg:mb-3 bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto rounded"></div>
                <div className="text-center">
                  <div className="h-4 bg-gray-800 rounded mb-2 w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-800 rounded mb-2 w-1/2 mx-auto"></div>
                  <div className="h-8 bg-gray-800 rounded w-20 mx-auto"></div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Added to Cart Animation */}
        <AnimatePresence>
          {showCartNotification && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-4 right-4 bg-black text-[#b3b3b3] px-6 py-3 rounded-lg z-50"
            >
              Added to cart!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default FeaturedProducts;