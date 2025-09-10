// Simple script to fix stock issues
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.log('ERROR: MONGODB_URI not found');
  process.exit(1);
}

async function fixStock() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    
    // Update all products to have stock
    const result = await Product.updateMany(
      {},
      { $set: { stock: 10 } }
    );
    
    console.log('Updated products:', result.modifiedCount);
    
    // Check one product
    const sample = await Product.findOne({});
    if (sample) {
      console.log('Sample product:', sample.name, 'stock:', sample.stock);
    }
    
    mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.log('Error:', error.message);
    process.exit(1);
  }
}

fixStock();
