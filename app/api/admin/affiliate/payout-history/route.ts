/**
 * ====================================
 * ADMIN PAYOUT HISTORY API
 * ====================================
 * 
 * Provides complete payout history for admin tracking and audit purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
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

        // ===== QUERY PARAMETERS =====
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const status = searchParams.get('status');
        const affiliateEmail = searchParams.get('affiliateEmail');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // ===== BUILD QUERY =====
        let query: any = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (affiliateEmail) {
            query.affiliateEmail = affiliateEmail.toLowerCase();
        }

        if (startDate || endDate) {
            query.processedAt = {};
            if (startDate) {
                query.processedAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.processedAt.$lte = new Date(endDate);
            }
        }

        // ===== FETCH PAYOUT HISTORY =====
        const [history, totalCount] = await Promise.all([
            PayoutHistory.find(query)
                .sort({ processedAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit)
                .lean(),

            PayoutHistory.countDocuments(query)
        ]);

        // ===== CALCULATE SUMMARY STATISTICS =====
        const summaryStats = await PayoutHistory.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalPaidOut: { $sum: '$amount' },
                    totalPayouts: { $sum: 1 },
                    averagePayoutAmount: { $avg: '$amount' },
                    uniqueAffiliates: { $addToSet: '$affiliateEmail' }
                }
            }
        ]);

        const summary = summaryStats[0] || {
            totalPaidOut: 0,
            totalPayouts: 0,
            averagePayoutAmount: 0,
            uniqueAffiliates: []
        };

        // ===== SUCCESS RESPONSE =====
        return NextResponse.json({
            history,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                limit
            },
            summary: {
                totalPaidOut: summary.totalPaidOut,
                totalPayouts: summary.totalPayouts,
                averagePayoutAmount: summary.averagePayoutAmount,
                uniqueAffiliatesCount: summary.uniqueAffiliates.length
            }
        });

    } catch (error) {
        console.error('Admin payout history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payout history' },
            { status: 500 }
        );
    }
}
