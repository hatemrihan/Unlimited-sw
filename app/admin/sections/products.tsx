import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '../../../models/product';

const Products = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);

  // Function to fetch all products
  const fetchProducts = async () => {
    try {
      console.log('🛍️ Admin fetching products...');
      const response = await fetch('/api/admin/products');
      console.log('📡 Admin products API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Admin received products data:', data);
        setProducts(data.products || []);
      } else {
        console.error('❌ Admin products API failed, status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching products for admin:', error);
    }
  };

  // Handle editing a product
  const handleEditProduct = (product: Product) => {
    router.push(`/admin/edit-product/${product._id}`);
  };

  // Toggle featured status of a product
  const toggleFeaturedStatus = async (product: Product) => {
    try {
      console.log(`🔄 Toggling featured status for product: ${product.name}`);

      const response = await fetch(`/api/admin/products/${product._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFeatured: !product.isFeatured
        }),
      });

      if (response.ok) {
        console.log(`✅ Successfully toggled featured status for: ${product.name}`);

        // Update local state
        setProducts(products.map(p =>
          p._id === product._id
            ? { ...p, isFeatured: !p.isFeatured }
            : p
        ));

        // Show success message
        alert(`Product ${!product.isFeatured ? 'featured' : 'unfeatured'} successfully!`);
      } else {
        console.error('❌ Failed to toggle featured status');
        alert('Failed to update featured status. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error toggling featured status:', error);
      alert('Error updating featured status. Please try again.');
    }
  };



  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold text-white mb-2">
          Products
        </h1>
        <div className="h-1 w-24 sm:w-32 md:w-40 bg-white"></div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => router.push('/admin/add-product')}
          className="bg-black text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white hover:text-black transition-all duration-300 font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Product
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-black border border-white/10 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 bg-transparent border border-white/20 text-white rounded-lg focus:border-white focus:outline-none"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:w-48">
            <select className="w-full px-4 py-2 bg-transparent border border-white/20 text-white rounded-lg focus:border-white focus:outline-none">
              <option value="">All Categories</option>
              <option value="clothing">Clothing</option>
              <option value="accessories">Accessories</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="sm:w-48">
            <select className="w-full px-4 py-2 bg-transparent border border-white/20 text-white rounded-lg focus:border-white focus:outline-none">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="price-high">Price High-Low</option>
              <option value="price-low">Price Low-High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products List */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((product) => (
            <div key={product._id} className="bg-black border border-white/10 rounded-lg p-3">
              <div className="flex flex-col gap-2">
                {/* Product Image */}
                <div 
                  className="w-full flex-shrink-0"
                  style={{ aspectRatio: '1080 / 1350', height: 'auto' }} // 1080px width × 1350px height
                >
                  <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <img
                      src={product.mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      style={{ aspectRatio: '1080 / 1350' }}
                      onError={(e) => {
                        e.currentTarget.src = '/images/placeholder.png';
                      }}
                    />
                    {/* Discount Badge */}
                    {product.discount && product.discount > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                        {product.discount}% OFF
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="space-y-1">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-gray-300 text-xs mb-1 line-clamp-2">
                        {product.description || 'No description available'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm">
                        {product.price.toLocaleString()} L.E
                      </span>
                      <div className="text-xs space-y-1">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 0 
                            ? 'bg-green-900 text-green-200' 
                            : 'bg-red-900 text-red-200'
                        }`}>
                          Total: {product.stock}
                        </div>
                        
                        {/* Variant Stock Details */}
                        {product.variants && product.variants.length > 0 && (
                          <div className="space-y-1">
                            {product.variants.map((variant: any, idx: number) => (
                              <div key={idx} className="text-gray-400 text-xs">
                                {variant.name}: {variant.stock || 0}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-1 pt-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors border border-blue-400/20 rounded hover:border-blue-400/40"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z" clipRule="evenodd" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => router.push(`/admin/delete-product/${product._id}`)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 text-xs font-medium transition-colors border border-red-400/20 rounded hover:border-red-400/40"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z"/>
                            <path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z"/>
                            <path fillRule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z" clipRule="evenodd" />
                          </svg>
                          Delete
                        </button>
                      </div>
                      <button
                        onClick={() => router.push(`/admin/products/${product._id}/city-pricing`)}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 text-green-400 hover:text-green-300 text-xs font-medium transition-colors border border-green-400/20 rounded hover:border-green-400/40"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
                        </svg>
                        💰 City Prices
                      </button>
                    </div>
                  </div>
                </div>
              </div>


            </div>
          ))}
        </div>
      ) : (
        <div className="bg-black border border-white/10 rounded-lg p-8 text-center">
          <p className="text-gray-300 mb-4">No products found</p>
          <button
            onClick={() => router.push('/admin/add-product')}
            className="bg-black text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white hover:text-black transition-all duration-300 font-medium"
          >
            Add Your First Product
          </button>
        </div>
      )}
    </div>
  );
};

export default Products;