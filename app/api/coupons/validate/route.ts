import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Grant, Course } from '@/lib/models';
import ProductionLogger from '@/lib/utils/production-logger';

/**
 * ===============================
 * COUPON VALIDATION API
 * ===============================
 * 
 * POST: Validate coupon code
 * - Check if coupon exists
 * - Check if coupon is already used
 * - Return discount details
 */

export async function POST(request: NextRequest) {
    try {
        const { couponCode, courseId, email } = await request.json();

        if (!couponCode) {
            return NextResponse.json({
                error: 'Coupon code is required'
            }, { status: 400 });
        }

        await connectToDatabase();

        // Find the grant with this coupon code
        const grant = await Grant.findOne({
            couponCode: couponCode.toUpperCase(),
            status: 'approved'
        });

        if (!grant) {
            return NextResponse.json({
                error: 'Invalid coupon code'
            }, { status: 400 });
        }

        // Check if coupon is already used
        if (grant.couponUsed) {
            return NextResponse.json({
                error: 'This coupon has already been used'
            }, { status: 400 });
        }

        // Check if coupon is for the correct course
        if (courseId && grant.courseId !== courseId) {
            return NextResponse.json({
                error: 'This coupon is not valid for the selected course'
            }, { status: 400 });
        }

        // Check if coupon is being used by the correct user
        if (email && grant.email.toLowerCase() !== email.toLowerCase()) {
            return NextResponse.json({
                error: 'This coupon can only be used by the grant recipient'
            }, { status: 400 });
        }

        // Check if coupon has expired
        if (grant.couponMetadata?.expiresAt && new Date() > grant.couponMetadata.expiresAt) {
            return NextResponse.json({
                error: 'This coupon has expired'
            }, { status: 400 });
        }

        // If the grant doesn't have discount percentage set, default based on coupon code pattern
        if (!grant.discountPercentage && grant.couponCode) {
            // Try to extract discount from coupon code pattern like GRANT50-xxx
            const match = grant.couponCode.match(/GRANT(\d+)-/);
            if (match) {
                grant.discountPercentage = parseInt(match[1]);
                grant.discountType = 'percentage';
                grant.requiresPayment = grant.discountPercentage < 100;
                ProductionLogger.info('Updated legacy grant with extracted discount percentage', {
                    grantId: grant._id,
                    extractedDiscount: grant.discountPercentage
                });
            } else {
                // Default to 100% for legacy grants without pattern
                grant.discountPercentage = 100;
                grant.discountType = 'percentage';
                grant.requiresPayment = false;
                ProductionLogger.info('Set legacy grant to 100% discount', {
                    grantId: grant._id,
                    couponCode: grant.couponCode
                });
            }
        }

        // Get course data to calculate proper pricing
        let coursePrice = 499; // Default fallback price
        try {
            await connectToDatabase();
            const courseData = await Course.findOne({ courseId: courseId });
            if (courseData) {
                coursePrice = courseData.price;
                ProductionLogger.info('Found course price in database', { coursePrice });
            } else {
                ProductionLogger.info('Using fallback course price', { coursePrice });
            }
        } catch (error) {
            ProductionLogger.warn('Could not fetch course price, using fallback', { coursePrice });
        }

        // Calculate proper pricing for legacy grants
        if (!grant.originalPrice || !grant.discountedPrice) {
            const pricing = grant.calculatePricing(coursePrice);
            grant.originalPrice = pricing.originalPrice;
            grant.discountedPrice = pricing.finalPrice;
            grant.requiresPayment = pricing.requiresPayment;
            ProductionLogger.info('Calculated pricing for legacy grant', {
                grantId: grant._id,
                originalPrice: grant.originalPrice,
                discountedPrice: grant.discountedPrice,
                discountPercentage: grant.discountPercentage,
                requiresPayment: grant.requiresPayment
            });
        }

        // Debug: Check grant data
        ProductionLogger.info('Coupon validation debug', {
            grantId: grant._id,
            couponCode: grant.couponCode,
            discountPercentage: grant.discountPercentage,
            originalPrice: grant.originalPrice,
            discountedPrice: grant.discountedPrice,
            requiresPayment: grant.requiresPayment,
            couponMetadata: grant.couponMetadata
        });

        // Get coupon information using the new helper method
        const couponInfo = grant.getCouponInfo();

        ProductionLogger.info('Coupon info calculated', couponInfo);

        // Return enhanced coupon details (frontend expects flat structure)
        return NextResponse.json({
            valid: true,
            discountPercentage: couponInfo.discountPercentage, // Actual percentage (10-100%)
            discountAmount: grant.couponMetadata?.discountAmount || grant.originalPrice || 0,
            originalPrice: grant.originalPrice || 0,
            finalPrice: couponInfo.finalPrice || 0,
            requiresPayment: couponInfo.requiresPayment,
            grantType: grant.couponMetadata?.type || 'full_grant',
            // Additional coupon details for admin/debugging
            coupon: {
                code: grant.couponCode,
                discountType: 'percentage',
                courseId: grant.courseId,
                recipientEmail: grant.email,
                recipientName: grant.name,
                expiresAt: couponInfo.expiresAt
            },
            message: couponInfo.requiresPayment
                ? `Coupon valid for ${couponInfo.discountPercentage}% discount! Pay $${couponInfo.finalPrice?.toFixed(2) || '0.00'}`
                : 'Coupon is valid for free enrollment!'
        });

    } catch (error) {
        ProductionLogger.error('Coupon validation error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// GET: Check coupon status (for admin)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const couponCode = searchParams.get('code');

        if (!couponCode) {
            return NextResponse.json({
                error: 'Coupon code is required'
            }, { status: 400 });
        }

        await connectToDatabase();

        const grant = await Grant.findOne({
            couponCode: couponCode.toUpperCase()
        });

        if (!grant) {
            return NextResponse.json({
                error: 'Coupon not found'
            }, { status: 404 });
        }

        const couponInfo = grant.getCouponInfo();

        return NextResponse.json({
            coupon: {
                code: grant.couponCode,
                courseId: grant.courseId,
                recipientEmail: grant.email,
                recipientName: grant.name,
                status: grant.status,
                used: grant.couponUsed || false,
                usedAt: grant.couponUsedAt,
                usedBy: grant.couponUsedBy,
                // Enhanced info
                discountPercentage: couponInfo.discountPercentage,
                originalPrice: grant.originalPrice,
                finalPrice: couponInfo.finalPrice,
                requiresPayment: couponInfo.requiresPayment,
                expiresAt: couponInfo.expiresAt,
                isExpired: couponInfo.isExpired,
                grantType: grant.couponMetadata?.type || 'full_grant'
            }
        });

    } catch (error) {
        ProductionLogger.error('Coupon check error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
