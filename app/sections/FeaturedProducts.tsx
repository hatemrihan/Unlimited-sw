"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Product } from '../../models/product';
import { useCart } from '../../contexts/CartContext';

const FeaturedProducts = () => {
  // COMPLETELY SEPARATE STATE - No conflicts with regular products
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cart functionality
  const { addItem, state: cartState } = useCart();
  const [showCartNotification, setShowCartNotification] = useState<boolean>(false);
  const [cartNotificationKey, setCartNotificationKey] = useState<number>(0);

  // Animation ref
  const sectionRef = React.useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // COMPLETELY SEPARATE API CALL - Independent from regular products
  useEffect(() => {
    const fetchOnlyFeaturedProducts = async () => {
      try {
        console.log('🎯 FEATURED: Starting completely separate fetch...');
        setIsLoading(true);
        setError(null);

        // COMPLETELY SEPARATE ENDPOINT - Only for featured products
        const response = await fetch('/api/products?featured=true');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('🎯 FEATURED: API Response:', data);

        if (data.products && Array.isArray(data.products)) {
          if (data.products.length > 0) {
            console.log('🎯 FEATURED: Found', data.products.length, 'featured products');
            // Show ALL featured products (not limited)
            setFeaturedProducts(data.products);
          } else {
            console.log('🎯 FEATURED: No featured products found');
            setFeaturedProducts([]);
          }
        } else {
          console.log('🎯 FEATURED: Invalid response format');
          setFeaturedProducts([]);
        }
      } catch (err) {
        console.error('🎯 FEATURED: Error fetching:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setFeaturedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

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
      addItem({
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price: product.price,
        stock: product.stock
      }, 1);

      // Show cart notification
      setCartNotificationKey(prev => prev + 1);
      setShowCartNotification(true);

      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowCartNotification(false);
      }, 3000);

      console.log('✅ Added to cart:', product.name);
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="relative bg-black text-[#b3b3b3] py-16" id="featured">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-4"></div>
          <p>Loading Featured Products...</p>
        </div>
      </section>
    );
  }

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

        {/* Section Title */}
        <motion.div
          className="text-center mb-16 sm:mb-12 lg:mb-16"
          initial={{opacity: 0, y: 50}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 1, y: 0}}
          transition={{duration: 0.2, delay: 0.1}}
        >
          <h2 className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#b3b3b3] uppercase tracking-wider">
             FEATURED PRODUCTS
          </h2>
          <motion.div
            className="w-12 sm:w-12 lg:w-16 h-0.5 bg-gradient-to-r from-transparent via-[#b3b3b3] to-transparent mx-auto mt-4 sm:mt-3"
            initial={{scaleX: 0}}
            animate={isInView ? {scaleX: 1} : {scaleX: 1}}
            transition={{duration: 0.3, delay: 0.2}}
          ></motion.div>
        </motion.div>



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
                <div className="aspect-square mb-2 lg:mb-3 overflow-hidden bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto">
                  <img
                    src={product.mainImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      console.error('❌ Featured product image load error:', product.name);
                      e.currentTarget.style.backgroundColor = '#333';
                    }}
                  />
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
          /* No Featured Products State */
          <motion.div
            className="text-center py-6 sm:py-8 lg:py-12 border border-gray-700 rounded-lg"
            initial={{opacity: 0, y: 50}}
            animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 50}}
            transition={{duration: 0.2, delay: 0.3}}
          >
            <h2 className="text-lg sm:text-xl lg:text-2xl font-medium text-[#b3b3b3] mb-3 text-center">FEATURED PRODUCTS</h2>
            <p className="text-[#b3b3b3]/70 mb-4 sm:mb-6 text-sm sm:text-base">Featured products coming soon. Admin can mark products as featured from the dashboard.</p>
            <motion.button
              onClick={() => window.location.href = '/admin'}
              className="bg-[#b3b3b3] text-black px-6 sm:px-8 py-2 sm:py-3 font-bold uppercase tracking-wider hover:bg-[#b3b3b3]/80 transition-colors duration-300 text-sm sm:text-base"
              initial={{opacity: 0, scale: 0.9}}
              animate={isInView ? {opacity: 1, scale: 1} : {opacity: 0, scale: 0.9}}
              transition={{duration: 0.2, delay: 0.4}}
            >
              Go to Admin
            </motion.button>
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