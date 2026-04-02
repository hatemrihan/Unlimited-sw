import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Contact from '../../../models/contact';
import { logger } from '../../../utils/logger';

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
        logger.error('Error submitting contact form:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to submit request' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const search = url.searchParams.get('search') || '';
        const skip = (page - 1) * limit;

        const query: any = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { status: { $regex: search, $options: 'i' } }
            ];
        }

        const totalCount = await Contact.countDocuments(query);

        const contacts = await Contact.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return NextResponse.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            contacts
        });

    } catch (error) {
        logger.error('Error fetching contacts natively:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch contacts schema' },
            { status: 500 }
        );
    }
}
