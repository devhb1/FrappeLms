/**
 * Cancel Enrollment API - Unreserve Grants
 * 
 * This endpoint handles cleanup when a user cancels checkout:
 * - Unreserves partial grant coupons
 * - Deletes pending enrollment records
 * - Allows coupon to be reused
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Enrollment, Grant } from '@/lib/models';
import ProductionLogger from '@/lib/utils/production-logger';

export async function POST(request: NextRequest) {
    try {
        const { enrollmentId } = await request.json();

        if (!enrollmentId) {
            return NextResponse.json({
                error: 'Enrollment ID is required',
                code: 'MISSING_ENROLLMENT_ID'
            }, { status: 400 });
        }

        await connectToDatabase();

        // Find the enrollment
        const enrollment = await Enrollment.findById(enrollmentId);

        if (!enrollment) {
            ProductionLogger.warn('Enrollment not found for cancellation', { enrollmentId });
            return NextResponse.json({
                success: true,
                message: 'Enrollment not found (may have been already cancelled)',
                enrollmentId
            });
        }

        // Only process pending enrollments
        if (enrollment.status !== 'pending') {
            ProductionLogger.info('Enrollment already processed', {
                enrollmentId,
                status: enrollment.status
            });
            return NextResponse.json({
                success: true,
                message: 'Enrollment already processed',
                status: enrollment.status
            });
        }

        // If this is a partial grant enrollment, unreserve the coupon
        if (enrollment.enrollmentType === 'partial_grant' && enrollment.grantData?.grantId) {
            try {
                const grant = await Grant.findById(enrollment.grantData.grantId);

                if (grant && !grant.couponUsed) {
                    // Unreserve the coupon so it can be used again
                    await Grant.findByIdAndUpdate(grant._id, {
                        $unset: {
                            reservedAt: 1,
                            reservedBy: 1,
                            reservationExpiry: 1
                        }
                    });

                    ProductionLogger.info('Grant coupon unreserved after checkout cancellation', {
                        grantId: grant._id,
                        couponCode: grant.couponCode,
                        email: enrollment.email
                    });
                }
            } catch (grantError) {
                ProductionLogger.error('Failed to unreserve grant', {
                    error: grantError instanceof Error ? grantError.message : 'Unknown',
                    grantId: enrollment.grantData.grantId
                });
                // Don't fail the whole operation
            }
        }

        // Delete the pending enrollment
        await Enrollment.findByIdAndDelete(enrollmentId);

        ProductionLogger.info('Enrollment cancelled successfully', {
            enrollmentId,
            email: enrollment.email,
            courseId: enrollment.courseId,
            enrollmentType: enrollment.enrollmentType
        });

        return NextResponse.json({
            success: true,
            message: 'Enrollment cancelled and coupon unreserved',
            enrollmentId
        });

    } catch (error) {
        ProductionLogger.error('Cancel enrollment error', {
            error: error instanceof Error ? error.message : 'Unknown'
        });

        return NextResponse.json({
            error: 'Failed to cancel enrollment',
            code: 'CANCELLATION_ERROR'
        }, { status: 500 });
    }
}
