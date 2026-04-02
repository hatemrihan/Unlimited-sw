// High-performance in-memory cache system with global persistence
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Global cache storage to persist across hot reloads in development
declare global {
  var _cacheStorages: Map<string, Map<string, CacheEntry<any>>> | undefined;
}

class PerformanceCache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly maxSize = 1000; // Prevent memory leaks
  private cacheId: string;

  constructor(cacheId: string = 'default') {
    this.cacheId = cacheId;
    // Use global cache in development to persist across hot reloads
    if (process.env.NODE_ENV === 'development') {
      if (!global._cacheStorages) global._cacheStorages = new Map();
      if (!global._cacheStorages.has(cacheId)) {
        global._cacheStorages.set(cacheId, new Map());
      }
      this.cache = global._cacheStorages.get(cacheId)!;
    } else {
      this.cache = new Map();
    }
  }

  set<T>(key: string, data: T, ttlMs: number = 300000): void { // 5min default
    // Clean old entries if cache is getting large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Returns stale (expired) data if it exists, WITHOUT deleting it.
   * Used for stale-while-revalidate: caller serves stale data immediately
   * and triggers a background refresh.
   * Returns null only if the key never existed.
   */
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data as T;
  }

  /** Returns true if the key exists AND is expired (stale but present). */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // If still too large, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.2)); // Remove 20%
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp <= entry.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries
    };
  }
}

// Global cache instances with persistence in development
export const productCache = new PerformanceCache('product');
export const apiCache = new PerformanceCache('api');

// Cache invalidation helpers
export const invalidateProductCache = (productId?: string) => {
  if (productId) {
    productCache.delete(`product:${productId}`);
    productCache.delete(`product:detail:${productId}`);
  }
  
  // Invalidate related caches
  apiCache.delete('products:all');
  apiCache.delete('products:featured');
  apiCache.delete('products:admin');
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️ Product cache invalidated');
  }
};

export const invalidateCitiesCache = () => {
  apiCache.delete('cities:all');
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️ Cities cache invalidated');
  }
};

export const invalidateAllCaches = () => {
  productCache.clear();
  apiCache.clear();
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️ All caches cleared');
  }
};






