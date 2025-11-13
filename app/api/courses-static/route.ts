/**
 * ===============================
 * MVP COURSE API (STATIC DATA)
 * ===============================
 * 
 * Simplified course API that uses static data
 * No database required for MVP
 */

import { NextRequest, NextResponse } from 'next/server';
import { COURSES } from '@/lib/courses';
import logger from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
    try {
        logger.info('Serving courses from static data');

        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get('sortBy') || 'custom';

        // Sort courses based on parameter
        let sortedCourses = [...COURSES];

        switch (sortBy) {
            case 'newest':
                sortedCourses = COURSES.slice().reverse(); // Reverse for newest first
                break;
            case 'price_low':
                sortedCourses.sort((a, b) => a.price - b.price);
                break;
            case 'price_high':
                sortedCourses.sort((a, b) => b.price - a.price);
                break;
            case 'alphabetical':
                sortedCourses.sort((a, b) => a.title.localeCompare(b.title));
                break;
            default:
                // Keep original order
                break;
        }

        return NextResponse.json({
            success: true,
            courses: sortedCourses,
            total: sortedCourses.length,
            cached: false,
            timestamp: new Date().toISOString(),
            source: 'static'
        });

    } catch (error) {
        logger.error('Error in courses API', error);

        return NextResponse.json({
            success: false,
            error: 'Unable to fetch courses',
            message: 'Static data error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
