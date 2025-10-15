// Script to update images for product ID: 68c10b711fd7ae728a98bdbd (Wall-parallel bar)
// ONLY updates images - does NOT change any other data

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

// Product schema (minimal version just for update)
const ProductSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function fixParallelBarImages() {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables!');
      console.log('💡 Make sure you have a .env.local file with MONGODB_URI set');
      process.exit(1);
    }
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const productId = '68c10b711fd7ae728a98bdbd';
    
    console.log(`🔍 Finding product: ${productId}`);
    const product = await Product.findById(productId);
    
    if (!product) {
      console.error('❌ Product not found!');
      process.exit(1);
    }

    console.log('✅ Product found:', product.name);
    console.log('📦 Current variants:', product.variants?.length || 0);

    // Parallel bar images (8 images + 1 video)
    const parallelBarImages = [
      '/images/parallel-bar/one-image.png',
      '/images/parallel-bar/two-image.png',
      '/images/parallel-bar/three-image.png',
      '/images/parallel-bar/four-image.png',
      '/images/parallel-bar/five-image.png',
      '/images/parallel-bar/six-image.png',
      '/images/parallel-bar/seven-image.png',
      '/images/parallel-bar/eight-image.png',
      '/images/parallel-bar/video.mp4'
    ];

    // Prepare updated variants (if any exist)
    let updatedVariants = [];
    if (product.variants && product.variants.length > 0) {
      updatedVariants = product.variants.map((variant) => {
        console.log(`🎨 Updating variant images: ${variant.name}`);
        return {
          name: variant.name,
          stock: variant.stock,
          price: variant.price,
          images: parallelBarImages
        };
      });
    }

    // Update using findByIdAndUpdate to force the changes
    console.log('🎨 Updating main product image to:', parallelBarImages[0]);
    console.log('🎨 Updating product images array with', parallelBarImages.slice(1).length, 'additional images');
    
    const updateData = {
      $set: {
        mainImage: parallelBarImages[0],
        images: parallelBarImages.slice(1)
      }
    };

    // Only update variants if they exist
    if (updatedVariants.length > 0) {
      updateData.$set.variants = updatedVariants;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );

    if (updatedProduct) {
      console.log('✅ Product images updated successfully!');
      console.log('\n📸 Verification - Current database values:');
      console.log(`   - Main image: ${updatedProduct.mainImage}`);
      console.log(`   - Additional images: ${updatedProduct.images?.length || 0} images`);
      
      if (updatedProduct.variants && updatedProduct.variants.length > 0) {
        console.log('\n📸 Updated variants:');
        updatedProduct.variants.forEach((v) => {
          console.log(`   - ${v.name}: ${v.images?.length || 0} images`);
          if (v.images && v.images.length > 0) {
            console.log(`     First image: ${v.images[0]}`);
          }
        });
      } else {
        console.log('\n📸 No variants for this product');
      }
      
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
fixParallelBarImages();

