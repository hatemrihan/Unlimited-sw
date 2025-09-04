
import { NextRequest, NextResponse } from 'next/server';
import Feedback from '../../../models/feedback';
import connectToDatabase from '../../../lib/mongodb';

// POST - Submit new feedback
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { message, rating, name, email, phone } = await request.json();

    // Validate input
    if (!message || !rating) {
      return NextResponse.json(
        { error: 'Message and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be less than 500 characters' },
        { status: 400 }
      );
    }

    // Create new feedback with additional fields
    const fullMessage = `${message.trim()}${name ? `\n\nFrom: ${name}` : ''}${email ? `\nEmail: ${email}` : ''}${phone ? `\nPhone: ${phone}` : ''}`;

    const feedback = new Feedback({
      message: fullMessage,
      rating: Number(rating),
      isApproved: false // Admin approval required
    });

    await feedback.save();

    return NextResponse.json(
      { message: 'Feedback submitted successfully! It will be reviewed by our team.' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// GET - Retrieve approved feedback for public display
export async function GET() {
  try {
    await connectToDatabase();

    const feedback = await Feedback.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('message rating createdAt');

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
