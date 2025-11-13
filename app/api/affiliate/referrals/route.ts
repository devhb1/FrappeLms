/**
 * ===============================
 * AFFILIATE REFERRALS & ACTIVITY API
 * ===============================
 * 
 * Consolidated endpoint for affiliate enrollment data including:
 * - Customer details and purchase information
 * - Commission amounts and status
 * - Recent activity tracking
 * - Filtering and pagination options
 * 
 * Query parameters:
 * - limit: number of results per page (default: 20)
 * - page: page number for pagination (default: 1)
 * - view: 'referrals' (detailed) or 'activity' (summary) format
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Affiliate } from '@/lib/models/affiliate';
import { Enrollment } from '@/lib/models/enrollment';
import { Course } from '@/lib/models/course';

export async function GET(request: NextRequest) {
    try {
        // ===== AUTHENTICATION =====
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectToDatabase();

        // ===== PARSE QUERY PARAMETERS =====
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const page = parseInt(searchParams.get('page') || '1');
        const view = searchParams.get('view') || 'referrals'; // 'referrals' or 'activity'

        // ===== FIND AFFILIATE =====
        const affiliate = await Affiliate.findOne({
            email: session.user.email.toLowerCase()
        });

        if (!affiliate) {
            return NextResponse.json(
                {
                    error: 'Affiliate account not found',
                    enrollments: [],
                    activities: [],
                    totalCount: 0
                },
                { status: 200 } // Return 200 with empty data instead of 404
            );
        }

        // ===== FETCH ENROLLMENTS =====
        const skip = (page - 1) * limit;

        const [enrollments, totalCount] = await Promise.all([
            Enrollment.find({
                'affiliateData.affiliateEmail': affiliate.email.toLowerCase(),
                status: 'paid'
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Enrollment.countDocuments({
                'affiliateData.affiliateEmail': affiliate.email.toLowerCase(),
                status: 'paid'
            })
        ]);

        // ===== GET COURSE DETAILS =====
        const courseIds = [...new Set(enrollments.map(e => e.courseId))];
        const courses = await Course.find({
            courseId: { $in: courseIds }
        }).lean();

        const courseMap = new Map();
        courses.forEach(course => {
            courseMap.set(course.courseId, course);
        });

        // ===== FORMAT RESPONSE BASED ON VIEW =====
        let responseData;

        if (view === 'activity') {
            // Activity view: simplified format for recent activity
            const activities = enrollments.map((enrollment, index) => {
                const course = courseMap.get(enrollment.courseId);
                return {
                    _id: enrollment._id.toString(),
                    serialNo: skip + index + 1,
                    courseName: course?.title || 'Unknown Course',
                    commission: enrollment.affiliateData?.commissionAmount || 0,
                    purchaseDate: enrollment.createdAt?.toISOString() || new Date().toISOString(),
                    customerEmail: enrollment.email || 'Unknown',
                    enrollmentId: enrollment._id.toString()
                };
            });

            responseData = {
                success: true,
                activities,
                totalCount,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit)
                }
            };
        } else {
            // Referrals view: detailed format for referral management
            const referrals = enrollments.map(enrollment => ({
                _id: enrollment._id,
                email: enrollment.email,
                courseId: enrollment.courseId,
                courseName: courseMap.get(enrollment.courseId)?.title || 'Unknown Course',
                amount: enrollment.amount,
                commission: enrollment.affiliateData?.commissionAmount || 0,
                createdAt: enrollment.createdAt,
                status: enrollment.status
            }));

            responseData = {
                success: true,
                enrollments: referrals,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit)
                }
            };
        }

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('❌ Error fetching affiliate referrals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch affiliate referrals' },
            { status: 500 }
        );
    }
}
