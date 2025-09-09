import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '../../../lib/cloudinary';

// Ensure Node.js runtime for Cloudinary upload_stream (Edge runtime doesn't support Buffer/streams)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileSizeMB = file.size / 1024 / 1024;
    const isVideo = file.type.startsWith('video/');

    console.log('📁 Server uploading file:', {
      name: file.name,
      type: file.type,
      size: `${fileSizeMB.toFixed(2)} MB`,
      isVideo
    });

    // Check file size limits (serverless functions have limits)
    if (fileSizeMB > 10) { // 10MB limit for server uploads
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large (${fileSizeMB.toFixed(1)}MB). Server uploads limited to 10MB. For videos, please configure Cloudinary direct uploads.`,
          details: 'Check CLOUDINARY_SETUP.md for configuration instructions'
        },
        { status: 413 }
      );
    }

    // Warn about video uploads via server
    if (isVideo && fileSizeMB > 5) {
      console.warn('⚠️ Large video uploaded via server route - recommend Cloudinary direct upload');
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine if it's a video file
    const isVideo = file.type.startsWith('video/') || 
                   file.name.toLowerCase().includes('.mp4') ||
                   file.name.toLowerCase().includes('.mov') ||
                   file.name.toLowerCase().includes('.avi') ||
                   file.name.toLowerCase().includes('.webm');

    console.log('🎥 Is video file:', isVideo);

    // Upload to Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadOptions: any = {
        resource_type: isVideo ? 'video' : 'image',
        folder: 'alkadyy-intro',
      };

      // Add video-specific options if it's a video
      if (isVideo) {
        uploadOptions.quality = 'auto';
        uploadOptions.format = 'mp4';
      }

      console.log('⚙️ Upload options:', uploadOptions);

      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary success:', {
              url: result?.secure_url,
              resource_type: result?.resource_type,
              format: result?.format
            });
            resolve(result);
          }
        }
      ).end(buffer);
    });

    // Return the Cloudinary URL
    return NextResponse.json({
      success: true,
      url: (uploadResponse as any).secure_url,
      public_id: (uploadResponse as any).public_id,
      resource_type: (uploadResponse as any).resource_type,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Upload API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}



