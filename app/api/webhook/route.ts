import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectToDatabase from '@/lib/db';
import { Enrollment } from '@/lib/models/enrollment';
import { Affiliate } from '@/lib/models/affiliate';
import { RetryJob } from '@/lib/models/retry-job';
import { getCourseFromDb } from '@/lib/services/course';
import { sendEmail } from '@/lib/emails';
import ProductionLogger from '@/lib/utils/production-logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // @ts-ignore - Different Stripe versions between local and Vercel
    apiVersion: '2025-08-27.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**

 *  STRIPE WEBHOOK
 * ===============================
 *
 * webhook for LMS admin consumption:
 * ✅ Process Stripe payments
 * ✅ Store enrollment data in database  
 * ✅ Track affiliate commissions in affiliate model
 * ✅ Provide clean data via GET /api/enrollments for LMS admin
 * 

 */

// GET: Webhook status and recent enrollments for LMS admin
export async function GET() {
    try {
        await connectToDatabase();

        // Get recent enrollments for LMS admin preview with complete data
        const recentEnrollments = await Enrollment.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .select({
                courseId: 1,
                email: 1,
                paymentId: 1,
                amount: 1,
                status: 1,
                timestamp: 1,
                enrollmentType: 1,
                lmsContext: 1,
                affiliateData: 1,
                grantData: 1,
                verification: 1,
                frappeSync: 1,
                paymentMethod: 1,
                currency: 1,
                originalAmount: 1,
                discountAmount: 1,
                metadata: 1,
                createdAt: 1,
                updatedAt: 1
            });

        const totalEnrollments = await Enrollment.countDocuments({ status: 'paid' });
        const totalAffiliateEnrollments = await Enrollment.countDocuments({
            status: 'paid',
            'affiliateData.affiliateEmail': { $exists: true, $ne: '' }
        });

        return NextResponse.json({
            status: 'operational',
            message: 'Webhook API active - Ready for LMS admin consumption',
            stats: {
                totalEnrollments,
                totalAffiliateEnrollments,
                recentEnrollments: recentEnrollments.length
            },
            recentEnrollments,
            lmsAdminInfo: {
                dataEndpoint: '/api/enrollments',
                usage: 'GET /api/enrollments?status=paid to fetch all paid enrollments for manual LMS processing'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Webhook status check failed:', error);
        return NextResponse.json({
            error: 'Database connection failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// POST: Process Stripe payments and store clean enrollment data
export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        console.log('✅ Webhook verified:', event.type, 'ID:', event.id);
    } catch (err: any) {
        console.error('❌ Webhook verification failed:', err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Process completed payments only
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        try {
            await connectToDatabase();
            console.log(`🔗 Connected to database for webhook processing`);

            // Get payment intent metadata
            let paymentIntent = null;
            if (session.payment_intent) {
                paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            }

            // Combine all metadata
            const metadata = {
                ...(session.metadata || {}),
                ...(paymentIntent?.metadata || {})
            };

            const customerEmail = (metadata.email || session.customer_details?.email || '').toLowerCase();

            console.log(`💳 Processing payment for: ${customerEmail}`);
            console.log(`📋 Course: ${metadata.courseId}, Amount: $${session.amount_total ? session.amount_total / 100 : 0}`);
            console.log(`🔗 Enrollment ID from metadata: ${metadata.enrollmentId}`);
            console.log(`👥 Affiliate Email: ${metadata.affiliateEmail || 'None'}`);

            // Validate required metadata
            if (!metadata.enrollmentId) {
                console.error(`❌ Missing enrollmentId in webhook metadata`);
                return NextResponse.json({ error: 'Missing enrollment ID' }, { status: 400 });
            }

            // Find and update existing enrollment instead of creating new one
            const existingEnrollment = await Enrollment.findById(metadata.enrollmentId);

            if (!existingEnrollment) {
                console.error(`❌ No pending enrollment found with ID: ${metadata.enrollmentId}`);
                return NextResponse.json({ error: 'Enrollment not found' }, { status: 400 });
            }

            console.log(`📝 Found existing enrollment: ${existingEnrollment._id}, Status: ${existingEnrollment.status}`);

            // Atomic idempotency check: prevent race conditions by atomically checking and adding event
            const updateResult = await Enrollment.findOneAndUpdate(
                {
                    _id: existingEnrollment._id,
                    'stripeEvents.eventId': { $ne: event.id } // Only update if eventId not already present
                },
                {
                    $addToSet: {
                        stripeEvents: {
                            eventId: event.id,
                            eventType: event.type,
                            processedAt: new Date(),
                            status: 'processing'
                        }
                    }
                },
                { new: true }
            );

            if (!updateResult) {
                ProductionLogger.warn('Webhook idempotency - Event already being processed or completed', {
                    eventId: event.id,
                    eventType: event.type,
                    enrollmentId: existingEnrollment._id,
                    existingEventsCount: existingEnrollment.stripeEvents?.length || 0
                });
                return NextResponse.json({
                    success: true,
                    message: 'Event already processed or processing',
                    eventId: event.id,
                    enrollmentId: existingEnrollment._id
                });
            }

            // ATOMIC status + event update to prevent race condition
            const updatedEnrollment = await Enrollment.findOneAndUpdate(
                {
                    _id: metadata.enrollmentId,
                    status: { $ne: 'paid' } // Only if NOT already paid
                },
                {
                    $set: {
                        paymentId: session.payment_intent as string,
                        status: 'paid',
                        'verification.paymentVerified': true,
                        'frappeSync.syncStatus': 'pending',
                        updatedAt: new Date()
                    }
                },
                { new: true } // Return updated document
            );

            if (!updatedEnrollment) {
                console.log(`⚠️ Enrollment already marked as paid or not found: ${metadata.enrollmentId}`);
                ProductionLogger.warn('Webhook rejected - enrollment already paid', {
                    enrollmentId: metadata.enrollmentId,
                    eventId: event.id
                });
                return NextResponse.json({
                    success: true,
                    message: 'Payment already processed',
                    eventId: event.id,
                    enrollmentId: metadata.enrollmentId
                });
            }

            console.log(`✅ Enrollment updated: ${updatedEnrollment._id}`);
            console.log('🔍 Updated enrollment status:', updatedEnrollment.status);
            console.log('💳 Payment ID stored:', updatedEnrollment.paymentId);

            ProductionLogger.info('Webhook processed successfully', {
                eventId: event.id,
                eventType: event.type,
                enrollmentId: updatedEnrollment._id,
                paymentId: updatedEnrollment.paymentId,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                customerEmail: customerEmail,
                stripeEventsCount: updatedEnrollment.stripeEvents?.length || 0
            });

            // Handle partial grant coupon marking as used
            if (updatedEnrollment.enrollmentType === 'partial_grant' && updatedEnrollment.grantData?.grantId) {
                try {
                    const { Grant } = await import('@/lib/models/grant');
                    await Grant.findByIdAndUpdate(updatedEnrollment.grantData.grantId, {
                        couponUsed: true,
                        couponUsedAt: new Date(),
                        couponUsedBy: customerEmail,
                        enrollmentId: updatedEnrollment._id
                    });
                    console.log(`✅ Partial grant coupon marked as used: ${updatedEnrollment.grantData.grantId}`);
                } catch (grantError) {
                    console.error(`❌ Failed to mark grant coupon as used:`, grantError);
                    // Don't fail the enrollment if grant update fails
                }
            }

            // Send course purchase confirmation email
            try {
                const course = await getCourseFromDb(metadata.courseId);
                const customerName = customerEmail.split('@')[0]; // Extract name from email
                const purchaseDate = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                console.log(`📧 Sending course purchase confirmation email to: ${customerEmail}`);

                // Send appropriate email based on enrollment type
                if (updatedEnrollment.enrollmentType === 'partial_grant' && updatedEnrollment.grantData) {
                    // Enhanced partial grant enrollment confirmation
                    await sendEmail.partialGrantEnrollment(
                        customerEmail,
                        customerName,
                        course?.title || 'Course',
                        purchaseDate,
                        updatedEnrollment.grantData.originalPrice || updatedEnrollment.amount,
                        updatedEnrollment.amount,
                        updatedEnrollment.grantData.discountPercentage || 0,
                        metadata.grantId ? `Coupon used from grant` : 'Grant coupon'
                    );
                    console.log(`✅ Partial grant enrollment confirmation email sent (${updatedEnrollment.grantData.discountPercentage}% discount applied)`);
                } else {
                    // Regular paid enrollment
                    await sendEmail.coursePurchaseConfirmation(
                        customerEmail,
                        customerName,
                        course?.title || 'Course',
                        updatedEnrollment.amount,
                        purchaseDate
                    );
                    console.log(`✅ Course purchase confirmation email sent successfully`);
                }
            } catch (emailError) {
                console.error(`❌ Failed to send course purchase confirmation email:`, emailError);
                // Don't fail the webhook if email fails - log and continue
            }

            // Process affiliate commission if applicable
            const affiliateEmail = updatedEnrollment.affiliateData?.affiliateEmail || metadata.affiliateEmail;
            if (affiliateEmail && affiliateEmail !== '') {
                console.log(`👥 Processing affiliate commission for: ${affiliateEmail}`);
                await processAffiliateCommission(updatedEnrollment, affiliateEmail);
            } else {
                console.log(`ℹ️ No affiliate associated with this enrollment`);
            }

            // ===== FRAPPE LMS INTEGRATION =====
            // Enroll user in FrappeLMS after successful payment
            try {
                console.log(`🎓 Enrolling user in FrappeLMS...`);

                // IDEMPOTENCY CHECK: Skip if already enrolled
                if (updatedEnrollment.frappeSync?.enrollmentId) {
                    ProductionLogger.info('Skipping Frappe enrollment - already enrolled', {
                        enrollmentId: updatedEnrollment._id,
                        frappeEnrollmentId: updatedEnrollment.frappeSync.enrollmentId
                    });

                    // Mark event as processed even though we skipped Frappe
                    await Enrollment.findOneAndUpdate(
                        { _id: updatedEnrollment._id },
                        {
                            $set: {
                                'stripeEvents.$[elem].status': 'processed',
                                'stripeEvents.$[elem].skippedReason': 'already_enrolled_in_frappe'
                            }
                        },
                        {
                            arrayFilters: [{ 'elem.eventId': event.id }]
                        }
                    );
                } else {
                    const { enrollInFrappeLMS } = await import('@/lib/services/frappeLMS');

                    ProductionLogger.info('Attempting Frappe LMS enrollment', {
                        enrollmentId: updatedEnrollment._id,
                        customerEmail,
                        courseId: metadata.courseId,
                        amount: updatedEnrollment.amount
                    });

                    const frappeResult = await enrollInFrappeLMS({
                        user_email: customerEmail,
                        course_id: metadata.courseId,
                        paid_status: true,
                        payment_id: updatedEnrollment.paymentId,
                        amount: updatedEnrollment.amount,
                        currency: 'USD',
                        referral_code: affiliateEmail || undefined,
                        // Grant metadata for partial discounts
                        original_amount: updatedEnrollment.originalAmount,
                        discount_percentage: updatedEnrollment.grantData?.discountPercentage,
                        grant_id: updatedEnrollment.grantData?.grantId?.toString()
                    });

                    if (frappeResult.success) {
                        // Update enrollment with FrappeLMS data and mark webhook event as processed
                        await Enrollment.findOneAndUpdate(
                            { _id: updatedEnrollment._id },
                            {
                                $set: {
                                    'frappeSync.synced': true,
                                    'frappeSync.syncStatus': 'success',
                                    'frappeSync.enrollmentId': frappeResult.enrollment_id,
                                    'frappeSync.syncCompletedAt': new Date(),
                                    'frappeSync.lastSyncAttempt': new Date(),
                                    'frappeSync.retryCount': 0,
                                    'stripeEvents.$[elem].status': 'processed'
                                }
                            },
                            {
                                arrayFilters: [{ 'elem.eventId': event.id }]
                            }
                        );

                        ProductionLogger.info('FrappeLMS enrollment successful', {
                            enrollmentId: updatedEnrollment._id,
                            frappeEnrollmentId: frappeResult.enrollment_id,
                            customerEmail
                        });
                        console.log(`✅ FrappeLMS enrollment completed: ${frappeResult.enrollment_id}`);
                    } else {
                        // IMMEDIATE RETRY before queuing
                        ProductionLogger.warn('First Frappe attempt failed, retrying immediately...', {
                            error: frappeResult.error,
                            enrollmentId: updatedEnrollment._id
                        });

                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

                        const retryResult = await enrollInFrappeLMS({
                            user_email: customerEmail,
                            course_id: metadata.courseId,
                            paid_status: true,
                            payment_id: updatedEnrollment.paymentId,
                            amount: updatedEnrollment.amount,
                            currency: 'USD',
                            referral_code: affiliateEmail || undefined,
                            original_amount: updatedEnrollment.originalAmount,
                            discount_percentage: updatedEnrollment.grantData?.discountPercentage,
                            grant_id: updatedEnrollment.grantData?.grantId?.toString()
                        });

                        if (retryResult.success) {
                            await Enrollment.findOneAndUpdate(
                                { _id: updatedEnrollment._id },
                                {
                                    $set: {
                                        'frappeSync.synced': true,
                                        'frappeSync.syncStatus': 'success',
                                        'frappeSync.enrollmentId': retryResult.enrollment_id,
                                        'frappeSync.syncCompletedAt': new Date(),
                                        'frappeSync.lastSyncAttempt': new Date(),
                                        'frappeSync.retryCount': 1,
                                        'stripeEvents.$[elem].status': 'processed'
                                    }
                                },
                                {
                                    arrayFilters: [{ 'elem.eventId': event.id }]
                                }
                            );
                            ProductionLogger.info('FrappeLMS enrollment successful on immediate retry', {
                                enrollmentId: updatedEnrollment._id,
                                frappeEnrollmentId: retryResult.enrollment_id
                            });
                            console.log(`✅ FrappeLMS enrollment completed on retry: ${retryResult.enrollment_id}`);
                        } else {
                            // Queue for later retry
                            ProductionLogger.error('Immediate retry failed, queuing for later', {
                                error: retryResult.error,
                                enrollmentId: updatedEnrollment._id
                            });

                            const retryJob = await RetryJob.create({
                                jobType: 'frappe_enrollment',
                                enrollmentId: updatedEnrollment._id,
                                payload: {
                                    user_email: customerEmail,
                                    course_id: metadata.courseId,
                                    paid_status: true,
                                    payment_id: updatedEnrollment.paymentId,
                                    amount: updatedEnrollment.amount,
                                    currency: 'USD',
                                    referral_code: affiliateEmail || undefined,
                                    original_amount: updatedEnrollment.originalAmount,
                                    discount_percentage: updatedEnrollment.grantData?.discountPercentage,
                                    grant_id: updatedEnrollment.grantData?.grantId?.toString(),
                                    enrollmentType: updatedEnrollment.enrollmentType || 'paid_stripe',
                                    originalRequestId: metadata.requestId
                                },
                                nextRetryAt: new Date(Date.now() + 2 * 60 * 1000) // Retry in 2 minutes
                            });

                            // Mark enrollment as queued for retry
                            await Enrollment.findByIdAndUpdate(updatedEnrollment._id, {
                                $set: {
                                    'frappeSync.synced': false,
                                    'frappeSync.syncStatus': 'retrying',
                                    'frappeSync.errorMessage': retryResult.error,
                                    'frappeSync.lastSyncAttempt': new Date(),
                                    'frappeSync.retryJobId': retryJob._id,
                                    'frappeSync.retryCount': 2
                                }
                            });

                            ProductionLogger.warn('FrappeLMS enrollment failed after immediate retry, queued for later', {
                                enrollmentId: updatedEnrollment._id,
                                retryJobId: retryJob._id,
                                error: retryResult.error,
                                nextRetryAt: retryJob.nextRetryAt
                            });
                            console.log(`⚠️ FrappeLMS enrollment queued for retry: ${retryJob._id}`);
                        }
                    }
                }
            } catch (frappeError) {
                const errorMessage = frappeError instanceof Error ? frappeError.message : 'Unknown error';

                // Queue for retry on network errors too
                try {
                    const retryJob = await RetryJob.create({
                        jobType: 'frappe_enrollment',
                        enrollmentId: updatedEnrollment._id,
                        payload: {
                            user_email: customerEmail,
                            course_id: metadata.courseId,
                            paid_status: true,
                            payment_id: updatedEnrollment.paymentId,
                            amount: updatedEnrollment.amount,
                            currency: 'USD',
                            referral_code: affiliateEmail || undefined,
                            enrollmentType: updatedEnrollment.enrollmentType || 'paid_stripe',
                            originalRequestId: metadata.requestId
                        },
                        nextRetryAt: new Date(Date.now() + 2 * 60 * 1000), // Retry in 2 minutes
                        maxAttempts: 5 // Explicit retry limit
                    });

                    await Enrollment.findByIdAndUpdate(updatedEnrollment._id, {
                        $set: {
                            'frappeSync.synced': false,
                            'frappeSync.syncStatus': 'retrying',
                            'frappeSync.errorMessage': errorMessage,
                            'frappeSync.lastSyncAttempt': new Date(),
                            'frappeSync.retryJobId': retryJob._id
                        }
                    });

                    ProductionLogger.error('FrappeLMS enrollment exception, queued for retry', {
                        enrollmentId: updatedEnrollment._id,
                        retryJobId: retryJob._id,
                        error: errorMessage,
                        nextRetryAt: retryJob.nextRetryAt
                    });
                } catch (retryError) {
                    // If retry job creation also fails, mark as failed
                    await Enrollment.findByIdAndUpdate(updatedEnrollment._id, {
                        $set: {
                            'frappeSync.synced': false,
                            'frappeSync.syncStatus': 'failed',
                            'frappeSync.errorMessage': `${errorMessage} | Retry queue failed: ${retryError instanceof Error ? retryError.message : 'Unknown'}`,
                            'frappeSync.lastSyncAttempt': new Date()
                        }
                    });

                    ProductionLogger.error('Failed to create retry job for FrappeLMS enrollment', {
                        enrollmentId: updatedEnrollment._id,
                        originalError: errorMessage,
                        retryError: retryError instanceof Error ? retryError.message : 'Unknown'
                    });
                }
            }
            // ===== END FRAPPE LMS INTEGRATION =====

            return NextResponse.json({
                success: true,
                enrollmentId: updatedEnrollment._id,
                customerEmail,
                courseId: metadata.courseId,
                amount: updatedEnrollment.amount,
                status: updatedEnrollment.status,
                affiliateProcessed: !!affiliateEmail,
                message: 'Payment processed - enrollment updated successfully'
            });

        } catch (error) {
            console.error('❌ Enrollment processing failed:', error);
            console.error('📋 Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                sessionId: session.id
            });

            return NextResponse.json({
                error: 'Failed to process enrollment',
                details: error instanceof Error ? error.message : 'Unknown error',
                sessionId: session.id
            }, { status: 500 });
        }
    }

    // Log other webhook events but don't process
    console.log(`ℹ️ Webhook received: ${event.type} (not processed)`);
    return NextResponse.json({ received: true, type: event.type });
}

/**
 * Enhanced affiliate commission processing with comprehensive error handling
 * Updates affiliate stats using the model's refreshStats method for consistency
 */
async function processAffiliateCommission(enrollment: any, affiliateEmail: string) {
    try {
        console.log(`💰 Processing commission for affiliate: ${affiliateEmail}`);

        // Find affiliate by email
        const affiliate = await Affiliate.findOne({
            email: affiliateEmail.toLowerCase()
        });

        if (!affiliate) {
            console.log(`❌ Affiliate not found: ${affiliateEmail}`);
            console.log(`🔍 Available affiliates count: ${await Affiliate.countDocuments({})}`);
            return;
        }

        console.log(`✅ Found affiliate: ${affiliate.name} (${affiliate.email})`);

        // Calculate commission on commissionBaseAmount (amount user paid)
        // For full-price purchases: commissionBaseAmount = course price
        // For partial grants: commissionBaseAmount = discounted price user paid
        const commissionRate = affiliate.commissionRate || 10;
        const basePrice = enrollment.commissionBaseAmount || enrollment.originalAmount || enrollment.amount;
        const commissionAmount = Math.round((basePrice * commissionRate) / 100 * 100) / 100;

        console.log(`💰 Commission calculation: $${basePrice} (commission base) × ${commissionRate}% = $${commissionAmount}`);

        // Update enrollment with commission details
        const enrollmentUpdate = await Enrollment.findByIdAndUpdate(enrollment._id, {
            $set: {
                'affiliateData.commissionAmount': commissionAmount,
                'affiliateData.commissionRate': commissionRate,
                'affiliateData.commissionProcessed': true,
                'affiliateData.commissionProcessedAt': new Date()
            }
        }, { new: true });

        if (!enrollmentUpdate) {
            console.error(`❌ Failed to update enrollment with commission details: ${enrollment._id}`);
            return;
        }

        console.log(`✅ Updated enrollment ${enrollment._id} with commission: $${commissionAmount}`);

        // Use the model's refreshStats method for consistent calculation
        const updatedAffiliate = await affiliate.refreshStats();

        if (updatedAffiliate) {
            console.log(`✅ Affiliate stats refreshed for ${affiliateEmail}`);
            console.log(`📊 New stats: Referrals: ${updatedAffiliate.stats?.totalReferrals || 0}, Pending: $${updatedAffiliate.pendingCommissions || 0}`);

            // Additional verification - check if the enrollment was counted
            const affiliateEnrollmentCount = await Enrollment.countDocuments({
                status: 'paid',
                'affiliateData.affiliateEmail': affiliateEmail.toLowerCase()
            });

            console.log(`🔍 Verification: Total paid enrollments for ${affiliateEmail}: ${affiliateEnrollmentCount}`);

        } else {
            console.log(`⚠️ Failed to refresh affiliate stats for ${affiliateEmail}`);
        }

    } catch (error) {
        console.error(`⚠️ Commission processing failed for ${affiliateEmail}:`, error);
        console.error(`📋 Commission error details:`, {
            affiliateEmail,
            enrollmentId: enrollment._id,
            enrollmentAmount: enrollment.amount,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace'
        });

        // Log the error but don't fail the enrollment
        // This ensures payment processing continues even if affiliate tracking fails

        try {
            // Mark commission as failed for debugging
            await Enrollment.findByIdAndUpdate(enrollment._id, {
                $set: {
                    'affiliateData.commissionError': error instanceof Error ? error.message : 'Unknown error',
                    'affiliateData.commissionProcessed': false,
                    'affiliateData.commissionFailedAt': new Date()
                }
            });
        } catch (updateError) {
            console.error('❌ Failed to log commission error to enrollment:', updateError);
        }
    }
}
