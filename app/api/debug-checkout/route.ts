import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Course, Grant } from '@/lib/models';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
    const results: any = {
        timestamp: new Date().toISOString(),
        checks: {}
    };

    // 1. Check Database Connection
    try {
        await connectToDatabase();
        results.checks.database = { status: '✅ Connected', error: null };
    } catch (error) {
        results.checks.database = {
            status: '❌ Failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        };
    }

    // 2. Check Stripe Initialization
    try {
        if (!stripe) {
            throw new Error('Stripe not initialized');
        }
        // Try to retrieve account info to verify API key works
        await stripe.balance.retrieve();
        results.checks.stripe = { status: '✅ Initialized and API key valid', error: null };
    } catch (error) {
        results.checks.stripe = {
            status: '❌ Failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        };
    }

    // 3. Check Course Model and Data
    try {
        const course = await Course.findOne({ courseId: 'block-chain-basics' });
        if (!course) {
            results.checks.course = { status: '❌ Course not found', error: 'Course "block-chain-basics" does not exist' };
        } else {
            results.checks.course = {
                status: '✅ Found',
                data: {
                    courseId: course.courseId,
                    title: course.title,
                    price: course.price,
                    priceType: typeof course.price,
                    hasPrice: !!course.price,
                    priceValue: course.price
                },
                error: null
            };
        }
    } catch (error) {
        results.checks.course = {
            status: '❌ Failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        };
    }

    // 4. Check Grant Model and Data
    try {
        const grant = await Grant.findOne({
            couponCode: 'GRANT50-MJ1BALOG-Y1GM',
            email: 'dofopix210@crsay.com'
        });
        if (!grant) {
            results.checks.grant = { status: '⚠️ Grant not found', error: 'No grant found for this coupon and email' };
        } else {
            results.checks.grant = {
                status: '✅ Found',
                data: {
                    _id: grant._id,
                    couponCode: grant.couponCode,
                    email: grant.email,
                    status: grant.status,
                    couponUsed: grant.couponUsed,
                    requiresPayment: grant.requiresPayment,
                    discountPercentage: grant.discountPercentage,
                    courseId: grant.courseId,
                    reservedAt: grant.reservedAt,
                    reservedBy: grant.reservedBy,
                    reservationExpiry: grant.reservationExpiry
                },
                error: null
            };
        }
    } catch (error) {
        results.checks.grant = {
            status: '❌ Failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        };
    }

    // 5. Check Environment Variables
    results.checks.environment = {
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasMongoUri: !!process.env.MONGODB_URI,
        hasNextPublicSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
        nodeEnv: process.env.NODE_ENV
    };

    return NextResponse.json(results, { status: 200 });
}
