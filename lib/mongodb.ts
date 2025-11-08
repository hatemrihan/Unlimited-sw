import mongoose from 'mongoose';
import { getMongoDBStatus } from './mongodb-config';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseCache | undefined;
}

// MongoDB Connection Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alkadyy-dev';

// Connection status
const status = getMongoDBStatus();

if (!process.env.MONGODB_URI) {
  console.log('ℹ️  MongoDB: Using default local connection');
  console.log('💡 To set up MongoDB:');
  console.log('   📍 Local: Install MongoDB Community Server');
  console.log('   ☁️  Cloud: MongoDB Atlas (free tier available)');
  console.log('   📝 Update .env.local with: MONGODB_URI=your_connection_string');
} else {
  console.log(`✅ MongoDB: ${status.isAtlas ? 'Atlas (Cloud)' : 'Local'} connection configured`);
}

// Show current status
if (status.fallbackActive) {
  console.log('📁 Fallback: JSON files will be used if MongoDB unavailable');
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

// Store the cache globally to persist across hot reloads
if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  // Return immediately if already connected
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 100, // 🚀 INCREASED: Even more concurrent connections
      minPoolSize: 10, // 🚀 Keep minimum connections ready
      serverSelectionTimeoutMS: 1000, // 🚀 ULTRA-FAST: Very quick timeout
      socketTimeoutMS: 10000, // 🚀 FASTER: Reduced socket timeout
      connectTimeoutMS: 1000, // 🚀 ULTRA-FAST: Very quick connection
      family: 4, // Use IPv4, skip trying IPv6
      maxIdleTimeMS: 60000, // Keep connections alive longer
      waitQueueTimeoutMS: 1000, // 🚀 ULTRA-FAST: Don't wait long
      retryWrites: true, // 🚀 RELIABILITY: Retry failed writes
      w: 1, // 🚀 ULTRA-FAST: Don't wait for write acknowledgment
      journal: false, // 🚀 ULTRA-FAST: Skip journal for speed
      readPreference: 'nearest' as const, // 🚀 Read from nearest server
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect; 