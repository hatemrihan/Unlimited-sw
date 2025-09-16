import { NextRequest, NextResponse } from 'next/server';

// GET - Check email configuration status
export async function GET(request: NextRequest) {
  try {
    const config = {
      hasSmtpUser: !!process.env.BREVO_SMTP_USER,
      hasSmtpPassword: !!process.env.BREVO_SMTP_PASSWORD
    };
    
    console.log('📧 Email configuration check:', {
      hasSmtpUser: config.hasSmtpUser,
      hasSmtpPassword: config.hasSmtpPassword
    });

    return NextResponse.json({
      success: true,
      config,
      message: config.hasSmtpUser && config.hasSmtpPassword 
        ? 'Email configuration is complete' 
        : 'Email configuration is incomplete'
    });

  } catch (error) {
    console.error('❌ Error checking email configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check email configuration' },
      { status: 500 }
    );
  }
}



