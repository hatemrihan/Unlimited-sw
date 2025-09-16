"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CloudinaryCheck = () => {
  const router = useRouter();
  const [config, setConfig] = useState({
    hasCloudName: false,
    hasApiKey: false,
    hasApiSecret: false,
    hasPublicCloudName: false,
    hasUploadPreset: false,
    hasFolder: false
  });
  const [testUpload, setTestUpload] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  useEffect(() => {
    // Check environment variables
    setConfig({
      hasCloudName: !!(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME),
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
      hasPublicCloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      hasUploadPreset: !!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      hasFolder: !!process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER
    });
  }, []);

  const testVideoUpload = async () => {
    setTestUpload({ status: 'testing', message: 'Testing video upload capability...' });

    try {
      // Create a small test blob (simulates video file)
      const testBlob = new Blob(['test video data'], { type: 'video/mp4' });
      const testFile = new File([testBlob], 'test.mp4', { type: 'video/mp4' });

      const formData = new FormData();
      formData.append('file', testFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestUpload({
          status: 'success',
          message: '✅ Video upload test successful! Your Cloudinary configuration is working.'
        });
      } else {
        setTestUpload({
          status: 'error',
          message: `❌ Video upload test failed: ${result.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      setTestUpload({
        status: 'error',
        message: `❌ Video upload test failed: ${error instanceof Error ? error.message : 'Network error'}`
      });
    }
  };

  const allConfigured = Object.values(config).every(Boolean);
  const basicConfigured = config.hasCloudName && config.hasApiKey && config.hasApiSecret;
  const directUploadConfigured = config.hasPublicCloudName && config.hasUploadPreset;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🎥 Cloudinary Configuration Check</h1>
            <p className="text-gray-400 mt-2">Verify your video upload configuration</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Configuration Status */}
        <div className="bg-black border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration Status</h2>
          
          <div className="space-y-3">
            <div className={`flex items-center space-x-3 p-3 rounded ${basicConfigured ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
              <div className={`w-3 h-3 rounded-full ${basicConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <h3 className="font-medium">Basic Cloudinary Configuration</h3>
                <p className="text-sm text-gray-400">Required for server-side uploads</p>
              </div>
            </div>

            <div className="ml-6 space-y-2 text-sm">
              <div className={`flex items-center space-x-2 ${config.hasCloudName ? 'text-green-400' : 'text-red-400'}`}>
                <span>{config.hasCloudName ? '✅' : '❌'}</span>
                <span>CLOUDINARY_CLOUD_NAME</span>
              </div>
              <div className={`flex items-center space-x-2 ${config.hasApiKey ? 'text-green-400' : 'text-red-400'}`}>
                <span>{config.hasApiKey ? '✅' : '❌'}</span>
                <span>CLOUDINARY_API_KEY</span>
              </div>
              <div className={`flex items-center space-x-2 ${config.hasApiSecret ? 'text-green-400' : 'text-red-400'}`}>
                <span>{config.hasApiSecret ? '✅' : '❌'}</span>
                <span>CLOUDINARY_API_SECRET</span>
              </div>
            </div>

            <div className={`flex items-center space-x-3 p-3 rounded ${directUploadConfigured ? 'bg-green-900/20' : 'bg-yellow-900/20'}`}>
              <div className={`w-3 h-3 rounded-full ${directUploadConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <div>
                <h3 className="font-medium">Direct Upload Configuration</h3>
                <p className="text-sm text-gray-400">Recommended for videos (bypasses server limits)</p>
              </div>
            </div>

            <div className="ml-6 space-y-2 text-sm">
              <div className={`flex items-center space-x-2 ${config.hasPublicCloudName ? 'text-green-400' : 'text-yellow-400'}`}>
                <span>{config.hasPublicCloudName ? '✅' : '⚠️'}</span>
                <span>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</span>
              </div>
              <div className={`flex items-center space-x-2 ${config.hasUploadPreset ? 'text-green-400' : 'text-yellow-400'}`}>
                <span>{config.hasUploadPreset ? '✅' : '⚠️'}</span>
                <span>NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</span>
              </div>
              <div className={`flex items-center space-x-2 ${config.hasFolder ? 'text-green-400' : 'text-blue-400'}`}>
                <span>{config.hasFolder ? '✅' : 'ℹ️'}</span>
                <span>NEXT_PUBLIC_CLOUDINARY_FOLDER (optional)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Upload */}
        <div className="bg-black border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Video Upload</h2>
          
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={testVideoUpload}
              disabled={testUpload.status === 'testing' || !basicConfigured}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {testUpload.status === 'testing' ? 'Testing...' : 'Test Upload'}
            </button>
          </div>

          {testUpload.message && (
            <div className={`p-3 rounded ${
              testUpload.status === 'success' ? 'bg-green-900/20 text-green-400' :
              testUpload.status === 'error' ? 'bg-red-900/20 text-red-400' :
              'bg-blue-900/20 text-blue-400'
            }`}>
              {testUpload.message}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="bg-gray-900 border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
          
          {!allConfigured && (
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded">
                <h3 className="font-medium text-yellow-400 mb-2">⚠️ Configuration Needed</h3>
                <p className="text-sm">Video uploads require proper Cloudinary configuration. Follow these steps:</p>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Create a free account at <a href="https://cloudinary.com" target="_blank" className="text-blue-400 underline">cloudinary.com</a></li>
                <li>Get your credentials from the Cloudinary dashboard</li>
                <li>Create an unsigned upload preset for direct uploads</li>
                <li>Create a <code className="bg-gray-800 px-1 rounded">.env.local</code> file in your project root</li>
                <li>Add the required environment variables</li>
                <li>Restart your development server</li>
              </ol>

              <div className="bg-gray-800 p-4 rounded">
                <p className="text-sm font-medium mb-2">📝 Check CLOUDINARY_SETUP.md for detailed instructions</p>
              </div>
            </div>
          )}

          {allConfigured && (
            <div className="bg-green-900/20 border border-green-600/30 p-4 rounded">
              <h3 className="font-medium text-green-400 mb-2">✅ Configuration Complete</h3>
              <p className="text-sm">Your Cloudinary configuration looks good! Video uploads should work properly.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudinaryCheck;



