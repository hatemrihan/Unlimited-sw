import mongoose from 'mongoose';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseCache | undefined;
}

// MongoDB Connection Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alkadyy-dev';

if (process.env.NODE_ENV === 'development') {
  console.log(`MongoDB: ${process.env.MONGODB_URI ? 'Atlas configured' : 'Using local fallback'}`);
}

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined. Check your .env.local file.');
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
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Time to wait for Atlas to respond on cold start
      socketTimeoutMS: 45000, 
      connectTimeoutMS: 10000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority' as const,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');

      // Add connection event listeners for production reliability
      mongoose.connection.on('connected', () => {
        if (process.env.NODE_ENV === 'development') console.log('MongoDB re-connected');
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        if (process.env.NODE_ENV === 'development') console.warn('MongoDB disconnected');
      });

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