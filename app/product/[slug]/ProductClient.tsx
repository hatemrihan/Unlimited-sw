"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Product } from '@/product/model';
import Nav from '../../sections/Nav';
import ProductDetailsTabs from './ProductDetailsTabs';
import { translator } from '@/i18n';
import type { Locale } from '@/lib/locale';
import { localized, productPath } from '@/product/seo';
import { useCart } from '../../../contexts/CartContext';
import { track } from '../../../analytics/client/track';
import { motion, AnimatePresence } from 'motion/react';
import Footer from '@/app/sections/Footer';

/**
 * ProductClient — Client-side product detail page
 *
 * Performance optimizations:
 * - Uses next/image for automatic WebP, srcset, and lazy loading
 * - Gallery scroll uses ref instead of document.querySelector
 * - Related products use router.push for client-side navigation (no full reload)
 * - Memoized computed values (displayMedia, currentStock, displayPrice)
 * 
 * Bug fixes applied:
 * - Quantity capped by live stock (was unbounded)
 * - Buy Now no longer navigates on addItem failure
 * - Stock passed to addItem for CartContext enforcement
 * - Variant comparison by name instead of reference equality
 */

type Variant = {
  name: string;
  stock: number;
  price?: number;
  images?: string[];
};

interface Props {
  product: Product;
  relatedProducts: Product[];
  /**
   * Which language this page renders in. Defaults to English so the existing
   * English route needs no change.
   */
  locale?: Locale;
}

// Helper — detect video URLs
const isVideoUrl = (url: string) =>
  url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') ||
  url.includes('.webm') || url.includes('video/upload');

