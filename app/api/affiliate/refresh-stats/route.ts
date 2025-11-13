/**
 * ====================================
 * AFFILIATE STATS REFRESH API
 * ====================================
 * 
 * Manually refresh affiliate stats to fix any data inconsistencies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Affiliate } from '@/lib/models/affiliate';

export async function POST(request: NextRequest) {
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

        // ===== FIND AFFILIATE =====
        const affiliate = await Affiliate.findOne({
            email: session.user.email.toLowerCase()
        });

        if (!affiliate) {
            return NextResponse.json(
                { error: 'Affiliate not found' },
                { status: 404 }
            );
        }

        // ===== REFRESH STATS =====
        await affiliate.refreshStats();

        // ===== GET UPDATED DATA =====
        const refreshedAffiliate = await Affiliate.findOne({
            email: session.user.email.toLowerCase()
        });

        // ===== SUCCESS RESPONSE =====
        return NextResponse.json({
            success: true,
            message: 'Stats refreshed successfully',
            data: {
                totalPaid: Math.round((refreshedAffiliate?.totalPaid || 0) * 100) / 100,
                pendingCommissions: Math.round((refreshedAffiliate?.pendingCommissions || 0) * 100) / 100,
                totalReferrals: refreshedAffiliate?.stats?.totalReferrals || 0,
                lastRefresh: new Date()
            }
        });

    } catch (error) {
        console.error('Affiliate stats refresh error:', error);
        return NextResponse.json(
            { error: 'Failed to refresh stats' },
            { status: 500 }
        );
    }
}
