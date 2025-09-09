"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '../../../components/FileUpload';

interface Product {
  _id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  mainImage: string;
  images: string[];
  video?: string;
  description: string;
  promoCode?: string;
  variants: Array<{
    name: string;
    stock: number;
    price: number;
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
  
  // Form state for adding new product
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    originalPrice: 0,
    discount: 0,
    mainImage: '',
    images: [],
    video: '',
    description: '',
    promoCode: '',
    variants: [{ name: '', stock: 0, price: 0, images: [] }],
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

  // Function to add new product
  const handleAddProduct = async () => {
    setSavingProduct(true);
    
    try {
      console.log('🛍️ Adding product:', {
        ...newProduct,
        video: newProduct.video ? `✅ Video URL: ${newProduct.video}` : '❌ No video'
      });
      
      // Validate required fields
      if (!newProduct.name || !newProduct.mainImage || !newProduct.description) {
        alert('Please fill in all required fields (Name, Main Image, Description)');
        return;
      }
      
      // Validate variants
      if (!newProduct.variants || newProduct.variants.length === 0) {
        alert('Please add at least one equipment variant');
        return;
      }
      
      // Calculate discounted price if discount is set
      if (newProduct.discount && newProduct.discount > 0) {
        const originalPrice = newProduct.price || 0;
        const discountedPrice = originalPrice * (1 - newProduct.discount / 100);
        newProduct.originalPrice = originalPrice;
        newProduct.price = Math.round(discountedPrice);
      } else {
        // If no discount, original price is the same as current price
        newProduct.originalPrice = newProduct.price;
      }
      
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Product added successfully:', result);
        
        // Redirect back to previous page
        router.back();
        
        alert('Product added successfully!');
      } else {
        const errorData = await response.json();
        alert('Failed to add product: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error adding product:', error);
      alert('Error adding product: ' + (error as Error).message);
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-2 md:p-4">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
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
          <div className="h-1 w-20 sm:w-24  mx-auto md:w-32 bg-white flex "></div>
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
                    value={newProduct.name || ''}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    placeholder="Enter product name"
                  />
                </div>
                
                {/* Product Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">Product Description *</label>
                  <textarea
                    value={newProduct.description || ''}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
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
                
                {newProduct.variants?.map((variant, index) => (
                  <div key={index} className="bg-transparent p-3 rounded-lg mb-3 border border-white/10">
                    <div className="space-y-3">
                      {/* Simplified: Only Variant Name, Stock, and Price */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-300 mb-1">VARIANT NAME *</label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...(newProduct.variants || [])];
                              newVariants[index] = { ...variant, name: e.target.value };
                              setNewProduct({...newProduct, variants: newVariants});
                            }}
                            className="w-full p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                            placeholder="e.g., Large Kit, Medium Set, Premium Bundle"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Stock *</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => {
                                const newVariants = [...(newProduct.variants || [])];
                                newVariants[index] = { ...variant, stock: parseInt(e.target.value) || 0 };
                                setNewProduct({...newProduct, variants: newVariants});
                              }}
                              className="flex-1 p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                              placeholder="10"
                              min="0"
                            />
                            
