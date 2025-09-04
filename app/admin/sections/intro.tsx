import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IntroItem } from '../../../models/intro';

const Intro = () => {
  const router = useRouter();
  const [introItems, setIntroItems] = useState<IntroItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch all intro items
  const fetchIntroItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/intro');
      if (response.ok) {
        const data = await response.json();
        setIntroItems(data.items || []);
      } else {
        console.error('Failed to fetch intro items');
      }
    } catch (error) {
      console.error('Error fetching intro items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle active status of an intro item
  const toggleActiveStatus = async (item: IntroItem) => {
    try {
      const response = await fetch(`/api/admin/intro/${item._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !item.isActive
        }),
      });

      if (response.ok) {
        // Update local state
        setIntroItems(introItems.map(i =>
          i._id === item._id
            ? { ...i, isActive: !i.isActive }
            : i
        ));
        alert(`Athlete ${!item.isActive ? 'activated' : 'deactivated'} successfully!`);
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating intro item status:', error);
      alert('Error updating status. Please try again.');
    }
  };

  // Delete an intro item
  const deleteIntroItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this athlete?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/intro/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIntroItems(introItems.filter(item => item._id !== itemId));
        alert('Athlete deleted successfully!');
      } else {
        alert('Failed to delete athlete. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting intro item:', error);
      alert('Error deleting athlete. Please try again.');
    }
  };

  useEffect(() => {
    fetchIntroItems();
  }, []);

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold text-white mb-2">
          OUR ATHLETES
        </h1>
        <div className="h-1 w-24 sm:w-32 md:w-40 bg-white"></div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => router.push('/admin/add-intro')}
          className="bg-black text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white hover:text-black transition-all duration-300 font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Athlete
        </button>
      </div>

      {/* Intro Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-black border border-white/10 rounded-lg p-6 animate-pulse">
              <div className="bg-gray-700 h-48 rounded-lg mb-4"></div>
              <div className="bg-gray-700 h-4 rounded mb-2"></div>
              <div className="bg-gray-700 h-4 rounded w-3/4"></div>
            </div>
          ))
        ) : introItems.length > 0 ? (
          introItems.map((item) => (
            <div key={item._id} className="bg-black border border-white/10 rounded-lg p-6 hover:shadow-lg transition-shadow">
              {/* Main Image */}
              <div className="relative mb-4">
                {item.isVideo ? (
                  <video
                    src={item.mainImage}
                    className="w-full h-48 object-cover rounded-lg"
                    controls
                  />
                ) : (
                  <img
                    src={item.mainImage}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                  }`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

                             {/* Title */}
               <h3 className="text-lg font-semibold text-white mb-2 text-center">{item.title}</h3>

               {/* Description */}
               <p className="text-gray-300 text-sm mb-4 line-clamp-2 text-center">{item.description}</p>

               {/* URL */}
               <div className="text-gray-400 text-xs mb-4 text-center">
                 <span className="font-medium">URL:</span> {item.url}
               </div>

                             {/* Action Buttons */}
               <div className="flex items-center justify-center gap-4">
                 <button
                   onClick={() => router.push(`/admin/edit-intro/${item._id}`)}
                   className="text-blue-400 hover:text-blue-300 text-sm font-medium cursor-pointer"
                 >
                   Edit
                 </button>
                 <button
                   onClick={() => toggleActiveStatus(item)}
                   className={`text-sm font-medium cursor-pointer ${
                     item.isActive 
                       ? 'text-yellow-400 hover:text-yellow-300' 
                       : 'text-green-400 hover:text-green-300'
                   }`}
                 >
                   {item.isActive ? 'Deactivate' : 'Activate'}
                 </button>
                 <button
                   onClick={() => deleteIntroItem(item._id || '')}
                   className="text-red-400 hover:text-red-300 text-sm font-medium cursor-pointer"
                 >
                   Delete
                 </button>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Athletes Found</h3>
            <p className="text-gray-400">Start by adding your first athlete to showcase them on your website.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Intro;
