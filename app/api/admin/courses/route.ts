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
 * Sanitize and validate courseId format to match LMS standards
 */
function sanitizeCourseId(courseId: string): string {
    if (!courseId || typeof courseId !== 'string') {
        throw new Error('Course ID must be a non-empty string');
    }

    // Trim whitespace and convert to lowercase
    let sanitized = courseId.trim().toLowerCase();

    // Replace spaces with hyphens
    sanitized = sanitized.replace(/\s+/g, '-');

    // Remove any characters that aren't allowed (keep: letters, numbers, - _ : + . % /)
    sanitized = sanitized.replace(/[^a-z0-9-_:+.%\/]/g, '');

    // Remove consecutive hyphens
    sanitized = sanitized.replace(/-+/g, '-');

    // Remove leading/trailing hyphens
    sanitized = sanitized.replace(/^-+|-+$/g, '');

    if (sanitized.length < 3 || sanitized.length > 100) {
        throw new Error('Course ID must be between 3 and 100 characters');
    }

    return sanitized;
}

/**
 * Validate courseId format to match LMS standards
 */
function validateCourseId(courseId: string): boolean {
    try {
        const sanitized = sanitizeCourseId(courseId);
        return sanitized.length >= 3 && sanitized.length <= 100;
    } catch {
        return false;
    }
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
        courseId: sanitizeCourseId(data.courseId),
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
            isActive: validatedData.status === 'published',  // Auto-activate if published
            status: validatedData.status || 'draft',
            order: courseOrder,
            createdBy: session.user.email,
            lastModified: new Date(),
            modifiedBy: session.user.email
        });

        const savedCourse = await newCourse.save();

        // 7. Clear cache to ensure fresh data on /courses page
        await RedisCache.clearCourseCache();

        console.log(`✅ Course created: ${savedCourse.courseId} (Status: ${savedCourse.status}, Active: ${savedCourse.isActive})`);

        // 8. Return success response
        return NextResponse.json({
            success: true,
            course: {
                courseId: savedCourse.courseId,
                title: savedCourse.title,
                status: savedCourse.status,
                isActive: savedCourse.isActive,
                createdAt: savedCourse.createdAt
            },
            message: `Course created successfully${savedCourse.status === 'published' ? ' and is now visible on /courses' : ' as draft (not visible to public)'}`
        }, { status: 201 });

    } catch (error: any) {
        console.error('Course creation error:', error);

        // Enhanced error logging for debugging
        if (error.errors) {
            console.error('Mongoose validation errors:', JSON.stringify(error.errors, null, 2));
        }

        // Check if it's a validation error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isValidationError = errorMessage.includes('Validation failed') ||
            errorMessage.includes('validation') ||
            errorMessage.includes('required') ||
            errorMessage.includes('invalid') ||
            error.name === 'ValidationError';

        // Extract specific validation error details
        let validationDetails = errorMessage;
        if (error.errors && typeof error.errors === 'object') {
            const fieldErrors = Object.entries(error.errors)
                .map(([field, err]: [string, any]) => `${field}: ${err.message}`)
                .join(', ');
            if (fieldErrors) {
                validationDetails = fieldErrors;
            }
        }

        return NextResponse.json({
            success: false,
            error: isValidationError ? validationDetails : 'Failed to create course',
            details: errorMessage
        }, { status: isValidationError ? 400 : 500 });
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
        const status = searchParams.get('status'); // draft, published, archived, all
        const category = searchParams.get('category');
        const sortBy = searchParams.get('sortBy') || 'order';
        const limit = parseInt(searchParams.get('limit') || '100');  // Show all courses to admin
        const includeInactive = searchParams.get('includeInactive') === 'true';

        // 3. Build query filter - admin can see all courses
        const filter: any = {};

        // Status filter
        if (status && status !== 'all') {
            filter.status = status;
        }

        // Category filter
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Unless specifically requested, show all courses (admins can see inactive ones)
        if (!includeInactive) {
            // No filter - show all including inactive
        }

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
            .select('courseId title description price duration level image features totalEnrollments status isActive createdAt lastModified order category')
            .sort(sortOptions)
            .limit(limit)
            .lean();

        // 6. Get comprehensive summary statistics
        const stats = await Course.aggregate([
            {
                $facet: {
                    byStatus: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                                totalEnrollments: { $sum: '$totalEnrollments' }
                            }
                        }
                    ],
                    byActive: [
                        {
                            $group: {
                                _id: '$isActive',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    totals: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                totalEnrollments: { $sum: '$totalEnrollments' },
                                totalRevenue: { $sum: { $multiply: ['$price', '$totalEnrollments'] } }
                            }
                        }
                    ]
                }
            }
        ]);

        const statsMap = {
            total: courses.length,
            draft: 0,
            published: 0,
            archived: 0,
            active: 0,
            inactive: 0,
            totalEnrollments: 0,
            totalRevenue: 0
        };

        // Process status statistics
        if (stats[0].byStatus) {
            stats[0].byStatus.forEach((stat: any) => {
                if (stat._id) {
                    statsMap[stat._id as keyof typeof statsMap] = stat.count;
                }
            });
        }

        // Process active/inactive statistics
        if (stats[0].byActive) {
            stats[0].byActive.forEach((stat: any) => {
                if (stat._id === true) statsMap.active = stat.count;
                if (stat._id === false) statsMap.inactive = stat.count;
            });
        }

        // Process totals
        if (stats[0].totals && stats[0].totals[0]) {
            statsMap.total = stats[0].totals[0].total;
            statsMap.totalEnrollments = stats[0].totals[0].totalEnrollments;
            statsMap.totalRevenue = stats[0].totals[0].totalRevenue;
        }

        console.log(`📊 Admin fetched ${courses.length} courses (Published: ${statsMap.published}, Draft: ${statsMap.draft}, Archived: ${statsMap.archived})`);

        // 7. Return admin course data with comprehensive statistics
        return NextResponse.json({
            success: true,
            courses,
            statistics: statsMap,
            filters: {
                status: status || 'all',
                category: category || 'all',
                sortBy,
                limit,
                includeInactive
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