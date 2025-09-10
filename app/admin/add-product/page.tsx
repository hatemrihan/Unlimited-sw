"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '../../../components/FileUpload';

interface Product {
  name: string;
  price: number;
  description: string;
  mainImage: string;
  images: string[];
  videos: string[];
  variants: Array<{
    name: string;
    stock: number;
    images: string[];
  }>;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
}

const AddProductPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Simple product state
  const [product, setProduct] = useState<Product>({
    name: '',
    price: 0,
    description: '',
    mainImage: '',
    images: [],
    videos: [],
    variants: [{ name: 'Default', stock: 10, images: [] }],
    stock: 10,
    isActive: true,
    isFeatured: false
  });

  // Add product function - CLEAN and SIMPLE
  const handleAddProduct = async () => {
    // Validate required fields
    if (!product.name || !product.mainImage || !product.description) {
      alert('Please fill in: Product Name, Main Image, and Description');
      return;
    }

    setLoading(true);
    
    // DEBUG: Log product data before sending
    console.log('🚀 Submitting product:', {
      name: product.name,
      videos: product.videos,
      videosLength: product.videos ? product.videos.length : 0,
      images: product.images,
      imagesLength: product.images ? product.images.length : 0
    });
    
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          description: product.description,
          mainImage: product.mainImage,
          images: product.images,
          videos: product.videos,
          variants: product.variants,
          stock: product.stock,
          isActive: product.isActive,
          isFeatured: product.isFeatured
        }),
      });
      
      if (response.ok) {
        alert('Product added successfully!');
        router.push('/admin');
      } else {
        const error = await response.json();
        alert(`Failed to add product: ${error.details || error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Add New Product</h1>
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-400 hover:text-white"
          >
            ← Back to Products
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side - Product Info */}
          <div className="space-y-6">
            
            {/* General Information */}
            <div>
              <h2 className="text-xl font-semibold mb-4">General Information</h2>
              
              {/* Product Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Product Name *</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => setProduct({...product, name: e.target.value})}
                  className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                  placeholder="Enter product name"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Product Description *</label>
                <textarea
                  value={product.description}
                  onChange={(e) => setProduct({...product, description: e.target.value})}
                  className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none h-32"
                  placeholder="Describe your product"
                />
              </div>

              {/* Price */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Price (LE) *</label>
                <input
                  type="number"
                  value={product.price || ''}
                  onChange={(e) => setProduct({...product, price: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                  placeholder="1000"
                />
              </div>

              {/* Stock */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Stock Quantity</label>
                <input
                  type="number"
                  value={product.stock || ''}
                  onChange={(e) => setProduct({...product, stock: parseInt(e.target.value) || 10})}
                  className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                  placeholder="10"
                />
              </div>

              {/* Variants */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Product Variants</label>
                {product.variants.map((variant, index) => (
                  <div key={index} className="border border-white/20 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Variant Name</label>
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => {
                            const newVariants = [...product.variants];
                            newVariants[index].name = e.target.value;
                            setProduct({...product, variants: newVariants});
                          }}
                          className="w-full p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                          placeholder="e.g., Black, Large"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Stock</label>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => {
                            const newVariants = [...product.variants];
                            newVariants[index].stock = parseInt(e.target.value) || 0;
                            setProduct({...product, variants: newVariants});
                          }}
                          className="w-full p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                          placeholder="10"
                        />
                      </div>
                    </div>

                    {/* ONE UPLOAD FIELD PER VARIANT */}
                    <div>
                      <label className="block text-xs font-medium mb-2">Variant Media (Images & Videos)</label>
                      
                      {/* Show uploaded media for this variant */}
                      {variant.images && variant.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {variant.images.map((media, mediaIndex) => {
                            const isVideo = media.includes('.mp4') || media.includes('.mov') || media.includes('.webm');
                            return (
                              <div key={mediaIndex} className="relative group">
                                {isVideo ? (
                                  <video src={media} className="w-full h-16 object-cover rounded" muted />
                                ) : (
                                  <img src={media} alt={`Variant ${variant.name} media`} className="w-full h-16 object-cover rounded" />
                                )}
                                <button
                                  onClick={() => {
                                    const newVariants = [...product.variants];
                                    newVariants[index].images = variant.images.filter((_, i) => i !== mediaIndex);
                                    setProduct({...product, variants: newVariants});
                                  }}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
                                >
                                  ×
                                </button>
                                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                                  {isVideo ? '🎥' : '📷'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* SINGLE UPLOAD FIELD - IMAGES AND VIDEOS */}
                      <FileUpload
                        label={`Upload for ${variant.name}`}
                        currentUrl=""
                        onUpload={(url) => {
                          const newVariants = [...product.variants];
                          const currentImages = newVariants[index].images || [];
                          newVariants[index].images = [...currentImages, url];
                          setProduct({...product, variants: newVariants});
                        }}
                        accept="image/*,video/*"
                      />
                    </div>

                    {/* Delete Variant */}
                    {product.variants.length > 1 && (
                      <button
                        onClick={() => {
                          const newVariants = product.variants.filter((_, i) => i !== index);
                          setProduct({...product, variants: newVariants});
                        }}
                        className="mt-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove Variant
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Variant Button */}
                <button
                  onClick={() => {
                    setProduct({
                      ...product,
                      variants: [...product.variants, { name: '', stock: 10, images: [] }]
                    });
                  }}
                  className="w-full p-3 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:border-white hover:text-white"
                >
                  + Add Another Variant
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Upload Main Image */}
          <div className="space-y-6">
            
            {/* Upload Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
              
              {/* Main Product Image - ONLY ONE */}
              <div className="mb-6">
                <FileUpload
                  label="Main Product Image *"
                  currentUrl={product.mainImage}
                  onUpload={(url) => setProduct({...product, mainImage: url})}
                  accept="image/*"
                />
              </div>

              {/* Show uploaded additional media */}
              {((product.images && product.images.length > 0) || (product.videos && product.videos.length > 0)) && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-2">Additional Media</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {/* Show images */}
                    {product.images?.map((img, index) => (
                      <div key={`img-${index}`} className="relative group">
                        <img src={img} alt="Product additional image" className="w-full h-16 object-cover rounded" />
                        <button
                          onClick={() => {
                            const newImages = product.images.filter((_, i) => i !== index);
                            setProduct({...product, images: newImages});
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">📷</div>
                      </div>
                    ))}
                    {/* Show videos */}
                    {product.videos?.map((video, index) => (
                      <div key={`vid-${index}`} className="relative group">
                        <video src={video} className="w-full h-16 object-cover rounded" muted />
                        <button
                          onClick={() => {
                            const newVideos = product.videos.filter((_, i) => i !== index);
                            setProduct({...product, videos: newVideos});
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">🎥</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Media Upload */}
              <div className="mb-6">
                <FileUpload
                  label="Add More Images/Videos (Optional)"
                  currentUrl=""
                  onUpload={(url) => {
                    const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
                    console.log('🎥 File uploaded:', { url, isVideo });
                    
                    if (isVideo) {
                      const newVideos = [...(product.videos || []), url];
                      console.log('🎬 Adding to videos array:', newVideos);
                      setProduct({...product, videos: newVideos});
                    } else {
                      const newImages = [...(product.images || []), url];
                      console.log('📷 Adding to images array:', newImages);
                      setProduct({...product, images: newImages});
                    }
                  }}
                  accept="image/*,video/*"
                />
              </div>

              {/* Product Options */}
              <div className="space-y-4">
                <div className="border border-white/20 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Product Settings</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={product.isActive}
                        onChange={(e) => setProduct({...product, isActive: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm">Show in Products Section</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={product.isFeatured}
                        onChange={(e) => setProduct({...product, isFeatured: e.target.checked})}
                        className="mr-2"
                      />
                      <span className="text-sm">Show in Featured Products</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleAddProduct}
            disabled={loading}
            className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Adding Product...' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;