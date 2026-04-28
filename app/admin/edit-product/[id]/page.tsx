"use client";

import React, { useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import FileUpload from '../../../../components/FileUpload';
import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import SidebarNav from '../../sections/SideBarNav';
import { useSession } from 'next-auth/react';
import { getNavItems } from '@/utils/navItems';
import { calculateFinalPrice } from '@/utils/pricing';

import { useProduct } from '@/hooks/useProduct';

const EditProductPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { data: session } = useSession();
  const navItems = useMemo(() => getNavItems(router), [router]);

  const { 
    product, loading, savingProduct, updateProduct: handleUpdateProduct,
    updateField, updateVariant, addVariant, removeVariant, updateFaq, addFaq, removeFaq
  } = useProduct(productId);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading product data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => router.push('/admin#products')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back to Products
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight font-bold text-gray-900 mb-1 text-center">
            Edit Product
          </h1>
          <div className="h-1 w-16 sm:w-20 mx-auto md:w-24 bg-gray-900 flex"></div>
        </div>

        {/* Product Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

            {/* Left Side - General Information */}
            <div className="space-y-4 lg:space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">General Information</h3>

                {/* Product Name */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={product.name || ''}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                    placeholder="Enter product name"
                  />
                </div>

                {/* Product Description */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Description *</label>
                  <textarea
                    value={product.description || ''}
                    onChange={(e) => updateField("description", e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Equipment Variants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Variants *</label>
                <p className="text-xs text-gray-500 mb-2">Add different sizes/colors for your equipment</p>

                {product.variants?.map((variant, index) => (
                  <div key={variant.id} className="bg-gray-50 p-3 rounded-lg mb-3 border border-gray-200">
                    <div className="space-y-3">
                      {/* First Row: Variant Name and Size */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">VARIANT NAME *</label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => {
                              updateVariant(index, { ...variant, name: e.target.value });
                            }}
                            className="w-full p-2 bg-white border border-gray-200 rounded text-gray-900 text-sm focus:border-gray-400 focus:outline-none"
                            placeholder="e.g., Black, Gray, Premium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => {
                                updateVariant(index, { ...variant, stock: parseInt(e.target.value) || 0 });
                              }}
                              className="flex-1 p-2 bg-white border border-gray-200 rounded text-gray-900 text-sm focus:border-gray-400 focus:outline-none"
                              placeholder="10"
                              min="0"
                            />

                            {/* Delete Variant */}
                            {(product.variants?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVariant(index)}
                                className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Variant Images */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Variant Images (Optional)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Upload specific images for this variant. If no images, default product images will be used.
                        </p>

                        {/* Display current variant images */}
                        {variant.images && variant.images.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                            {variant.images.map((img, imgIndex) => (
                              <div key={img} className="relative">
                                <img
                                  src={img}
                                  alt={`Variant ${variant.name} ${imgIndex + 1}`}
                                  className="w-full h-20 object-cover rounded border border-gray-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newImages = variant.images?.filter((_, i) => i !== imgIndex) || [];
                                    updateVariant(index, { ...variant, images: newImages });
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
                          label={`Add Media for ${variant.name || 'Variant'}`}
                          accept="image/*,video/*"
                          onUpload={(url, isVideo = false) => {
                            if (isVideo) {
                              updateVariant(index, { ...variant, videos: [...(variant.videos || []), url] });
                            } else {
                              updateVariant(index, { ...variant, images: [...(variant.images || []), url] });
                            }
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
                  onClick={addVariant}
                  className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 text-sm transition-colors duration-300"
                >
                  + Add Another Variant
                </button>
              </div>

              {/* Pricing and Stock */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Pricing And Stock</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (L.E) *</label>
                  <input
                    type="number"
                    value={product.originalPrice || ''}
                    onChange={(e) => updateField("originalPrice", parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                    placeholder="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the original price before discount</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount % (Optional)</label>
                    <input
                      type="number"
                      value={product.discount || ''}
                      onChange={(e) => updateField("discount", parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty or 0 for no discount</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code (Optional)</label>
                    <input
                      type="text"
                      value={product.promoCode || ''}
                      onChange={(e) => updateField("promoCode", e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                      placeholder="SAVE10"
                    />
                  </div>
                </div>

                {/* Price Preview */}
                {(product.originalPrice || 0) > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Price Preview:</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-bold text-lg">
                        {calculateFinalPrice(product.originalPrice || 0, product.discount).toLocaleString()} L.E
                      </span>
                      {product.discount && product.discount > 0 && (
                        <span className="text-gray-400 line-through text-sm">
                          {(product.originalPrice || 0).toLocaleString()} L.E
                        </span>
                      )}
                    </div>
                    {product.discount && product.discount > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {product.discount}% discount applied
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Upload Images */}
            <div className="space-y-4 lg:space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Upload Media</h3>

                {/* Unified Product Media Upload */}
                <div className="mb-6">
                  <FileUpload
                    label="Product Media (Images & Videos)"
                    currentUrl=""
                    onUpload={(url, isVideo = false) => {
                      // If no main image is set and this is an image, set as main
                      if (!product.mainImage && !isVideo) {
                        updateField("mainImage", url);
                      } else {
                        if (isVideo) {
                          const newVideos = [...(product.videos || []), url];
                          updateField("videos", newVideos);
                        } else {
                          const newImages = [...(product.images || []), url];
                          updateField("images", newImages);
                        }
                      }
                    }}
                    accept="image/*,video/*"
                  />

                  {/* Show all uploaded media */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 text-gray-600">Uploaded Media</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {/* Show main image */}
                      {product.mainImage && (
                        <div className="relative group">
                          <img src={product.mainImage} alt="Main product image" className="w-full h-16 object-cover rounded" />
                          <button
                            onClick={() => updateField("mainImage", '')}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">🏆 Main</div>
                        </div>
                      )}

                      {/* Show additional images */}
                      {product.images?.map((img, index) => (
                        <div key={img} className="relative group">
                          <img src={img} alt="Product image" className="w-full h-16 object-cover rounded" />
                          <button
                            onClick={() => {
                              const newImages = product.images?.filter((_, i) => i !== index) || [];
                              updateField("images", newImages);
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
                        <div key={video} className="relative group">
                          <video src={video} className="w-full h-16 object-cover rounded" muted />
                          <button
                            onClick={() => {
                              const newVideos = product.videos?.filter((_, i) => i !== index) || [];
                              updateField("videos", newVideos);
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
                </div>

              </div>

              {/* Product Visibility Options */}
              <div className="space-y-3 lg:space-y-4">
                <div className="bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 text-xs font-medium rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Featured Products Section</h4>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={product.isFeatured || false}
                      onChange={(e) => updateField("isFeatured", e.target.checked)}
                      className="mr-2 h-4 w-4"
                    />
                    <label htmlFor="isFeatured" className="text-sm text-gray-700">
                      Show in Featured Products (homepage spotlight)
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 text-gray-900 px-3 py-2 text-xs font-medium rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Products Section</h4>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={product.isActive || false}
                      onChange={(e) => updateField("isActive", e.target.checked)}
                      className="mr-2 h-4 w-4"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">
                      Show in Products Section (main catalog)
                    </label>
                  </div>
                </div>
              </div>

              {/* Admin Badges (only effective when stock is 0) */}
              <div className="space-y-3 lg:space-y-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 text-gray-900 px-3 py-3 text-xs font-medium rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Badges & Custom Labels</h4>
                  
                  <div className="flex items-center gap-6 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={product.showOutOfStockBadge || false}
                        onChange={(e) => updateField("showOutOfStockBadge", e.target.checked)}
                        className="mr-1 h-4 w-4 rounded text-gray-900"
                      />
                      <span className="text-gray-700 text-sm">OUT OF STOCK</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={product.showPreorderBadge || false}
                        onChange={(e) => updateField("showPreorderBadge", e.target.checked)}
                        className="mr-1 h-4 w-4 rounded text-gray-900"
                      />
                      <span className="text-gray-700 text-sm">PREORDER</span>
                    </label>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Custom Badge Message (Optional)
                    </label>
                    <input
                      type="text"
                      value={product.customOutOfStockMessage || ''}
                      onChange={(e) => updateField("customOutOfStockMessage", e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                      placeholder="e.g. نعود خلال ٧ أيام (Restocking in 7 Days)"
                    />
                    <p className="text-xs text-gray-500 mt-1 font-normal">This badge is <strong>always visible</strong> on the product card. Use for announcements like "Restocking Soon" or "New Arrival".</p>
                  </div>
                </div>
              </div>

              {/* Detailed Product Information */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900">Detailed Product Information</h3>

                {/* Detailed Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
                  <textarea
                    value={product.detailedDescription || ''}
                    onChange={(e) => updateField("detailedDescription", e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                    rows={4}
                    placeholder="Enter detailed product description..."
                  />
                </div>

                {/* Specifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specifications</label>
                  <textarea
                    value={product.specifications || ''}
                    onChange={(e) => updateField("specifications", e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                    rows={4}
                    placeholder="Enter product specifications and technical details..."
                  />
                </div>

                {/* Shipping Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Information</label>
                  <textarea
                    value={product.shippingInfo || ''}
                    onChange={(e) => updateField("shippingInfo", e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:border-gray-400 focus:outline-none text-sm"
                    rows={3}
                    placeholder="Enter shipping information and delivery details..."
                  />
                </div>

                {/* FAQs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequently Asked Questions</label>
                  <div className="space-y-3">
                    {product.faqs?.map((faq, index) => (
                      <div key={faq.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) => {
                                updateFaq(index, { ...faq, question: e.target.value });
                              }}
                              className="w-full p-2 bg-white border border-gray-200 rounded text-gray-900 text-sm focus:border-gray-400 focus:outline-none"
                              placeholder="Enter question..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Answer</label>
                            <textarea
                              value={faq.answer}
                              onChange={(e) => {
                                updateFaq(index, { ...faq, answer: e.target.value });
                              }}
                              className="w-full p-2 bg-white border border-gray-200 rounded text-gray-900 text-sm focus:border-gray-400 focus:outline-none"
                              rows={2}
                              placeholder="Enter answer..."
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFaq(index)}
                          className="mt-2 text-red-500 hover:text-red-600 text-sm"
                        >
                          Remove FAQ
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addFaq}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      + Add FAQ
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 lg:pt-6">
                <button
                  type="button"
                  onClick={() => router.push('/admin#products')}
                  className="flex-1 bg-white text-gray-900 px-5 py-2 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-all duration-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateProduct}
                  disabled={savingProduct}
                  className="flex-1 bg-gray-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:text-gray-600 transition-all duration-300 text-sm"
                >
                  {savingProduct ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </div>
          </div>
            </div>
          </div>
    );
  };

  return (
    <ProtectedAdminRoute>
      <div className="flex min-h-screen flex-col relative bg-gray-50">
        <SidebarNav
          logo="/images/Logo-image.png"
          logoAlt="Alkady Logo"
          items={navItems}
          activeHref={'/admin#products'}
          className="custom-nav"
          ease="power2.easeOut"
          baseColor="#000000"
          pillColor="#ffffff"
          hoveredPillTextColor="#ffffff"
          pillTextColor="#000000"
          onMobileMenuClick={() => { }}
          userName={session?.user?.name || "Admin"}
          onVisitStore={() => { if (typeof window !== 'undefined') window.open('/', '_blank'); }}
        />
        <main className="flex-1 p-3 md:p-6 lg:p-8 pb-20 lg:pb-8 overflow-x-hidden relative z-10 md:ml-64">
          {renderContent()}
        </main>
      </div>
    </ProtectedAdminRoute>
  );
};

export default EditProductPage;
