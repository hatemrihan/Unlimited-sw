import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    version: '2024-12-10-fix-v2',
    timestamp: new Date().toISOString(),
    fixes: [
      'Fixed video->videos field mapping',
      'Fixed cityPricing initialization with default Cairo data',
      'Fixed order variant handling'
    ]
  });
}
