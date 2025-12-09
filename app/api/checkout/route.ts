/**
 * ===============================
 * MAIN CHECKOUT API - PRODUCTION READY
 * ===============================
 * 
 * 
 
 * Clean, reliable checkout system with:
 * ✅ Database-first course lookup with static fallback
 * ✅ Grant coupon system (100% off) 
 * ✅ Affiliate tracking with commission calculation
 * ✅ Frappe LMS integration metadata
 * ✅ Clean error handling
 * ✅ No over-engineering
 * 
 * 



 * FLOW:
 * 1. Validate request & get course data
 * 2. Check for duplicate enrollment
 * 3. If coupon -> Process free enrollment
 * 4. If no coupon -> Process paid enrollment via Stripe
 * 5. Record affiliate tracking for both paths
 * 6. Return appropriate response
 */




import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getCourseFromDb } from '@/lib/services/course'
import connectToDatabase from '@/lib/db'
import { Course, Enrollment, Grant, Affiliate } from '@/lib/models'
import { sendEmail } from '@/lib/emails'
import { z } from 'zod'
import ProductionLogger from '@/lib/utils/production-logger'
import { checkoutRateLimit } from '@/lib/middleware/rateLimit'
import { calculateCommission } from '@/lib/services'

// ===== REQUEST VALIDATION =====
const checkoutSchema = z.object({
    courseId: z.string().min(1, 'Course ID is required'),
    email: z.string().email('Valid email required').toLowerCase().optional(),
    couponCode: z.string().optional(),
    affiliateEmail: z.string().email('Valid affiliate email required').toLowerCase().optional().or(z.literal('')),
    redirectSource: z.enum(['lms_redirect', 'direct', 'affiliate']).optional(),
    requestId: z.string().optional()
});

