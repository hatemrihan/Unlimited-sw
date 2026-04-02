"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '../../../models/product';
import Nav from '../../sections/Nav';
import ProductDetailsTabs from './ProductDetailsTabs';
import { useCart } from '../../../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import Footer from '@/app/sections/Footer';
import { nameToSlug } from '../../../data/products';

type Variant = {
  name: string;
  stock: number;
  price?: number;
  images?: string[];
};

interface Props {
  product: Product;
  allProducts: Product[];
}

// Helper — detect video URLs
const isVideoUrl = (url: string) =>
  url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') ||
  url.includes('.webm') || url.includes('video/upload');

// Build the media array for display (variant images first, then product images + videos)
function getDisplayMedia(product: Product, selectedVariant: Variant | null): string[] {
  let media: string[] = [];
  if (selectedVariant?.images && selectedVariant.images.length > 0) {
    media = selectedVariant.images;
  } else {
    media = [product.mainImage, ...(product.images || [])].filter(Boolean);
  }
  if (product.videos && product.videos.length > 0) {
    media = [...media, ...product.videos];
  }
  return media;
}

export default function ProductClient({ product, allProducts }: Props) {
  const router = useRouter();
  const { addItem } = useCart();

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [cartNotificationKey, setCartNotificationKey] = useState(0);

  // Animation refs
  const imagesRef = React.useRef(null);
  const infoRef = React.useRef(null);
  const relatedRef = React.useRef(null);

  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : product.stock <= 0;
  const allMedia = getDisplayMedia(product, selectedVariant);

  const handleAddToCart = () => {
    try {
      addItem({
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price: selectedVariant?.price || product.price,
        variant: selectedVariant ? { name: selectedVariant.name, color: selectedVariant.name } : undefined,
      }, quantity);
      setCartNotificationKey(prev => prev + 1);
      setShowCartNotification(true);
      setTimeout(() => setShowCartNotification(false), 3000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleBuyNow = () => {
    try {
      addItem({
        id: product._id!,
        name: product.name,
        image: product.mainImage,
        price: selectedVariant?.price || product.price,
        variant: selectedVariant ? { name: selectedVariant.name, color: selectedVariant.name } : undefined,
      }, quantity);
      setTimeout(() => { window.location.href = '/checkout'; }, 100);
    } catch (error) {
      window.location.href = '/checkout';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-stone-900 text-[#b3b3b3]">
        <Nav />

        <div className="pt-20 lg:pt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

              {/* Left Side - Images */}
              <motion.div
                ref={imagesRef}
                className="space-y-4"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <motion.div
                  className="relative"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  {/* Horizontal Scrollable Gallery */}
                  <div
                    className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide"
                    style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                    onScroll={(e) => {
                      const container = e.currentTarget;
                      const newIndex = Math.round(container.scrollLeft / container.clientWidth);
                      setCurrentImageIndex(newIndex);
                    }}
                  >
                    {allMedia.map((media, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-full bg-gray-800 overflow-hidden"
                        style={{ scrollSnapAlign: 'start', aspectRatio: '1080 / 1350', maxWidth: '1080px', maxHeight: '1350px' }}
                      >
                        {isVideoUrl(media) ? (
                          <video src={media} className="w-full h-full object-cover" controls preload="metadata" playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img
                            src={media}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

                {/* Thumbnails (desktop) */}
                {allMedia.length > 1 && (
                  <div className="hidden lg:grid grid-cols-4 gap-2">
                    {allMedia.map((media, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const gallery = document.querySelector('.flex.overflow-x-auto') as HTMLElement | null;
                          if (gallery) gallery.scrollTo({ left: index * gallery.clientWidth, behavior: 'smooth' });
                          setCurrentImageIndex(index);
                        }}
                        className={`aspect-square overflow-hidden bg-gray-800 border-2 transition-colors duration-300 rounded-lg ${currentImageIndex === index ? 'border-white' : 'border-transparent hover:border-gray-400'}`}
                      >
                        {isVideoUrl(media) ? (
                          <video src={media} className="w-full h-full object-cover" preload="metadata" playsInline muted />
                        ) : (
                          <img src={media} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Right Side - Product Info */}
              <motion.div
                ref={infoRef}
                className="space-y-3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {/* Title & Price */}
                <div>
                  <h1 className="text-lg lg:text-xl font-bold mb-2 text-center">{product.name}</h1>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    {product.discount && product.discount > 0 && product.originalPrice ? (
                      <>
                        <span className="text-base lg:text-lg font-bold">{product.price.toLocaleString()} LE</span>
                        <span className="text-sm text-gray-400 line-through">{product.originalPrice.toLocaleString()} LE</span>
                        <span className="bg-red-600 text-white px-1.5 py-0.5 text-xs font-medium rounded">{product.discount}% OFF</span>
                      </>
                    ) : (
                      <span className="text-base lg:text-lg font-bold">{product.price.toLocaleString()} LE</span>
                    )}
                    {isOutOfStock && product.customOutOfStockMessage && (
                      <span className="bg-red-600 border border-red-500 shadow-md text-white px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded animate-pulse ml-2" dir="auto">{product.customOutOfStockMessage}</span>
                    )}
                    {(product as any).showOutOfStockBadge && isOutOfStock && (
                      <span className="bg-gray-700 text-white px-1.5 py-0.5 text-xs font-medium rounded ml-2">OUT OF STOCK</span>
                    )}
                  </div>
                </div>

                {/* Variants */}
                {product.variants && product.variants.length > 0 && (
                  <div>
                    <label className="text-xs font-medium mb-2 flex items-center justify-center">Color</label>
                    <div className="flex flex-wrap gap-2 items-center justify-center">
                      {product.variants.map((variant, index) => (
                        <button
                          key={index}
                          onClick={() => { setSelectedVariant(variant); setQuantity(1); setCurrentImageIndex(0); }}
                          className={`px-3 py-1.5 border text-xs font-medium transition-colors duration-300 ${selectedVariant === variant ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white hover:bg-white hover:text-black'}`}
                        >
                          {variant.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="flex items-center justify-center text-xs font-medium mb-2">Quantity</label>
                  <div className="flex items-center space-x-3 justify-center">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-white hover:bg-white hover:text-black transition-colors duration-300 flex items-center justify-center text-sm font-bold">-</button>
                    <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="text-white hover:bg-white hover:text-black transition-colors duration-300 flex items-center justify-center text-sm font-bold">+</button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {isOutOfStock ? (
                    <button disabled className="w-full bg-gray-700 border border-gray-600 text-gray-400 px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-not-allowed opacity-60">Out of Stock</button>
                  ) : (
                    <>
                      <button onClick={handleAddToCart} className="w-full bg-transparent border border-white text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-all duration-300">Add to cart</button>
                      <button onClick={handleBuyNow} className="w-full bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors duration-300">Buy it now</button>
                    </>
                  )}
                </div>

                <ProductDetailsTabs product={product} />
              </motion.div>
            </div>

            {/* Related Products */}
            <motion.div
              ref={relatedRef}
              className="mt-20 lg:mt-26"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.h2
                className="text-lg sm:text-xl lg:text-2xl font-bold text-center mb-16 lg:mb-20 uppercase tracking-wider text-[#b3b3b3]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                MIGHT ALSO LIKE
              </motion.h2>

              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                {allProducts.filter(p => p._id !== product._id).slice(0, 6).map((relatedProduct) => (
                  <div
                    key={relatedProduct._id}
                    className="group cursor-pointer"
                    onClick={() => window.location.href = `/product/${nameToSlug(relatedProduct.name)}`}
                  >
                    <div className="aspect-square mb-2 lg:mb-3 overflow-hidden bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto">
                      {isVideoUrl(relatedProduct.mainImage) ? (
                        <video src={relatedProduct.mainImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" preload="metadata" playsInline muted />
                      ) : (
                        <img src={relatedProduct.mainImage} alt={relatedProduct.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="text-[#b3b3b3] text-xs sm:text-sm lg:text-base font-medium mb-1 group-hover:text-[#b3b3b3]/70 transition-colors duration-300 line-clamp-2">{relatedProduct.name}</h3>
                      <p className="text-[#b3b3b3] font-bold text-sm lg:text-base">{relatedProduct.price.toLocaleString()} L.E</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

          </div>
        </div>

        {/* Cart notification */}
        <AnimatePresence>
          {showCartNotification && (
            <motion.div
              key={cartNotificationKey}
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
}
