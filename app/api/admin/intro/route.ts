import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import IntroItem from '../../../../models/intro';
import { promises as fs } from 'fs';
import path from 'path';

// GET - Fetch all intro items for admin dashboard
export async function GET(request: NextRequest) {
  try {
    console.log('📖 Admin fetching intro items...');

    // Prefer MongoDB, fallback to JSON file
    try {
      await dbConnect();
      console.log('✅ MongoDB connected for admin list');

      const items = await IntroItem.find().sort({ order: 1, createdAt: -1 }).lean();
      console.log('✅ Found', items.length, 'intro items from MongoDB');

      return NextResponse.json({ success: true, items, count: items.length });
    } catch (mongoError) {
      console.log('❌ MongoDB fetch failed, using JSON fallback:', mongoError instanceof Error ? mongoError.message : String(mongoError));

      try {
        const dataFilePath = path.join(process.cwd(), 'data', 'intro-items.json');
        console.log('🔍 Looking for intro items file at:', dataFilePath);

        // Read all items from file
        let items = [] as any[];
        try {
          const data = await fs.readFile(dataFilePath, 'utf8');
          items = JSON.parse(data);
          console.log('📖 Successfully read intro items file, parsing data...');
        } catch (e: unknown) {
          console.log('❌ Error reading intro items file:', e instanceof Error ? e.message : String(e));
          items = [];
        }

        console.log('✅ Found', items.length, 'intro items from file for admin');

        return NextResponse.json({ success: true, items, count: items.length });
      } catch (fileError) {
        console.error('❌ File fallback also failed for admin:', fileError);
        return NextResponse.json({ success: false, items: [], count: 0, error: 'Could not read data file' });
      }
    }

  } catch (error) {
    console.error('❌ General error fetching intro items for admin:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch intro items for admin',
        items: [] 
      },
      { status: 500 }
    );
  }
}

// POST - Create new intro item (Admin only)
export async function POST(request: NextRequest) {
  try {
    console.log('📝 Creating intro item...');
    
    // Parse request body
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { title, mainImage, leftImage, rightImage, description, isVideo } = body;
    
    // Validate required fields (description is now optional)
    if (!title || !mainImage || !leftImage || !rightImage) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Title and all images are required' },
        { status: 400 }
      );
    }
    
    console.log('✅ All fields validated');
    
    try {
      // Try MongoDB first
      await dbConnect();
      console.log('✅ MongoDB connected');
      
      // Create new intro item in MongoDB
      const newItem = new IntroItem({
        title: title.trim(),
        mainImage: mainImage.trim(),
        leftImage: leftImage.trim(),
        rightImage: rightImage.trim(),
        description: description ? description.trim() : '',
        url: '#',  // Default URL since it's removed from form
        isVideo: isVideo || false,
        isActive: true,
        order: 0  // Default order
      });
      
      // Save to MongoDB
      const savedItem = await newItem.save();
      console.log('✅ Intro item saved to MongoDB:', savedItem._id);
      
      return NextResponse.json({
        success: true,
        item: savedItem,
        message: 'Intro item created successfully in MongoDB'
      });
      
    } catch (mongoError) {
      console.error('❌ MongoDB error, using fallback:', mongoError);
      
      // Fallback to file storage if MongoDB fails
      const { promises: fs } = require('fs');
      const path = require('path');
      
      try {
        const dataFilePath = path.join(process.cwd(), 'data', 'intro-items.json');
        
        // Read existing items
        let items = [];
        try {
          const data = await fs.readFile(dataFilePath, 'utf8');
          items = JSON.parse(data);
        } catch (e) {
          items = [];
        }
        
        // Create new item
        const newItem = {
          _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: title.trim(),
          mainImage: mainImage.trim(),
          leftImage: leftImage.trim(),
          rightImage: rightImage.trim(),
          description: description.trim(),
          url: '#',  // Default URL since it's removed from form
          isVideo: isVideo || false,
          isActive: true,
          order: 0,  // Default order since it's removed from form
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Add to items
        items.push(newItem);
        
        // Write back to file
        await fs.writeFile(dataFilePath, JSON.stringify(items, null, 2));
        console.log('✅ Intro item saved to file as fallback:', newItem._id);
        
        return NextResponse.json({
          success: true,
          item: newItem,
          message: 'Intro item created successfully (file fallback)'
        });
        
      } catch (fileError) {
        console.error('❌ File fallback also failed:', fileError);
        throw fileError;
      }
    }
    
  } catch (error: unknown) {
    console.error('❌ General error creating intro item:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create intro item: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
