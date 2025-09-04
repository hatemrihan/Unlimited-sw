import { NextRequest, NextResponse } from 'next/server';
import Feedback from '../../../../../models/feedback';
import connectToDatabase from '../../../../../lib/mongodb';

// DELETE - Delete feedback (Admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🗑️ Deleting feedback...');

    const params = await context.params;
    const { id } = params;
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Database connected for delete');
    
    // Delete feedback
    const deletedFeedback = await Feedback.findByIdAndDelete(id);
    
    if (!deletedFeedback) {
      console.log('❌ Feedback not found for deletion:', id);
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Feedback deleted:', deletedFeedback._id);
    
    return NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}

