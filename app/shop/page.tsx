"use client";

import React, { useState, useEffect } from 'react';
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

// Use your existing Product interface
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
  isFeatured?: boolean;
  isActive?: boolean;
  detailedDescription?: string;
  specifications?: string;
  shippingInfo?: string;
  faqs?: { question: string; answer: string }[];
  variants?: {
    name: string;
    size: string;
    color: string;
    stock: number;
    price?: number;
  }[];
  stock?: number;
  order?: number;
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false); // Start with false for instant display
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { addItem, state: cartState } = useCart();
  const [showCartNotification, setShowCartNotification] = useState<boolean>(false);
  const [cartNotificationKey, setCartNotificationKey] = useState<number>(0);

  // Animation refs
  const headerRef = React.useRef(null);
  const filtersRef = React.useRef(null);
  const productsRef = React.useRef(null);

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        // Fast fetch without showing loading state

        // Fetch both regular and featured products
        const [regularResponse, featuredResponse] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/products?featured=true')
        ]);

        let allProducts: Product[] = [];
        let featuredList: Product[] = [];

        // Process regular products
        if (regularResponse.ok) {
          const regularData = await regularResponse.json();
          if (regularData.products) {
            allProducts = regularData.products;
          }
        }

        // Process featured products
        if (featuredResponse.ok) {
          const featuredData = await featuredResponse.json();
          if (featuredData.products) {
            featuredList = featuredData.products;
            setFeaturedProducts(featuredData.products);
          }
        }

        // Ensure featured products are marked as featured
        const markedFeaturedList = featuredList.map(product => ({
          ...product,
          isFeatured: true
        }));

        // Combine all products and remove duplicates
        const combinedProducts = [...allProducts, ...markedFeaturedList].filter(
          (product, index, self) => index === self.findIndex(p => p._id === product._id)
        );



        setProducts(combinedProducts);

      } catch (err: unknown) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      }
    };

    fetchAllProducts();
  }, []);

  // Get unique categories from your products
  const categories = ['All', ...Array.from(new Set(products.flatMap(p => p.categories || [])))];

  const filteredProducts = products.filter(product => {
    // Category filter using your existing categories field
    if (selectedCategory === 'All') {
      // If no category filter, just filter by search
    } else {
      const hasMatchingCategory = product.categories?.some(cat =>
        cat.toLowerCase().includes(selectedCategory.toLowerCase())
      );
      if (!hasMatchingCategory) return false;
    }

    // Search filter - prioritize name search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const productName = product.name?.toLowerCase() || '';
      const productDescription = product.description?.toLowerCase() || '';

      // First check if name contains the search query (exact or partial)
      const nameMatch = productName.includes(query);

      // If name doesn't match, check description
      const descriptionMatch = productDescription.includes(query);

      // Check categories as well
      const categoryMatch = product.categories?.some(cat =>
        cat.toLowerCase().includes(query)
      ) || false;

      if (!nameMatch && !descriptionMatch && !categoryMatch) {
        return false;
      }
    }

    return true;
  });

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product._id,
      name: product.name,
      image: product.mainImage || product.images[0],
      price: product.price,
      stock: product.stock
    }, 1);

    setCartNotificationKey(prev => prev + 1);
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 3000);
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-black text-[#b3b3b3] pt-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Breadcrumb */}
          <motion.div
            className="mb-6"
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.1}}
          >
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/">Home</Link>
                  </BreadcrumbLink>
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
            ref={headerRef}
            className="text-center mb-12"
            initial={{opacity: 0, y: 50}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.2}}
          >
            <h1 className="text-3xl font-light text-[#b3b3b3]">
              Shop Collection
            </h1>
            {error && <motion.p
              className="mt-4 text-sm text-red-500"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{duration: 0.6, delay: 0.4}}
            >{error}</motion.p>}
          </motion.div>

          {/* Filters */}
          <motion.div
            ref={filtersRef}
            className="flex flex-col items-center mb-12"
            initial={{opacity: 0, y: 30}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, delay: 0.3}}
          >
            {/* Search Bar */}
            <div className="w-full max-w-md mx-auto mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 text-sm bg-black border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 placeholder-gray-400"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>



            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="flex gap-6 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-4 py-2 text-sm whitespace-nowrap transition-colors duration-300 ${
                      selectedCategory === category
                        ? 'border-b-2 border-gray-400 font-medium text-[#b3b3b3]'
                        : 'text-gray-400 hover:text-[#b3b3b3]'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </motion.div>



          {/* Product Grid */}
          <motion.div
            ref={productsRef}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.6, delay: 0.4}}
          >
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] w-full bg-gray-700 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded mb-1"></div>
                  <div className="h-3 bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No products found matching your criteria.</p>
            </div>
          ) : (
            <>
              {/* Desktop: 5 columns with reduced image size and spacing */}
              <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} onAddToCart={handleAddToCart} />
                ))}
              </div>

              {/* Tablet: 3 columns */}
              <div className="hidden md:grid md:grid-cols-3 lg:hidden gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} onAddToCart={handleAddToCart} />
                ))}
              </div>

              {/* Mobile: 2 columns with spacing */}
              <div className="grid grid-cols-2 gap-3 md:hidden">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} onAddToCart={handleAddToCart} isMobile />
                ))}
              </div>
            </>
          )}
          </motion.div>
        </div>
      </main>

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

      <Footer />
    </>
  );
}

