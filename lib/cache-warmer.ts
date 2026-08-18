// Cache warming utility to pre-load data on server start
import { apiCache } from './cache';
import { CACHE_TTL } from './cache-ttl';
import { cacheKeys } from './cache-keys';
import dbConnect from './mongodb';
import Product from '@/product/model';

const PRODUCT_FIELDS = 'name price originalPrice discount mainImage images videos description promoCode variants stock isActive order showOutOfStockBadge showPreorderBadge category tags specifications shippingInfo faqs detailedDescription cityPricing';

export async function warmCache() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔥 Starting cache warming...');
  }
  const startTime = Date.now();
  
  try {
    // Connect to MongoDB once
    await dbConnect();
    
    // Pre-load all active products
    const allProductsPromise = Product.find({ isActive: true })
      .select(PRODUCT_FIELDS)
      .sort({ order: 1 })
      .lean()
      .exec();
    
    // Execute query
    const allProducts = await allProductsPromise;
    
    // Cache the results with 5-minute TTL
    apiCache.set(cacheKeys.products.all(), allProducts, CACHE_TTL.PRODUCTS);
    
    const warmTime = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Cache warmed in ${warmTime}ms — ${allProducts.length} products`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
    return false;
  }
}

// Auto-warm cache in production
if (process.env.NODE_ENV === 'production') {
  warmCache().catch(console.error);
}






