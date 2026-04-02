import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetEmail = url.searchParams.get('email') || 'hatemrihan22@gmail.com';

  const smtpUser = process.env.BREVO_SMTP_USER || '969421001@smtp-brevo.com';
  const smtpPassword = process.env.BREVO_SMTP_PASSWORD;

  if (!smtpPassword) {
    return NextResponse.json({ error: 'BREVO_SMTP_PASSWORD missing from .env.local' }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  try {
    const info = await transporter.sendMail({
      // Testing with a direct string format instead of an object, sometimes Brevo prefers this to avoid overwriting to brevosend.com
      from: '"UNLIMITED SW" <orders@unlimited-sw.com>',
      to: targetEmail,
      subject: '🚨 Test Email from UNLIMITED-SW',
      text: 'This is a test email to verify Brevo delivery.',
      html: '<h1 style="color:red;">Brevo Test</h1><p>If you see this, emails are landing!</p>',
    });

    return NextResponse.json({ 
      success: true, 
      message: `Email dispatched to ${targetEmail}`,
      messageId: info.messageId,
      envelope: info.envelope,
      accepted: info.accepted
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
