"use client";

import React, { useState } from 'react';

interface FileUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
  label: string;
  accept?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onUpload, 
  currentUrl, 
  label, 
  accept = "image/*,video/*,.mp4,.mov,.avi,.webm" 
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    if (!file) return;

    console.log('📁 Selected file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    setUploading(true);

    try {
      // Prefer direct unsigned upload to Cloudinary (avoids serverless file size limits)
      const cloudName = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string) || (process.env.CLOUDINARY_CLOUD_NAME as unknown as string);
      const uploadPreset = (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string) || (process.env.CLOUDINARY_UPLOAD_PRESET as unknown as string);
      const folder = (process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER as string) || 'alkadyy-intro';

      const isVideo = file.type.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      if (cloudName && uploadPreset) {
        const form = new FormData();
        form.append('file', file);
        form.append('upload_preset', uploadPreset);
        form.append('folder', folder);

        console.log('🚀 Uploading directly to Cloudinary...');
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        const cloudRes = await fetch(cloudinaryUrl, { method: 'POST', body: form });
        const cloudData = await cloudRes.json();
        if (cloudRes.ok && cloudData.secure_url) {
          console.log('✅ Direct upload success:', cloudData.secure_url);
          onUpload(cloudData.secure_url);
          alert('File uploaded successfully!');
          return;
        } else {
          console.warn('⚠️ Direct upload failed, falling back to server route', cloudData);
        }
      } else {
        console.warn('⚠️ Cloudinary unsigned preset not configured, using server upload route');
      }

      // Fallback: server-side upload (works for small files)
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      console.log('📡 Fallback upload status:', response.status);
      const data = await response.json().catch(() => ({} as any));
      if (response.ok && data.url) {
        onUpload(data.url);
        alert('File uploaded successfully!');
      } else {
        throw new Error(data?.details || data?.error || `Upload failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('💥 Error uploading file:', error);
      alert(`Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
      // Reset the input value to allow re-uploading the same file
      e.target.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-black dark:text-white mb-2">
        {label}
      </label>
      
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 ${
          dragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-black dark:text-white">Uploading...</span>
          </div>
        ) : currentUrl ? (
          <div>
            {/* Preview uploaded file */}
            <div className="mb-4">
              {currentUrl.includes('.mp4') || currentUrl.includes('.mov') || currentUrl.includes('.avi') || currentUrl.includes('.webm') || currentUrl.includes('video') ? (
                <video 
                  src={currentUrl} 
                  className="max-w-full h-32 mx-auto rounded-lg object-cover"
                  controls
                  preload="metadata"
                />
              ) : (
                <img 
                  src={currentUrl} 
                  alt="Preview" 
                  className="max-w-full h-32 mx-auto rounded-lg object-cover"
                />
              )}
            </div>
            <p className="text-green-600 dark:text-green-400 text-sm mb-2">✅ File uploaded</p>
            <button
              type="button"
              onClick={() => document.getElementById(`file-input-${label}`)?.click()}
              className="bg-black border border-white text-white px-4 py-2 rounded-lg transition-colors duration-300"
            >
              Change File
            </button>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-black dark:text-white mb-2">
              <span className="font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Images: PNG, JPG, GIF | Videos: MP4, MOV
            </p>
            <button
              type="button"
              onClick={() => document.getElementById(`file-input-${label}`)?.click()}
              className="mt-4 bg-black border border-white text-white px-4 py-2 rounded-lg transition-colors duration-300"
            >
              Choose File
            </button>
          </div>
        )}
        
        {/* Hidden file input */}
        <input
          id={`file-input-${label}`}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default FileUpload;



