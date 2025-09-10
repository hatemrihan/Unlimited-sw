import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';

export async function GET() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    await dbConnect();
    console.log('✅ MongoDB connection successful');
    
    return NextResponse.json({ 
      success: true, 
      message: 'MongoDB connection successful',
      env: {
        hasMongoURI: !!process.env.MONGODB_URI,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      env: {
        hasMongoURI: !!process.env.MONGODB_URI,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
