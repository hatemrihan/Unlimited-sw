import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import IntroItem from '../../../../models/intro';
import { promises as fs } from 'fs';
import path from 'path';

// GET - Fetch all intro items for admin dashboard
export async function GET(request: NextRequest) {
  try {
    console.log('📖 Admin fetching intro items...');

    // Skip MongoDB entirely - use JSON files only for guaranteed stability
    console.log('📁 Using JSON file fallback for guaranteed stability');

    // Fallback to file storage (primary method)

    try {
      const dataFilePath = path.join(process.cwd(), 'data', 'intro-items.json');
      console.log('🔍 Looking for intro items file at:', dataFilePath);

      // Read all items from file
      let items = [];
      try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        items = JSON.parse(data);
        console.log('📖 Successfully read intro items file, parsing data...');
      } catch (e: unknown) {
        console.log('❌ Error reading intro items file:', e instanceof Error ? e.message : String(e));
        // Return empty array instead of crashing
        items = [];
      }

      console.log('✅ Found', items.length, 'intro items from file for admin');

      return NextResponse.json({
        success: true,
        items: items,
        count: items.length
      });

    } catch (fileError) {
      console.error('❌ File fallback also failed for admin:', fileError);
      return NextResponse.json({
        success: false,
        items: [],
        count: 0,
        error: 'Could not read data file'
      });
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
    
    const { title, mainImage, leftImage, rightImage, description, url, isVideo, order } = body;
    
    // Validate required fields
    if (!title || !mainImage || !leftImage || !rightImage || !description || !url) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
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
        description: description.trim(),
        url: url.trim(),
        isVideo: isVideo || false,
        isActive: true,
        order: order || 0
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
          url: url.trim(),
          isVideo: isVideo || false,
          isActive: true,
          order: order || items.length,
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
