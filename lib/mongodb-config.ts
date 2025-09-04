/**
 * MongoDB Configuration and Setup Guide
 *
 * This file provides multiple options for MongoDB connectivity
 * to ensure your app always works without errors.
 */

export const MONGODB_CONFIG = {
  // Option 1: Local MongoDB (Free, requires installation)
  LOCAL_URI: 'mongodb://localhost:27017/alkadyy-dev',

  // Option 2: MongoDB Atlas (Cloud, free tier available)
  ATLAS_TEMPLATE: 'mongodb+srv://username:password@cluster.mongodb.net/alkadyy-dev?retryWrites=true&w=majority',

  // Option 3: Alternative cloud providers
  CLOUD_PROVIDERS: {
    MONGODB_ATLAS: 'https://www.mongodb.com/atlas',
    SUPABASE: 'https://supabase.com',
    PLANETSCALE: 'https://planetscale.com'
  }
};

export const SETUP_INSTRUCTIONS = {
  MONGODB_ATLAS: `
🚀 MONGO DB ATLAS SETUP (Recommended for Production):

1. Go to https://www.mongodb.com/atlas
2. Create free account → Create cluster
3. Choose "FREE" tier (M0 Sandbox)
4. Set cluster name: "alkadyy-cluster"
5. Create database user:
   - Username: alkadyy-admin
   - Password: [your-secure-password]
6. Network Access → Add IP Address:
   - For development: Add "0.0.0.0/0" (allow all)
   - For production: Add your server's IP
7. Connect → Connect your application
8. Copy connection string and update .env.local:

MONGODB_URI=mongodb+srv://alkadyy-admin:[password]@alkadyy-cluster.mongodb.net/alkadyy-dev?retryWrites=true&w=majority
`,

  LOCAL_MONGODB: `
💻 LOCAL MONGODB SETUP (Development):

1. Download MongoDB Community Server:
   https://www.mongodb.com/try/download/community

2. Install and start MongoDB service

3. Your .env.local is already configured for local:
   MONGODB_URI=mongodb://localhost:27017/alkadyy-dev

4. If you want a GUI, install MongoDB Compass:
   https://www.mongodb.com/products/compass
`,

  TROUBLESHOOTING: `
🔧 TROUBLESHOOTING:

1. Connection Timeout:
   - Check internet connection (for Atlas)
   - Verify MongoDB service is running (for local)
   - Check firewall settings

2. Authentication Failed:
   - Verify username/password in connection string
   - Check user permissions in Atlas dashboard

3. IP Whitelist Issues:
   - Atlas: Add your current IP to whitelist
   - Local: Usually not required

4. Still having issues?
   - Your app will automatically use JSON file fallback
   - No data loss, just slower performance
`
};

export function getMongoDBStatus() {
  const uri = process.env.MONGODB_URI || MONGODB_CONFIG.LOCAL_URI;

  return {
    configured: !!process.env.MONGODB_URI,
    uri: uri,
    isLocal: uri.includes('localhost'),
    isAtlas: uri.includes('mongodb+srv'),
    fallbackActive: !process.env.MONGODB_URI || uri === MONGODB_CONFIG.LOCAL_URI
  };
}


