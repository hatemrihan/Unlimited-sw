import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import IntroItem from '../../../../models/intro';
import { promises as fs } from 'fs';
import path from 'path';

// POST - Sync intro items from JSON file to MongoDB
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting sync from JSON to MongoDB...');

    // Read from JSON file
    const dataFilePath = path.join(process.cwd(), 'data', 'intro-items.json');
    console.log('📁 Reading from:', dataFilePath);

    let jsonItems = [];
    try {
      const data = await fs.readFile(dataFilePath, 'utf8');
      jsonItems = JSON.parse(data);
      console.log('📖 Found', jsonItems.length, 'items in JSON file');
    } catch (fileError) {
      console.log('❌ Error reading JSON file:', fileError instanceof Error ? fileError.message : String(fileError));
      return NextResponse.json({
        success: false,
        error: 'Could not read JSON file',
        details: fileError instanceof Error ? fileError.message : 'Unknown error'
      }, { status: 500 });
    }

    if (jsonItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No items to sync',
        synced: 0
      });
    }

    // Connect to MongoDB
    await dbConnect();
    console.log('✅ Connected to MongoDB');

    let syncedCount = 0;
    let errors = [];

    // Sync each item
    for (const item of jsonItems) {
      try {
        console.log('🔄 Syncing item:', item._id, '-', item.title);

        // Check if item already exists in MongoDB
        const existingItem = await IntroItem.findById(item._id);
        
        if (existingItem) {
          console.log('📝 Updating existing item:', item._id);
          await IntroItem.findByIdAndUpdate(item._id, {
            title: item.title,
            mainImage: item.mainImage,
            leftImage: item.leftImage,
            rightImage: item.rightImage,
            description: item.description,
            url: item.url,
            isVideo: item.isVideo,
            isActive: item.isActive,
            order: item.order,
            updatedAt: new Date()
          });
        } else {
          console.log('➕ Creating new item:', item._id);
          await IntroItem.create({
            _id: item._id,
            title: item.title,
            mainImage: item.mainImage,
            leftImage: item.leftImage,
            rightImage: item.rightImage,
            description: item.description,
            url: item.url,
            isVideo: item.isVideo,
            isActive: item.isActive,
            order: item.order,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
          });
        }

        syncedCount++;
        console.log('✅ Synced:', item.title);

      } catch (itemError) {
        console.error('❌ Error syncing item:', item._id, itemError);
        errors.push({
          id: item._id,
          title: item.title,
          error: itemError instanceof Error ? itemError.message : 'Unknown error'
        });
      }
    }

    console.log('🎉 Sync completed!', syncedCount, 'items synced,', errors.length, 'errors');

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} intro items to MongoDB`,
      synced: syncedCount,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Sync failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync intro items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check sync status
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Checking sync status...');

    // Read JSON file count
    const dataFilePath = path.join(process.cwd(), 'data', 'intro-items.json');
    let jsonCount = 0;
    try {
      const data = await fs.readFile(dataFilePath, 'utf8');
      const jsonItems = JSON.parse(data);
      jsonCount = jsonItems.length;
    } catch (fileError) {
      console.log('❌ Could not read JSON file');
    }

    // Connect to MongoDB and count
    let mongoCount = 0;
    try {
      await dbConnect();
      mongoCount = await IntroItem.countDocuments();
    } catch (mongoError) {
      console.log('❌ Could not connect to MongoDB');
    }

    return NextResponse.json({
      success: true,
      jsonFileItems: jsonCount,
      mongoDbItems: mongoCount,
      inSync: jsonCount === mongoCount && jsonCount > 0,
      needsSync: jsonCount > mongoCount
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check sync status'
    }, { status: 500 });
  }
}
