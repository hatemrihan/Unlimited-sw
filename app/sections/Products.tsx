"use client";

import React, { useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Product } from '../../models/product';
import { useCart } from '../../contexts/CartContext';

const Products = () => {
  // State for managing products from database
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Start with false for instant display

  // Cart functionality
  const { addItem, state: cartState } = useCart();
  const [showCartNotification, setShowCartNotification] = useState<boolean>(false);
  const [cartNotificationKey, setCartNotificationKey] = useState<number>(0);

  // Animation ref
  const sectionRef = React.useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Fetch products from admin-controlled database with instant loading
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fast fetch without showing loading state
        const response = await fetch('/api/products');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.products) {
            setProducts(data.products);
            
            // Set featured product (first one or specifically marked as featured)
            const featured = data.products.find((p: Product) => p.isFeatured) || data.products[0];
            setFeaturedProduct(featured);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching products:', error);
      }
    };

    // Immediate fetch without loading state
    fetchProducts();
  }, []);

  // Handle shop button click
  const handleShopClick = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/shop';
    }
  };

  // Handle product card click
  const handleProductClick = (productId: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/product/${productId}`;
    }
  };

  // Handle add to cart with beautiful animation
  const handleAddToCart = (product: Product) => {
    try {
      addItem({
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price: product.price,
        stock: product.stock
      }, 1);

      // Show beautiful cart notification
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

  // Remove loading screen - show content immediately

  return (
    <section className="relative bg-black text-[#b3b3b3] pt-22 pb-8 sm:pt-12 sm:pb-12 lg:pt-16 lg:pb-12 xl:pb-16" id="products">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div className="text-lg sm:text-xl font-bold tracking-[0.2em] uppercase mb-12 lg:mb-16 text-center text-[#b3b3b3]">
        — OUR PRODUCTS
      </div>

        {/* Products Grid - Calisthenics Equipment Style */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {products.map((product, index) => (
              <div
                key={product._id}
                className="group cursor-pointer"
                onClick={() => handleProductClick(product._id!)}
              >
                {/* Product Image */}
                <div className="aspect-square mb-2 lg:mb-3 overflow-hidden bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto relative">
                  <img
                    src={product.mainImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      console.error('❌ Product image load error:', product.name);
                      e.currentTarget.style.backgroundColor = '#333';
                    }}
                  />
                  
                  {/* Badges Container - Stacked Vertically */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    {/* Discount Badge */}
                    {product.discount && product.discount > 0 && (
                      <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                        {product.discount}% OFF
                      </div>
                    )}
                    
                    {/* Admin-controlled badges (only when stock is 0) */}
                    {product.stock !== undefined && product.stock === 0 && (
                      <>
                        { // show only if admin enabled
                          (product as any).showOutOfStockBadge && (
                            <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                              OUT OF STOCK
                            </div>
                          )
                        }
                        { // show only if admin enabled
                          (product as any).showPreorderBadge && (
                            <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                              PREORDER
                            </div>
                          )
                        }
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className="bg-transparent border border-white text-white px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-white hover:text-black transition-all duration-300 whitespace-nowrap"
                  >
                    ADD TO CART
                  </button>
                </div>
              </div>
            ))}
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
              className="fixed top-4 right-4 bg-black text-white px-6 py-3 rounded-lg z-50"
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