import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IntroItem } from '../../../models/intro';
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

const Intro = () => {
  const router = useRouter();
  const [introItems, setIntroItems] = useState<IntroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<IntroItem | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  // Open delete confirmation dialog
  const openDeleteDialog = (item: IntroItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  // Delete an intro item
  const deleteIntroItem = async () => {
    if (!itemToDelete) return;

    try {
      console.log('🗑️ Attempting to delete item:', itemToDelete._id);
      const response = await fetch(`/api/admin/intro/${itemToDelete._id}`, {
        method: 'DELETE',
      });

      console.log('📡 Delete response status:', response.status);
      const data = await response.json();
      console.log('📡 Delete response data:', data);

      if (response.ok && data.success) {
        setIntroItems(introItems.filter(item => item._id !== itemToDelete._id));
        setSuccessMessage('Athlete deleted successfully!');
        setErrorMessage('');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorMsg = data.error || 'Failed to delete athlete. Please try again.';
        console.error('❌ Delete failed:', errorMsg);
        setErrorMessage(errorMsg);
        setSuccessMessage('');

        // Clear error message after 5 seconds
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('❌ Error deleting intro item:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setSuccessMessage('');

      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  useEffect(() => {
    fetchIntroItems();
  }, []);

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight font-bold text-gray-900 mb-1">
          OUR ATHLETES
        </h1>
        <div className="h-1 w-24 sm:w-32 md:w-40 bg-gray-900"></div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => router.push('/admin/add-intro')}
          className="bg-gray-900 text-white px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-800 transition-all duration-300 font-medium flex items-center gap-2 text-sm"
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
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse shadow-sm">
              <div className="bg-gray-200 h-40 rounded-lg mb-3"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4"></div>
            </div>
          ))
        ) : introItems.length > 0 ? (
          introItems.map((item) => (
            <div key={item._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow shadow-sm">
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
                  <span className={`px-2 py-1 rounded-full text-xs ${item.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                    }`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-gray-900 mb-2 text-center">{item.title}</h3>

              {/* Description */}
              <p className="text-gray-500 text-sm mb-3 line-clamp-2 text-center">{item.description}</p>

              {/* URL */}
              <div className="text-gray-400 text-xs mb-3 text-center">
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
                  className={`text-sm font-medium cursor-pointer ${item.isActive
                      ? 'text-yellow-400 hover:text-yellow-300'
                      : 'text-green-400 hover:text-green-300'
                    }`}
                >
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => openDeleteDialog(item)}
                  className="text-red-400 hover:text-red-300 text-sm font-medium cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10">
            <div className="text-gray-300 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">No Athletes Found</h3>
            <p className="text-gray-500 text-sm">Start by adding your first athlete to showcase them on your website.</p>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {errorMessage}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Athlete</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete "{itemToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteIntroItem}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Intro;
