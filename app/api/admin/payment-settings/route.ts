import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import PaymentSettings from '../../../../models/paymentSettings';

// GET - Fetch payment settings
export async function GET(request: NextRequest) {
  try {
    console.log('🎛️ Fetching payment settings...');
    
    await dbConnect();
    
    // Get or create payment settings (there should only be one document)
    let settings = await PaymentSettings.findOne({});
    
    if (!settings) {
      // Create default settings if none exist
      settings = new PaymentSettings({
        codEnabled: true, // COD enabled by default
        instaPayEnabled: true, // InstaPay always enabled
      });
      await settings.save();
      console.log('✅ Created default payment settings');
    }
    
    console.log('✅ Payment settings fetched:', settings);
    
    return NextResponse.json({
      success: true,
      settings: {
        codEnabled: settings.codEnabled,
        instaPayEnabled: settings.instaPayEnabled,
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payment settings'
    }, { status: 500 });
  }
}

// PUT - Update payment settings
export async function PUT(request: NextRequest) {
  try {
    console.log('🎛️ Updating payment settings...');
    
    await dbConnect();
    
    const { codEnabled } = await request.json();
    
    // Validate input
    if (typeof codEnabled !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'codEnabled must be a boolean'
      }, { status: 400 });
    }
    
    // Update or create payment settings
    let settings = await PaymentSettings.findOne({});
    
    if (!settings) {
      // Create new settings
      settings = new PaymentSettings({
        codEnabled,
        instaPayEnabled: true, // Always true
      });
    } else {
      // Update existing settings
      settings.codEnabled = codEnabled;
      // Keep InstaPay always enabled
      settings.instaPayEnabled = true;
    }
    
    await settings.save();
    
    console.log('✅ Payment settings updated:', settings);
    
    return NextResponse.json({
      success: true,
      settings: {
        codEnabled: settings.codEnabled,
        instaPayEnabled: settings.instaPayEnabled,
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating payment settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update payment settings'
    }, { status: 500 });
  }
}


