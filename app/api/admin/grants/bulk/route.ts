import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Grant, User } from '@/lib/models';
import { sendEmail } from '@/lib/emails';
import { generateGrantCoupon, generatePartialGrantCoupon } from '@/lib/utils/coupon-generator';
import { safeEmailSend } from '@/lib/utils/email-error-handler';
import { validateAdminAuth, logAdminAction } from '@/lib/utils/admin-middleware';
import ProductionLogger from '@/lib/utils/production-logger';
import { getCourseFromDb } from '@/lib/services/course';

/**
 * ===============================
 * ADMIN GRANT BULK PROCESSING API
 * ===============================
 * 
 * POST: Bulk approve/reject grants
 * - Process multiple grants at once
 * - Send emails for each grant
 * - Generate coupons for approved grants
 */

export async function POST(request: NextRequest) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectToDatabase();
        const adminUser = await User.findOne({ email: session.user.email });
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { grantIds, action, message, processedBy, discountPercentage = 100 } = await request.json();

        if (!grantIds || !Array.isArray(grantIds) || grantIds.length === 0) {
            return NextResponse.json({ error: 'Grant IDs array is required' }, { status: 400 });
        }

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 });
        }

        // Fetch all grants
        const grants = await Grant.find({
            _id: { $in: grantIds },
            status: 'pending'
        });

        if (grants.length === 0) {
            return NextResponse.json({ error: 'No pending grants found' }, { status: 404 });
        }

        const results = [];
        const approved = action === 'approve';

        // Process each grant
        for (const grant of grants) {
            try {
                // Update grant status
                grant.status = approved ? 'approved' : 'rejected';
                grant.processedAt = new Date();
                grant.processedBy = processedBy || session.user.email;

                if (message) {
                    grant.adminNotes = message;
                }

                let emailSuccess = false;
                let couponCode = null;

                if (approved) {
                    // Use the discount percentage from admin input (not from existing grant)
                    const grantDiscountPercentage = discountPercentage;
                    const isPartialDiscount = grantDiscountPercentage < 100;

                    // Get course information for pricing calculations
                    const course = await getCourseFromDb(grant.courseId);
                    const coursePrice = course?.price || 499; // fallback price

                    // Calculate proper pricing (fixed floating point precision)
                    const discountAmount = Math.round((coursePrice * grantDiscountPercentage) / 100 * 100) / 100;
                    const finalPrice = Math.max(0, Math.round((coursePrice - discountAmount) * 100) / 100);

                    const pricing = {
                        originalPrice: coursePrice,
                        discountPercentage: grantDiscountPercentage,
                        discountAmount,
                        finalPrice,
                        requiresPayment: grantDiscountPercentage < 100
                    };

                    // Update grant with discount information
                    grant.discountPercentage = grantDiscountPercentage;
                    grant.discountType = 'percentage';
                    grant.originalPrice = pricing.originalPrice;
                    grant.discountedPrice = pricing.finalPrice;
                    grant.requiresPayment = pricing.requiresPayment;

                    // Generate appropriate coupon code
                    couponCode = isPartialDiscount
                        ? generatePartialGrantCoupon(grantDiscountPercentage)
                        : generateGrantCoupon();
                    grant.couponCode = couponCode;

                    // Set coupon metadata
                    grant.couponMetadata = {
                        type: grantDiscountPercentage === 100 ? 'full_grant' : 'partial_grant',
                        discountAmount: pricing.discountAmount,
                        finalPrice: pricing.finalPrice,
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days
                    };

                    // Send appropriate email based on discount type
                    if (isPartialDiscount) {
                        // Send partial grant approval email
                        const courseTitle = course?.title || 'Course';
                        const emailResult = await safeEmailSend(
                            sendEmail.partialGrantApproval(
                                grant.email,
                                grant.username || grant.name,
                                courseTitle,
                                couponCode,
                                grantDiscountPercentage,
                                pricing.originalPrice,
                                pricing.finalPrice,
                                pricing.discountAmount
                            ),
                            `partial grant approval for ${grant.email}`
                        );
                        emailSuccess = emailResult.success;
                    } else {
                        // Send regular 100% approval email
                        const courseTitle = course?.title || 'Course';
                        const emailResult = await safeEmailSend(
                            sendEmail.grantApproval(grant.email, grant.username || grant.name, courseTitle, couponCode),
                            `grant approval for ${grant.email}`
                        );
                        emailSuccess = emailResult.success;
                    }
                } else {
                    // Send rejection email
                    const emailResult = await safeEmailSend(
                        sendEmail.grantRejection(grant.email, grant.username, grant.courseId || 'Course', 'Application did not meet criteria'),
                        `grant rejection for ${grant.email}`
                    );
                    emailSuccess = emailResult.success;
                }

                await grant.save();

                results.push({
                    grantId: grant._id,
                    email: grant.email,
                    name: grant.name,
                    status: grant.status,
                    couponCode,
                    emailSent: emailSuccess
                });

            } catch (error) {
                ProductionLogger.error('Error processing grant', {
                    grantId: grant._id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined
                });
                results.push({
                    grantId: grant._id,
                    email: grant.email,
                    name: grant.name,
                    status: 'error',
                    error: 'Processing failed'
                });
            }
        }

        const successful = results.filter(r => r.status !== 'error').length;
        const failed = results.filter(r => r.status === 'error').length;

        return NextResponse.json({
            message: `Bulk ${action} completed`,
            summary: {
                total: grantIds.length,
                successful,
                failed,
                processed: results.length
            },
            results
        });

    } catch (error) {
        ProductionLogger.error('Bulk grant processing error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
