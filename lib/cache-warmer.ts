// Cache warming utility to pre-load data on server start
import { apiCache, productCache } from './cache';
import dbConnect from './mongodb';
import Product from '../models/product';

export async function warmCache() {
  console.log('🔥 Starting cache warming...');
  const startTime = Date.now();
  
  try {
    // Connect to MongoDB once
    await dbConnect();
    
    // Pre-load all active products
    const allProductsPromise = Product.find({ isActive: true })
      .select('name price originalPrice discount mainImage images videos description promoCode variants stock isActive isFeatured order showOutOfStockBadge showPreorderBadge category tags specifications shippingInfo faqs detailedDescription cityPricing')
      .sort({ order: 1 })
      .lean()
      .exec();
    
    // Pre-load featured products
    const featuredProductsPromise = Product.find({ isFeatured: true, isActive: true })
      .select('name price originalPrice discount mainImage images videos description promoCode variants stock isActive isFeatured order showOutOfStockBadge showPreorderBadge category tags specifications shippingInfo faqs detailedDescription cityPricing')
      .sort({ order: 1 })
      .lean()
      .exec();
    
    // Execute both queries in parallel
    const [allProducts, featuredProducts] = await Promise.all([
      allProductsPromise,
      featuredProductsPromise
    ]);
    
    // Cache the results with 30-minute TTL
    apiCache.set('products:all', allProducts, 1800000);
    apiCache.set('products:featured', featuredProducts, 1800000);
    
    const warmTime = Date.now() - startTime;
    console.log(`✅ Cache warmed successfully in ${warmTime}ms`);
    console.log(`   - Cached ${allProducts.length} active products`);
    console.log(`   - Cached ${featuredProducts.length} featured products`);
    
    return true;
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
    return false;
  }
}

// Auto-warm cache in production
if (process.env.NODE_ENV === 'production') {
  // Warm cache on server start
  warmCache().catch(console.error);
  
  // Re-warm cache every 25 minutes to keep it fresh
  setInterval(() => {
    warmCache().catch(console.error);
  }, 25 * 60 * 1000);
}




