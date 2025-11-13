/**
 * ===============================
 * MANUAL FRAPPE RETRY API
 * ===============================
 * 
 * Admin endpoint to manually retry failed FrappeLMS enrollments.
 * Useful for immediate retry without waiting for the cron job.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { RetryJob } from '@/lib/models/retry-job';
import { Enrollment } from '@/lib/models/enrollment';
import ProductionLogger from '@/lib/utils/production-logger';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { enrollmentId } = body;

        if (!enrollmentId) {
            return NextResponse.json({
                error: 'Enrollment ID is required'
            }, { status: 400 });
        }

        // Find the enrollment
        const enrollment = await Enrollment.findById(enrollmentId);
        if (!enrollment) {
            return NextResponse.json({
                error: 'Enrollment not found'
            }, { status: 404 });
        }

        // Check if enrollment is eligible for retry
        if (enrollment.frappeSync?.syncStatus === 'success') {
            return NextResponse.json({
                error: 'Enrollment already successfully synced to FrappeLMS'
            }, { status: 400 });
        }

        // Create or update retry job
        let retryJob;

        if (enrollment.frappeSync?.retryJobId) {
            // Update existing retry job
            retryJob = await RetryJob.findByIdAndUpdate(
                enrollment.frappeSync.retryJobId,
                {
                    $set: {
                        status: 'pending',
                        nextRetryAt: new Date(), // Retry immediately
                        lastError: 'Manual retry triggered by admin'
                    },
                    $unset: {
                        workerNodeId: 1,
                        processingStartedAt: 1,
                        processingTimeout: 1
                    }
                },
                { new: true }
            );
        } else {
            // Create new retry job
            retryJob = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId: enrollment._id,
                payload: {
                    user_email: enrollment.email,
                    course_id: enrollment.courseId,
                    paid_status: true,
                    payment_id: enrollment.paymentId,
                    amount: enrollment.amount,
                    currency: 'USD',
                    referral_code: enrollment.affiliateData?.affiliateEmail || undefined,
                    enrollmentType: enrollment.enrollmentType || 'paid_stripe'
                },
                nextRetryAt: new Date() // Retry immediately
            });

            // Link retry job to enrollment
            await Enrollment.findByIdAndUpdate(enrollmentId, {
                $set: {
                    'frappeSync.retryJobId': retryJob._id,
                    'frappeSync.syncStatus': 'retrying'
                }
            });
        }

        if (!retryJob) {
            throw new Error('Failed to create or update retry job');
        }

        ProductionLogger.info('Manual retry job created', {
            enrollmentId,
            retryJobId: retryJob._id,
            adminAction: true
        });

        return NextResponse.json({
            success: true,
            message: 'Retry job created successfully',
            retryJob: {
                id: retryJob._id,
                status: retryJob.status,
                nextRetryAt: retryJob.nextRetryAt,
                attempts: retryJob.attempts
            }
        });

    } catch (error) {
        ProductionLogger.error('Manual retry job creation failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}