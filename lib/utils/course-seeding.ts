/**
 * ===============================
 * COURSE SEEDING UTILITY
 * ===============================
 * 
 * Professional utility to seed courses into database
 * Supports both API calls and direct script usage
 */

import connectToDatabase from '@/lib/db';
import { Course } from '@/lib/models/course';
import { COURSES } from '@/lib/courses';
import { RedisCache } from '@/lib/redis';

interface SeedResult {
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    total: number;
    courses: Array<{
        courseId: string;
        title: string;
        action: 'created' | 'updated' | 'skipped';
        error?: string;
    }>;
}

/**
 * Seed courses from static data to database
 * Updates existing courses or creates new ones
 */
export async function seedCoursesToDatabase(): Promise<SeedResult> {
    const result: SeedResult = {
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        courses: []
    };

    try {
        console.log('🌱 Starting course seeding process...');

        // Connect to database
        await connectToDatabase();

        // Process each static course
        for (let i = 0; i < COURSES.length; i++) {
            const courseData = COURSES[i];

            try {
                console.log(`Processing ${i + 1}/${COURSES.length}: ${courseData.title}`);

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
                            isActive: true,
                            lastModified: new Date(),
                            modifiedBy: 'seeding_utility'
                        },
                        { new: true }
                    );

                    result.courses.push({
                        courseId: courseData.courseId,
                        title: courseData.title,
                        action: 'updated'
                    });
                    result.updated++;
                    console.log(`✅ Updated: ${courseData.title}`);

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
                        order: i + 1, // Set order based on static array position
                        createdBy: 'seeding_utility'
                    });

                    await newCourse.save();

                    result.courses.push({
                        courseId: courseData.courseId,
                        title: courseData.title,
                        action: 'created'
                    });
                    result.created++;
                    console.log(`🆕 Created: ${courseData.title}`);
                }

            } catch (courseError) {
                console.error(`❌ Error processing ${courseData.title}:`, courseError);

                result.courses.push({
                    courseId: courseData.courseId,
                    title: courseData.title,
                    action: 'skipped',
                    error: courseError instanceof Error ? courseError.message : 'Unknown error'
                });
                result.skipped++;
            }
        }

        // Clear cache after seeding
        await RedisCache.clearCourseCache();
        console.log('🧹 Course cache cleared');

        result.total = result.created + result.updated + result.skipped;
        result.success = result.skipped < COURSES.length; // Success if not all failed

        console.log(`🎉 Seeding completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);

        return result;

    } catch (error) {
        console.error('💥 Seeding failed:', error);

        result.success = false;
        return result;
    }
}

/**
 * Create a sample professional course for testing
 */
export async function createSampleCourse(): Promise<any> {
    try {
        await connectToDatabase();

        const sampleCourse = {
            courseId: `course-v1:MAALEDU+sample-${Date.now()}+2025_T1`,
            title: 'Sample Professional Course',
            description: 'This is a sample course created through the professional course management system. It demonstrates all the features and capabilities of the new dynamic course creation workflow.',
            price: 99.99,
            duration: '6 weeks',
            level: 'Intermediate' as const,
            image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop&auto=format',
            features: [
                'Professional course structure',
                'Dynamic content management',
                'Real-world project examples',
                'Interactive assignments',
                'Expert instructor support',
                'Certificate of completion'
            ],
            totalEnrollments: 0,
            enrolledUsers: [],
            isActive: true,
            order: 100, // Put at end of list
            createdBy: 'seeding_utility'
        };

        const course = new Course(sampleCourse);
        const savedCourse = await course.save();

        console.log('✅ Sample course created:', savedCourse.title);
        return savedCourse;

    } catch (error) {
        console.error('❌ Failed to create sample course:', error);
        throw error;
    }
}

/**
 * Verify seeding status - check sync between static and database
 */
export async function verifySeeding() {
    try {
        await connectToDatabase();

        // Get all courses from database
        const dbCourses = await Course.find({}, 'courseId title isActive').lean();

        // Get static course IDs
        const staticCourseIds = COURSES.map(c => c.courseId);

        // Check which static courses are missing from database
        const missing = staticCourseIds.filter(id =>
            !dbCourses.find(db => db.courseId === id)
        );

        // Check which database courses are not in static data
        const extra = dbCourses.filter(db =>
            !staticCourseIds.includes(db.courseId)
        );

        const syncStatus = {
            inSync: missing.length === 0,
            staticCourses: COURSES.length,
            databaseCourses: dbCourses.length,
            activeCourses: dbCourses.filter(c => (c as any).isActive).length,
            missing: missing,
            extra: extra.map(c => ({ courseId: c.courseId, title: (c as any).title }))
        };

        console.log('🔍 Seeding verification:', syncStatus);
        return syncStatus;

    } catch (error) {
        console.error('❌ Verification failed:', error);
        throw error;
    }
}

/**
 * Quick setup - seed courses and create sample
 */
export async function quickSetup() {
    console.log('🚀 Starting quick course setup...');

    try {
        // 1. Seed static courses
        const seedResult = await seedCoursesToDatabase();
        console.log(`📚 Seeded ${seedResult.created + seedResult.updated} courses`);

        // 2. Create a sample course
        const sampleCourse = await createSampleCourse();
        console.log(`🧪 Created sample course: ${sampleCourse.title}`);

        // 3. Verify everything is in sync
        const verification = await verifySeeding();

        const summary = {
            seedResult,
            sampleCourse: {
                courseId: sampleCourse.courseId,
                title: sampleCourse.title
            },
            verification,
            totalCourses: verification.databaseCourses,
            success: seedResult.success && verification.inSync
        };

        console.log('🎉 Quick setup completed!');
        return summary;

    } catch (error) {
        console.error('💥 Quick setup failed:', error);
        throw error;
    }
}