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

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 50, // 🚀 INCREASED: More concurrent connections for speed
      serverSelectionTimeoutMS: 2000, // 🚀 FASTER: Reduced timeout for quicker fails
      socketTimeoutMS: 20000, // 🚀 FASTER: Reduced socket timeout
      connectTimeoutMS: 2000, // 🚀 FASTER: Quick connection timeout
      family: 4, // Use IPv4, skip trying IPv6
      maxIdleTimeMS: 30000, // 🚀 OPTIMIZED: Close idle connections faster
      waitQueueTimeoutMS: 2000, // 🚀 FASTER: Don't wait long for connections
      retryWrites: true, // 🚀 RELIABILITY: Retry failed writes
      w: 'majority', // 🚀 PERFORMANCE: Write concern for speed
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