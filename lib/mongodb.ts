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
      maxPoolSize: 50, // Increased for more concurrent connections
      serverSelectionTimeoutMS: 5000, // A more reasonable timeout
      socketTimeoutMS: 45000, 
      connectTimeoutMS: 10000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority' as const,
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