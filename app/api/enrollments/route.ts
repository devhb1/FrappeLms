import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/db'
import { Enrollment } from '@/lib/models'

export async function GET(request: NextRequest) {
    try {
        await connectToDatabase()

        // Parse query parameters for filtering
        const { searchParams } = new URL(request.url)
        const email = searchParams.get('email')
        const courseId = searchParams.get('courseId')
        const paymentId = searchParams.get('paymentId')
        const status = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '10')
        const enrollmentType = searchParams.get('enrollmentType')

        // Build query for flexible filtering (for Frappe LMS consumption)
        const query: any = {}
        if (email) query.email = email.toLowerCase()
        if (courseId) query.courseId = courseId
        if (paymentId) query.paymentId = paymentId
        if (status) query.status = status
        if (enrollmentType) query.enrollmentType = enrollmentType

        // Get enrollments with enhanced data
        const enrollments = await Enrollment.find(query)
            .populate('grantData.grantId', 'name couponCode status')
            .sort({ createdAt: -1 })
            .limit(Math.min(limit, 50)) // Max 50 results
            .lean()

        console.log(`Found ${enrollments.length} enrollments for query:`, query)

        // Format response for Frappe LMS consumption
        const formattedEnrollments = enrollments.map(enrollment => ({
            // Core enrollment data
            id: enrollment._id,
            courseId: enrollment.courseId,
            email: enrollment.email,
            paymentId: enrollment.paymentId,
            amount: enrollment.amount,
            status: enrollment.status,
            timestamp: enrollment.timestamp,
            createdAt: enrollment.createdAt,

            // Enhanced enrollment context
            enrollmentType: enrollment.enrollmentType || 'paid_stripe',

            // LMS context for Frappe LMS decision making
            lmsContext: enrollment.lmsContext || {
                frappeUsername: enrollment.email?.split('@')[0],
                frappeEmail: enrollment.email,
                redirectSource: 'direct'
            },

            // Affiliate data (for frontend analytics, not Frappe LMS)
            affiliateData: enrollment.affiliateData ? {
                affiliateEmail: enrollment.affiliateData.affiliateEmail,
                referralSource: enrollment.affiliateData.referralSource,
                commissionEligible: enrollment.affiliateData.commissionEligible,
                referralTimestamp: enrollment.affiliateData.referralTimestamp
            } : null,

            // Grant/coupon verification
            grantData: enrollment.grantData ? {
                grantId: enrollment.grantData.grantId,
                couponCode: enrollment.grantData.couponCode,
                approvalDate: enrollment.grantData.approvalDate,
                grantVerified: enrollment.grantData.grantVerified
            } : null,

            // Verification data for Frappe LMS access decisions
            verification: {
                paymentVerified: enrollment.verification?.paymentVerified ?? (enrollment.status === 'paid'),
                courseEligible: enrollment.verification?.courseEligible ?? true,
                accessLevel: enrollment.verification?.accessLevel || 'verified',
                stripePaymentId: enrollment.verification?.stripePaymentId ||
                    (enrollment.paymentId?.startsWith('pi_') ? enrollment.paymentId : null),
                grantVerified: enrollment.verification?.grantVerified ?? (!!enrollment.grantData?.grantVerified),

                // Overall recommendation for Frappe LMS
                recommendation: getAccessRecommendation(enrollment)
            },

            // Enhanced affiliate data structure
            ...(enrollment.affiliateData?.affiliateEmail && {
                affiliateEmail: enrollment.affiliateData.affiliateEmail,
                hasAffiliate: true
            })
        }))

        return NextResponse.json({
            success: true,
            count: formattedEnrollments.length,
            query: { email, courseId, paymentId, status, enrollmentType, limit },
            enrollments: formattedEnrollments,
            metadata: {
                generatedAt: new Date().toISOString(),
                version: '2.0',
                totalResults: formattedEnrollments.length
            }
        })
    } catch (error) {
        console.error('Error fetching enrollments:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch enrollments',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        )
    }
}

/**
 * Generate access recommendation for Frappe LMS
 */
function getAccessRecommendation(enrollment: any): 'grant_access' | 'manual_review' | 'deny_access' {
    // Paid enrollments with verified payment
    if (enrollment.status === 'paid' && enrollment.amount > 0) {
        return 'grant_access'
    }

    // Free grant enrollments with verified coupon
    if (enrollment.status === 'paid' && enrollment.amount === 0 && enrollment.grantData?.grantVerified) {
        return 'grant_access'
    }

    // Free enrollments without grant verification
    if (enrollment.amount === 0 && !enrollment.grantData?.grantVerified) {
        return 'manual_review'
    }

    // Pending or failed payments
    if (enrollment.status !== 'paid') {
        return 'deny_access'
    }

    // Default to manual review for edge cases
    return 'manual_review'
}
