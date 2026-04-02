import { NextRequest, NextResponse } from 'next/server';
import { STATIC_CITIES } from '../../../../data/checkout-cities';

// STATIC FALLBACK MODE — serving instantly without MongoDB
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    cities: STATIC_CITIES,
  });
}
