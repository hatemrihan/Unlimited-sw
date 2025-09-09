import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '../../../lib/cloudinary';

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

    console.log('📁 Uploading file:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    });

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
        resource_type: 'auto', // Automatically detect file type (image/video)
        folder: 'alkadyy-intro', // Organize uploads in a folder
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



