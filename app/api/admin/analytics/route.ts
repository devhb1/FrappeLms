import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { User, Course, Grant, Affiliate, Enrollment } from '@/lib/models';

/**
 * ===============================
 * ADMIN ANALYTICS API - MVP
 * ===============================
 * 
 * GET: Dashboard metrics for admin
 * - Total users, revenue, courses, affiliates
 * - Recent activity summary
 * - Simple metrics only
 */

export async function GET(request: NextRequest) {
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

        // Get current date for time-based calculations
        const now = new Date();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 1. USER METRICS
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: monthAgo }
        });

        // 2. REVENUE METRICS
        const totalRevenueResult = await User.aggregate([
            { $group: { _id: null, total: { $sum: '$totalSpent' } } }
        ]);
        const totalRevenue = totalRevenueResult[0]?.total || 0;

        const monthlyRevenueResult = await User.aggregate([
            { $unwind: '$purchasedCourses' },
            { $match: { 'purchasedCourses.enrolledAt': { $gte: monthAgo } } },
            { $group: { _id: null, total: { $sum: '$purchasedCourses.amount' } } }
        ]);
        const revenueThisMonth = monthlyRevenueResult[0]?.total || 0;

        // 3. COURSE METRICS
        const totalCourses = await Course.countDocuments({ isActive: true });
        const totalEnrollments = await Course.aggregate([
            { $group: { _id: null, total: { $sum: '$totalEnrollments' } } }
        ]);
        const totalEnrollmentsCount = totalEnrollments[0]?.total || 0;

        // 4. GRANT METRICS
        const totalGrants = await Grant.countDocuments();
        const pendingGrants = await Grant.countDocuments({ status: 'pending' });
        const approvedGrants = await Grant.countDocuments({ status: 'approved' });
        const rejectedGrants = await Grant.countDocuments({ status: 'rejected' });

        // 5. AFFILIATE METRICS
        const totalAffiliates = await Affiliate.countDocuments();
        const activeAffiliates = await Affiliate.countDocuments({ status: 'active' });

        // Get total affiliate-driven revenue
        const affiliateRevenueResult = await Enrollment.aggregate([
            { $match: { 'affiliateData.affiliateEmail': { $exists: true, $ne: '' }, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const affiliateRevenue = affiliateRevenueResult[0]?.total || 0;

        // 6. RECENT ACTIVITY (last 10 items)
        const recentUsers = await User.find()
            .select('email username createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentGrants = await Grant.find()
            .select('name email courseId status createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const recentPurchases = await User.aggregate([
            { $unwind: '$purchasedCourses' },
            { $sort: { 'purchasedCourses.enrolledAt': -1 } },
            { $limit: 5 },
            {
                $project: {
                    email: 1,
                    courseTitle: '$purchasedCourses.title',
                    amount: '$purchasedCourses.amount',
                    enrolledAt: '$purchasedCourses.enrolledAt'
                }
            }
        ]);

        // 7. TOP PERFORMING COURSES
        const topCourses = await Course.find({ isActive: true })
            .select('title totalEnrollments')
            .sort({ totalEnrollments: -1 })
            .limit(5)
            .lean();

        return NextResponse.json({
            // Summary metrics
            metrics: {
                users: {
                    total: totalUsers,
                    admins: totalAdmins,
                    verified: verifiedUsers,
                    newThisMonth: newUsersThisMonth
                },
                revenue: {
                    total: Math.round(totalRevenue),
                    thisMonth: Math.round(revenueThisMonth),
                    affiliate: Math.round(affiliateRevenue)
                },
                courses: {
                    total: totalCourses,
                    enrollments: totalEnrollmentsCount
                },
                grants: {
                    total: totalGrants,
                    pending: pendingGrants,
                    approved: approvedGrants,
                    rejected: rejectedGrants,
                    approvalRate: totalGrants > 0 ? Math.round((approvedGrants / totalGrants) * 100) : 0
                },
                affiliates: {
                    total: totalAffiliates,
                    active: activeAffiliates,
                    revenue: Math.round(affiliateRevenue)
                }
            },

            // Recent activity
            recentActivity: {
                users: recentUsers.map(user => ({
                    type: 'user_registered',
                    email: user.email,
                    username: user.username,
                    timestamp: user.createdAt
                })),
                grants: recentGrants.map(grant => ({
                    type: 'grant_application',
                    name: grant.name,
                    email: grant.email,
                    courseId: grant.courseId,
                    status: grant.status,
                    timestamp: grant.createdAt
                })),
                purchases: recentPurchases.map(purchase => ({
                    type: 'course_purchase',
                    email: purchase.email,
                    courseTitle: purchase.courseTitle,
                    amount: purchase.amount,
                    timestamp: purchase.enrolledAt
                }))
            },

            // Top performers
            topCourses: topCourses.map(course => ({
                title: course.title,
                enrollments: course.totalEnrollments
            }))
        });

    } catch (error) {
        console.error('❌ Admin analytics API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
