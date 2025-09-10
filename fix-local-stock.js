// Simple script to fix stock issues locally
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Product schema (simplified)
const productSchema = new mongoose.Schema({
  name: String,
  stock: Number,
  variants: [{
    name: String,
    stock: Number
  }]
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function fixStock() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update all products with 0 or undefined stock to have 10 stock
    console.log('📦 Updating product stocks...');
    const result = await Product.updateMany(
      { $or: [{ stock: 0 }, { stock: null }, { stock: { $exists: false } }] },
      { $set: { stock: 10 } }
    );
    console.log(`✅ Updated ${result.modifiedCount} products with stock`);

    // Update variant stocks
    console.log('📦 Updating variant stocks...');
    const products = await Product.find({});
    let variantCount = 0;
    
    for (const product of products) {
      let updated = false;
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (!variant.stock || variant.stock === 0) {
            variant.stock = 10;
            updated = true;
            variantCount++;
          }
        }
        if (updated) {
          await product.save();
        }
      }
    }
    console.log(`✅ Updated ${variantCount} variants with stock`);

    // Show current products
    const allProducts = await Product.find({}).select('name stock variants');
    console.log('\n📋 Current products:');
    allProducts.forEach(p => {
      console.log(`- ${p.name}: stock=${p.stock}`);
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach(v => {
          console.log(`  • ${v.name}: stock=${v.stock}`);
        });
      }
    });

    console.log('\n✅ Stock fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStock();
