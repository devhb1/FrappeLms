/**
 * Manual Frappe LMS Sync - Debug/Admin Endpoint
 * Manually triggers Frappe LMS sync for a paid enrollment
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Enrollment } from '@/lib/models/enrollment';
import { enrollInFrappeLMS } from '@/lib/services/frappeLMS';
import ProductionLogger from '@/lib/utils/production-logger';

export async function POST(req: NextRequest) {
    try {
        const { enrollmentId, email } = await req.json();

        if (!enrollmentId && !email) {
            return NextResponse.json({
                error: 'Provide either enrollmentId or email'
            }, { status: 400 });
        }

        await connectToDatabase();

        // Find the enrollment
        const query = enrollmentId
            ? { _id: enrollmentId }
            : { email: email.toLowerCase(), status: 'paid' };

        const enrollment = await Enrollment.findOne(query).sort({ createdAt: -1 });

        if (!enrollment) {
            return NextResponse.json({
                error: 'No paid enrollment found',
                query
            }, { status: 404 });
        }

        ProductionLogger.info('Manual Frappe sync triggered', {
            enrollmentId: enrollment._id,
            email: enrollment.email,
            courseId: enrollment.courseId,
            currentSyncStatus: enrollment.frappeSync?.syncStatus
        });

        // Check if already synced
        if (enrollment.frappeSync?.synced) {
            return NextResponse.json({
                success: true,
                message: 'Already synced to Frappe LMS',
                enrollment: {
                    id: enrollment._id,
                    email: enrollment.email,
                    courseId: enrollment.courseId,
                    frappeEnrollmentId: enrollment.frappeSync.enrollmentId,
                    syncedAt: enrollment.frappeSync.syncCompletedAt
                }
            });
        }

        // Attempt Frappe sync
        const frappeResult = await enrollInFrappeLMS({
            user_email: enrollment.email,
            course_id: enrollment.courseId,
            paid_status: true,
            payment_id: enrollment.paymentId,
            amount: enrollment.amount,
            currency: enrollment.currency || 'usd',
            referral_code: enrollment.affiliateData?.affiliateEmail,
            enrollment_type: enrollment.enrollmentType
        });

        if (frappeResult.success) {
            // Update enrollment
            enrollment.frappeSync = {
                synced: true,
                syncStatus: 'success',
                enrollmentId: frappeResult.enrollment_id,
                syncCompletedAt: new Date(),
                lastSyncAttempt: new Date()
            };
            await enrollment.save();

            ProductionLogger.info('Manual Frappe sync successful', {
                enrollmentId: enrollment._id,
                frappeEnrollmentId: frappeResult.enrollment_id
            });

            return NextResponse.json({
                success: true,
                message: 'Successfully synced to Frappe LMS',
                enrollment: {
                    id: enrollment._id,
                    email: enrollment.email,
                    courseId: enrollment.courseId,
                    frappeEnrollmentId: frappeResult.enrollment_id
                }
            });
        } else {
            ProductionLogger.error('Manual Frappe sync failed', {
                enrollmentId: enrollment._id,
                error: frappeResult.error
            });

            return NextResponse.json({
                success: false,
                error: 'Frappe sync failed',
                details: frappeResult.error,
                enrollment: {
                    id: enrollment._id,
                    email: enrollment.email,
                    courseId: enrollment.courseId
                }
            }, { status: 500 });
        }

    } catch (error) {
        ProductionLogger.error('Manual sync endpoint error', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            error: 'Manual sync failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'Manual Frappe Sync API',
        usage: {
            method: 'POST',
            body: {
                option1: '{ "enrollmentId": "..." }',
                option2: '{ "email": "user@example.com" }'
            }
        }
    });
}
