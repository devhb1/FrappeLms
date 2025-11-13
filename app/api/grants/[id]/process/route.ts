import connectToDatabase from "@/lib/db";
import { Grant } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails";
import { generateGrantCoupon, generatePartialGrantCoupon } from "@/lib/utils/coupon-generator";
import { safeEmailSend as safeEmailSendUtil } from "@/lib/utils/email-error-handler";
import verifyAdminAuth from "@/lib/utils/admin-middleware";
import ProductionLogger from "@/lib/utils/production-logger";
import { getCourseFromDb } from "@/lib/services/course";



export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Verify admin authentication first
        const authResult = await verifyAdminAuth.validateAdminAuth(request);
        if (!authResult.success) {
            return authResult.error || NextResponse.json({
                error: "Unauthorized - Admin access required"
            }, { status: 401 });
        }

        const {
            approved,
            reason,
            adminNotes,
            processedBy,
            discountPercentage = 100,  // Default to 100% for backward compatibility
            expirationDays = 30        // Default 30 days expiration
        } = await request.json();
        const params = await context.params;
        const grantId = params.id;

        if (typeof approved !== 'boolean') {
            return NextResponse.json({
                error: "approved field must be a boolean"
            }, { status: 400 });
        }

        if (approved && (discountPercentage < 1 || discountPercentage > 100)) {
            return NextResponse.json({
                error: "Discount percentage must be between 1 and 100"
            }, { status: 400 });
        }

        await connectToDatabase();

        const grant = await Grant.findById(grantId);

        if (!grant) {
            return NextResponse.json({
                error: "Grant not found"
            }, { status: 404 });
        }

        if (grant.status !== 'pending') {
            return NextResponse.json({
                error: `Grant has already been ${grant.status}`
            }, { status: 400 });
        }

        // Update grant status
        grant.status = approved ? 'approved' : 'rejected';
        grant.processedAt = new Date();
        grant.processedBy = processedBy || authResult.user.email || 'admin';

        if (adminNotes) {
            grant.adminNotes = adminNotes;
        }

        let emailSuccess = false;
        let couponCode = null;
        let pricingInfo = null;

        if (approved) {
            // Get course information for pricing calculations
            const course = await getCourseFromDb(grant.courseId);
            if (!course) {
                return NextResponse.json({
                    error: "Course not found"
                }, { status: 404 });
            }

            // Update grant with discount information FIRST
            grant.discountPercentage = discountPercentage;
            grant.discountType = 'percentage';

            // Calculate pricing based on NEW discount percentage
            const pricing = grant.calculatePricing(course.price);
            pricingInfo = pricing;

            // Update grant with calculated pricing
            grant.originalPrice = pricing.originalPrice;
            grant.discountedPrice = pricing.finalPrice;
            grant.requiresPayment = pricing.requiresPayment;

            // Generate appropriate coupon code
            couponCode = discountPercentage < 100
                ? generatePartialGrantCoupon(discountPercentage)
                : generateGrantCoupon();
            grant.couponCode = couponCode;

            // Set coupon metadata
            const expiresAt = expirationDays > 0
                ? new Date(Date.now() + (expirationDays * 24 * 60 * 60 * 1000))
                : undefined;

            grant.couponMetadata = {
                type: discountPercentage === 100 ? 'full_grant' : 'partial_grant',
                discountAmount: pricing.discountAmount,
                finalPrice: pricing.finalPrice,
                expiresAt,
                createdAt: new Date()
            };

            // Send appropriate approval email based on discount type
            if (discountPercentage === 100) {
                // Existing 100% discount email
                const emailResult = await safeEmailSendUtil(
                    sendEmail.grantApproval(grant.email, grant.name, course.title, couponCode),
                    `grant approval - ${grant.email}`
                );
                emailSuccess = emailResult.success;
            } else {
                // Enhanced partial discount email
                const expirationDate = expiresAt ? expiresAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : undefined;

                const emailResult = await safeEmailSendUtil(
                    sendEmail.partialGrantApproval(
                        grant.email,
                        grant.name,
                        course.title,
                        couponCode,
                        discountPercentage,
                        pricing.originalPrice,
                        pricing.finalPrice,
                        pricing.discountAmount,
                        expirationDate
                    ),
                    `partial grant approval - ${grant.email}`
                );
                emailSuccess = emailResult.success;
            }
        } else {
            // Send rejection email
            const emailResult = await safeEmailSendUtil(
                sendEmail.grantRejection(grant.email, grant.name, grant.courseId, reason),
                `grant rejection - ${grant.email}`
            );
            emailSuccess = emailResult.success;
        }

        await grant.save();

        ProductionLogger.info('Grant processed successfully', {
            grantId: grant._id,
            status: grant.status,
            processedBy: grant.processedBy,
            emailSent: emailSuccess,
            hasCoupon: !!couponCode,
            discountPercentage: grant.discountPercentage,
            requiresPayment: grant.requiresPayment
        });

        const response: any = {
            message: `Grant ${approved ? 'approved' : 'rejected'} successfully`,
            grantId: grant._id,
            status: grant.status,
            couponCode,
            emailSent: emailSuccess
        };

        // Include pricing information for approved grants
        if (approved && pricingInfo) {
            response.pricing = {
                discountPercentage: grant.discountPercentage,
                originalPrice: pricingInfo.originalPrice,
                discountAmount: pricingInfo.discountAmount,
                finalPrice: pricingInfo.finalPrice,
                requiresPayment: pricingInfo.requiresPayment,
                expiresAt: grant.couponMetadata?.expiresAt
            };
        }

        return NextResponse.json(response, { status: 200 });

    } catch (error) {
        ProductionLogger.error('Grant processing error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({
            error: "Internal Server Error"
        }, { status: 500 });
    }
}

// GET: Fetch specific grant details
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Verify admin authentication first
        const authResult = await verifyAdminAuth.validateAdminAuth(request);
        if (!authResult.success) {
            return authResult.error || NextResponse.json({
                error: "Unauthorized - Admin access required"
            }, { status: 401 });
        }

        const params = await context.params;
        const grantId = params.id;

        await connectToDatabase();

        const grant = await Grant.findById(grantId).lean();

        if (!grant) {
            return NextResponse.json({
                error: "Grant not found"
            }, { status: 404 });
        }

        return NextResponse.json({ grant }, { status: 200 });

    } catch (error) {
        ProductionLogger.error('Fetch grant error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({
            error: "Internal Server Error"
        }, { status: 500 });
    }
}
