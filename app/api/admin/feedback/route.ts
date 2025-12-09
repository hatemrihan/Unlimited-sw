import { NextRequest, NextResponse } from 'next/server';
import Feedback from '../../../../models/feedback';
import connectToDatabase from '../../../../lib/mongodb';

// GET - Get all feedback for admin
export async function GET() {
  try {
    await connectToDatabase();

    const feedback = await Feedback.find({})
      .sort({ createdAt: -1 })
      .select('_id message rating createdAt isApproved isShownPublic name email phone');

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error('Error fetching feedback for admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

// PATCH - Approve/Reject feedback or toggle show status
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { id, isApproved, isShownPublic } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    // Build update object based on what was provided
    const updateObj: { isApproved?: boolean; isShownPublic?: boolean } = {};
    if (typeof isApproved === 'boolean') {
      updateObj.isApproved = isApproved;
    }
    if (typeof isShownPublic === 'boolean') {
      updateObj.isShownPublic = isShownPublic;
    }

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      updateObj,
      { new: true }
    );

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Feedback updated successfully',
      feedback
    });

  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

// DELETE - Delete feedback
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}






