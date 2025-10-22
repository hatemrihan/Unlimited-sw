"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '../../../components/FileUpload';

interface Product {
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  mainImage: string;
  images: string[];
  videos?: string[];
  description: string;
  promoCode?: string;
  variants: Array<{
    name: string;
    stock: number;
    price?: number;
    images?: string[];
    videos?: string[];
  }>;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  detailedDescription?: string;
  specifications?: string;
  shippingInfo?: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  showOutOfStockBadge?: boolean;
  showPreorderBadge?: boolean;
}

const AddProductPage = () => {
  const router = useRouter();
  const [savingProduct, setSavingProduct] = useState<boolean>(false);
  const [product, setProduct] = useState<Product>({
    name: '',
    price: 0,
    originalPrice: 0,
    discount: 0,
    mainImage: '',
    images: [],
    videos: [],
    description: '',
    promoCode: '',
    variants: [{ name: '', stock: 0, price: 0, images: [], videos: [] }],
    stock: 0,
    isActive: true,
    isFeatured: false,
    order: 0,
    detailedDescription: '',
    specifications: '',
    shippingInfo: '',
    faqs: [{ question: '', answer: '' }],
    showOutOfStockBadge: false,
    showPreorderBadge: false
  });

  // Function to add product
  const handleAddProduct = async () => {
    setSavingProduct(true);
    
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...product,
          // Calculate final price if discount is provided
          price: product.discount && product.originalPrice 
            ? product.originalPrice * (1 - product.discount / 100)
            : product.price || product.originalPrice || 0
        }),
      });
      
      if (response.ok) {
        alert('Product added successfully!');
        router.push('/admin');
      } else {
        const error = await response.json();
        alert(`Failed to add product: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-center mb-4">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back to Products
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold text-white mb-2 text-center">
            Add New Product
          </h1>
          <div className="h-1 w-20 sm:w-24 mx-auto md:w-32 bg-white flex"></div>
        </div>

        {/* Product Form */}
        <div className="bg-black border border-white/10 rounded-lg p-3 md:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Left Side - General Information */}
            <div className="space-y-4 lg:space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">General Information</h3>
                
                {/* Product Name */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-white mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => setProduct({...product, name: e.target.value})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    placeholder="Enter product name"
                  />
                </div>
                
                {/* Product Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">Product Description *</label>
                  <textarea
                    value={product.description}
                    onChange={(e) => setProduct({...product, description: e.target.value})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Equipment Variants */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Equipment Variants *</label>
                <p className="text-xs text-gray-400 mb-3">Add different sizes/colors for your equipment</p>
                
                {product.variants.map((variant, index) => (
                  <div key={index} className="bg-transparent p-3 rounded-lg mb-3 border border-white/10">
                    <div className="space-y-3">
                      {/* First Row: Variant Name and Stock */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-300 mb-1">VARIANT NAME *</label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...product.variants];
                              newVariants[index] = { ...variant, name: e.target.value };
                              setProduct({...product, variants: newVariants});
                            }}
                            className="w-full p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                            placeholder="e.g., Black, Gray, Premium"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Stock</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => {
                                const newVariants = [...product.variants];
                                newVariants[index] = { ...variant, stock: parseInt(e.target.value) || 0 };
                                setProduct({...product, variants: newVariants});
                              }}
                              className="flex-1 p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                              placeholder="10"
                              min="0"
                            />
                            
                            {/* Delete Variant */}
                            {product.variants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newVariants = product.variants.filter((_, i) => i !== index);
                                  setProduct({...product, variants: newVariants});
                                }}
                                className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* THE KEY DIFFERENCE: ONE UNIFIED MEDIA UPLOAD PER VARIANT */}
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                          Variant Media (Images & Videos)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Upload all media for this variant in order. First upload becomes the main display.
                        </p>
                        
                        {/* Display current variant media */}
                        {((variant.images && variant.images.length > 0) || (variant.videos && variant.videos.length > 0)) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                            {/* Show images */}
                            {variant.images?.map((img, imgIndex) => (
                              <div key={`img-${imgIndex}`} className="relative">
                                <img 
                                  src={img} 
                                  alt={`Variant ${variant.name} ${imgIndex + 1}`}
                                  className="w-full h-20 object-cover rounded border border-white/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newVariants = [...product.variants];
                                    const newImages = variant.images?.filter((_, i) => i !== imgIndex) || [];
                                    newVariants[index] = { ...variant, images: newImages };
                                    setProduct({...product, variants: newVariants});
                                  }}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {/* Show videos */}
                            {variant.videos?.map((vid, vidIndex) => (
                              <div key={`vid-${vidIndex}`} className="relative">
                                <video 
                                  src={vid} 
                                  className="w-full h-20 object-cover rounded border border-white/20"
                                  muted
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newVariants = [...product.variants];
                                    const newVideos = variant.videos?.filter((_, i) => i !== vidIndex) || [];
                                    newVariants[index] = { ...variant, videos: newVideos };
                                    setProduct({...product, variants: newVariants});
                                  }}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-red-600"
                                >
                                  ×
                                </button>
                                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">🎥</div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* ONE UNIFIED UPLOAD FIELD */}
                        <FileUpload
                          label={`Add Media for ${variant.name || 'Variant'}`}
                          accept="image/*,video/*"
                          onUpload={(url, isVideo = false) => {
                            const newVariants = [...product.variants];
                            if (isVideo) {
                              const currentVideos = variant.videos || [];
                              newVariants[index] = { ...variant, videos: [...currentVideos, url] };
                            } else {
                              const currentImages = variant.images || [];
                              newVariants[index] = { ...variant, images: [...currentImages, url] };
                            }
                            setProduct({...product, variants: newVariants});
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add Variant Button */}
                <button
                  type="button"
                  onClick={() => {
                    setProduct({
                      ...product,
                      variants: [...product.variants, { name: '', stock: 0, price: 0, images: [], videos: [] }]
                    });
                  }}
                  className="w-full p-2 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:border-white hover:text-white text-sm transition-colors"
                >
                  + Add Another Variant
                </button>
              </div>
            </div>

            {/* Right Side - Media & Pricing */}
            <div className="space-y-4 lg:space-y-6">
              {/* Product Media */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Product Media</h3>
                
                {/* Display current media */}
                {(product.mainImage || product.images.length > 0 || (product.videos && product.videos.length > 0)) && (
                  <div className="mb-4">
                    <div className="grid grid-cols-3 gap-2">
                      {/* Main Image */}
                      {product.mainImage && (
                        <div className="relative">
                          <img 
                            src={product.mainImage} 
                            alt="Main product"
                            className="w-full h-24 object-cover rounded border-2 border-yellow-500"
                          />
                          <span className="absolute top-1 left-1 bg-yellow-500 text-black text-xs px-1 rounded">Main</span>
                        </div>
                      )}
                      {/* Additional Images */}
                      {product.images.map((img, index) => (
                        <div key={`img-${index}`} className="relative">
                          <img 
                            src={img} 
                            alt={`Product ${index + 1}`}
                            className="w-full h-24 object-cover rounded border border-white/20"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = product.images.filter((_, i) => i !== index);
                              setProduct({...product, images: newImages});
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {/* Videos */}
                      {product.videos?.map((vid, index) => (
                        <div key={`vid-${index}`} className="relative">
                          <video 
                            src={vid}
                            className="w-full h-24 object-cover rounded border border-white/20"
                            muted
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newVideos = product.videos?.filter((_, i) => i !== index) || [];
                              setProduct({...product, videos: newVideos});
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">🎥</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* ONE UNIFIED UPLOAD FOR MAIN PRODUCT */}
                <FileUpload
                  label="Product Media (Images & Videos) *"
                  accept="image/*,video/*"
                  onUpload={(url, isVideo = false) => {
                    if (!product.mainImage && !isVideo) {
                      // First image becomes main image
                      setProduct({...product, mainImage: url});
                    } else if (isVideo) {
                      // Add to videos array
                      const newVideos = [...(product.videos || []), url];
                      setProduct({...product, videos: newVideos});
                    } else {
                      // Add to images array
                      const newImages = [...product.images, url];
                      setProduct({...product, images: newImages});
                    }
                  }}
                />
                <p className="text-xs text-gray-400 mt-2">
                  First image becomes the main product image. Upload in the order you want them displayed.
                </p>
              </div>

              {/* Pricing & Discount */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Pricing & Discount</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Original Price (L.E)</label>
                    <input
                      type="number"
                      value={product.originalPrice || ''}
                      onChange={(e) => setProduct({...product, originalPrice: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                      placeholder="1000"
                    />
                    <p className="text-xs text-gray-400 mt-1">Enter the original price before discount</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Discount (%)</label>
                    <input
                      type="number"
                      value={product.discount || ''}
                      onChange={(e) => setProduct({...product, discount: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave 0 for no discount</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Promo Code</label>
                    <input
                      type="text"
                      value={product.promoCode || ''}
                      onChange={(e) => setProduct({...product, promoCode: e.target.value})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                      placeholder="SAVE10"
                    />
                  </div>
                </div>
                
                {/* Calculated Final Price Display */}
                {product.originalPrice && product.discount ? (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400">Final Price:</p>
                    <p className="text-2xl font-bold text-white">
                      L.E {(product.originalPrice * (1 - product.discount / 100)).toFixed(0)}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Product Settings */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Product Settings</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={product.isActive}
                      onChange={(e) => setProduct({...product, isActive: e.target.checked})}
                      className="mr-3"
                    />
                    <span className="text-sm">Show in Products Section</span>
                  </label>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={product.isFeatured}
                      onChange={(e) => setProduct({...product, isFeatured: e.target.checked})}
                      className="mr-3"
                    />
                    <span className="text-sm">Show in Featured Products</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Additional Information</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Detailed Description</label>
                <textarea
                  value={product.detailedDescription || ''}
                  onChange={(e) => setProduct({...product, detailedDescription: e.target.value})}
                  className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                  rows={4}
                  placeholder="Enter detailed product description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Specifications</label>
                <textarea
                  value={product.specifications || ''}
                  onChange={(e) => setProduct({...product, specifications: e.target.value})}
                  className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                  rows={4}
                  placeholder="Enter product specifications and technical details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Shipping Information</label>
                <textarea
                  value={product.shippingInfo || ''}
                  onChange={(e) => setProduct({...product, shippingInfo: e.target.value})}
                  className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                  rows={3}
                  placeholder="Enter shipping information and delivery details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">FAQs</label>
                {product.faqs.map((faq, index) => (
                  <div key={index} className="mb-3 p-3 border border-white/10 rounded-lg">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Question</label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const newFaqs = [...product.faqs];
                            newFaqs[index] = { ...faq, question: e.target.value };
                            setProduct({...product, faqs: newFaqs});
                          }}
                          className="w-full p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                          placeholder="Enter question..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Answer</label>
                        <textarea
                          value={faq.answer}
                          onChange={(e) => {
                            const newFaqs = [...product.faqs];
                            newFaqs[index] = { ...faq, answer: e.target.value };
                            setProduct({...product, faqs: newFaqs});
                          }}
                          className="w-full p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                          rows={2}
                          placeholder="Enter answer..."
                        />
                      </div>
                      {product.faqs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newFaqs = product.faqs.filter((_, i) => i !== index);
                            setProduct({...product, faqs: newFaqs});
                          }}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Remove FAQ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setProduct({
                      ...product,
                      faqs: [...product.faqs, { question: '', answer: '' }]
                    });
                  }}
                  className="w-full p-2 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:border-white hover:text-white text-sm transition-colors"
                >
                  + Add FAQ
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleAddProduct}
              disabled={savingProduct}
              className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProduct ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;