                            {/* Delete Variant */}
                            {(newProduct.variants?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newVariants = newProduct.variants?.filter((_, i) => i !== index) || [];
                                  setNewProduct({...newProduct, variants: newVariants});
                                }}
                                className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                                title="Delete variant"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Variant Images */}
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                          Variant Images (Optional)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Upload specific images for this variant. If no images, default product images will be used.
                        </p>
                        
                        {/* Display current variant images */}
                        {variant.images && variant.images.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                            {variant.images.map((img, imgIndex) => (
                              <div key={imgIndex} className="relative">
                                <img 
                                  src={img} 
                                  alt={`Variant ${variant.name} ${imgIndex + 1}`}
                                  className="w-full h-20 object-cover rounded border border-white/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newVariants = [...(newProduct.variants || [])];
                                    const newImages = variant.images?.filter((_, i) => i !== imgIndex) || [];
                                    newVariants[index] = { ...variant, images: newImages };
                                    setNewProduct({...newProduct, variants: newVariants});
                                  }}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add variant image button */}
                        <FileUpload
                          label={`Add Image for ${variant.name || 'Variant'}`}
                          accept="image/*"
                          onUpload={(url) => {
                            const newVariants = [...(newProduct.variants || [])];
                            const currentImages = variant.images || [];
                            newVariants[index] = { ...variant, images: [...currentImages, url] };
                            setNewProduct({...newProduct, variants: newVariants});
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add Variant Button */}
                <button
                  type="button"
                  onClick={() => {
                    const currentVariants = newProduct.variants || [];
                    setNewProduct({
                      ...newProduct, 
                      variants: [...currentVariants, { name: '', stock: 0, price: 0, images: [] }]
                    });
                  }}
                  className="w-full p-3 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:border-white hover:text-white transition-colors duration-300"
                >
                  + Add Another Variant
                </button>
              </div>

              {/* Pricing and Stock */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Pricing And Stock</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Original Price (L.E) *</label>
                    <input
                      type="number"
                      value={newProduct.price || ''}
                      onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                      placeholder="1000"
                    />
                    <p className="text-xs text-gray-400 mt-1">Enter the original price before discount</p>
                  </div>
                  

                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Discount % (Optional)</label>
                    <input
                      type="number"
                      value={newProduct.discount || ''}
                      onChange={(e) => setNewProduct({...newProduct, discount: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave empty or 0 for no discount</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Promo Code (Optional)</label>
                    <input
                      type="text"
                      value={newProduct.promoCode || ''}
                      onChange={(e) => setNewProduct({...newProduct, promoCode: e.target.value})}
                      className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                      placeholder="SAVE10"
                    />
                  </div>
                </div>

                {/* Price Preview */}
                {(newProduct.price || 0) > 0 && (
                  <div className="mt-4 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">Price Preview:</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">
                        {newProduct.discount && newProduct.discount > 0 
                          ? Math.round((newProduct.price || 0) * (1 - newProduct.discount / 100)).toLocaleString()
                          : (newProduct.price || 0).toLocaleString()
                        } L.E
                      </span>
                      {newProduct.discount && newProduct.discount > 0 && (
                        <span className="text-gray-400 line-through text-sm">
                          {(newProduct.price || 0).toLocaleString()} L.E
                        </span>
                      )}
                    </div>
                    {newProduct.discount && newProduct.discount > 0 && (
                      <p className="text-xs text-green-400 mt-1">
                        {newProduct.discount}% discount applied
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Upload Images */}
            <div className="space-y-4 lg:space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Upload Images</h3>
                
                {/* Main Product Image */}
                <div className="mb-4">
                  <FileUpload
                    label="Main Product Image *"
                    currentUrl={newProduct.mainImage}
                    onUpload={(url) => setNewProduct({...newProduct, mainImage: url})}
                    accept="image/*"
                  />
                </div>
                
                {/* Additional Images - Support 9+ images */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">Additional Images (Upload up to 12 images)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) => (
                      <div key={index}>
                        <FileUpload
                          label={`Image ${index + 2}`}
                          currentUrl={newProduct.images?.[index]}
                          onUpload={(url) => {
                            const currentImages = newProduct.images || [];
                            const newImages = [...currentImages];
                            newImages[index] = url;
                            setNewProduct({...newProduct, images: newImages});
                          }}
                          accept="image/*"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Product Video */}
                <div className="mb-4">
                  <FileUpload
                    label="Product Video (Optional)"
                    currentUrl={newProduct.video}
                    onUpload={(url) => {
                      console.log('🎥 Video uploaded, setting URL:', url);
                      setNewProduct({...newProduct, video: url});
                    }}
                    accept="video/*"
                  />
                </div>
              </div>

              {/* Product Visibility Options */}
              <div className="space-y-3 lg:space-y-4">
                <div className="bg-transparent border border-white text-white px-3 py-1.5 text-xs font-medium uppercase tracking-wider   transition-all duration-300 whitespace-nowrap">
                  <h4 className="text-sm font-semibold text-white mb-2">Featured Products Section</h4>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={newProduct.isFeatured || false}
                      onChange={(e) => setNewProduct({...newProduct, isFeatured: e.target.checked})}
                      className="mr-2 h-4 w-4 text-white focus:ring-white border-white rounded"
                    />
                    <label htmlFor="isFeatured" className="text-sm text-white">
                      Show in Featured Products (homepage spotlight)
                    </label>
                  </div>
                </div>
                
                <div className="bg-transparent border border-white text-white px-3 py-1.5 text-xs font-medium uppercase tracking-wider -black transition-all duration-300 whitespace-nowrap">
                  <h4 className="text-sm font-semibold text-white mb-2">Products Section</h4>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={newProduct.isActive || false}
                      onChange={(e) => setNewProduct({...newProduct, isActive: e.target.checked})}
                      className="mr-2 h-4 w-4 text-white focus:ring-white border-white rounded"
                    />
                    <label htmlFor="isActive" className="text-sm text-white">
                      Show in Products Section (main catalog)
                    </label>
                  </div>
                </div>
              </div>

              {/* Admin Badges (only effective when stock is 0) */}
              <div className="space-y-3 lg:space-y-4">
                <div className="bg-transparent border border-white text-white px-3 py-1.5 text-xs font-medium uppercase tracking-wider   transition-all duration-300 whitespace-nowrap">
                  <h4 className="text-sm font-semibold text-white mb-2">Badges (shown only when stock is 0)</h4>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newProduct.showOutOfStockBadge || false}
                        onChange={(e)=> setNewProduct({...newProduct, showOutOfStockBadge: e.target.checked})}
                        className="mr-1 h-4 w-4 text-white focus:ring-white border-white rounded"
                      />
                      <span>OUT OF STOCK</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newProduct.showPreorderBadge || false}
                        onChange={(e)=> setNewProduct({...newProduct, showPreorderBadge: e.target.checked})}
                        className="mr-1 h-4 w-4 text-white focus:ring-white border-white rounded"
                      />
                      <span>PREORDER</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Detailed Product Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Detailed Product Information</h3>
                
                {/* Detailed Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Detailed Description</label>
                  <textarea
                    value={newProduct.detailedDescription || ''}
                    onChange={(e) => setNewProduct({...newProduct, detailedDescription: e.target.value})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    rows={4}
                    placeholder="Enter detailed product description..."
                  />
                </div>

                {/* Specifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Specifications</label>
                  <textarea
                    value={newProduct.specifications || ''}
                    onChange={(e) => setNewProduct({...newProduct, specifications: e.target.value})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    rows={4}
                    placeholder="Enter product specifications and technical details..."
                  />
                </div>

                {/* Shipping Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Shipping Information</label>
                  <textarea
                    value={newProduct.shippingInfo || ''}
                    onChange={(e) => setNewProduct({...newProduct, shippingInfo: e.target.value})}
                    className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
                    rows={3}
                    placeholder="Enter shipping information and delivery details..."
                  />
                </div>

                {/* FAQs */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Frequently Asked Questions</label>
                  <div className="space-y-3">
                    {newProduct.faqs?.map((faq, index) => (
                      <div key={index} className="border border-white/20 rounded-lg p-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Question</label>
                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) => {
                                const newFaqs = [...(newProduct.faqs || [])];
                                newFaqs[index] = { ...faq, question: e.target.value };
                                setNewProduct({...newProduct, faqs: newFaqs});
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
                                const newFaqs = [...(newProduct.faqs || [])];
                                newFaqs[index] = { ...faq, answer: e.target.value };
                                setNewProduct({...newProduct, faqs: newFaqs});
                              }}
                              className="w-full p-2 bg-transparent border border-white/20 rounded text-white text-sm focus:border-white focus:outline-none"
                              rows={2}
                              placeholder="Enter answer..."
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newFaqs = newProduct.faqs?.filter((_, i) => i !== index) || [];
                            setNewProduct({...newProduct, faqs: newFaqs});
                          }}
                          className="mt-2 text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove FAQ
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newFaqs = [...(newProduct.faqs || []), { question: '', answer: '' }];
                        setNewProduct({...newProduct, faqs: newFaqs});
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add FAQ
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 pt-4 lg:pt-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={savingProduct}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-400 disabled:text-gray-600 transition-all duration-300"
                >
                  {savingProduct ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;
