/**
 * ===============================
 * INDIVIDUAL COURSE MANAGEMENT API
 * ===============================
 * 
 * Handles operations on specific courses:
 * - GET: Fetch course details for editing
 * - PUT: Update course information
 * - DELETE: Soft delete/archive course
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Course } from '@/lib/models/course';
import { RedisCache } from '@/lib/redis';

/**
 * Validate course update data
 */
function validateCourseUpdateData(data: any) {
    const errors: string[] = [];

    // Check if any field is being updated
    const allowedFields = [
        'title', 'description', 'price', 'duration', 'level',
        'image', 'features', 'category', 'tags', 'status'
    ];

    const hasValidField = allowedFields.some(field => data.hasOwnProperty(field));
    if (!hasValidField) {
        errors.push('No valid fields to update');
    }

    // Validate individual fields if provided
    if (data.title !== undefined && !data.title?.trim()) {
        errors.push('Title cannot be empty');
    }

    if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
        errors.push('Price must be a non-negative number');
    }

    if (data.level !== undefined && !['Beginner', 'Intermediate', 'Advanced'].includes(data.level)) {
        errors.push('Level must be Beginner, Intermediate, or Advanced');
    }

    if (data.features !== undefined && (!Array.isArray(data.features) || data.features.length === 0)) {
        errors.push('At least one feature is required');
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Return sanitized update data
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.duration !== undefined) updateData.duration = data.duration.trim();
    if (data.level !== undefined) updateData.level = data.level;
    if (data.image !== undefined) updateData.image = data.image.trim();
    if (data.features !== undefined) {
        updateData.features = data.features.filter((f: string) => f.trim()).map((f: string) => f.trim());
    }
    if (data.category !== undefined) updateData.category = data.category.trim();
    if (data.tags !== undefined) updateData.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.status !== undefined) updateData.status = data.status;

    return updateData;
}

// ===============================
// API ENDPOINTS
// ===============================

/**
 * GET /api/admin/courses/[id]
 * Fetch course details for editing
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // 2. Get course ID from params
        const { id } = await params;
        const courseId = decodeURIComponent(id);

        // 3. Connect to database and fetch course
        await connectToDatabase();

        const course = await Course.findOne({ courseId })
            .select('-enrolledUsers -__v') // Exclude large arrays for admin view
            .lean();

        if (!course) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        // 4. Return complete course data for editing
        return NextResponse.json({
            success: true,
            course: {
                ...course,
                // Ensure all fields are present for form
                category: (course as any).category || 'General',
                tags: (course as any).tags || [],
                status: (course as any).status || ((course as any).isActive ? 'published' : 'draft')
            }
        });

    } catch (error) {
        console.error('Admin course fetch error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch course'
        }, { status: 500 });
    }
}

/**
 * PUT /api/admin/courses/[id]
 * Update course information
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // 2. Get course ID and validate request data
        const { id } = await params;
        const courseId = decodeURIComponent(id);

        const requestData = await request.json();
        const validatedData = validateCourseUpdateData(requestData);

        // 3. Connect to database
        await connectToDatabase();

        // 4. Check if course exists
        const existingCourse = await Course.findOne({ courseId });
        if (!existingCourse) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        // 5. Update isActive based on status if provided
        if (validatedData.status) {
            validatedData.isActive = validatedData.status === 'published';
        }

        // 6. Update course with admin tracking
        const updatedCourse = await Course.findOneAndUpdate(
            { courseId },
            {
                ...validatedData,
                lastModified: new Date(),
                modifiedBy: session.user.email
            },
            {
                new: true,
                runValidators: true,
                select: '-enrolledUsers -__v'
            }
        );

        // 7. Clear cache to ensure fresh data
        await RedisCache.clearCourseCache();

        // 8. Return success response
        return NextResponse.json({
            success: true,
            course: updatedCourse,
            message: 'Course updated successfully',
            updatedFields: Object.keys(validatedData)
        });

    } catch (error) {
        console.error('Course update error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to update course',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/courses/[id]
 * Soft delete (archive) a course
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        // 2. Get course ID
        const { id } = await params;
        const courseId = decodeURIComponent(id);

        // 3. Connect to database
        await connectToDatabase();

        // 4. Check if course has enrollments
        const course = await Course.findOne({ courseId });
        if (!course) {
            return NextResponse.json(
                { error: 'Course not found' },
                { status: 404 }
            );
        }

        // 5. Warn if course has enrollments
        if (course.totalEnrollments > 0) {
            // Don't delete courses with enrollments, just archive them
            const archivedCourse = await Course.findOneAndUpdate(
                { courseId },
                {
                    isActive: false,
                    status: 'archived',
                    archivedAt: new Date(),
                    archivedBy: session.user.email,
                    lastModified: new Date(),
                    modifiedBy: session.user.email
                },
                { new: true }
            );

            // Clear cache
            await RedisCache.clearCourseCache();

            return NextResponse.json({
                success: true,
                message: `Course archived (${course.totalEnrollments} enrollments preserved)`,
                course: {
                    courseId: archivedCourse?.courseId,
                    title: archivedCourse?.title,
                    status: 'archived'
                }
            });
        }

        // 6. For courses with no enrollments, perform soft delete
        const deletedCourse = await Course.findOneAndUpdate(
            { courseId },
            {
                isActive: false,
                status: 'archived',
                deletedAt: new Date(),
                deletedBy: session.user.email,
                lastModified: new Date(),
                modifiedBy: session.user.email
            },
            { new: true }
        );

        // 7. Clear cache
        await RedisCache.clearCourseCache();

        return NextResponse.json({
            success: true,
            message: 'Course deleted successfully'
        });

    } catch (error) {
        console.error('Course deletion error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to delete course'
        }, { status: 500 });
    }
}