// ===== MAIN CHECKOUT HANDLER =====
export async function POST(request: NextRequest) {
    // Apply rate limiting
    const rateLimitResponse = await checkoutRateLimit(request);
    if (rateLimitResponse) {
        ProductionLogger.warn('Checkout rate limit exceeded', {
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
        });
        return rateLimitResponse;
    }

    try {
        // 1. Parse and validate request
        const body = await request.json();
        ProductionLogger.debug('Raw request body received', { hasBody: !!body });

        // 2. Transform and clean data before validation
        const cleanedBody = {
            ...body,
            email: body.email?.trim() || '',
            couponCode: body.couponCode?.trim() || '',
            affiliateEmail: body.affiliateEmail?.trim() || '',
            requestId: body.requestId?.trim() || ''
        };

        ProductionLogger.debug('Cleaned request body', { cleanedKeys: Object.keys(cleanedBody) });

        const validatedData = checkoutSchema.parse(cleanedBody);
        const { courseId, email, couponCode, affiliateEmail, redirectSource, requestId } = validatedData;

        // 3. Resolve final email with fallbacks
        const finalEmail = (email && email.trim()) || `temp_${Date.now()}@placeholder.com`;

        ProductionLogger.info('Processing checkout request', {
            courseId,
            hasEmail: !!finalEmail,
            hasCoupon: !!couponCode,
            hasAffiliate: !!affiliateEmail,
            requestId
        });

        // 2. Get course data (database first, static fallback)
        const course = await getCourseWithFallback(courseId);
        if (!course) {
            return NextResponse.json({
                error: 'Course not found',
                code: 'COURSE_NOT_FOUND',
                retryable: false // Don't retry non-existent courses
            }, { status: 404 });
        }

        // 3. Connect to database
        await connectToDatabase();

        // 4. Check for duplicate enrollment
        const existingEnrollment = await Enrollment.findOne({
            courseId: courseId,
            email: finalEmail.toLowerCase(),
            status: { $in: ['paid', 'pending'] }
        });

        if (existingEnrollment) {
            return NextResponse.json({
                error: 'Already enrolled in this course',
                code: 'DUPLICATE_ENROLLMENT',
                retryable: false, // Don't retry duplicate enrollments
                enrollmentId: existingEnrollment._id
            }, { status: 400 });
        }

        // 5. Validate affiliate if provided
        let affiliate = null;
        if (affiliateEmail && affiliateEmail !== '') {
            // Prevent self-referral: user cannot use their own affiliate email
            if (affiliateEmail.toLowerCase() === finalEmail.toLowerCase()) {
                ProductionLogger.warn('Self-referral attempt blocked', {
                    affiliateEmail,
                    userEmail: finalEmail
                });
                return NextResponse.json({
                    error: 'You cannot use your own email as an affiliate referral. If you are an affiliate, you can still enroll in courses - just leave the affiliate field empty.',
                    code: 'SELF_REFERRAL_NOT_ALLOWED',
                    retryable: false,
                    suggestions: [
                        'Leave the affiliate field empty to enroll normally',
                        'Use a different email if this is for someone else',
                        'Contact support if you need assistance'
                    ]
                }, { status: 400 });
            }

            affiliate = await Affiliate.findOne({
                email: affiliateEmail.toLowerCase(),
                status: 'active'
            });
            if (!affiliate) {
                ProductionLogger.warn('Invalid affiliate email provided', {
                    affiliateEmail
                });
                // Don't fail enrollment for invalid affiliate - just continue without tracking
                ProductionLogger.info('Continuing enrollment without affiliate tracking');
            } else {
                ProductionLogger.info('Valid affiliate found', {
                    affiliateName: affiliate.name,
                    affiliateEmail: affiliate.email
                });
            }
        }

        // 6. Route to appropriate enrollment type
        if (couponCode) {
            // No affiliate tracking for free enrollments - affiliates only earn from paid courses
            return await processCouponEnrollment({
                courseId, email: finalEmail, couponCode, course,
                redirectSource,
                affiliateEmail // Pass affiliate email for tracking but no commission
            });
        } else {
            // Affiliate tracking only for paid enrollments
            return await processStripeCheckout({
                courseId, email: finalEmail, course, affiliate,
                redirectSource
            });
        }

    } catch (error) {
        ProductionLogger.error('Checkout error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        if (error instanceof z.ZodError) {
            ProductionLogger.error('Validation details', {
                errors: error.errors
            });

            // Create user-friendly error messages
            const fieldErrors: Record<string, string> = {};
            error.errors.forEach(err => {
                const field = err.path.join('.');
                if (field === 'email') {
                    fieldErrors[field] = 'A valid email address is required';
                } else if (field === 'affiliateEmail') {
                    fieldErrors[field] = 'Please enter a valid affiliate email or leave empty';
                } else if (field === 'courseId') {
                    fieldErrors[field] = 'Course ID is required';
                } else {
                    fieldErrors[field] = err.message;
                }
            });

            return NextResponse.json({
                error: 'Please check the required fields and try again',
                code: 'VALIDATION_ERROR',
                retryable: false, // Don't retry validation errors
                details: error.errors,
                fieldErrors: fieldErrors,
                userMessage: 'Please fill in all required fields correctly'
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'An error occurred processing your request',
            code: 'CHECKOUT_ERROR',
            userMessage: 'Something went wrong. Please try again or contact support.'
        }, { status: 500 });
    }
}

// ===== COURSE RETRIEVAL WITH FALLBACK =====
async function getCourseWithFallback(courseId: string) {
    try {
        await connectToDatabase();

        // Try database first
        const dbCourse = await Course.findOne({
            courseId: courseId,
            isActive: true
        });

        if (dbCourse) {
            ProductionLogger.info('Course found in database', { courseId });
            return {
                courseId: dbCourse.courseId,
                title: dbCourse.title,
                description: dbCourse.description,
                price: dbCourse.price,
                duration: dbCourse.duration,
                level: dbCourse.level,
                image: dbCourse.image,
                features: dbCourse.features,
                totalEnrollments: dbCourse.totalEnrollments || 0,
                source: 'database'
            };
        }

        // Fallback to static data
        ProductionLogger.info('Course not in database, using static data');
        const staticCourse = await getCourseFromDb(courseId);
        if (staticCourse) {
            return { ...staticCourse, source: 'static' };
        }

        return null;
    } catch (error) {
        ProductionLogger.error('Database error, using static fallback', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return await getCourseFromDb(courseId);
    }
}

// ===== FREE ENROLLMENT PROCESSING =====
async function processCouponEnrollment(data: any) {
    const { courseId, email, couponCode, course, affiliateEmail } = data;

    ProductionLogger.info('Validating coupon', {
        couponCode: couponCode.toUpperCase(),
        email: email.toLowerCase(),
        courseId
    });

    // 1. Atomically reserve grant coupon to prevent race conditions
    const reservedGrant = await Grant.findOneAndUpdate(
        {
            couponCode: couponCode.toUpperCase(),
            status: 'approved',
            couponUsed: false,
            email: email.toLowerCase()
        },
        {
            $set: {
                couponUsed: true,
                couponUsedAt: new Date(),
                couponUsedBy: email.toLowerCase(),
                reservedAt: new Date()
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    ProductionLogger.info('Grant atomic reservation result', {
        found: reservedGrant ? 'RESERVED' : 'NOT AVAILABLE'
    });

    if (reservedGrant) {
        ProductionLogger.info('Grant successfully reserved', {
            id: reservedGrant._id,
            email: reservedGrant.email,
            couponCode: reservedGrant.couponCode,
            status: reservedGrant.status,
            couponUsed: reservedGrant.couponUsed,
            courseId: reservedGrant.courseId,
            discountPercentage: reservedGrant.discountPercentage || 100,
            requiresPayment: reservedGrant.requiresPayment || false
        });
    } else {
        // Debug: Let's see what grants exist for this user
        const userGrants = await Grant.find({ email: email.toLowerCase() });
        ProductionLogger.info('No matching grant found, checking user grants', {
            userGrantsCount: userGrants.length,
            userGrants: userGrants.map(g => ({
                id: g._id,
                couponCode: g.couponCode,
                status: g.status,
                couponUsed: g.couponUsed,
                email: g.email,
                discountPercentage: g.discountPercentage || 100
            }))
        });

        // Also check if coupon exists for any user
        const anyCoupon = await Grant.findOne({ couponCode: couponCode.toUpperCase() });
        ProductionLogger.info('Coupon exists for any user', {
            exists: anyCoupon ? 'YES' : 'NO'
        });
        if (anyCoupon) {
            ProductionLogger.info('Coupon details', {
                email: anyCoupon.email,
                status: anyCoupon.status,
                couponUsed: anyCoupon.couponUsed,
                discountPercentage: anyCoupon.discountPercentage || 100
            });
        }
    }

    if (!reservedGrant) {
        return NextResponse.json({
            error: 'Coupon is no longer available (already used or invalid)',
            code: 'COUPON_UNAVAILABLE',
            retryable: false,
            debug: {
                searchedFor: {
                    couponCode: couponCode.toUpperCase(),
                    email: email.toLowerCase(),
                    status: 'approved',
                    couponUsed: false
                }
            }
        }, { status: 400 });
    }

    // 2. Check for coupon expiration (if somehow an expired coupon got reserved)
    if (reservedGrant.couponMetadata?.expiresAt && new Date() > new Date(reservedGrant.couponMetadata.expiresAt)) {
        // Rollback the reservation since coupon is expired
        await Grant.findByIdAndUpdate(reservedGrant._id, {
            $unset: {
                couponUsed: 1,
                couponUsedAt: 1,
                couponUsedBy: 1,
                reservedAt: 1
            }
        });

        ProductionLogger.warn('Coupon expired after reservation, rolled back', {
            couponCode: couponCode.toUpperCase(),
            expiresAt: reservedGrant.couponMetadata.expiresAt,
            currentTime: new Date()
        });
        return NextResponse.json({
            error: 'This coupon has expired',
            code: 'COUPON_EXPIRED',
            retryable: false
        }, { status: 400 });
    }

    // 3. Calculate discount amounts
    const discountPercentage = reservedGrant.discountPercentage || 100;
    const originalPrice = course.price;
    const discountAmount = Math.round((originalPrice * discountPercentage) / 100 * 100) / 100;
    const finalPrice = Math.round((originalPrice - discountAmount) * 100) / 100;
    const requiresPayment = reservedGrant.requiresPayment || (discountPercentage < 100);

    ProductionLogger.info('Discount calculation', {
        originalPrice,
        discountPercentage,
        discountAmount,
        finalPrice,
        requiresPayment
    });

    // 4. Route to appropriate enrollment flow
    if (requiresPayment && finalPrice > 0) {
        // Partial discount - route to Stripe checkout with discounted price
        return await processPartialDiscountCheckout({
            ...data,
            grant: reservedGrant,
            originalPrice,
            finalPrice,
            discountPercentage,
            discountAmount
        });
    }

    // 5. Process free enrollment (100% discount)
    const enrollment = new Enrollment({
        courseId: courseId,
        email: email.toLowerCase(),
        paymentId: `free_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        amount: 0,
        status: 'paid',
        enrollmentType: 'free_grant',
        timestamp: new Date().toISOString(),

        // LMS integration data
        lmsContext: {
            frappeUsername: data.username || email.split('@')[0],
            frappeEmail: email,
            redirectSource: data.affiliateEmail ? 'affiliate' : data.redirectSource || 'direct'
        },

        // Grant data with enhanced discount tracking
        grantData: {
            grantId: reservedGrant._id,
            couponCode: couponCode.toUpperCase(),
            grantVerified: true,
            discountPercentage: discountPercentage,
            originalPrice: originalPrice,
            finalPrice: finalPrice,
            discountAmount: discountAmount
        },

        // Track referral source for free enrollments (no commission but track referral)
        referralSource: data.affiliateEmail ? 'affiliate_link' : 'direct',
        hasReferral: !!data.affiliateEmail,

        // Payment method
        paymentMethod: 'grant_coupon',

        // Verification
        verification: {
            paymentVerified: true,
            courseEligible: true,
            grantVerified: true
        },

        // Metadata
        metadata: {
            source: 'checkout_api',
            userAgent: 'web',
            createdAt: new Date(),
            discountType: 'full_grant'
        }
    });

    // Save enrollment with rollback on failure
    let savedEnrollment;
    try {
        savedEnrollment = await enrollment.save();
        ProductionLogger.info('Free enrollment created', {
            enrollmentId: savedEnrollment._id,
            discountPercentage,
            finalPrice
        });
    } catch (enrollmentError) {
        // Rollback coupon reservation if enrollment creation fails
        await Grant.findByIdAndUpdate(reservedGrant._id, {
            $unset: {
                couponUsed: 1,
                couponUsedAt: 1,
                couponUsedBy: 1,
                reservedAt: 1
            }
        });

        ProductionLogger.error('Enrollment creation failed, rolled back coupon reservation', {
            error: enrollmentError instanceof Error ? enrollmentError.message : 'Unknown error',
            grantId: reservedGrant._id
        });

        throw enrollmentError;
    }

    // 6. Link enrollment ID to the reserved grant (coupon already marked as used atomically)
    await Grant.findByIdAndUpdate(reservedGrant._id, {
        enrollmentId: savedEnrollment._id
    });
    ProductionLogger.info('Grant linked to enrollment');

    // Helper function to rollback grant reservation
    const rollbackGrantReservation = async () => {
        try {
            await Grant.findByIdAndUpdate(reservedGrant._id, {
                $unset: {
                    couponUsed: 1,
                    couponUsedAt: 1,
                    couponUsedBy: 1,
                    reservedAt: 1,
                    enrollmentId: 1
                }
            });
            ProductionLogger.warn('Grant reservation rolled back', {
                grantId: reservedGrant._id,
                couponCode: reservedGrant.couponCode
            });
        } catch (rollbackError) {
            ProductionLogger.error('Failed to rollback grant reservation', {
                grantId: reservedGrant._id,
                error: rollbackError instanceof Error ? rollbackError.message : 'Unknown'
            });
        }
    };

    // 6.5. ===== SEND GRANT ENROLLMENT EMAIL (IMMEDIATELY AFTER ENROLLMENT) =====
    // Send email BEFORE Frappe sync to ensure users always get confirmation
    try {
        await sendEmail.grantCourseEnrollment(
            email.toLowerCase(),
            email.split('@')[0],
            course.title,
            new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            originalPrice
        );
        ProductionLogger.info('Grant enrollment confirmation email sent', {
            email: email.toLowerCase(),
            courseId: courseId
        });
    } catch (emailError) {
        ProductionLogger.error('Failed to send grant enrollment email', {
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            email: email.toLowerCase()
        });
        // Don't fail enrollment if email fails - enrollment was successful
    }

    // 6.6. ===== FRAPPE LMS INTEGRATION =====
    // Enroll in FrappeLMS immediately for free enrollments
    try {
        ProductionLogger.info('Enrolling in FrappeLMS (free enrollment)');

        const { enrollInFrappeLMS } = await import('@/lib/services/frappeLMS');

        const frappeResult = await enrollInFrappeLMS({
            user_email: email.toLowerCase(),
            course_id: courseId,
            paid_status: true, // Free enrollment is still "paid" (100% discount)
            payment_id: savedEnrollment.paymentId,
            amount: 0,
            currency: 'USD',
            referral_code: data.affiliateEmail || undefined
        });

        if (frappeResult.success) {
            await Enrollment.findByIdAndUpdate(savedEnrollment._id, {
                $set: {
                    'frappeSync.synced': true,
                    'frappeSync.syncStatus': 'success',
                    'frappeSync.enrollmentId': frappeResult.enrollment_id,
                    'frappeSync.syncCompletedAt': new Date(),
                    'frappeSync.lastSyncAttempt': new Date(),
                    'frappeSync.retryCount': 0
                }
            });
            ProductionLogger.info('FrappeLMS enrollment successful (free)', {
                enrollmentId: frappeResult.enrollment_id
            });
        } else {
            // Queue for background retry instead of blocking user (improved UX)
            ProductionLogger.warn('First Frappe attempt failed, queuing for immediate background retry...', {
                error: frappeResult.error
            });

            const { RetryJob } = await import('@/lib/models/retry-job');
            const retryJob = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId: savedEnrollment._id,
                payload: {
                    user_email: email.toLowerCase(),
                    course_id: courseId,
                    paid_status: true,
                    payment_id: savedEnrollment.paymentId,
                    amount: 0,
                    currency: 'USD',
                    referral_code: data.affiliateEmail || undefined,
                    enrollmentType: 'free_grant'
                },
                nextRetryAt: new Date(Date.now() + 5000), // Retry in 5 seconds
                maxAttempts: 5 // Explicit retry limit
            });

            await Enrollment.findByIdAndUpdate(savedEnrollment._id, {
                $set: {
                    'frappeSync.synced': false,
                    'frappeSync.syncStatus': 'retrying',
                    'frappeSync.errorMessage': frappeResult.error,
                    'frappeSync.lastSyncAttempt': new Date(),
                    'frappeSync.retryJobId': retryJob._id,
                    'frappeSync.retryCount': 1
                }
            });

            ProductionLogger.info('Free enrollment queued for background retry', {
                retryJobId: retryJob._id,
                enrollmentId: savedEnrollment._id,
                nextRetryAt: retryJob.nextRetryAt
            });

            // Don't block user - return success, background retry will complete enrollment
        }
    } catch (frappeError) {
        ProductionLogger.error('FrappeLMS error (free enrollment)', {
            error: frappeError instanceof Error ? frappeError.message : 'Unknown error',
            stack: frappeError instanceof Error ? frappeError.stack : undefined,
            enrollmentId: savedEnrollment._id
        });

        // Queue for background retry on exception
        try {
            const { RetryJob } = await import('@/lib/models/retry-job');
            const retryJob = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId: savedEnrollment._id,
                payload: {
                    user_email: email.toLowerCase(),
                    course_id: courseId,
                    paid_status: true,
                    payment_id: savedEnrollment.paymentId,
                    amount: 0,
                    currency: 'USD',
                    referral_code: data.affiliateEmail || undefined
                },
                nextRetryAt: new Date(Date.now() + 2 * 60 * 1000)
            });

            await Enrollment.findByIdAndUpdate(savedEnrollment._id, {
                $set: {
                    'frappeSync.synced': false,
                    'frappeSync.syncStatus': 'retrying',
                    'frappeSync.errorMessage': frappeError instanceof Error ? frappeError.message : 'Exception during enrollment',
                    'frappeSync.lastSyncAttempt': new Date(),
                    'frappeSync.retryJobId': retryJob._id
                }
            });

            ProductionLogger.info('Queued failed free enrollment for retry', {
                retryJobId: retryJob._id,
                enrollmentId: savedEnrollment._id
            });
        } catch (retryCreateError) {
            ProductionLogger.error('Failed to queue retry job for free enrollment', {
                error: retryCreateError instanceof Error ? retryCreateError.message : 'Unknown error',
                enrollmentId: savedEnrollment._id
            });
            // Don't fail the free enrollment completely - user can use manual retry
        }
    }
    // ===== END FRAPPE LMS INTEGRATION =====

    // 7. Update course enrollment count only (enrolledUsers removed - use fullEnrollments virtual)
    if (course.source === 'database') {
        await Course.findOneAndUpdate(
            { courseId: courseId },
            { $inc: { totalEnrollments: 1 } }
        );
        ProductionLogger.info('Course stats updated', { courseId });
    }

    ProductionLogger.info('Free enrollment completed', {
        enrollmentId: savedEnrollment._id,
        discountApplied: `${discountPercentage}%`
    });

    return NextResponse.json({
        success: true,
        directEnrollment: true,
        enrollmentId: savedEnrollment._id.toString(),
        course: {
            title: course.title,
            enrollmentType: 'free_grant'
        },
        redirectUrl: `/success?type=free&course=${encodeURIComponent(course.title)}&enrollmentId=${savedEnrollment._id}`
    });
}

// ===== PAID ENROLLMENT PROCESSING =====
async function processStripeCheckout(data: any) {
    const { courseId, email, course, affiliate } = data;

    // 1. Create pending enrollment record
    const enrollment = new Enrollment({
        courseId: courseId,
        email: email.toLowerCase(),
        paymentId: `PENDING_${Date.now()}`,
        amount: course.price,
        status: 'pending',
        enrollmentType: 'paid_stripe',

        // LMS integration data
        lmsContext: {
            frappeUsername: data.username || email.split('@')[0],
            frappeEmail: email,
            redirectSource: affiliate ? 'affiliate' : data.redirectSource || 'direct'
        },

        // Affiliate data (if applicable)
        affiliateData: affiliate ? {
            affiliateEmail: affiliate.email,
            commissionEligible: true,
            commissionRate: affiliate.commissionRate || 10,
            commissionAmount: calculateCommission(course.price, affiliate.commissionRate || 10),
            referralSource: 'affiliate_link'
        } : null,

        // Commission base amount for accurate calculations
        originalAmount: course.price,
        commissionBaseAmount: course.price,

        // Set correct referral tracking for affiliate enrollments
        referralSource: affiliate ? 'affiliate_link' : 'direct',
        hasReferral: !!affiliate,

        // Metadata
        metadata: {
            source: 'checkout_api',
            userAgent: 'web',
            createdAt: new Date()
        }
    });

    const savedEnrollment = await enrollment.save();

    // 2. Record affiliate activity immediately for tracking (even for pending payments)
    if (affiliate) {
        const commissionAmount = calculateCommission(course.price, affiliate.commissionRate || 10);
        ProductionLogger.info('Recording affiliate activity', {
            affiliateEmail: affiliate.email,
            commissionAmount: commissionAmount
        });
        // Note: Affiliate stats will be updated by webhook when payment completes
        // Just log the activity here for tracking pending enrollments
    }

    // 3. Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: course.title,
                    description: course.description,
                    images: course.image ? [course.image] : undefined,
                },
                unit_amount: Math.round(course.price * 100), // Convert to cents
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel?enrollment_id=${savedEnrollment._id}`,
        customer_email: email,
        metadata: {
            courseId: courseId,
            email: email,
            enrollmentId: savedEnrollment._id.toString(),
            affiliateEmail: affiliate?.email || '',
            redirectSource: data.redirectSource
        }
    });

    // 3. Update enrollment with Stripe session ID
    await Enrollment.findByIdAndUpdate(savedEnrollment._id, {
        stripeSessionId: session.id,
        paymentId: `STRIPE_${session.id}`
    });

    ProductionLogger.info('Stripe session created', { sessionId: session.id });

    return NextResponse.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        enrollmentId: savedEnrollment._id.toString(),
        course: {
            title: course.title,
            price: course.price
        }
    });
}

// ===== AFFILIATE ACTIVITY TRACKING =====
async function recordAffiliateActivity(affiliateEmail: string, action: string, enrollmentId: string, amount: number) {
    try {
        ProductionLogger.info('Recording affiliate activity', {
            affiliateEmail,
            action,
            enrollmentId,
            amount
        });

        // Update affiliate stats
        const affiliate = await Affiliate.findOne({ email: affiliateEmail.toLowerCase() });
        if (affiliate) {
            ProductionLogger.info('Found affiliate, current stats', {
                affiliateName: affiliate.name,
                totalReferrals: affiliate.stats?.totalReferrals || 0,
                pendingCommissions: affiliate.pendingCommissions || 0,
                totalPaid: affiliate.totalPaid || 0
            });

            const updatedAffiliate = await affiliate.refreshStats(); // Uses existing method

            ProductionLogger.info('Updated affiliate stats', {
                affiliateEmail,
                newTotalReferrals: updatedAffiliate?.stats?.totalReferrals || 0,
                newPendingCommissions: updatedAffiliate?.pendingCommissions || 0,
                newTotalPaid: updatedAffiliate?.totalPaid || 0
            });
        } else {
            ProductionLogger.warn('Affiliate not found', { affiliateEmail });
            // Let's see if affiliate exists with different casing
            const anyAffiliate = await Affiliate.findOne({
                email: { $regex: new RegExp(`^${affiliateEmail}$`, 'i') }
            });
            if (anyAffiliate) {
                ProductionLogger.info('Found affiliate with different casing', {
                    searchedEmail: affiliateEmail,
                    actualEmail: anyAffiliate.email
                });
            } else {
                ProductionLogger.warn('No affiliate found with any casing', { affiliateEmail });
            }
        }

    } catch (error) {
        ProductionLogger.error('Error recording affiliate activity', {
            affiliateEmail,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
    }
}

// ===== PARTIAL DISCOUNT CHECKOUT PROCESSING =====
async function processPartialDiscountCheckout(data: any) {
    const {
        courseId, email, course, affiliateEmail, grant,
        originalPrice, finalPrice, discountPercentage, discountAmount
    } = data;

    ProductionLogger.info('Processing partial discount checkout', {
        originalPrice,
        finalPrice,
        discountPercentage,
        grantId: grant._id
    });

    // 1. ATOMIC COUPON RESERVATION - prevent duplicate usage
    const reservedGrant = await Grant.findOneAndUpdate(
        {
            _id: grant._id,
            status: 'approved',
            couponUsed: false,
            email: email.toLowerCase()
        },
        {
            $set: {
                couponUsed: true,
                couponUsedAt: new Date(),
                couponUsedBy: email.toLowerCase(),
                reservedAt: new Date()
            }
        },
        { new: true }
    );

    if (!reservedGrant) {
        ProductionLogger.warn('Partial grant coupon already used or unavailable', {
            grantId: grant._id,
            email
        });
        return NextResponse.json({
            error: 'This coupon has already been used or is no longer available',
            code: 'COUPON_UNAVAILABLE',
            retryable: false
        }, { status: 400 });
    }

    ProductionLogger.info('Partial grant coupon atomically reserved', {
        grantId: reservedGrant._id,
        email
    });

    // 2. Find or create affiliate for commission tracking
    let affiliate = null;
    if (affiliateEmail && affiliateEmail !== '') {
        affiliate = await Affiliate.findOne({
            email: affiliateEmail.toLowerCase(),
            status: 'active'
        });
        if (affiliate) {
            ProductionLogger.info('Valid affiliate found for partial discount', {
                affiliateName: affiliate.name,
                affiliateEmail: affiliate.email
            });
        }
    }

    // 2. Create pending enrollment record for partial discount
    const enrollment = new Enrollment({
        courseId: courseId,
        email: email.toLowerCase(),
        paymentId: `PARTIAL_PENDING_${Date.now()}`,
        amount: finalPrice, // Discounted amount to pay
        status: 'pending',
        enrollmentType: 'partial_grant',

        // LMS integration data
        lmsContext: {
            frappeUsername: data.username || email.split('@')[0],
            frappeEmail: email,
            redirectSource: affiliate ? 'affiliate' : data.redirectSource || 'direct'
        },

        // Enhanced grant data for partial discounts
        grantData: {
            grantId: reservedGrant._id,
            couponCode: reservedGrant.couponCode,
            grantVerified: true,
            discountPercentage: discountPercentage,
            originalPrice: originalPrice,
            finalPrice: finalPrice,
            discountAmount: discountAmount,
            grantType: 'partial'
        },

        // Affiliate data (if applicable) - commission on amount user actually pays
        affiliateData: affiliate ? {
            affiliateEmail: affiliate.email,
            commissionEligible: true,
            commissionRate: affiliate.commissionRate || 10,
            commissionAmount: Math.round((finalPrice * (affiliate.commissionRate || 10)) / 100 * 100) / 100,
            referralSource: 'affiliate_link'
        } : null,

        // Store both amounts for tracking
        originalAmount: originalPrice,
        commissionBaseAmount: finalPrice, // Commission on amount user pays, not original price

        // Set referral tracking
        referralSource: affiliate ? 'affiliate_link' : 'direct',
        hasReferral: !!affiliate,

        // Payment method
        paymentMethod: 'partial_grant_stripe',

        // Metadata
        metadata: {
            source: 'checkout_api',
            userAgent: 'web',
            createdAt: new Date(),
            discountType: 'partial_grant'
        }
    });

    const savedEnrollment = await enrollment.save();

    // 3. Create Stripe checkout session with discounted price (with rollback on failure)
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${course.title} (${discountPercentage}% Grant Discount Applied)`,
                        description: `Original Price: $${originalPrice} | Discount: ${discountPercentage}% ($${discountAmount}) | Final Price: $${finalPrice}`,
                        images: course.image ? [course.image] : undefined,
                    },
                    unit_amount: Math.round(finalPrice * 100), // Convert to cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}&grant_discount=${discountPercentage}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel?enrollment_id=${savedEnrollment._id}`,
            customer_email: email,
            metadata: {
                courseId: courseId,
                email: email,
                enrollmentId: savedEnrollment._id.toString(),
                affiliateEmail: affiliate?.email || '',
                redirectSource: data.redirectSource,
                grantId: String(reservedGrant._id),
                discountPercentage: discountPercentage.toString(),
                originalPrice: originalPrice.toString(),
                finalPrice: finalPrice.toString(),
                enrollmentType: 'partial_grant'
            }
        });

        // 4. Update enrollment with Stripe session ID
        await Enrollment.findByIdAndUpdate(savedEnrollment._id, {
            stripeSessionId: session.id,
            paymentId: `STRIPE_PARTIAL_${session.id}`
        });

        ProductionLogger.info('Partial discount Stripe session created', {
            sessionId: session.id,
            originalPrice,
            finalPrice,
            discountPercentage
        });

        return NextResponse.json({
            checkoutUrl: session.url,
            sessionId: session.id,
            enrollmentId: savedEnrollment._id.toString(),
            course: {
                title: course.title,
                originalPrice: originalPrice,
                finalPrice: finalPrice,
                discountPercentage: discountPercentage,
                discountAmount: discountAmount
            },
            grant: {
                couponCode: reservedGrant.couponCode,
                grantType: 'partial'
            }
        });

    } catch (stripeError) {
        // ROLLBACK: Release grant coupon reservation
        ProductionLogger.error('Stripe session creation failed, initiating rollback', {
            error: stripeError instanceof Error ? stripeError.message : 'Unknown',
            grantId: reservedGrant._id,
            enrollmentId: savedEnrollment._id
        });

        try {
            // Rollback grant reservation atomically
            await Grant.findByIdAndUpdate(reservedGrant._id, {
                $unset: {
                    couponUsed: 1,
                    couponUsedAt: 1,
                    couponUsedBy: 1,
                    reservedAt: 1
                }
            });

            // Delete pending enrollment record
            await Enrollment.findByIdAndDelete(savedEnrollment._id);

            ProductionLogger.info('Rollback completed successfully', {
                grantId: reservedGrant._id,
                couponCode: reservedGrant.couponCode
            });
        } catch (rollbackError) {
            // Log rollback failure but don't expose to user
            ProductionLogger.error('Rollback failed - manual intervention required', {
                grantId: reservedGrant._id,
                enrollmentId: savedEnrollment._id,
                originalError: stripeError instanceof Error ? stripeError.message : 'Unknown',
                rollbackError: rollbackError instanceof Error ? rollbackError.message : 'Unknown'
            });
        }

        // Return user-friendly error
        return NextResponse.json({
            error: 'Unable to create payment session. Please try again.',
            code: 'STRIPE_SESSION_FAILED',
            retryable: true,
            details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'Simple Checkout API',
        version: '1.0',
        endpoints: {
            POST: 'Process course enrollment (free coupon or paid Stripe)'
        }
    });
}
