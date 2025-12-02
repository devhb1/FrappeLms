/**
 * ===============================
 * COMPLETE ENROLLMENT API (FALLBACK)
 * ===============================
 * 
 * This endpoint serves as a fallback when webhooks don't work.
 * It verifies the Stripe payment and completes the enrollment.
 * Called from the success page after payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import connectToDatabase from '@/lib/db';
import { Enrollment } from '@/lib/models/enrollment';
import { RetryJob } from '@/lib/models/retry-job';
import ProductionLogger from '@/lib/utils/production-logger';

export async function POST(req: NextRequest) {
    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({
                error: 'Missing session_id'
            }, { status: 400 });
        }

        ProductionLogger.info('Complete enrollment called', { sessionId });

        // 1. Verify the Stripe session
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return NextResponse.json({
                error: 'Payment not completed',
                payment_status: session.payment_status
            }, { status: 400 });
        }

        // 2. Connect to database
        await connectToDatabase();

        // 3. Get enrollment ID from metadata
        const enrollmentId = session.metadata?.enrollmentId;
        if (!enrollmentId) {
            return NextResponse.json({
                error: 'No enrollment ID in session metadata'
            }, { status: 400 });
        }

        // 4. Find the enrollment
        const enrollment = await Enrollment.findById(enrollmentId);
        if (!enrollment) {
            return NextResponse.json({
                error: 'Enrollment not found'
            }, { status: 404 });
        }

        // 5. Check if already processed
        if (enrollment.status === 'paid') {
            return NextResponse.json({
                success: true,
                message: 'Enrollment already completed',
                enrollment: {
                    id: enrollment._id,
                    status: enrollment.status,
                    frappeSync: enrollment.frappeSync
                }
            });
        }

        // 6. Update enrollment to paid
        enrollment.status = 'paid';
        enrollment.paymentId = session.payment_intent as string;
        enrollment.verification = {
            ...enrollment.verification,
            paymentVerified: true
        };
        enrollment.frappeSync = {
            ...enrollment.frappeSync,
            syncStatus: 'pending'
        };
        enrollment.updatedAt = new Date();

        await enrollment.save();

        ProductionLogger.info('Enrollment marked as paid', {
            enrollmentId: enrollment._id,
            email: enrollment.email,
            courseId: enrollment.courseId
        });

        // 7. Queue Frappe LMS sync
        await RetryJob.create({
            jobType: 'frappe_enrollment',
            enrollmentId: enrollment._id,
            payload: {
                user_email: enrollment.email,
                course_id: enrollment.courseId,
                paid_status: true,
                payment_id: enrollment.paymentId,
                amount: enrollment.amount,
                currency: enrollment.currency || 'usd',
                referral_code: enrollment.affiliateData?.affiliateEmail,
                enrollmentType: enrollment.enrollmentType,
                originalRequestId: `complete-enrollment-${Date.now()}`
            },
            attempts: 0,
            maxAttempts: 5,
            status: 'pending',
            nextRetryAt: new Date(),
            createdAt: new Date()
        });

        ProductionLogger.info('Frappe sync queued', { enrollmentId: enrollment._id });

        return NextResponse.json({
            success: true,
            message: 'Enrollment completed successfully',
            enrollment: {
                id: enrollment._id,
                status: enrollment.status,
                courseId: enrollment.courseId,
                email: enrollment.email,
                frappeSync: enrollment.frappeSync
            }
        });

    } catch (error) {
        ProductionLogger.error('Complete enrollment failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            error: 'Failed to complete enrollment',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'Complete Enrollment API (Fallback)',
        version: '1.0',
        usage: 'POST with { sessionId: "cs_..." }'
    });
}
