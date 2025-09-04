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
    console.log('🗑️ Deleting intro item from MongoDB...');

    const params = await context.params;
    const { id } = params;
    
    // Connect to MongoDB
    await dbConnect();
    console.log('✅ MongoDB connected for delete');
    
    // Delete intro item from MongoDB
    const deletedItem = await IntroItem.findByIdAndDelete(id);
    
    if (!deletedItem) {
      console.log('❌ Intro item not found for deletion:', id);
      return NextResponse.json(
        { success: false, error: 'Intro item not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Intro item deleted from MongoDB:', deletedItem._id);
    
    return NextResponse.json({
      success: true,
      message: 'Intro item deleted successfully from MongoDB'
    });
    
  } catch (error) {
    console.error('❌ MongoDB error deleting intro item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete intro item from MongoDB' },
      { status: 500 }
    );
  }
}
