import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Affiliate } from '@/lib/models/affiliate';

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Connect to database
        await connectToDatabase();

        // Find affiliate by email (simplified approach)
        const affiliate = await Affiliate.findOne({
            email: session.user.email?.toLowerCase()
        });

        if (!affiliate) {
            return NextResponse.json({
                isAffiliate: false,
                affiliate: null
            });
        }

        // Refresh affiliate stats from enrollments
        await affiliate.refreshStats();

        // Get fresh data after refresh
        const refreshedAffiliate = await Affiliate.findOne({
            email: session.user.email?.toLowerCase()
        });

        // Use refreshed data if available, otherwise use original affiliate data
        const affiliateData = refreshedAffiliate || affiliate;

        // ===== FIX FLOATING POINT PRECISION ISSUES =====
        const totalPaid = Math.round((affiliateData.totalPaid || 0) * 100) / 100;
        const pendingCommissions = Math.round((affiliateData.pendingCommissions || 0) * 100) / 100;

        return NextResponse.json({
            isAffiliate: true,
            affiliate: {
                id: affiliateData._id,
                email: affiliateData.email,
                name: affiliateData.name,
                status: affiliateData.status,
                commissionRate: affiliateData.commissionRate,
                payoutMode: affiliateData.payoutMode,
                affiliateLink: affiliateData.generateAffiliateLink(),
                stats: {
                    ...affiliateData.stats
                },
                paymentMethod: affiliateData.paymentMethod,

                // ===== PAYOUT TRACKING DATA =====
                totalPaid,
                lastPayoutDate: affiliateData.lastPayoutDate,
                pendingCommissions,

                createdAt: affiliateData.createdAt,
                updatedAt: affiliateData.updatedAt
            }
        });

    } catch (error: any) {
        console.error('Affiliate status check error:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
