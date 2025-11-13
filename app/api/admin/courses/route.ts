/**
 * ===============================
 * ADMIN COURSE MANAGEMENT API
 * ===============================
 * 
 * Professional course CRUD operations for admin team.
 * Provides create, read, update, delete operations with:
 * - Authentication & authorization
 * - Manual courseId input (must match LMS system)
 * - Data validation & sanitization  
 * - Cache management
 * - Audit logging
 * 
 * IMPORTANT: Course IDs must be provided manually to match your LMS system.
 * They are NOT auto-generated to ensure consistency across platforms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Course } from '@/lib/models/course';
import { RedisCache } from '@/lib/redis';

// ===============================
// HELPER FUNCTIONS
// ===============================

/**
 * Validate courseId format to match LMS standards
 */
function validateCourseId(courseId: string): boolean {
    // Allow flexible courseId format to match your LMS
    // Common formats: course-v1:ORG+COURSE+RUN or simple course identifiers
    if (!courseId || typeof courseId !== 'string') return false;

    // Basic validation: should be non-empty, reasonable length
    const trimmed = courseId.trim();
    return trimmed.length >= 3 && trimmed.length <= 100;
}

/**
 * Get next available order number
 */
async function getNextCourseOrder(): Promise<number> {
    const lastCourse = await Course.findOne({}, {}, { sort: { order: -1 } });
    return (lastCourse?.order || 0) + 1;
}

/**
 * Validate course creation data
 */
function validateCourseData(data: any) {
    const errors: string[] = [];

    // Required fields
    if (!data.courseId?.trim()) errors.push('Course ID is required (must match your LMS)');
    if (!validateCourseId(data.courseId)) {
        errors.push('Course ID format is invalid (3-100 characters required)');
    }
    if (!data.title?.trim()) errors.push('Title is required');
    if (!data.description?.trim()) errors.push('Description is required');
    if (typeof data.price !== 'number' || data.price < 0) {
        errors.push('Price must be a non-negative number');
    }
    if (!data.duration?.trim()) errors.push('Duration is required');
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(data.level)) {
        errors.push('Level must be Beginner, Intermediate, or Advanced');
    }
    if (!data.image?.trim()) errors.push('Course image is required');
    if (!Array.isArray(data.features) || data.features.length === 0) {
        errors.push('At least one feature is required');
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Sanitize and return clean data
    return {
        courseId: data.courseId.trim(),
        title: data.title.trim(),
        description: data.description.trim(),
        price: Number(data.price),
        duration: data.duration.trim(),
        level: data.level,
        image: data.image.trim(),
        features: data.features.filter((f: string) => f.trim()).map((f: string) => f.trim()),
        category: data.category?.trim() || 'General',
        tags: Array.isArray(data.tags) ? data.tags : [],
        status: data.status || 'draft'
    };
}

// ===============================
// API ENDPOINTS
// ===============================

/**
 * POST /api/admin/courses
 * Create a new course
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // 2. Parse and validate request body
        const requestData = await request.json();
        const validatedData = validateCourseData(requestData);

        // 3. Check for duplicate courseId (must match LMS)
        const existingCourseById = await Course.findOne({
            courseId: validatedData.courseId
        });

        if (existingCourseById) {
            return NextResponse.json(
                { error: 'A course with this Course ID already exists. Course ID must match your LMS.' },
                { status: 400 }
            );
        }

        // 4. Check for duplicate titles
        const existingCourseByTitle = await Course.findOne({
            title: { $regex: new RegExp(`^${validatedData.title}$`, 'i') }
        });

        if (existingCourseByTitle) {
            return NextResponse.json(
                { error: 'A course with this title already exists' },
                { status: 400 }
            );
        }

        // 5. Connect to database
        await connectToDatabase();

        // 6. Create new course
        const courseOrder = await getNextCourseOrder();

        const newCourse = new Course({
            ...validatedData,
            totalEnrollments: 0,
            enrolledUsers: [],
            isActive: validatedData.status === 'published',
            order: courseOrder,
            createdBy: session.user.email,
            lastModified: new Date(),
            modifiedBy: session.user.email
        });

        const savedCourse = await newCourse.save();

        // 7. Clear cache to ensure fresh data
        await RedisCache.clearCourseCache();

        // 8. Return success response
        return NextResponse.json({
            success: true,
            course: {
                courseId: savedCourse.courseId,
                title: savedCourse.title,
                status: validatedData.status,
                createdAt: savedCourse.createdAt
            },
            message: 'Course created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Course creation error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to create course',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/courses
 * Get all courses for admin management
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // 2. Parse query parameters
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // draft, published, archived
        const category = searchParams.get('category');
        const sortBy = searchParams.get('sortBy') || 'order';
        const limit = parseInt(searchParams.get('limit') || '50');

        // 3. Build query filter
        const filter: any = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        // 4. Build sort options
        let sortOptions: any = { order: 1 };
        switch (sortBy) {
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'title':
                sortOptions = { title: 1 };
                break;
            case 'enrollments':
                sortOptions = { totalEnrollments: -1 };
                break;
            case 'price':
                sortOptions = { price: -1 };
                break;
        }

        // 5. Connect to database and fetch courses
        await connectToDatabase();

        const courses = await Course.find(filter)
            .select('courseId title description price level image totalEnrollments status isActive createdAt lastModified order')
            .sort(sortOptions)
            .limit(limit)
            .lean();

        // 6. Get summary statistics
        const stats = await Course.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalEnrollments: { $sum: '$totalEnrollments' }
                }
            }
        ]);

        const statsMap = {
            total: courses.length,
            draft: 0,
            published: 0,
            archived: 0,
            totalEnrollments: 0
        };

        stats.forEach(stat => {
            if (stat._id) {
                statsMap[stat._id as keyof typeof statsMap] = stat.count;
            }
            statsMap.totalEnrollments += stat.totalEnrollments;
        });

        // 7. Return admin course data
        return NextResponse.json({
            success: true,
            courses,
            statistics: statsMap,
            filters: {
                status: status || 'all',
                category: category || 'all',
                sortBy,
                limit
            }
        });

    } catch (error) {
        console.error('Admin courses fetch error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch courses'
        }, { status: 500 });
    }
}