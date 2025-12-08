/**
 * ===============================
 * MANUAL FRAPPE RETRY API
 * ===============================
 * 
 * Admin endpoint to manually retry failed FrappeLMS enrollments.
 * Now executes the retry IMMEDIATELY instead of queuing.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Enrollment } from '@/lib/models/enrollment';
import { enrollInFrappeLMS } from '@/lib/services/frappeLMS';
import ProductionLogger from '@/lib/utils/production-logger';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { enrollmentId, retryAll } = body;

        if (retryAll) {
            // Retry all failed enrollments
            const failedEnrollments = await Enrollment.find({
                status: 'paid',
                $or: [
                    { 'frappeSync.syncStatus': 'pending' },
                    { 'frappeSync.syncStatus': 'retrying' },
                    { 'frappeSync.syncStatus': 'failed' },
                    { 'frappeSync.synced': false },
                    { 'frappeSync.enrollmentId': { $exists: false } }
                ]
            }).limit(20); // Process 20 at a time to avoid timeout

            ProductionLogger.info('Manual retry all - found enrollments', {
                count: failedEnrollments.length
            });

            const results = [];
            for (const enrollment of failedEnrollments) {
                const result = await retryEnrollment(enrollment);
                results.push({
                    enrollmentId: enrollment._id.toString(),
                    email: enrollment.email,
                    courseId: enrollment.courseId,
                    ...result
                });
            }

            return NextResponse.json({
                success: true,
                message: `Processed ${results.length} enrollments`,
                results
            });
        }

        if (!enrollmentId) {
            return NextResponse.json({
                error: 'Enrollment ID is required (or use retryAll: true)'
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
        if (enrollment.frappeSync?.syncStatus === 'success' && enrollment.frappeSync?.enrollmentId) {
            return NextResponse.json({
                success: true,
                message: 'Enrollment already successfully synced to FrappeLMS',
                frappeEnrollmentId: enrollment.frappeSync.enrollmentId
            });
        }

        ProductionLogger.info('Manual retry initiated', {
            enrollmentId,
            currentStatus: enrollment.frappeSync?.syncStatus || 'none',
            email: enrollment.email,
            courseId: enrollment.courseId
        });

        // Execute retry immediately
        const result = await retryEnrollment(enrollment);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Frappe enrollment successful',
                frappeEnrollmentId: result.frappeEnrollmentId,
                enrollmentId: enrollment._id.toString(),
                email: enrollment.email
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error,
                enrollmentId: enrollment._id.toString(),
                email: enrollment.email
            }, { status: 500 });
        }

    } catch (error) {
        ProductionLogger.error('Manual retry failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Helper function to execute enrollment retry
async function retryEnrollment(enrollment: any) {
    try {
        ProductionLogger.info('Executing Frappe enrollment retry', {
            enrollmentId: enrollment._id,
            email: enrollment.email,
            courseId: enrollment.courseId
        });

        const frappeResult = await enrollInFrappeLMS({
            user_email: enrollment.email,
            course_id: enrollment.courseId,
            paid_status: true,
            payment_id: enrollment.paymentId,
            amount: enrollment.amount,
            currency: enrollment.currency || 'USD',
            referral_code: enrollment.affiliateData?.affiliateEmail || undefined
        });

        if (frappeResult.success) {
            // Update enrollment with success
            await Enrollment.findByIdAndUpdate(enrollment._id, {
                $set: {
                    'frappeSync.synced': true,
                    'frappeSync.syncStatus': 'success',
                    'frappeSync.enrollmentId': frappeResult.enrollment_id,
                    'frappeSync.syncCompletedAt': new Date(),
                    'frappeSync.lastSyncAttempt': new Date(),
                    'frappeSync.manualRetry': true
                },
                $inc: {
                    'frappeSync.retryCount': 1
                }
            });

            ProductionLogger.info('Manual retry successful', {
                enrollmentId: enrollment._id,
                frappeEnrollmentId: frappeResult.enrollment_id
            });

            return {
                success: true,
                frappeEnrollmentId: frappeResult.enrollment_id
            };
        } else {
            // Update enrollment with failure
            await Enrollment.findByIdAndUpdate(enrollment._id, {
                $set: {
                    'frappeSync.synced': false,
                    'frappeSync.syncStatus': 'failed',
                    'frappeSync.errorMessage': frappeResult.error,
                    'frappeSync.lastSyncAttempt': new Date()
                },
                $inc: {
                    'frappeSync.retryCount': 1
                }
            });

            ProductionLogger.error('Manual retry failed', {
                enrollmentId: enrollment._id,
                error: frappeResult.error
            });

            return {
                success: false,
                error: frappeResult.error
            };
        }
    } catch (error) {
        ProductionLogger.error('Manual retry exception', {
            enrollmentId: enrollment._id,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// GET endpoint to view failed enrollments
export async function GET() {
    try {
        await connectToDatabase();

        const failedEnrollments = await Enrollment.find({
            status: 'paid',
            $or: [
                { 'frappeSync.syncStatus': 'pending' },
                { 'frappeSync.syncStatus': 'retrying' },
                { 'frappeSync.syncStatus': 'failed' },
                { 'frappeSync.synced': false },
                { 'frappeSync.enrollmentId': { $exists: false } }
            ]
        })
            .select('_id email courseId frappeSync createdAt')
            .limit(50)
            .sort({ createdAt: -1 });

        const stats = {
            pending: 0,
            retrying: 0,
            failed: 0,
            noEnrollmentId: 0
        };

        failedEnrollments.forEach(e => {
            const status = e.frappeSync?.syncStatus;
            if (status === 'pending') stats.pending++;
            else if (status === 'retrying') stats.retrying++;
            else if (status === 'failed') stats.failed++;
            if (!e.frappeSync?.enrollmentId) stats.noEnrollmentId++;
        });

        return NextResponse.json({
            stats,
            total: failedEnrollments.length,
            failedEnrollments: failedEnrollments.map(e => ({
                enrollmentId: e._id,
                email: e.email,
                courseId: e.courseId,
                syncStatus: e.frappeSync?.syncStatus || 'unknown',
                synced: e.frappeSync?.synced || false,
                hasEnrollmentId: !!e.frappeSync?.enrollmentId,
                errorMessage: e.frappeSync?.errorMessage,
                retryCount: e.frappeSync?.retryCount || 0,
                lastAttempt: e.frappeSync?.lastSyncAttempt,
                createdAt: e.createdAt
            }))
        });

    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}