/**
 * ====================================
 * ADMIN AFFILIATE STATS API
 * ====================================
 * 
 * Provides comprehensive statistics for admin dashboard
 * including total affiliates, payouts, commissions, and performance metrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Affiliate } from '@/lib/models/affiliate';
import { Enrollment } from '@/lib/models/enrollment';
import { PayoutHistory } from '@/lib/models/payoutHistory';

export async function GET(request: NextRequest) {
    try {
        // ===== AUTHENTICATION CHECK =====
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // ===== DATABASE CONNECTION =====
        await dbConnect();

        // ===== PARALLEL DATA QUERIES =====
        const [
            totalAffiliates,
            activeAffiliates,
            totalCommissionsPaid,
            pendingPayouts,
            thisMonthPayouts,
            totalEnrollments,
            recentActivity
        ] = await Promise.all([
            // Total affiliates count
            Affiliate.countDocuments(),

            // Active affiliates count
            Affiliate.countDocuments({ status: 'active' }),

            // Total commissions paid from payout history
            PayoutHistory.aggregate([
                { $match: { status: 'processed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),

            // Total pending payouts from affiliates
            Affiliate.aggregate([
                { $group: { _id: null, total: { $sum: '$pendingCommissions' } } }
            ]),

            // This month's payouts
            PayoutHistory.aggregate([
                {
                    $match: {
                        status: 'processed',
                        processedAt: {
                            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),

            // Total enrollments through affiliates
            Enrollment.countDocuments({ affiliateData: { $exists: true } }),

            // Recent activity (enrollments in last 7 days)
            Enrollment.find({
                affiliateData: { $exists: true },
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
                .populate('affiliateData', 'username email affiliateCode')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean()
        ]);

        // ===== FORMAT RESPONSE DATA =====
        const stats = {
            totalAffiliates: totalAffiliates || 0,
            activeAffiliates: activeAffiliates || 0,
            totalCommissionsPaid: totalCommissionsPaid[0]?.total || 0,
            pendingPayouts: pendingPayouts[0]?.total || 0,
            thisMonthPayouts: thisMonthPayouts[0]?.total || 0,
            totalEnrollments: totalEnrollments || 0,
            recentActivity: recentActivity?.map(enrollment => ({
                id: enrollment._id,
                courseId: enrollment.courseId,
                amount: enrollment.amount,
                affiliate: enrollment.affiliateData,
                enrolledAt: enrollment.createdAt
            })) || []
        };

        // ===== SUCCESS RESPONSE =====
        return NextResponse.json(stats);

    } catch (error) {
        console.error('Admin affiliate stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch affiliate statistics' },
            { status: 500 }
        );
    }
}
