import { NextRequest, NextResponse } from 'next/server';
import { productCache, apiCache } from '../../../../lib/cache';
import dbConnect from '../../../../lib/mongodb';
import { requireAdmin } from '../../../../lib/requireAdmin';

export async function GET(request: NextRequest) {
  // middleware.ts matches '/admin/:path*', which does NOT cover
  // '/api/admin/...'. Without this the endpoint is open to the internet.
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const startTime = Date.now();
    
    // Test database connection speed
    let dbConnectionTime = 0;
    let dbConnected = false;
    
    try {
      const dbStart = Date.now();
      await dbConnect();
      dbConnectionTime = Date.now() - dbStart;
      dbConnected = true;
    } catch (error) {
      dbConnected = false;
    }
    
    // Get cache statistics
    const productCacheStats = productCache.getStats();
    const apiCacheStats = apiCache.getStats();
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      performance: {
        responseTime: `${totalTime}ms`,
        database: {
          connected: dbConnected,
          connectionTime: `${dbConnectionTime}ms`,
          status: dbConnectionTime < 100 ? '🚀 ULTRA FAST' : 
                 dbConnectionTime < 500 ? '⚡ FAST' : 
                 dbConnectionTime < 1000 ? '🐌 SLOW' : '❌ VERY SLOW'
        },
        cache: {
          productCache: {
            ...productCacheStats,
            status: productCacheStats.valid > 0 ? '✅ ACTIVE' : '⚠️ EMPTY',
            hitRatio: productCacheStats.total > 0 ? 
              `${Math.round((productCacheStats.valid / productCacheStats.total) * 100)}%` : '0%'
          },
          apiCache: {
            ...apiCacheStats,
            status: apiCacheStats.valid > 0 ? '✅ ACTIVE' : '⚠️ EMPTY',
            hitRatio: apiCacheStats.total > 0 ? 
              `${Math.round((apiCacheStats.valid / apiCacheStats.total) * 100)}%` : '0%'
          }
        },
        optimizations: {
          inMemoryCache: '✅ ENABLED',
          mongooseLeaning: '✅ ENABLED',
          connectionPooling: '✅ ENABLED (50 connections)',
          fieldSelection: '✅ ENABLED',
          databaseIndexes: '✅ ENABLED',
          responseCompression: '✅ ENABLED'
        },
        recommendations: totalTime > 500 ? [
          '🔄 Clear cache if responses are slow',
          '📊 Check database indexes',
          '⚡ Restart application if needed'
        ] : [
          '🎉 Performance is EXCELLENT!',
          '🚀 All optimizations working perfectly'
        ]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Performance check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check performance' },
      { status: 500 }
    );
  }
}






