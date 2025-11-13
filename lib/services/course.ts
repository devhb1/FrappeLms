/**
 * ===============================
 * COURSE SERVICE LAYER
 * ===============================
 * 
 * Simple, focused course operations for database-seeded courses.
 * Since courses are regularly seeded to the database, this service
 * primarily handles database operations with minimal abstraction.
 */

import connectToDatabase from '../db';
import { Course, ICourse } from '../models/course';
import { logger } from '../utils/logger';

/**
 * Get course by ID from database
 */
export async function getCourseFromDb(courseId: string): Promise<ICourse | null> {
    try {
        await connectToDatabase();

        const course = await Course.findOne({
            courseId,
            isActive: true
        }).select('-__v -updatedAt').lean();

        if (course) {
            logger.info('Course retrieved by ID', { courseId });
        } else {
            logger.warn('Course not found', { courseId });
        }

        return course as unknown as ICourse | null;

    } catch (error) {
        logger.error('Failed to get course by ID', { courseId, error });
        throw new Error('Failed to retrieve course');
    }
}

/**
 * Update course enrollment count
 */
export async function updateCourseEnrollment(courseId: string, userEmail: string, paymentId: string): Promise<boolean> {
    try {
        await connectToDatabase();

        const course = await Course.findOne({ courseId, isActive: true });
        if (!course) {
            logger.error('Course not found for enrollment update', { courseId });
            return false;
        }

        // Check if user already enrolled
        const alreadyEnrolled = course.enrolledUsers.some(
            (user: any) => user.email === userEmail.toLowerCase()
        );

        if (alreadyEnrolled) {
            logger.warn('User already enrolled in course', { courseId, userEmail: '[EMAIL_REDACTED]' });
            return false;
        }

        // Add enrollment
        course.enrolledUsers.push({
            email: userEmail.toLowerCase(),
            enrolledAt: new Date(),
            paymentId
        });
        course.totalEnrollments += 1;

        await course.save();

        logger.success('Course enrollment updated', {
            courseId,
            userEmail: '[EMAIL_REDACTED]',
            newTotal: course.totalEnrollments
        });

        return true;

    } catch (error) {
        logger.error('Failed to update course enrollment', { courseId, error });
        return false;
    }
}