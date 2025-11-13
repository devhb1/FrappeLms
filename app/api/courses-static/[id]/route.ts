/**
 * ===============================
 * MVP COURSE DETAIL API (STATIC)
 * ===============================
 * 
 * Simplified course detail API using static data
 * No database required for MVP
 */

import { NextRequest, NextResponse } from 'next/server';
import { COURSES } from '@/lib/courses';
import logger from '@/lib/utils/logger';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const courseId = decodeURIComponent(id);

        logger.info('Looking for course', { courseId });

        // Get course from static data
        const course = COURSES.find(c => c.courseId === courseId);

        if (!course) {
            logger.warn('Course not found', { courseId });
            return NextResponse.json({
                error: 'Course not found',
                courseId,
                message: 'The requested course does not exist in our catalog'
            }, { status: 404 });
        }

        logger.success('Found course', { title: course.title, courseId });

        return NextResponse.json({
            success: true,
            course: course,
            cached: false,
            timestamp: new Date().toISOString(),
            source: 'static'
        });

    } catch (error) {
        logger.error('Error fetching course', error);

        return NextResponse.json({
            error: 'Internal server error',
            message: 'Failed to load course details'
        }, { status: 500 });
    }
}
