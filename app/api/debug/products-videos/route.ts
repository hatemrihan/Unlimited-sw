import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/product';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get all products and check their videos field
    const products = await Product.find({}).select('name videos images mainImage').lean();
    
    console.log('🔍 DEBUG: Products with videos check:');
    
    const productsWithVideos = products.filter(p => p.videos && p.videos.length > 0);
    const productsWithoutVideos = products.filter(p => !p.videos || p.videos.length === 0);
    
    console.log(`📊 Total products: ${products.length}`);
    console.log(`🎥 Products WITH videos: ${productsWithVideos.length}`);
    console.log(`📷 Products WITHOUT videos: ${productsWithoutVideos.length}`);
    
    // Log detailed info for products with videos
    productsWithVideos.forEach(p => {
      console.log(`🎬 Product "${p.name}": ${p.videos.length} videos`);
      p.videos.forEach((video, index) => {
        console.log(`   Video ${index + 1}: ${video}`);
      });
    });
    
    return NextResponse.json({
      success: true,
      totalProducts: products.length,
      productsWithVideos: productsWithVideos.length,
      productsWithoutVideos: productsWithoutVideos.length,
      productsWithVideosList: productsWithVideos.map(p => ({
        id: p._id,
        name: p.name,
        videos: p.videos,
        videoCount: p.videos.length
      })),
      allProducts: products.map(p => ({
        id: p._id,
        name: p.name,
        hasVideos: !!(p.videos && p.videos.length > 0),
        videoCount: p.videos ? p.videos.length : 0,
        videos: p.videos || []
      }))
    });
    
  } catch (error) {
    console.error('❌ Debug API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to debug products' },
      { status: 500 }
    );
  }
}
