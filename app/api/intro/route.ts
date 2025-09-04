import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import IntroItem from '../../../models/intro';
import { promises as fs } from 'fs';
import path from 'path';

// GET - Fetch all active intro items for frontend
export async function GET(request: NextRequest) {
  try {
    console.log('🌐 Frontend fetching intro items...');
    
    // Skip MongoDB entirely for frontend - use JSON files only
    console.log('📁 Frontend using JSON file fallback for guaranteed stability');
      
      // Fallback to file storage
      
      const dataFilePath = path.join(process.cwd(), 'data', 'intro-items.json');

      // Read items from file
      let allItems = [];
      try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        allItems = JSON.parse(data);
      } catch (e) {
        allItems = [];
      }

      // Filter active items
      const activeItems = allItems.filter((item: unknown) => item && typeof item === 'object' && 'isActive' in item && item.isActive === true);

      console.log('✅ Found', activeItems.length, 'active intro items from file fallback');

      return NextResponse.json({
        success: true,
        items: activeItems,
        count: activeItems.length
      });
    }
  catch (error) {
    console.error('❌ General error fetching intro items:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch intro items',
        items: []
      },
      { status: 500 }
    );
  }
}

// POST - Create new intro item (This endpoint is not used by frontend)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Use admin API endpoint instead' },
    { status: 404 }
  );
}
