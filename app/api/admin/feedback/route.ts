import { NextRequest, NextResponse } from 'next/server';
import Feedback from '../../../../models/feedback';
import connectToDatabase from '../../../../lib/mongodb';

// GET - Fetch all feedback for admin dashboard
export async function GET() {
  try {
    await connectToDatabase();

    const feedback = await Feedback.find({})
      .sort({ createdAt: -1 })
      .select('_id message rating createdAt isApproved isShownPublic name email phone');

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Error fetching feedback for admin:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

// PATCH - Toggle approval / visibility for a single feedback item
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();

    const { id, isApproved, isShownPublic } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    // Build update object from provided fields
    const update: Record<string, boolean> = {};
    if (typeof isApproved === 'boolean')    update.isApproved = isApproved;
    if (typeof isShownPublic === 'boolean') update.isShownPublic = isShownPublic;

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const feedback = await Feedback.findByIdAndUpdate(id, update, { new: true });

    if (!feedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}
