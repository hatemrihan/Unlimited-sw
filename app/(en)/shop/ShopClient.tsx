"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { useCart } from '@/contexts/CartContext';
import { translator } from '@/i18n';
import type { Locale } from '@/lib/locale';
import { localized, productPath } from '@/product/seo';
import { CATEGORIES, categorySlug, stockedCategories } from '@/product/categories';
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
  category?: string | null;
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
  locale: Locale;
}

const ProductCard = ({ product, onAddToCart, index, locale }: ProductCardProps) => {
  const tr = translator(locale);
  const href = productPath(product as any, locale);
  const name = localized(product as any, 'name', locale);
  const hasDiscount = Number(product.discount) > 0 && !!product.originalPrice;
  const isOutOfStock = getAvailableStock(product) === 0;

  return (
    <article className="group relative flex flex-col h-full">
      <Link href={href} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-800 mb-3 max-w-[180px] mx-auto">
          {product.mainImage ? (
            <Image
              src={product.mainImage}
              alt={name}
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
                {product.discount}% {tr('product.off')}
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
                    {tr('product.preorder')}
                  </div>
                ) : (
                  <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase w-fit">
                    {tr('product.outOfStock')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Link>

      <div className="text-center flex flex-col flex-grow mt-2">
        <Link href={href}>
          <h3 className="text-sm font-light text-[#b3b3b3] mb-1 hover:underline line-clamp-2">
            {name}
          </h3>
        </Link>

        <div className="font-light text-sm mb-2">
          <span className="text-[#b3b3b3]">{product.price.toLocaleString('en-US')} {tr('product.currency')}</span>
          {hasDiscount && product.originalPrice && (
            <span className="ml-2 text-gray-500 line-through text-xs">
              {product.originalPrice.toLocaleString('en-US')} {tr('product.currency')}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 pb-2">
          {isOutOfStock ? (
            <span className="inline-block pb-1 border-b border-stone-600 text-stone-600 uppercase tracking-[0.15em] text-[10px] sm:text-xs font-bold cursor-not-allowed">
              {tr('product.outOfStock')}
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                onAddToCart(product);
              }}
              className="inline-block pb-1 border-b border-[#b3b3b3] text-[#b3b3b3] hover:text-white hover:border-white uppercase tracking-[0.15em] text-[10px] sm:text-xs font-bold transition-colors duration-300"
            >
              {tr('product.addToCart')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

// ─── Shop Page ────────────────────────────────────────────────────────────────

export default function ShopClient({
  initialProducts,
  locale = 'en',
}: {
  initialProducts: Product[];
  locale?: Locale;
}) {
  const tr = translator(locale);
  const shopPath = locale === 'ar' ? '/ar/shop' : '/shop';
  // Rendered on the server so crawlers see every /product/ link in the HTML.
  const [products] = useState<Product[]>(initialProducts);
  const [error] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { addItem } = useCart();
  const router = useRouter();
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [cartNotificationKey, setCartNotificationKey] = useState(0);

  // Only categories with a product on sale get a link (4 Nov 2026).
  const stocked = useMemo(() => stockedCategories(products), [products]);

  // Search: the name, the description and the category's name, in either
  // language. (The old filter read `p.categories`, a field no product has,
  // so typing "parallettes" found nothing.)
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(p => {
      const cat = p.category && p.category in CATEGORIES
        ? CATEGORIES[p.category as keyof typeof CATEGORIES]
        : null;
      return [p.name, p.description, cat?.en, cat?.ar]
        .some(text => text?.toLowerCase().includes(query));
    });
  }, [products, searchQuery]);

  const handleAddToCart = (product: Product) => {
    const stock = getAvailableStock(product);
    if (stock <= 0) return;

    // Adding a variant product from the grid picks no variant, so the order
    // would decrement the aggregate mirror rather than the variant the customer
    // receives — and the cart could hold the "same" product twice. Send them to
    // the product page to choose.
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      router.push(productPath(product as any, locale));
      return;
    }

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
            <h1 className="text-3xl font-light text-[#b3b3b3]">{tr('shop.title')}</h1>
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
                  placeholder={tr('shop.search')}
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

            {/*
              Category tabs are links, not client-side filters.

              As buttons they changed only React state, so the four category
              pages had no route pointing at them and Google had no way to reach
              them. A link is crawlable; the filtering still happens instantly
              because the target pages are prerendered.
            */}
            {stocked.length > 1 && (
            <nav className="flex gap-6 overflow-x-auto pb-2">
              {stocked.map((key) => (
                <Link
                  key={key}
                  href={`${shopPath}/${categorySlug(key, locale)}`}
                  className="px-4 py-2 text-sm whitespace-nowrap text-gray-400 hover:text-[#b3b3b3] transition-colors duration-300"
                >
                  {locale === 'ar' ? CATEGORIES[key].ar : CATEGORIES[key].en}
                </Link>
              ))}
            </nav>
            )}
          </motion.div>

          {/* Product Grid — flex layout to ensure centering on all screen sizes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">{tr('shop.empty')}</p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-12">
                {filteredProducts.map((product, index) => (
                  <div key={product._id} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-1rem)] lg:w-[calc(25%-2.25rem)] max-w-[280px] shrink-0">
                    <ProductCard
                      product={product}
                      onAddToCart={handleAddToCart}
                      index={index}
                      locale={locale}
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
            {tr('product.addedToCart')}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}
