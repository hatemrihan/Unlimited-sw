// API endpoint for uploading files to AWS S3
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure S3 client with AWS credentials
// Using custom variable names to avoid Netlify/Vercel reserved variable conflicts
const s3Client = new S3Client({
  region: process.env.ALKADY_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ALKADY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.ALKADY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('📤 S3 Upload ye - Starting upload process...');

    // Check if AWS credentials are configured
    const accessKeyId = process.env.ALKADY_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.ALKADY_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!accessKeyId || !secretAccessKey) {
      console.error('❌ AWS credentials not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: 'AWS credentials not configured. Please set ALKADY_AWS_ACCESS_KEY_ID and ALKADY_AWS_SECRET_ACCESS_KEY in environment variables' 
        },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No file provided');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📁 File received:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.error('❌ File too large');
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        },
        { status: 400 }
      );
    }

    // Determine file type (image or video)
    const isVideo = file.type.startsWith('video/') || 
                   file.name.toLowerCase().endsWith('.mp4') ||
                   file.name.toLowerCase().endsWith('.mov') ||
                   file.name.toLowerCase().endsWith('.avi') ||
                   file.name.toLowerCase().endsWith('.webm');

    const resourceType = isVideo ? 'video' : 'image';
    console.log(`📹 Detected file type: ${resourceType}`);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${resourceType}s/${timestamp}-${randomString}.${fileExtension}`;

    console.log('📝 Generated S3 key:', fileName);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const bucketName = process.env.ALKADY_AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
    
    if (!bucketName) {
      console.error('❌ S3 bucket name not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: 'AWS S3 bucket name not configured. Please set ALKADY_AWS_S3_BUCKET_NAME in environment variables' 
        },
        { status: 500 }
      );
    }

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      // Files are publicly readable via bucket policy (no ACL needed)
    };

    console.log('☁️ Uploading to S3...');
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Construct the public URL
    const region = process.env.ALKADY_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

    console.log('✅ S3 upload successful!');
    console.log('🔗 Public URL:', publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      resource_type: resourceType,
      message: 'File uploaded successfully to S3',
    });

  } catch (error) {
    console.error('❌ S3 upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

