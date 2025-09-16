"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Product } from '../../../models/product';
import Nav from '../../sections/Nav';
import ProductDetailsTabs from './ProductDetailsTabs';
import { useCart } from '../../../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import Footer from '@/app/sections/Footer';

const ProductDetail = () => {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshedProduct, setRefreshedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{
    name: string;
    stock: number;
    price?: number;
    images?: string[];
  } | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  // Cart functionality
  const { addItem, state: cartState } = useCart();
  const [showCartNotification, setShowCartNotification] = useState<boolean>(false);
  const [cartNotificationKey, setCartNotificationKey] = useState<number>(0);

  // Animation refs
  const imagesRef = React.useRef(null);
  const infoRef = React.useRef(null);
  const relatedRef = React.useRef(null);

  // Fetch product details and all products
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Fetching product details for ID:', params.id);
        
        // Fetch current product with cache-busting to get latest prices
        const productResponse = await fetch(`/api/products/${params.id}?t=${Date.now()}`);
        
        if (productResponse.ok) {
          const productData = await productResponse.json();
          console.log('✅ Product data received:', productData);
          console.log('✅ Product object:', productData.product);
          console.log('🔍 Product detailed fields:', {
            specifications: productData.product.specifications,
            detailedDescription: productData.product.detailedDescription,
            shippingInfo: productData.product.shippingInfo,
            faqs: productData.product.faqs
          });
          setProduct(productData.product);
          setRefreshedProduct(productData.product); // Store refreshed data
          console.log('🔄 Product prices refreshed:', { 
            price: productData.product.price, 
            originalPrice: productData.product.originalPrice,
            discount: productData.product.discount 
          });
          
          // Set first variant as default
          if (productData.product.variants && productData.product.variants.length > 0) {
            setSelectedVariant(productData.product.variants[0]);
            setSelectedImageIndex(0); // Reset image index for default variant
            setCurrentImageIndex(0);
          }
        } else {
          console.error('❌ Failed to fetch product, status:', productResponse.status);
          router.push('/');
        }

        // Fetch all products (regular + featured) for the equipment section
        console.log('🛍️ Fetching all products for equipment section...');
        const allProductsResponse = await fetch('/api/products');
        const featuredProductsResponse = await fetch('/api/products?featured=true');

        if (allProductsResponse.ok) {
          const allProductsData = await allProductsResponse.json();
          const featuredProductsData = featuredProductsResponse.ok ? await featuredProductsResponse.json() : { products: [] };

          console.log('📦 Regular products fetched:', allProductsData.products?.length || 0);
          console.log('⭐ Featured products fetched:', featuredProductsData.products?.length || 0);

          // Combine regular and featured products, removing duplicates
          const regularProducts = allProductsData.products || [];
          const featuredProducts = featuredProductsData.products || [];

          // Create a map to avoid duplicates
          const productMap = new Map();

          // Add regular products
          regularProducts.forEach((product: Product) => {
            productMap.set(product._id, product);
          });

          // Add featured products (will override if duplicate)
          featuredProducts.forEach((product: Product) => {
            productMap.set(product._id, product);
          });

          // Convert back to array
          const combinedProducts = Array.from(productMap.values());
          console.log('🔄 Combined products total:', combinedProducts.length);
          setAllProducts(combinedProducts);
        }
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

  // Handle add to cart with beautiful animation
  const handleAddToCart = () => {
    if (!product) return;

    try {
      // Add to cart using context with selected quantity
      addItem({
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price: selectedVariant?.price || product.price,
        variant: selectedVariant ? {
          name: selectedVariant.name,
          color: selectedVariant.name // The variant name IS the color (Black, Gray, etc.)
        } : undefined
      }, quantity); // Pass the selected quantity

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

  // Handle buy now - ADD TO CART FIRST, THEN REDIRECT
  const handleBuyNow = () => {
    if (!product) return;
    
    try {
      // 🎯 FIRST: Add the selected item to cart with the selected quantity and color
      addItem({
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price: selectedVariant?.price || product.price,
        variant: selectedVariant ? {
          name: selectedVariant.name,
          color: selectedVariant.name // Include the color (Black, Gray, etc.)
        } : undefined
      }, quantity); // Pass the selected quantity (important!)

      console.log('💳 Buy now - Added to cart:', {
        product: product.name,
        variant: selectedVariant?.name,
        color: selectedVariant?.name,
        quantity: quantity
      });
      
      // 🚀 THEN: Redirect to checkout (item now in cart!)
      setTimeout(() => {
        window.location.href = '/checkout';
      }, 100); // Small delay to ensure cart updates
      
    } catch (error) {
      console.error('❌ Error in Buy Now:', error);
      // Fallback: still redirect even if add to cart fails
      window.location.href = '/checkout';
    }
  };

  // Debug logging
  console.log('🔍 Component state - loading:', loading, 'product:', product);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium mb-4">Product not found</h2>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-black px-6 py-3 font-medium hover:bg-gray-100 transition-colors duration-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Helper function to detect if a URL is a video
  const isVideoUrl = (url: string) => {
    return url.includes('.mp4') || 
           url.includes('.mov') || 
           url.includes('.avi') || 
           url.includes('.webm') || 
           url.includes('video/upload');
  };

  // Get all media (images + videos) based on selected variant or default product media
  const getDisplayMedia = () => {
    let media: string[] = [];
    
    // If variant is selected and has images, use variant images
    if (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) {
      media = selectedVariant.images;
    } else {
      // Otherwise, use main product images (main + additional)
      media = [product.mainImage, ...(product.images || [])].filter(Boolean);
    }
    
    // Add product videos if available
    if (product.videos && product.videos.length > 0) {
      media = [...media, ...product.videos];
    }
    
    return media;
  };
  
  const allMedia = getDisplayMedia();

  return (
    <>
    <div className="min-h-screen bg-black text-[#b3b3b3]">
      <Nav />
      
      <div className="pt-20 lg:pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Left Side - Images */}
            <motion.div
              ref={imagesRef}
              className="space-y-4"
              initial={{opacity: 0, x: -50}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.8, delay: 0.2}}
            >
              {/* Horizontal Scrollable Image Gallery */}
              <motion.div
                className="relative"
                initial={{scale: 0.9}}
                animate={{scale: 1}}
                transition={{duration: 0.6, delay: 0.4}}
              >
                <div 
                  className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide"
                  style={{
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none'
                  }}
                  onScroll={(e) => {
                    const container = e.currentTarget;
                    const scrollLeft = container.scrollLeft;
                    const itemWidth = container.clientWidth;
                    const newIndex = Math.round(scrollLeft / itemWidth);
                    setCurrentImageIndex(newIndex);
                  }}
                >
                  {allMedia.map((media, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-full bg-gray-800 overflow-hidden"
                      style={{ 
                        scrollSnapAlign: 'start',
                        aspectRatio: '1080 / 1350', // 1080px width × 1350px height
                        maxWidth: '1080px',
                        maxHeight: '1350px'
                      }}
                    >
                      {isVideoUrl(media) ? (
                        <video
                          src={media}
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                          playsInline
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <img
                          src={media}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading={index === 0 ? 'eager' : 'lazy'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Image Counter */}
                {allMedia.length > 1 && (
                  <div className="absolute bottom-6 right-4 bg-black/70 text-white px-2 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {allMedia.length}
                  </div>
                )}
              </motion.div>
              
              {/* Thumbnail Navigation (Optional - for desktop) */}
              {allMedia.length > 1 && (
                <div className="hidden lg:grid grid-cols-4 gap-2">
                  {allMedia.map((media, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Scroll to the specific media
                        const gallery = document.querySelector('.flex.overflow-x-auto');
                        if (gallery) {
                          const mediaWidth = gallery.clientWidth;
                          gallery.scrollTo({
                            left: index * mediaWidth,
                            behavior: 'smooth'
                          });
                        }
                        setCurrentImageIndex(index);
                      }}
                      className={`aspect-square overflow-hidden bg-gray-800 border-2 transition-colors duration-300 rounded-lg ${
                        currentImageIndex === index 
                          ? 'border-white' 
                          : 'border-transparent hover:border-gray-400'
                      }`}
                    >
                      {isVideoUrl(media) ? (
                        <video
                          src={media}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          playsInline
                          muted
                        />
                      ) : (
                        <img
                          src={media}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
              
            </motion.div>
            
            {/* Right Side - Product Info */}
            <motion.div
              ref={infoRef}
              className="space-y-6"
              initial={{opacity: 0, x: 50}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.8, delay: 0.2}}
            >
              
              {/* Product Title and Price */}
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold mb-4">{product.name}</h1>
                
                <div className="flex items-center space-x-4 mb-2">
                  {product.discount && product.discount > 0 && product.originalPrice ? (
                    <>
                      <span className="text-2xl lg:text-3xl font-bold">
                        {product.price.toLocaleString()} LE
                      </span>
                      <span className="text-lg text-gray-400 line-through">
                        {product.originalPrice.toLocaleString()} LE
                      </span>
                      <span className="bg-red-600 text-white px-2 py-1 text-sm font-medium rounded">
                        {product.discount}% OFF
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl lg:text-3xl font-bold">
                      {product.price.toLocaleString()} LE
                    </span>
                  )}
                </div>
              </div>

              {/* Variants Selection */}
              {product.variants && product.variants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-3">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant, index) => (
                      <button
                        key={index}
                        onClick={() => { 
                          setSelectedVariant(variant); 
                          setQuantity(1); 
                          setSelectedImageIndex(0); // Reset image index when variant changes
                          setCurrentImageIndex(0);
                        }}
                        className={`px-4 py-2 border  font-medium transition-colors duration-300 ${
                          selectedVariant === variant
                            ? 'bg-white text-black border-white'
                            : 'bg-transparent text-white border-white hover:bg-white hover:text-black'
                        }`}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                  
                  {/* Selected Variant Info */}
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Quantity
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-white text-white hover:bg-white hover:text-black transition-colors duration-300 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-white text-white hover:bg-white hover:text-black transition-colors duration-300 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-transparent border border-white text-white px-6 py-4 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-all duration-300"
                >
                  Add to cart
                </button>
                
                <button
                  onClick={handleBuyNow}
                  className="w-full bg-white text-black px-6 py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors duration-300"
                >
                  Buy it now
                </button>
              </div>

              {/* Product Details Sections - Animated */}
              <ProductDetailsTabs product={product} />
            </motion.div>
          </div>

          {/* Related Products Section */}
          <motion.div
            ref={relatedRef}
            className="mt-20 lg:mt-26"
            initial={{opacity: 0, y: 50}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.8, delay: 0.2}}
          >
            <motion.h2
              className="text-lg sm:text-xl lg:text-2xl font-bold text-center mb-16 lg:mb-20 uppercase tracking-wider text-[#b3b3b3]"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{duration: 0.6, delay: 0.4}}
            >
              MIGHT ALSO LIKE
            </motion.h2>

            {/* All Products Grid - Matching Products.tsx styling */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{duration: 0.6, delay: 0.6}}
            >
              {allProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct._id}
                  className="group cursor-pointer"
                  onClick={() => window.location.href = `/product/${relatedProduct._id}`}
                >
                  {/* Product Media - Matching Products.tsx sizing */}
                  <div className="aspect-square mb-2 lg:mb-3 overflow-hidden bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto">
                    {isVideoUrl(relatedProduct.mainImage) ? (
                      <video
                        src={relatedProduct.mainImage}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        preload="metadata"
                        playsInline
                        muted
                      />
                    ) : (
                      <img
                        src={relatedProduct.mainImage} 
                        alt={relatedProduct.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>

                  {/* Product Info - Matching Products.tsx styling */}
                  <div className="text-center">
                    <h3 className="text-[#b3b3b3] text-xs sm:text-sm lg:text-base font-medium mb-1 group-hover:text-[#b3b3b3]/70 transition-colors duration-300 line-clamp-2">
                      {relatedProduct.name}
                    </h3>
                    <p className="text-[#b3b3b3] font-bold text-sm lg:text-base">
                      {relatedProduct.price.toLocaleString()} L.E
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>


          </motion.div>
        </div>
      </div>

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
    <Footer />
    </>
  );
};

export default ProductDetail;





