/**
 * ===============================
 * PUBLIC COURSE POPULATION API
 * ===============================
 * 
 * Public endpoint to populate database with course data
 * No authentication required for MVP
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Course } from '@/lib/models/course';
import { COURSES } from '@/lib/courses';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Starting course population...');

        // Connect to database
        await connectToDatabase();
        console.log('✅ Database connected');

        // Get existing courses count
        const existingCount = await Course.countDocuments();
        console.log(`📊 Existing courses in database: ${existingCount}`);

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        // Process each course from static data
        for (const courseData of COURSES) {
            try {
                console.log(`Processing course: ${courseData.courseId}`);

                // Check if course already exists
                const existingCourse = await Course.findOne({
                    courseId: courseData.courseId
                });

                if (existingCourse) {
                    // Update existing course
                    const updatedCourse = await Course.findOneAndUpdate(
                        { courseId: courseData.courseId },
                        {
                            title: courseData.title,
                            description: courseData.description,
                            price: courseData.price,
                            duration: courseData.duration,
                            level: courseData.level,
                            image: courseData.image,
                            features: courseData.features,
                            isActive: true
                        },
                        { new: true }
                    );

                    console.log(`✅ Updated course: ${courseData.courseId}`);
                    updatedCount++;
                } else {
                    // Create new course
                    const newCourse = new Course({
                        courseId: courseData.courseId,
                        title: courseData.title,
                        description: courseData.description,
                        price: courseData.price,
                        duration: courseData.duration,
                        level: courseData.level,
                        image: courseData.image,
                        features: courseData.features,
                        totalEnrollments: 0,
                        enrolledUsers: [],
                        isActive: true,
                        order: createdCount + 1 // Set order based on creation sequence
                    });

                    const savedCourse = await newCourse.save();
                    console.log(`✅ Created course: ${courseData.courseId}`);
                    createdCount++;
                }

            } catch (courseError) {
                console.error(`❌ Error processing course ${courseData.courseId}:`, courseError);
                skippedCount++;
            }
        }

        // Final count check
        const finalCount = await Course.countDocuments();

        const result = {
            success: true,
            message: 'Course population completed',
            statistics: {
                initialCount: existingCount,
                finalCount: finalCount,
                created: createdCount,
                updated: updatedCount,
                skipped: skippedCount,
                processed: COURSES.length
            },
            courses: COURSES.map(c => ({
                courseId: c.courseId,
                title: c.title,
                price: c.price
            }))
        };

        console.log('🎉 Population complete:', result.statistics);

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error('❌ Course population error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to populate courses',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

// Allow GET requests to check status
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const totalCourses = await Course.countDocuments();
        const activeCourses = await Course.countDocuments({ isActive: true });

        // Get course IDs from database
        const dbCourses = await Course.find({}, 'courseId title price').lean();

        // Get course IDs from static data
        const staticCourseIds = COURSES.map(c => c.courseId);

        return NextResponse.json({
            success: true,
            statistics: {
                totalCourses,
                activeCourses,
                staticCourses: COURSES.length,
                dbCourseIds: dbCourses.map(c => c.courseId),
                staticCourseIds,
                synced: staticCourseIds.every(id =>
                    dbCourses.some(db => db.courseId === id)
                )
            },
            courses: dbCourses
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to check course status'
        }, { status: 500 });
    }
}
