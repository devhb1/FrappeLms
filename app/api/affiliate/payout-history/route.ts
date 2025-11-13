/**
 * ====================================
 * AFFILIATE PAYOUT HISTORY API
 * ====================================
 * 
 * Allows affiliates to view their own payout history.
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

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // ===== DATABASE CONNECTION =====
        await dbConnect();

        // ===== QUERY PARAMETERS =====
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        // ===== FETCH AFFILIATE'S PAYOUT HISTORY =====
        const [history, totalCount] = await Promise.all([
            PayoutHistory.find({
                affiliateEmail: session.user.email.toLowerCase()
            })
                .sort({ processedAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit)
                .lean(),

            PayoutHistory.countDocuments({
                affiliateEmail: session.user.email.toLowerCase()
            })
        ]);

        // ===== CALCULATE SUMMARY STATISTICS =====
        const summaryStats = await PayoutHistory.aggregate([
            {
                $match: {
                    affiliateEmail: session.user.email.toLowerCase(),
                    status: 'processed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalReceived: { $sum: '$amount' },
                    totalPayouts: { $sum: 1 },
                    averagePayoutAmount: { $avg: '$amount' }
                }
            }
        ]);

        const summary = summaryStats[0] || {
            totalReceived: 0,
            totalPayouts: 0,
            averagePayoutAmount: 0
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
            summary
        });

    } catch (error) {
        console.error('Affiliate payout history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payout history' },
            { status: 500 }
        );
    }
}
