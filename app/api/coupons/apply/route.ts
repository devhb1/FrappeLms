import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Grant } from '@/lib/models';
import ProductionLogger from '@/lib/utils/production-logger';

/**
 * ===============================
 * COUPON APPLY API
 * ===============================
 * 
 * POST: Mark coupon as used after successful payment
 * - Update coupon status to used
 * - Record usage details
 */

export async function POST(request: NextRequest) {
    try {
        const { couponCode, email, paymentId, courseId } = await request.json();

        if (!couponCode || !email || !paymentId) {
            return NextResponse.json({
                error: 'Coupon code, email, and payment ID are required'
            }, { status: 400 });
        }

        await connectToDatabase();

        // Find and update the grant coupon
        const grant = await Grant.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'approved',
            couponUsed: false // Only unused coupons
        });

        if (!grant) {
            return NextResponse.json({
                error: 'Invalid or already used coupon'
            }, { status: 400 });
        }

        // Verify the coupon belongs to the user
        if (grant.email.toLowerCase() !== email.toLowerCase()) {
            return NextResponse.json({
                error: 'This coupon can only be used by the grant recipient'
            }, { status: 400 });
        }

        // Verify the course matches
        if (courseId && grant.courseId !== courseId) {
            return NextResponse.json({
                error: 'This coupon is not valid for the selected course'
            }, { status: 400 });
        }

        // Mark coupon as used
        grant.couponUsed = true;
        grant.couponUsedAt = new Date();
        grant.couponUsedBy = email;

        await grant.save();

        return NextResponse.json({
            success: true,
            message: 'Coupon applied successfully',
            coupon: {
                code: grant.couponCode,
                usedAt: grant.couponUsedAt,
                usedBy: grant.couponUsedBy
            }
        });

    } catch (error) {
        ProductionLogger.error('Coupon apply error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
