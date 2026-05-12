"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Nav from '../sections/Nav';
import Footer from '../sections/Footer';
import { useCart } from '../../contexts/CartContext';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProductVariant {
  name: string;
  size: string;
  color: string;
  stock: number;
  price?: number;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  originalPrice?: number;
  mainImage: string;
  images: string[];
  description: string;
  categories?: string[];
  discount?: number;
  isActive?: boolean;
  stock?: number;
  order?: number;
  variants?: ProductVariant[];
  showPreorderBadge?: boolean;
  showOutOfStockBadge?: boolean;
  customOutOfStockMessage?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Compute available stock from variants, or fall back to product.stock */
const getAvailableStock = (p: Product): number => {
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    return p.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }
  return Number(p.stock) || 0;
};

// ─── ProductCard ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  index: number;
}

const ProductCard = ({ product, onAddToCart, index }: ProductCardProps) => {
  const hasDiscount = Number(product.discount) > 0 && !!product.originalPrice;
  const isOutOfStock = getAvailableStock(product) === 0;

  return (
    <article className="group relative flex flex-col h-full">
      <Link href={`/product/${product._id}`} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-800 mb-3 max-w-[180px] mx-auto">
          {product.mainImage ? (
            <Image
              src={product.mainImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
              priority={index < 5}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-700">
              <span className="text-gray-400 text-xs">No image</span>
            </div>
          )}

          {/* Badges — inside the relative container so absolute positioning works */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            {hasDiscount && (
              <div className="bg-stone-900 text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                {product.discount}% OFF
              </div>
            )}
            {isOutOfStock && (
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
      </Link>

      <div className="text-center flex flex-col flex-grow mt-2">
        <Link href={`/product/${product._id}`}>
          <h3 className="text-sm font-light text-[#b3b3b3] mb-1 hover:underline line-clamp-2">
            {product.name}
          </h3>
        </Link>

        <div className="font-light text-sm mb-2">
          <span className="text-[#b3b3b3]">{product.price.toLocaleString()} L.E</span>
          {hasDiscount && product.originalPrice && (
            <span className="ml-2 text-gray-500 line-through text-xs">
              {product.originalPrice.toLocaleString()} L.E
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 pb-2">
          {isOutOfStock ? (
            <span className="inline-block pb-1 border-b border-stone-600 text-stone-600 uppercase tracking-[0.15em] text-[10px] sm:text-xs font-bold cursor-not-allowed">
              OUT OF STOCK
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToCart(product);
              }}
              className="inline-block pb-1 border-b border-[#b3b3b3] text-[#b3b3b3] hover:text-white hover:border-white uppercase tracking-[0.15em] text-[10px] sm:text-xs font-bold transition-colors duration-300"
            >
              ADD TO CART
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

// ─── Shop Page ────────────────────────────────────────────────────────────────

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { addItem } = useCart();
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [cartNotificationKey, setCartNotificationKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products');
        const data = await response.json();
        if (data.success && data.products) {
          setProducts(data.products);
        } else {
          setError('Failed to load products');
        }
      } catch (err) {
        setError('Network error loading products');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Memoize derived data to avoid recomputing on every render
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.flatMap(p => p.categories ?? [])))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter(p => {
      if (selectedCategory !== 'All') {
        const match = p.categories?.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()));
        if (!match) return false;
      }
      if (query) {
        const inName = p.name?.toLowerCase().includes(query);
        const inDesc = p.description?.toLowerCase().includes(query);
        const inCat  = p.categories?.some(c => c.toLowerCase().includes(query));
        if (!inName && !inDesc && !inCat) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleAddToCart = (product: Product) => {
    const stock = getAvailableStock(product);
    if (stock <= 0) return;

    addItem({
      id: product._id,
      name: product.name,
      image: product.mainImage || product.images?.[0],
      price: product.price,
      stock,
    }, 1);

    setCartNotificationKey(prev => prev + 1);
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 3000);
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-stone-900 text-[#b3b3b3] pt-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Breadcrumb */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Shop</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </motion.div>

          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-3xl font-light text-[#b3b3b3]">Shop Collection</h1>
            {error && (
              <motion.p className="mt-4 text-sm text-red-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.p>
            )}
          </motion.div>

          {/* Filters */}
          <motion.div
            className="flex flex-col items-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Search */}
            <div className="w-full max-w-md mx-auto mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 text-sm bg-transparent border border-white/20 text-white rounded-none focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-[#b3b3b3]"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            {categories.length > 1 && (
              <div className="flex gap-6 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 text-sm whitespace-nowrap transition-colors duration-300 ${
                      selectedCategory === cat
                        ? 'border-b-2 border-gray-400 font-medium text-[#b3b3b3]'
                        : 'text-gray-400 hover:text-[#b3b3b3]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Grid — flex layout to ensure centering on all screen sizes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {loading ? (
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-12">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-1rem)] lg:w-[calc(25%-2.25rem)] max-w-[280px] shrink-0">
                    <div className="aspect-[3/4] w-full bg-gray-800 mb-2 max-w-[220px] mx-auto" />
                    <div className="h-4 bg-gray-800 rounded mb-1 max-w-[200px] mx-auto" />
                    <div className="h-3 bg-gray-800 rounded w-20 mx-auto" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No products found matching your criteria.</p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-12">
                {filteredProducts.map((product, index) => (
                  <div key={product._id} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-1rem)] lg:w-[calc(25%-2.25rem)] max-w-[280px] shrink-0">
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      index={index}
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </main>

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

      <Footer />
    </>
  );
}
