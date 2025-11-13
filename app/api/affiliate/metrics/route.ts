/**
 * AFFILIATE METRICS API - GET /api/affiliate/metrics
 * 
 * Returns comprehensive affiliate performance metrics including:
 * - Total referrals and sales
 * - Commission earnings (total, pending, paid)
 * - Conversion rates and analytics
 * 
 * This endpoint supports the enhanced affiliate dashboard with detailed tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAffiliateStats } from '@/lib/services/affiliate';

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

        // ===== GET AFFILIATE METRICS =====
        const metrics = await getAffiliateStats(session.user.email);

        return NextResponse.json({
            success: true,
            metrics
        });

    } catch (error: any) {
        console.error('❌ Error fetching affiliate metrics:', error);

        if (error.message === 'Affiliate not found') {
            return NextResponse.json(
                { error: 'Affiliate account not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch affiliate metrics' },
            { status: 500 }
        );
    }
}
