import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import IntroItem from '../../../models/intro';
import { promises as fs } from 'fs';
import path from 'path';

// GET - Fetch all active intro items for frontend
export async function GET(request: NextRequest) {
  try {
    console.log('🌐 Frontend fetching intro items...');

    // Prefer MongoDB for live data
    try {
      await dbConnect();
      const items = await IntroItem.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
      return NextResponse.json({ success: true, items, count: items.length });
    } catch (mongoError) {
      console.log('❌ MongoDB fetch failed on frontend, using JSON fallback');

      const dataFilePath = path.join(process.cwd(), 'data', 'intro-items.json');
      // Read items from file
      let allItems = [] as any[];
      try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        allItems = JSON.parse(data);
      } catch (e) {
        allItems = [];
      }
      const activeItems = allItems.filter((item: any) => item && item.isActive === true);
      return NextResponse.json({ success: true, items: activeItems, count: activeItems.length });
    }
  } catch (error) {
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
