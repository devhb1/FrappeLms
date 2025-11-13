import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Course } from '@/lib/models/course';
import { RedisCache, REDIS_KEYS, CACHE_TTL } from '@/lib/redis';

/**
 * GET /api/courses/[id]
 * 
 * Fetches a specific course by ID from the database
 * 
 * @param request - The incoming request
 * @param params - Route parameters containing the course ID
 * @returns Course data or error response
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const courseId = decodeURIComponent(id);

        // Create cache key for this specific course
        const cacheKey = REDIS_KEYS.COURSE_DETAIL(courseId);

        // Try to get from cache first
        const cachedCourse = await RedisCache.get(cacheKey);
        if (cachedCourse) {
            console.log(`✅ Course ${courseId} served from Redis cache`);
            return NextResponse.json({
                success: true,
                course: cachedCourse,
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        // If not in cache, fetch from database
        await connectToDatabase();

        // Find course by courseId field
        const course = await Course.findOne({
            courseId: courseId,
            isActive: true
        }).select('-__v -updatedAt');

        if (!course) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        // Transform the course data to match the frontend interface
        const courseData = {
            courseId: course.courseId,  // Keep consistent field naming
            title: course.title,
            description: course.description,
            price: course.price,
            duration: course.duration,
            level: course.level,
            image: course.image,
            features: course.features,
            totalEnrollments: course.totalEnrollments,
            createdAt: course.createdAt
        };

        // Cache the course data
        await RedisCache.set(cacheKey, courseData, CACHE_TTL.COURSE_DETAIL);
        console.log(`💾 Course ${courseId} cached to Redis`);

        return NextResponse.json({
            success: true,
            course: courseData,
            cached: false,
            timestamp: new Date().toISOString()
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching course:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