export default function ProductClient({ product, relatedProducts, locale = 'en' }: Props) {
  const tr = translator(locale);
  /** The product's own text in this language, falling back to English. */
  const displayName = localized(product, 'name', locale);
  const router = useRouter();
  const { addItem } = useCart();
  const galleryRef = useRef<HTMLDivElement>(null);

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showCartNotification, setShowCartNotification] = useState(false);
  /** Set when the cart refused an add, so the button can explain itself. */
  const [cartRefusal, setCartRefusal] = useState<string | null>(null);
  const [cartNotificationKey, setCartNotificationKey] = useState(0);

  // ── Computed values (memoized) ─────────────────────────────────────────────
  const currentStock = useMemo(() => {
    return selectedVariant ? selectedVariant.stock : product.stock;
  }, [selectedVariant, product.stock]);

  const displayPrice = useMemo(() => {
    return (selectedVariant?.price && selectedVariant.price > 0)
      ? selectedVariant.price
      : product.price;
  }, [selectedVariant, product.price]);

  const isOutOfStock = currentStock <= 0;

  const allMedia = useMemo(() => {
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
  }, [selectedVariant, product.mainImage, product.images, product.videos]);

  /**
   * ViewContent — someone looked at this product.
   *
   * Once per mount, keyed on the product id, NOT on the selected variant.
   * Clicking through four colours is one person considering one product; four
   * events would make the funnel's second stage a measure of how many variants
   * a product has rather than of how many people looked at it.
   */
  useEffect(() => {
    if (!product._id) return;
    track('ViewContent', {
      productId: product._id,
      productName: product.name,
      value: product.price,
      currency: 'EGP',
      source: 'client',
    });
  }, [product._id, product.name, product.price]);

  // ── Cart actions ───────────────────────────────────────────────────────────
  const buildCartItem = useCallback(() => ({
    id: product._id!,
    name: product.name,
    image: product.mainImage,
    price: displayPrice,
    stock: currentStock,
    // `color` is left unset: there is no separate colour field on a variant, and
    // duplicating the name into it puts garbage in the order record and breaks
    // variant matching in the cart.
    variant: selectedVariant ? { name: selectedVariant.name } : undefined,
  }), [product._id, product.name, product.mainImage, displayPrice, currentStock, selectedVariant]);

  /**
   * What to say when the cart refuses an add.
   *
   * `addItem` used to return nothing, so a refusal — always a stock limit —
   * looked exactly like a working button that did nothing at all. The customer
   * pressed it again, and again.
   */
  const refusalMessage = (remaining: number) =>
    remaining > 0
      ? `Only ${remaining} more available — your cart already holds the rest.`
      : 'That is all we have in stock right now.';

  const handleAddToCart = useCallback(() => {
    try {
      const result = addItem(buildCartItem(), quantity, currentStock);

      if (!result.added) {
        setCartRefusal(refusalMessage(result.remaining));
        setTimeout(() => setCartRefusal(null), 4000);
        return;
      }

      setCartRefusal(null);
      setCartNotificationKey(prev => prev + 1);
      setShowCartNotification(true);
      setTimeout(() => setShowCartNotification(false), 3000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  }, [addItem, buildCartItem, quantity, currentStock]);

  const handleBuyNow = useCallback(() => {
    try {
      const result = addItem(buildCartItem(), quantity, currentStock);

      // Navigating on a refused add sent the customer to checkout to buy
      // something that was never added.
      if (!result.added) {
        setCartRefusal(refusalMessage(result.remaining));
        setTimeout(() => setCartRefusal(null), 4000);
        return;
      }

      router.push('/checkout');
    } catch (error) {
      console.error('Error in Buy Now:', error);
      // Don't navigate on error — item wasn't added
    }
  }, [addItem, buildCartItem, quantity, currentStock, router]);

  // ── Quantity controls (stock-bounded) ──────────────────────────────────────
  const decrementQty = useCallback(() => {
    setQuantity(prev => Math.max(1, prev - 1));
  }, []);

  const incrementQty = useCallback(() => {
    setQuantity(prev => {
      const max = currentStock > 0 ? currentStock : 1;
      return Math.min(prev + 1, max);
    });
  }, [currentStock]);

  // ── Gallery scroll via ref ─────────────────────────────────────────────────
  const scrollToImage = useCallback((index: number) => {
    if (galleryRef.current) {
      galleryRef.current.scrollTo({
        left: index * galleryRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
    setCurrentImageIndex(index);
  }, []);

  const handleGalleryScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const newIndex = Math.round(container.scrollLeft / container.clientWidth);
    setCurrentImageIndex(newIndex);
  }, []);

  // ── Variant selection ──────────────────────────────────────────────────────
  const selectVariant = useCallback((variant: Variant) => {
    setSelectedVariant(variant);
    setQuantity(1);
    setCurrentImageIndex(0);
  }, []);

  return (
    <>
      <div className="min-h-screen bg-stone-900 text-[#b3b3b3]">
        <Nav />

        <div className="pt-20 lg:pt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

              {/* Left Side - Images */}
              <motion.div
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
                    ref={galleryRef}
                    className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide"
                    style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                    onScroll={handleGalleryScroll}
                  >
                    {allMedia.map((media, index) => (
                      <div
                        key={`${media}-${index}`}
                        className="flex-shrink-0 w-full bg-gray-800 overflow-hidden relative"
                        style={{ scrollSnapAlign: 'start', aspectRatio: '1080 / 1350', maxWidth: '1080px', maxHeight: '1350px' }}
                      >
                        {isVideoUrl(media) ? (
                          <video
                            src={media}
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Image
                            src={media}
                            alt={`${product.name} - image ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            priority={index === 0}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Image Counter */}
                  {allMedia.length > 1 && (
                    <div className="absolute bottom-6 right-4 bg-black/70 text-white px-2 py-1 rounded-full text-sm" aria-live="polite">
                      {currentImageIndex + 1} / {allMedia.length}
                    </div>
                  )}
                </motion.div>

                {/* Thumbnails (desktop) */}
                {allMedia.length > 1 && (
                  <div className="hidden lg:grid grid-cols-4 gap-2">
                    {allMedia.map((media, index) => (
                      <button
                        key={`thumb-${index}`}
                        onClick={() => scrollToImage(index)}
                        aria-label={`View image ${index + 1} of ${allMedia.length}`}
                        className={`aspect-square overflow-hidden bg-gray-800 border-2 transition-colors duration-300 rounded-lg ${currentImageIndex === index ? 'border-white' : 'border-transparent hover:border-gray-400'}`}
                      >
                        {isVideoUrl(media) ? (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        ) : (
                          <img src={media} alt={`${product.name} thumbnail ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Right Side - Product Info */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {/* Title & Price */}
                <div>
                  <h1 className="text-lg lg:text-xl font-bold mb-2 text-center">{displayName}</h1>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    {product.discount && product.discount > 0 && product.originalPrice ? (
                      <>
                        <span className="text-base lg:text-lg font-bold">{displayPrice.toLocaleString()} LE</span>
                        <span className="text-sm text-gray-400 line-through">{product.originalPrice.toLocaleString()} LE</span>
                        <span className="bg-red-600 text-white px-1.5 py-0.5 text-xs font-medium rounded">{product.discount}% {tr('product.off')}</span>
                      </>
                    ) : (
                      <span className="text-base lg:text-lg font-bold">{displayPrice.toLocaleString()} LE</span>
                    )}
                    {/* Custom badge — always visible when set by admin */}
                    {product.customOutOfStockMessage && (
                      <span className="bg-stone-900 text-white px-1.5 py-0.5 text-[10px] font-medium uppercase rounded ml-2" dir="auto">{product.customOutOfStockMessage}</span>
                    )}
                    {/* Standard badge — only when out of stock AND no custom message */}
                    {isOutOfStock && !product.customOutOfStockMessage && (
                      <span className="bg-gray-700 text-white px-1.5 py-0.5 text-xs font-medium rounded ml-2">{tr('product.outOfStock')}</span>
                    )}
                  </div>
                </div>

                {/* Variants */}
                {product.variants && product.variants.length > 0 && (
                  <div>
                    <label className="text-xs font-medium mb-2 flex items-center justify-center">Color</label>
                    <div className="flex flex-wrap gap-2 items-center justify-center" role="radiogroup" aria-label="Product color options">
                      {product.variants.map((variant, index) => {
                        const isSelected = selectedVariant?.name === variant.name;
                        return (
                          <button
                            key={index}
                            onClick={() => selectVariant(variant)}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`Color: ${variant.name}${variant.stock <= 0 ? ' (out of stock)' : ''}`}
                            className={`px-3 py-1.5 border text-xs font-medium transition-colors duration-300 ${isSelected ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white hover:bg-white hover:text-black'}`}
                          >
                            {variant.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label className="flex items-center justify-center text-xs font-medium mb-2">Quantity</label>
                  <div className="flex items-center space-x-3 justify-center">
                    <button
                      onClick={decrementQty}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className={`w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                        quantity <= 1
                          ? 'text-white/30 cursor-not-allowed'
                          : 'text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      -
                    </button>
                    <span className="text-sm font-medium w-8 text-center tabular-nums" aria-live="polite" aria-label={`Quantity: ${quantity}`}>
                      {quantity}
                    </span>
                    <button
                      onClick={incrementQty}
                      disabled={!isOutOfStock && quantity >= currentStock}
                      aria-label="Increase quantity"
                      className={`w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                        !isOutOfStock && quantity >= currentStock
                          ? 'text-white/30 cursor-not-allowed'
                          : 'text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      +
                    </button>
                  </div>
                  {/* Stock indicator */}
                  {!isOutOfStock && currentStock <= 5 && (
                    <p className="text-center text-amber-400 text-xs mt-1">
                      Only {currentStock} left in stock
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {isOutOfStock ? (
                    <button disabled className="w-full bg-gray-700 border border-gray-600 text-gray-400 px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-not-allowed opacity-60">Out of Stock</button>
                  ) : (
                    <>
                      <button
                        onClick={handleAddToCart}
                        aria-label={`Add ${product.name} to cart`}
                        className="w-full bg-transparent border border-white text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-all duration-300"
                      >
                        Add to cart
                      </button>
                      <button
                        onClick={handleBuyNow}
                        aria-label={`Buy ${product.name} now`}
                        className="w-full bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors duration-300"
                      >
                        Buy it now
                      </button>
                    </>
                  )}
                </div>

                <ProductDetailsTabs product={product} locale={locale} />
              </motion.div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <motion.div
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
                  {relatedProducts.filter(p => p._id !== product._id).slice(0, 6).map((relatedProduct) => (
                    <div
                      key={relatedProduct._id}
                      className="group cursor-pointer"
                      onClick={() => router.push(productPath(relatedProduct, locale))}
                      role="link"
                      aria-label={`View ${relatedProduct.name}`}
                    >
                      <div className="aspect-square mb-2 lg:mb-3 overflow-hidden bg-gray-800 max-w-[140px] sm:max-w-[160px] lg:max-w-[180px] mx-auto relative">
                        {isVideoUrl(relatedProduct.mainImage) ? (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <svg className="w-10 h-10 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        ) : (
                          <Image
                            src={relatedProduct.mainImage}
                            alt={relatedProduct.name}
                            fill
                            sizes="(max-width: 640px) 140px, (max-width: 1024px) 160px, 180px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="text-[#b3b3b3] text-xs sm:text-sm lg:text-base font-medium mb-1 group-hover:text-[#b3b3b3]/70 transition-colors duration-300 line-clamp-2">{relatedProduct.name}</h3>
                        <p className="text-[#b3b3b3] font-bold text-sm lg:text-base tabular-nums">{relatedProduct.price.toLocaleString()} L.E</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}

          </div>
        </div>

        {/* Cart refusal — always a stock limit, and always actionable */}
        <AnimatePresence>
          {cartRefusal && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              role="status"
              aria-live="polite"
              className="fixed top-4 right-4 bg-amber-600 text-white px-6 py-3 rounded-lg z-50"
            >
              {cartRefusal}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart notification */}
        <AnimatePresence>
          {showCartNotification && (
            <motion.div
              key={cartNotificationKey}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              role="status"
              aria-live="polite"
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
