import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Notification from '../../../../models/notification';

// GET - Fetch notifications for admin dashboard
export async function GET(request: NextRequest) {
  try {
    console.log('🔔 Fetching admin notifications...');
    
    await dbConnect();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // Build query
    const query: any = {};
    if (unreadOnly) {
      query.isRead = false;
    }
    
    // Fetch notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
    
    console.log(`✅ Found ${notifications.length} notifications`);
    
    return NextResponse.json({
      success: true,
      notifications: notifications.map(notification => ({
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    console.log('🔔 Marking notifications as read...');
    
    const body = await request.json();
    const { notificationIds } = body;
    
    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: 'notificationIds must be an array' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Mark notifications as read
    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { isRead: true }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);
    
    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('❌ Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}

// DELETE - Delete old notifications (cleanup)
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Cleaning up old notifications...');
    
    await dbConnect();
    
    // Delete notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} old notifications`);
    
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clean up notifications' },
      { status: 500 }
    );
  }
}






