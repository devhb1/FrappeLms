/**
 * ===============================
 * ENROLLMENT SERVICE LAYER
 * ===============================
 * 
 * Simple enrollment operations for database-seeded courses.
 * Handles core enrollment logic with minimal abstraction.
 */

import connectToDatabase from '../db';
import { Enrollment, IEnrollment } from '../models/enrollment';
import { Affiliate } from '../models/affiliate';
import { logger } from '../utils/logger';
import { updateCourseEnrollment } from './course';

export interface CreateEnrollmentData {
    email: string;
    courseId: string;
    amount: number;
    paymentId: string;
    status: 'pending' | 'paid' | 'failed';
    enrollmentType: 'paid' | 'free_coupon' | 'grant';

    // Optional affiliate data
    affiliateData?: {
        affiliateEmail: string;
        commissionAmount: number;
        commissionRate: number;
        commissionEligible: boolean;
    };

    // Optional grant data
    grantData?: {
        couponCode: string;
        grantId?: string;
        discountAmount: number;
    };

    // Optional metadata
    metadata?: {
        requestId?: string;
        redirectSource?: string;
        userAgent?: string;
    };
}

/**
 * Create a new enrollment record
 */
export async function createEnrollment(data: CreateEnrollmentData): Promise<IEnrollment> {
    try {
        await connectToDatabase();

        // Validate required fields
        if (!data.email || !data.courseId || !data.paymentId) {
            throw new Error('Missing required enrollment data');
        }

        // Check for duplicate enrollment
        const existingEnrollment = await Enrollment.findOne({
            email: data.email.toLowerCase(),
            courseId: data.courseId
        });

        if (existingEnrollment) {
            logger.warn('Duplicate enrollment attempt', {
                email: '[EMAIL_REDACTED]',
                courseId: data.courseId,
                existingId: existingEnrollment._id
            });
            throw new Error('User already enrolled in this course');
        }

        // Create enrollment document
        const enrollment = new Enrollment({
            email: data.email.toLowerCase(),
            courseId: data.courseId,
            amount: data.amount,
            paymentId: data.paymentId,
            status: data.status,
            enrollmentType: data.enrollmentType,
            timestamp: new Date(),

            // Verification data
            verification: {
                paymentVerified: data.status === 'paid',
                courseEligible: true,
                verificationDate: data.status === 'paid' ? new Date() : undefined
            },

            // Optional affiliate data
            ...(data.affiliateData && {
                affiliateData: {
                    ...data.affiliateData,
                    affiliateEmail: data.affiliateData.affiliateEmail.toLowerCase()
                }
            }),

            // Optional grant data
            ...(data.grantData && {
                grantData: data.grantData
            }),

            // Metadata
            metadata: {
                requestId: data.metadata?.requestId || `enr_${Date.now()}`,
                redirectSource: data.metadata?.redirectSource,
                userAgent: data.metadata?.userAgent
            }
        });

        await enrollment.save();

        logger.success('Enrollment created', {
            enrollmentId: enrollment._id,
            email: '[EMAIL_REDACTED]',
            courseId: data.courseId,
            amount: data.amount,
            status: data.status,
            hasAffiliate: !!data.affiliateData
        });

        return enrollment;

    } catch (error) {
        logger.error('Failed to create enrollment', {
            email: '[EMAIL_REDACTED]',
            courseId: data.courseId,
            error
        });
        throw error;
    }
}

/**
 * Update enrollment status (e.g., from pending to paid)
 */
export async function updateEnrollmentStatus(
    enrollmentId: string,
    status: 'pending' | 'paid' | 'failed',
    paymentData?: {
        paymentId?: string;
        amount?: number;
        paymentMethod?: string;
    }
): Promise<IEnrollment | null> {
    try {
        await connectToDatabase();

        const updates: any = {
            status,
            updatedAt: new Date()
        };

        // Update verification based on status
        if (status === 'paid') {
            updates['verification.paymentVerified'] = true;
            updates['verification.verificationDate'] = new Date();
        } else if (status === 'failed') {
            updates['verification.paymentVerified'] = false;
        }

        // Add payment data if provided
        if (paymentData) {
            if (paymentData.paymentId) updates.paymentId = paymentData.paymentId;
            if (paymentData.amount) updates.amount = paymentData.amount;
            if (paymentData.paymentMethod) updates['metadata.paymentMethod'] = paymentData.paymentMethod;
        }

        const enrollment = await Enrollment.findByIdAndUpdate(
            enrollmentId,
            { $set: updates },
            { new: true }
        );

        if (!enrollment) {
            logger.error('Enrollment not found for status update', { enrollmentId });
            return null;
        }

        logger.info('Enrollment status updated', {
            enrollmentId,
            oldStatus: enrollment.status,
            newStatus: status,
            courseId: enrollment.courseId
        });

        // If status changed to paid, trigger post-payment actions
        if (status === 'paid') {
            await handleSuccessfulPayment(enrollment);
        }

        return enrollment;

    } catch (error) {
        logger.error('Failed to update enrollment status', { enrollmentId, status, error });
        throw error;
    }
}

/**
 * Handle successful payment completion
 */
async function handleSuccessfulPayment(enrollment: IEnrollment): Promise<void> {
    try {
        // Update course enrollment count
        await updateCourseEnrollment(
            enrollment.courseId,
            enrollment.email,
            enrollment.paymentId
        );

        // Process affiliate commission if applicable
        if (enrollment.affiliateData?.affiliateEmail && enrollment.affiliateData.commissionEligible) {
            await processAffiliateCommission(enrollment);
        }

        logger.success('Post-payment processing completed', {
            enrollmentId: enrollment._id,
            courseId: enrollment.courseId,
            hasAffiliate: !!enrollment.affiliateData
        });

    } catch (error) {
        logger.error('Post-payment processing failed', {
            enrollmentId: enrollment._id,
            error
        });
        // Don't throw - enrollment is already successful
    }
}

/**
 * Process affiliate commission
 */
async function processAffiliateCommission(enrollment: IEnrollment): Promise<void> {
    try {
        if (!enrollment.affiliateData?.affiliateEmail) {
            return;
        }

        const affiliateEmail = enrollment.affiliateData.affiliateEmail;
        const affiliate = await Affiliate.findOne({ email: affiliateEmail });

        if (!affiliate) {
            logger.warn('Affiliate not found for commission processing', {
                affiliateEmail: '[EMAIL_REDACTED]',
                enrollmentId: enrollment._id
            });
            return;
        }

        // Refresh affiliate stats to include this new enrollment
        await affiliate.refreshStats();

        logger.success('Affiliate commission processed', {
            affiliateEmail: '[EMAIL_REDACTED]',
            enrollmentId: enrollment._id,
            commissionAmount: enrollment.affiliateData.commissionAmount
        });

    } catch (error) {
        logger.error('Failed to process affiliate commission', {
            affiliateEmail: '[EMAIL_REDACTED]',
            enrollmentId: enrollment._id,
            error
        });
    }
}

/**
 * Check if user is enrolled in course
 */
export async function isUserEnrolled(email: string, courseId: string): Promise<{
    enrolled: boolean;
    enrollment?: IEnrollment;
}> {
    try {
        await connectToDatabase();

        const enrollment = await Enrollment.findOne({
            email: email.toLowerCase(),
            courseId,
            status: { $in: ['paid', 'pending'] }
        });

        return {
            enrolled: !!enrollment,
            enrollment: enrollment || undefined
        };

    } catch (error) {
        logger.error('Failed to check enrollment status', { email: '[EMAIL_REDACTED]', courseId, error });
        return { enrolled: false };
    }
}