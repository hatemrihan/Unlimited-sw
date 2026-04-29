import { NextRequest, NextResponse } from 'next/server';
import Feedback from '../../../../../models/feedback';
import connectToDatabase from '../../../../../lib/mongodb';

// DELETE - Delete a feedback item by ID
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await connectToDatabase();

    const deleted = await Feedback.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
