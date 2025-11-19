import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Enrollment } from '@/lib/models';

/**
 * Get user enrollments
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({
                error: 'Email parameter is required'
            }, { status: 400 });
        }

        await connectToDatabase();

        const enrollments = await Enrollment.find({
            email: email.toLowerCase(),
            status: 'paid'
        }).sort({ createdAt: -1 });

        return NextResponse.json({
            success: true,
            email: email.toLowerCase(),
            enrollments: enrollments.map(e => ({
                id: e._id,
                courseId: e.courseId,
                paymentId: e.paymentId,
                amount: e.amount,
                status: e.status,
                enrollmentType: e.enrollmentType,
                couponCode: e.couponCode || null,
                enrolledAt: e.createdAt,
                lmsUsername: e.lmsContext?.frappeUsername || null,
                accessLevel: e.verification?.accessLevel || 'verified'
            }))
        });

    } catch (error) {
        console.error('❌ Get enrollments error:', error);
        return NextResponse.json({
            error: 'Failed to fetch enrollments'
        }, { status: 500 });
    }
}
