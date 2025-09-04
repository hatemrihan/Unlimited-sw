require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Use the URI from .env.local
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  console.log('💡 Make sure your .env.local file contains: MONGODB_URI=your_mongodb_uri');
  process.exit(1);
}

async function migrateData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB!');
    console.log('📊 Database:', mongoose.connection.name);

    // Define schemas
    const IntroItemSchema = new mongoose.Schema({
      title: String,
      mainImage: String,
      leftImage: String,
      rightImage: String,
      description: String,
      url: String,
      isVideo: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
      order: { type: Number, default: 0 }
    }, { timestamps: true });

    const ProductSchema = new mongoose.Schema({
      name: String,
      nameArabic: String,
      price: Number,
      originalPrice: Number,
      mainImage: String,
      images: [String],
      description: String,
      promoCode: String,
      variants: [{
        name: String,
        size: String,
        color: String,
        stock: Number,
        price: Number
      }],
      stock: Number,
      isActive: { type: Boolean, default: true },
      isFeatured: { type: Boolean, default: false },
      order: { type: Number, default: 0 }
    }, { timestamps: true });

    const IntroItem = mongoose.model('IntroItem', IntroItemSchema);
    const Product = mongoose.model('Product', ProductSchema);

    // Clear existing data (optional)
    console.log('🧹 Clearing existing data...');
    await IntroItem.deleteMany({});
    await Product.deleteMany({});

    // Migrate Intro Items
    console.log('\n📦 Migrating intro items...');
    try {
      const introData = await fs.readFile(path.join(__dirname, 'data', 'intro-items.json'), 'utf8');
      const introItems = JSON.parse(introData);

      for (const item of introItems) {
        const newItem = new IntroItem({
          title: item.title,
          mainImage: item.mainImage,
          leftImage: item.leftImage,
          rightImage: item.rightImage,
          description: item.description,
          url: item.url,
          isVideo: item.isVideo || false,
          isActive: item.isActive !== false,
          order: item.order || 0
        });
        await newItem.save();
        console.log(`✅ Migrated: ${item.title}`);
      }
      console.log(`🎉 Migrated ${introItems.length} intro items!`);
    } catch (error) {
      console.log('⚠️  No intro items to migrate:', error.message);
    }

    // Migrate Products
    console.log('\n🛒 Migrating products...');
    try {
      const productsData = await fs.readFile(path.join(__dirname, 'data', 'products.json'), 'utf8');
      const products = JSON.parse(productsData);

      for (const product of products) {
        const newProduct = new Product({
          name: product.name,
          nameArabic: product.nameArabic,
          price: product.price,
          originalPrice: product.originalPrice,
          mainImage: product.mainImage,
          images: product.images || [],
          description: product.description,
          promoCode: product.promoCode,
          variants: product.variants || [],
          stock: product.stock,
          isActive: product.isActive !== false,
          isFeatured: product.isFeatured || false,
          order: product.order || 0
        });
        await newProduct.save();
        console.log(`✅ Migrated: ${product.name}`);
      }
      console.log(`🎉 Migrated ${products.length} products!`);
    } catch (error) {
      console.log('⚠️  No products to migrate:', error.message);
    }

    // Show final counts
    const introCount = await IntroItem.countDocuments();
    const productCount = await Product.countDocuments();

    console.log('\n📊 FINAL COUNTS:');
    console.log(`   Intro Items: ${introCount}`);
    console.log(`   Products: ${productCount}`);

    console.log('\n✅ Migration completed! Check your MongoDB Compass.');
    console.log('🎯 Your data is now properly stored in MongoDB Atlas!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Possible solutions:');
    console.log('   1. Check your MongoDB Atlas URI in .env.local');
    console.log('   2. Verify your IP is whitelisted in MongoDB Atlas');
    console.log('   3. Check your username/password are correct');
  } finally {
    await mongoose.disconnect();
  }
}

migrateData();
