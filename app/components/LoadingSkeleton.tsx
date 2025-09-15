// Loading skeleton components for better UX while data loads
import React from 'react';

// Product card loading skeleton
export const ProductCardSkeleton = () => (
  <div className="bg-black border border-white/10 rounded-lg overflow-hidden animate-pulse">
    {/* Image skeleton */}
    <div className="aspect-square bg-gray-800"></div>
    
    {/* Content skeleton */}
    <div className="p-4 space-y-3">
      {/* Title skeleton */}
      <div className="h-5 bg-gray-700 rounded w-3/4"></div>
      
      {/* Price skeleton */}
      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      
      {/* Button skeleton */}
      <div className="h-10 bg-gray-700 rounded w-full"></div>
    </div>
  </div>
);

// Products grid loading skeleton
export const ProductsGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

// Admin table row skeleton
export const AdminTableRowSkeleton = () => (
  <tr className="border-b border-white/10 animate-pulse">
    <td className="px-4 py-3">
      <div className="w-12 h-12 bg-gray-700 rounded"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-700 rounded w-32"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-700 rounded w-20"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-700 rounded w-16"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-6 bg-gray-700 rounded w-16"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-8 bg-gray-700 rounded w-20"></div>
    </td>
  </tr>
);

// Admin table loading skeleton
export const AdminTableSkeleton = ({ rows = 10 }: { rows?: number }) => (
  <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-white text-black">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Image</th>
            <th className="px-4 py-3 text-left font-medium">Product Name</th>
            <th className="px-4 py-3 text-left font-medium">Price</th>
            <th className="px-4 py-3 text-left font-medium">Stock</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <AdminTableRowSkeleton key={index} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Cities management loading skeleton
export const CitiesTableSkeleton = ({ rows = 15 }: { rows?: number }) => (
  <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-white text-black">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Governorate</th>
            <th className="px-4 py-3 text-left font-medium">Shipping Cost (LE)</th>
            <th className="px-4 py-3 text-left font-medium">COD Fee (LE)</th>
            <th className="px-4 py-3 text-left font-medium">Total (COD)</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-white/10 animate-pulse">
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-700 rounded w-24"></div>
              </td>
              <td className="px-4 py-3">
                <div className="w-20 h-8 bg-gray-700 rounded"></div>
              </td>
              <td className="px-4 py-3">
                <div className="w-20 h-8 bg-gray-700 rounded"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </td>
              <td className="px-4 py-3">
                <div className="h-6 bg-gray-700 rounded w-16"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// General loading spinner
export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-white ${sizeClasses[size]}`}></div>
    </div>
  );
};

