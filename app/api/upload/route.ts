import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { consumeRateLimit, clientKey } from '@/lib/throttle';
import { sniffImageMime, MAX_SCREENSHOT_BYTES, SCREENSHOT_PREFIX } from '@/lib/imageUpload';

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

/**
 * Deliberately generous, for the same reason the order throttle is: Egyptian
 * mobile networks put very many customers behind one carrier-grade NAT address,
 * so a tight per-IP limit would refuse real people who share an operator. This
 * is sized to stop a script filling the bucket, not to ration customers — one
 * order needs one screenshot, and a few retries for a bad photo.
 */
const UPLOAD_RATE_LIMIT = { limit: 15, windowMs: 15 * 60 * 1000 };

export async function POST(request: NextRequest) {
  try {
    // This endpoint writes to S3 for anyone who asks, because the customer
    // sending a payment screenshot has no account. Unlimited, that is a file
    // host paid for by the shop.
    const throttle = await consumeRateLimit(`upload:${clientKey(request.headers)}`, UPLOAD_RATE_LIMIT);

    if (!throttle.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'محاولات رفع كتير في وقت قصير. استنى شوية وجرب تاني.',
          code: 'RATE_LIMITED',
        },
        { status: 429, headers: { 'Retry-After': String(throttle.retryAfterSeconds) } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileSizeMB = file.size / 1024 / 1024;

    // The checkout form promises 5MB; the server used to allow 10.
    if (file.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large (${fileSizeMB.toFixed(1)}MB). Uploads limited to ${MAX_SCREENSHOT_BYTES / 1024 / 1024}MB.`
        },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // The bytes, not `file.type` — that field is chosen by the uploader, and
    // renaming payload.exe to receipt.png sets it to image/png for free.
    const imageMime = sniffImageMime(new Uint8Array(buffer));

    if (!imageMime) {
      console.warn('🚫 Refused a non-image upload', { name: file.name, claimedType: file.type });
      return NextResponse.json(
        { success: false, error: 'Only image files can be uploaded.' },
        { status: 415 }
      );
    }

    // Create a unique filename safely, under a prefix that can be expired by an
    // S3 lifecycle rule — these are evidence for one order, not site assets.
    const uniqueFileName = `${SCREENSHOT_PREFIX}${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    console.log('☁️ Uploading file to AWS S3:', {
      name: uniqueFileName,
      size: `${fileSizeMB.toFixed(2)} MB`,
      type: imageMime
    });

    const putCommand = new PutObjectCommand({
      Bucket: process.env.ALKADY_AWS_S3_BUCKET_NAME as string,
      Key: uniqueFileName,
      Body: buffer,
      // The sniffed type, so S3 cannot be told to serve something back with a
      // content type the file is not.
      ContentType: imageMime,
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
