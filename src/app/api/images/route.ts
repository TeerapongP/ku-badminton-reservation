import { NextRequest, NextResponse } from 'next/server';

// This is a fallback route for /api/images
export async function GET(request: NextRequest) {
    return NextResponse.json({
        error: 'Image path required',
        message: 'Please specify image path: /api/images/[path]',
        examples: [
            '/api/images/profiles/image.jpg',
            '/api/images/facilities/facility.png',
            '/api/images/courts/court.webp'
        ]
    }, { status: 400 });
}