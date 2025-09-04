"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '../../../../components/FileUpload';

const EditIntro = ({ params }: { params: Promise<{ id: string }> }) => {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    isVideo: false,
    isActive: true,
    order: 0
  });
  const [images, setImages] = useState({
    mainImage: '',
    leftImage: '',
    rightImage: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch intro item data
  useEffect(() => {
    const fetchIntroItem = async () => {
      try {
        const response = await fetch(`/api/admin/intro/${resolvedParams.id}`);
        if (response.ok) {
          const data = await response.json();
          const item = data.item;
          
          setFormData({
            title: item.title || '',
            description: item.description || '',
            url: item.url || '',
            isVideo: item.isVideo || false,
            isActive: item.isActive !== undefined ? item.isActive : true,
            order: item.order || 0
          });
          
          setImages({
            mainImage: item.mainImage || '',
            leftImage: item.leftImage || '',
            rightImage: item.rightImage || ''
          });
        } else {
          alert('Failed to fetch athlete data');
          router.push('/admin');
        }
      } catch (error) {
        console.error('Error fetching intro item:', error);
        alert('Error fetching athlete data');
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    };

    fetchIntroItem();
  }, [resolvedParams.id, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleImageUpload = (field: string, url: string) => {
    setImages(prev => ({
      ...prev,
      [field]: url
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!images.mainImage || !images.leftImage || !images.rightImage) {
      alert('Please upload all required images');
      return;
    }

    setSaving(true);
    
    try {
      const response = await fetch(`/api/admin/intro/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ...images,
          order: parseInt(formData.order.toString())
        }),
      });

      if (response.ok) {
        alert('Athlete updated successfully!');
        router.push('/admin');
      } else {
        const error = await response.json();
        alert(`Failed to update athlete: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating intro item:', error);
      alert('Error updating athlete. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-gray-700 h-8 w-64 rounded mb-4"></div>
            <div className="bg-gray-700 h-4 w-32 rounded mb-8"></div>
            <div className="bg-gray-700 h-96 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold text-white mb-2">
            Edit Athlete
          </h1>
          <div className="h-1 w-24 sm:w-32 md:w-40 bg-white"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-black border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-transparent border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-white/40"
                  placeholder="Athlete name or title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Order
                </label>
                <input
                  type="number"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-white/40"
                  placeholder="Display order"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-white mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full bg-transparent border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-white/40"
                placeholder="Athlete description or bio"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-white mb-2">
                URL *
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                required
                className="w-full bg-transparent border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-white/40"
                placeholder="https://example.com"
              />
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isVideo"
                  checked={formData.isVideo}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-white">Main content is video</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-white">Active</span>
              </label>
            </div>
          </div>

          {/* Image Uploads */}
          <div className="bg-black border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Images</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Main Image/Video *
                </label>
                <FileUpload
                  onUpload={(url) => handleImageUpload('mainImage', url)}
                  accept={formData.isVideo ? 'video/*' : 'image/*'}
                  label="Main Image/Video"
                />
                {images.mainImage && (
                  <div className="mt-2">
                    {formData.isVideo ? (
                      <video src={images.mainImage} className="w-full h-32 object-cover rounded" controls />
                    ) : (
                      <img src={images.mainImage} alt="Main" className="w-full h-32 object-cover rounded" />
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Left Image *
                </label>
                <FileUpload
                  onUpload={(url) => handleImageUpload('leftImage', url)}
                  accept="image/*"
                  label="Left Image"
                />
                {images.leftImage && (
                  <div className="mt-2">
                    <img src={images.leftImage} alt="Left" className="w-full h-32 object-cover rounded" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Right Image *
                </label>
                <FileUpload
                  onUpload={(url) => handleImageUpload('rightImage', url)}
                  accept="image/*"
                  label="Right Image"
                />
                {images.rightImage && (
                  <div className="mt-2">
                    <img src={images.rightImage} alt="Right" className="w-full h-32 object-cover rounded" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Athlete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditIntro;
