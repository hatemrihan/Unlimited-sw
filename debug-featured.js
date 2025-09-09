// Debug script to check featured products
async function debugFeaturedProducts() {
  try {
    console.log('🔍 Debugging Featured Products...');

    // Test regular products API
    console.log('\n1. Testing regular products API...');
    const regularResponse = await fetch('http://localhost:3000/api/products');
    const regularData = await regularResponse.json();
    console.log('Regular products count:', regularData.products?.length || 0);
    console.log('Regular products:', regularData.products?.map(p => ({ name: p.name, isFeatured: p.isFeatured })) || []);

    // Test featured products API
    console.log('\n2. Testing featured products API...');
    const featuredResponse = await fetch('http://localhost:3000/api/products?featured=true');
    const featuredData = await featuredResponse.json();
    console.log('Featured products count:', featuredData.products?.length || 0);
    console.log('Featured products:', featuredData.products?.map(p => ({ name: p.name, isFeatured: p.isFeatured })) || []);

    // Test admin products API
    console.log('\n3. Testing admin products API...');
    const adminResponse = await fetch('http://localhost:3000/api/admin/products');
    const adminData = await adminResponse.json();
    console.log('Admin products count:', adminData.products?.length || 0);
    console.log('All products in admin:', adminData.products?.map(p => ({ name: p.name, isFeatured: p.isFeatured, isActive: p.isActive })) || []);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugFeaturedProducts();






