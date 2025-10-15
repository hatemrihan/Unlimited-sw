// Script to update images for product ID: 68c0cdd2ee583648917b6a29
// ONLY updates images - does NOT change any other data

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

// Product schema (minimal version just for update)
const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function fixPullupBarImages() {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables!');
      console.log('💡 Make sure you have a .env.local file with MONGODB_URI set');
      process.exit(1);
    }
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const productId = '68c0cdd2ee583648917b6a29';
    
    console.log(`🔍 Finding product: ${productId}`);
    const product = await Product.findById(productId);
    
    if (!product) {
      console.error('❌ Product not found!');
      process.exit(1);
    }

    console.log('✅ Product found:', product.name);
    console.log('📦 Current variants:', product.variants?.length || 0);

    // Gray variant images (11 images + 2 videos)
    const grayImages = [
      '/images/gray-pullup-bar/one-image.png',
      '/images/gray-pullup-bar/two-image.png',
      '/images/gray-pullup-bar/three-image.png',
      '/images/gray-pullup-bar/four-image.png',
      '/images/gray-pullup-bar/five-image.png',
      '/images/gray-pullup-bar/six-image.png',
      '/images/gray-pullup-bar/seven-image.png',
      '/images/gray-pullup-bar/eight-image.png',
      '/images/gray-pullup-bar/nine-image.png',
      '/images/gray-pullup-bar/ten-image.png',
      '/images/gray-pullup-bar/eleven-image.png',
      '/images/gray-pullup-bar/video.mp4',
      '/images/gray-pullup-bar/videotwo.mp4'
    ];

    // Black variant images (9 images)
    const blackImages = [
      '/images/black-pullup-bar/one-image.png',
      '/images/black-pullup-bar/two-image.png',
      '/images/black-pullup-bar/three-image.png',
      '/images/black-pullup-bar/four-image.png',
      '/images/black-pullup-bar/five-image.png',
      '/images/black-pullup-bar/six-image.png',
      '/images/black-pullup-bar/seven-image.png',
      '/images/black-pullup-bar/eight-image.png',
      '/images/black-pullup-bar/nine-image.png'
    ];

    // Prepare updated variants
    const updatedVariants = product.variants.map((variant) => {
      if (variant.name.toLowerCase().includes('gray') || variant.name.toLowerCase().includes('grey')) {
        console.log(`🎨 Updating GRAY variant images: ${variant.name}`);
        return {
          name: variant.name,
          stock: variant.stock,
          price: variant.price,
          images: grayImages
        };
      } else if (variant.name.toLowerCase().includes('black')) {
        console.log(`🎨 Updating BLACK variant images: ${variant.name}`);
        return {
          name: variant.name,
          stock: variant.stock,
          price: variant.price,
          images: blackImages
        };
      }
      return {
        name: variant.name,
        stock: variant.stock,
        price: variant.price,
        images: variant.images
      };
    });

    // Update using findByIdAndUpdate to force the changes
    console.log('🎨 Updating main product image to:', grayImages[0]);
    console.log('🎨 Updating product images array with', grayImages.slice(1).length, 'additional images');
    
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          mainImage: grayImages[0],
          images: grayImages.slice(1),
          variants: updatedVariants
        }
      },
      { new: true }
    );

    if (updatedProduct) {
      console.log('✅ Product images updated successfully!');
      console.log('\n📸 Verification - Current database values:');
      console.log(`   - Main image: ${updatedProduct.mainImage}`);
      console.log(`   - Additional images: ${updatedProduct.images?.length || 0} images`);
      console.log('\n📸 Updated variants:');
      updatedProduct.variants.forEach((v) => {
        console.log(`   - ${v.name}: ${v.images?.length || 0} images`);
        if (v.images && v.images.length > 0) {
          console.log(`     First image: ${v.images[0]}`);
        }
      });
      
      console.log('\n🔄 NOTE: You may need to refresh your browser or clear cache to see the new images!');
      console.log('   Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh the page.');
    } else {
      console.log('⚠️ Failed to update product');
    }

    console.log('\n✅ Done!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixPullupBarImages();