const ProductCard = ({ product, onAddToCart, isMobile = false }: {
  product: Product;
  onAddToCart: (product: Product) => void;
  isMobile?: boolean;
}) => {
  const hasDiscount = product.discount && Number(product.discount) > 0 && product.originalPrice;
  const finalPrice = product.price; // Price is already the final discounted price

  return (
    <div className="group block relative">
      <Link href={`/product/${product._id}`} className="block">
        <div className={`aspect-[3/4] w-full overflow-hidden bg-gray-800 ${isMobile ? 'mb-2' : 'mb-3'} ${isMobile ? 'max-w-[120px]' : 'max-w-[180px]'} mx-auto`}>
          {product.mainImage ? (
            <>
              <Image
                src={product.mainImage}
                alt={product.name}
                width={500}
                height={625}
                className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                {hasDiscount && (
                  <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                    {product.discount}% OFF
                  </div>
                )}
                
                {/* Stock Badges - Only show admin-enabled badges when stock is 0 */}
                {(() => {
                  // Calculate total available stock from variants or main stock
                  const variantStock = Array.isArray(product.variants) && product.variants.length > 0
                    ? product.variants.reduce((sum: number, v: any) => sum + (Number((v as any).stock) || 0), 0)
                    : Number((product as any).stock) || 0;
                  return variantStock;
                })() === 0 && (
                  <>
                    {/* Show OUT OF STOCK badge only if admin enabled it */}
                    {(product as any).showOutOfStockBadge && (
                      <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                        OUT OF STOCK
                      </div>
                    )}
                    {/* Show PREORDER badge only if admin enabled it */}
                    {(product as any).showPreorderBadge && (
                      <div className="bg-black text-white px-1.5 py-0.5 text-[10px] font-medium uppercase">
                        PREORDER
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-700">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
      </Link>

      <div className={`text-center ${isMobile ? 'mb-6' : 'mt-4'}`}>
        <Link href={`/product/${product._id}`}>
          <h3 className={`text-sm font-light text-[#b3b3b3] mb-1 ${isMobile ? 'text-xs' : ''} hover:underline`}>
            {product.name}
          </h3>
        </Link>

        <div className={`font-light ${isMobile ? 'text-xs' : 'text-sm'} mb-2`}>
          <span className="text-[#b3b3b3]">{finalPrice} L.E</span>
          {hasDiscount && product.originalPrice && (
            <span className="ml-2 text-gray-500 line-through text-xs">{product.originalPrice} L.E</span>
          )}
        </div>

        {(() => {
          const variantStock = Array.isArray(product.variants) && product.variants.length > 0
            ? product.variants.reduce((sum: number, v: any) => sum + (Number((v as any).stock) || 0), 0)
            : Number((product as any).stock) || 0;
          return variantStock === 0;
        })() ? (
          <button
            disabled
            className="bg-gray-600 text-gray-300 px-4 py-2 text-xs font-medium uppercase tracking-wider cursor-not-allowed"
          >
            SOLD OUT
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              onAddToCart(product);
            }}
            className="bg-transparent border border-white text-white px-4 py-2 text-xs font-medium uppercase tracking-wider hover:bg-gray-800  transition-colors duration-300"
          >
            ADD TO CART
          </button>
        )}
      </div>
    </div>
  );
};
