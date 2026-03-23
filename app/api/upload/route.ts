import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Ensure Node.js runtime for Buffer support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const s3Client = new S3Client({
  region: process.env.ALKADY_AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.ALKADY_AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.ALKADY_AWS_SECRET_ACCESS_KEY as string,
  },
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileSizeMB = file.size / 1024 / 1024;
    
    // Check file size limit
    if (fileSizeMB > 10) { 
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large (${fileSizeMB.toFixed(1)}MB). Uploads limited to 10MB.`
        },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename safely
    const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    console.log('☁️ Uploading file to AWS S3:', {
      name: uniqueFileName,
      size: `${fileSizeMB.toFixed(2)} MB`,
      type: file.type
    });

    const putCommand = new PutObjectCommand({
      Bucket: process.env.ALKADY_AWS_S3_BUCKET_NAME as string,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(putCommand);

    const fileUrl = `https://${process.env.ALKADY_AWS_S3_BUCKET_NAME}.s3.${process.env.ALKADY_AWS_REGION}.amazonaws.com/${uniqueFileName}`;

    console.log('✅ AWS S3 success:', fileUrl);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Upload API error:', error);
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
