import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb';
import IntroItem from '../../../../../models/intro';
import { promises as fs } from 'fs';
import path from 'path';

// Temporarily disabled authentication for setup

// GET - Fetch single intro item (Admin only)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('📖 Fetching single intro item...');

    const params = await context.params;
    const { id } = params;
    
    // Use JSON file fallback for guaranteed stability
    console.log('📁 Using JSON file fallback for single item fetch');

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
        items = [];
      }

      // Find the specific item by ID
      const item = items.find((item: any) => item._id === id);
      
      if (!item) {
        console.log('❌ Intro item not found:', id);
        return NextResponse.json(
          { success: false, error: 'Intro item not found' },
          { status: 404 }
        );
      }

      console.log('✅ Found intro item:', item._id);

      return NextResponse.json({
        success: true,
        item: item
      });

    } catch (fileError) {
      console.error('❌ File fallback failed for single item:', fileError);
      return NextResponse.json({
        success: false,
        error: 'Could not read data file'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ General error fetching single intro item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch intro item',
        item: null 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update intro item (Admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔄 Updating intro item in MongoDB...');

    // Parse request body
    const body = await request.json();
    const params = await context.params;
    const { id } = params;
    
    // Connect to MongoDB
    await dbConnect();
    console.log('✅ MongoDB connected for update');
    
    // Update intro item in MongoDB
    const updatedItem = await IntroItem.findByIdAndUpdate(
      id,
      { 
        ...body,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    );
    
    if (!updatedItem) {
      console.log('❌ Intro item not found:', id);
      return NextResponse.json(
        { success: false, error: 'Intro item not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Intro item updated in MongoDB:', updatedItem._id);
    
    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: 'Intro item updated successfully in MongoDB'
    });
    
  } catch (error) {
    console.error('❌ MongoDB error updating intro item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update intro item in MongoDB' },
      { status: 500 }
    );
  }
}

// DELETE - Delete intro item (Admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🗑️ Deleting intro item...');

    const params = await context.params;
    const { id } = params;
    
    console.log('🔍 Attempting to delete intro item with ID:', id);
    console.log('🔍 ID type:', typeof id);
    console.log('🔍 ID length:', id.length);
    
    // Validate ID format
    if (!id || id.trim() === '') {
      console.log('❌ Invalid ID provided:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid ID provided' },
        { status: 400 }
      );
    }
    
    let deletedFromMongoDB = false;
    let deletedFromFile = false;
    
    // Try to delete from MongoDB first
    try {
      await dbConnect();
      console.log('✅ MongoDB connected for delete');
      
      // First check if item exists in MongoDB
      const existingItem = await IntroItem.findById(id);
      console.log('🔍 MongoDB item exists:', !!existingItem);
      
      if (existingItem) {
        const deletedItem = await IntroItem.findByIdAndDelete(id);
        if (deletedItem) {
          console.log('✅ Intro item deleted from MongoDB:', deletedItem._id);
          deletedFromMongoDB = true;
        }
      } else {
        console.log('📝 Item not found in MongoDB (ID:', id, '), trying JSON file...');
        
        // Count total items in MongoDB for debugging
        const totalMongoItems = await IntroItem.countDocuments();
        console.log('📊 Total items in MongoDB:', totalMongoItems);
        
        if (totalMongoItems === 0) {
          console.log('⚠️ MongoDB is empty! You may need to sync data from JSON file.');
          console.log('💡 Use POST /api/admin/sync-intro to sync data from JSON to MongoDB');
        }
      }
    } catch (mongoError) {
      console.log('❌ MongoDB delete failed, trying JSON file...', mongoError instanceof Error ? mongoError.message : String(mongoError));
    }
    
    // Try to delete from JSON file
    try {
      const dataFilePath = path.join(process.cwd(), 'data', 'intro-items.json');
      console.log('🔍 Looking for intro items file at:', dataFilePath);
      console.log('🔍 Current working directory:', process.cwd());

      // Ensure data directory exists
      const dataDir = path.dirname(dataFilePath);
      try {
        await fs.mkdir(dataDir, { recursive: true });
        console.log('✅ Data directory ensured');
      } catch (mkdirError) {
        console.log('❌ Error creating data directory:', mkdirError instanceof Error ? mkdirError.message : String(mkdirError));
      }

      // Check if file exists
      try {
        await fs.access(dataFilePath);
        console.log('✅ Data file exists and is accessible');
      } catch (accessError) {
        console.log('❌ Data file not accessible:', accessError instanceof Error ? accessError.message : String(accessError));
        // Try to create empty file
        try {
          await fs.writeFile(dataFilePath, '[]');
          console.log('✅ Created empty data file');
        } catch (createError) {
          console.log('❌ Cannot create data file:', createError instanceof Error ? createError.message : String(createError));
          throw new Error('Cannot access or create data file');
        }
      }

      // Read current items
      let items = [];
      try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        items = JSON.parse(data);
        console.log('📖 Successfully read intro items file, found', items.length, 'items');
      } catch (readError) {
        console.log('❌ Error reading intro items file:', readError instanceof Error ? readError.message : String(readError));
        items = [];
      }

      // Find and remove the item
      const initialLength = items.length;
      console.log('🔍 Looking for item with ID:', id);
      console.log('🔍 Available items:', items.map((item: any) => ({ id: item._id, title: item.title })));
      
      items = items.filter((item: any) => item._id !== id);
      
      console.log('🔍 Items after filter:', items.length, 'vs initial:', initialLength);
      
      if (items.length < initialLength) {
        // Write updated items back to file
        await fs.writeFile(dataFilePath, JSON.stringify(items, null, 2));
        console.log('✅ Intro item deleted from JSON file');
        deletedFromFile = true;
      } else {
        console.log('📝 Item not found in JSON file');
      }
    } catch (fileError) {
      console.error('❌ File delete failed:', fileError);
    }
    
    // Check if deletion was successful from either source
    if (deletedFromMongoDB || deletedFromFile) {
      return NextResponse.json({
        success: true,
        message: `Intro item deleted successfully from ${deletedFromMongoDB ? 'MongoDB' : 'JSON file'}`
      });
    } else {
      console.log('❌ Intro item not found in either MongoDB or JSON file:', id);
      return NextResponse.json(
        { success: false, error: 'Intro item not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('❌ General error deleting intro item:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete intro item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
