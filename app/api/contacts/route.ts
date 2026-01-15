import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Contact from '../../../models/contact';

// Ensure Node runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const body = await request.json();
        const { name, email } = body;

        // Validation
        if (!name || !email) {
            return NextResponse.json(
                { success: false, error: 'Name and email are required' },
                { status: 400 }
            );
        }

        const contact = await Contact.create({
            name,
            email
        });

        return NextResponse.json({
            success: true,
            message: 'Contact request submitted successfully',
            contact
        });

    } catch (error) {
        console.error('Error submitting contact form:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to submit request' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const contacts = await Contact.find({})
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json({
            success: true,
            contacts
        });

    } catch (error) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch contacts' },
            { status: 500 }
        );
    }
}
