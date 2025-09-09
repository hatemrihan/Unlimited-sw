"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '../../../components/FileUpload';

const AddIntro = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isVideo: false,
    isActive: true
  });
  const [images, setImages] = useState({
    mainImage: '',
    leftImage: '',
    rightImage: ''
  });
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/intro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ...images
        }),
      });

      if (response.ok) {
        alert('Athlete added successfully!');
        router.push('/admin');
      } else {
        const error = await response.json();
        alert(`Failed to add athlete: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding intro item:', error);
      alert('Error adding athlete. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold text-white mb-2">
            Add New Athlete
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

            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-white mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-transparent border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-white/40"
                placeholder="Athlete description or bio (optional)"
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
                    <img src={images.mainImage} alt="Main" className="w-full h-32 object-cover rounded" />
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
              disabled={loading}
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Athlete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIntro;

