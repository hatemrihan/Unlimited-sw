import { NextRequest, NextResponse } from 'next/server';

// Admin password - you can move this to environment variable for better security
const ADMIN_PASSWORD = '012345';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_PASSWORD) {
      // Create response with success
      const response = NextResponse.json({ success: true });
      
      // Set cookie for authentication
      response.cookies.set('adminAuthenticated', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return response;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// Logout endpoint
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Remove the authentication cookie
  response.cookies.set('adminAuthenticated', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}



















