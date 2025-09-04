"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Product {
  _id?: string;
  name: string;
  price: number;
  mainImage: string;
  description: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
}

const DeleteProductPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [product, setProduct] = useState<Product | null>(null);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/products/${productId}`);
        
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
        } else {
          alert('Failed to load product data');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        alert('Error loading product data');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, router]);

  // Function to delete product
  const handleDeleteProduct = async () => {
    if (!product) return;
    
    setDeleting(true);
    
    try {
      console.log('🗑️ Deleting product:', product.name);

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log(`✅ Successfully deleted product: ${product.name}`);
        
        // Show success message
        alert('Product deleted successfully!');
        
        // Redirect back to products page
        router.back();
      } else {
        console.error('❌ Failed to delete product');
        alert('Failed to delete product. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-2 md:p-4">
        <div className="w-full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-gray-300">Loading product data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white p-2 md:p-4">
        <div className="w-full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-400 mb-4">Product not found</p>
              <button
                onClick={() => router.back()}
                className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300"
              >
                Back to Products
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-2 md:p-4">
      <div className="w-full max-w-4xl mx-auto">
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
            Delete Product
          </h1>
          <div className="h-1 w-20 sm:w-24 mx-auto md:w-32 bg-white flex"></div>
        </div>

        {/* Warning Card */}
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-200 mb-2">⚠️ Warning: This action cannot be undone!</h2>
              <p className="text-red-300 mb-4">
                You are about to permanently delete this product. This will remove it from your store, 
                customer orders, and all associated data. Please make sure you want to proceed.
              </p>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="bg-black border border-white/10 rounded-lg p-4 md:p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Product to be deleted:</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Image */}
            <div className="flex justify-center md:justify-start">
              <div className="w-full max-w-sm">
                <div className="relative w-full h-64 rounded-lg overflow-hidden">
                  <img
                    src={product.mainImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder.png';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-bold text-white mb-2">{product.name}</h4>
                <p className="text-gray-300 text-sm mb-4">{product.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-300">Price:</span>
                  <span className="text-white font-semibold">{product.price.toLocaleString()} L.E</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-300">Stock:</span>
                  <span className={`font-semibold ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {product.stock} units
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-300">Status:</span>
                  <span className={`font-semibold ${product.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">Featured:</span>
                  <span className={`font-semibold ${product.isFeatured ? 'text-blue-400' : 'text-gray-400'}`}>
                    {product.isFeatured ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Section */}
        <div className="bg-black border border-white/10 rounded-lg p-4 md:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Confirm Deletion</h3>
          
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-yellow-200 text-sm">
              <strong>Please type the product name to confirm deletion:</strong>
            </p>
            <p className="text-yellow-300 text-sm mt-1">
              Type: <span className="font-mono bg-yellow-900/30 px-2 py-1 rounded">{product.name}</span>
            </p>
          </div>

          <div className="mb-6">
            <input
              type="text"
              id="confirmInput"
              placeholder={`Type "${product.name}" to confirm`}
              className="w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value === product.name) {
                  handleDeleteProduct();
                }
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all duration-300"
            >
              Cancel
            </button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={deleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:text-gray-600 transition-all duration-300"
                >
                  {deleting ? 'Deleting...' : 'Delete Product Permanently'}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the product "{product.name}" 
                    and remove it from your store, customer orders, and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProduct}>
                    Delete Product
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteProductPage;
