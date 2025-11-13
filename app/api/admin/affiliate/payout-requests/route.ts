/**
 * ====================================
 * ADMIN PAYOUT REQUESTS API
 * ====================================
 * 
 * Manages affiliate payout requests for admin approval/rejection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Affiliate } from '@/lib/models/affiliate';

// ===== GET PAYOUT REQUESTS =====
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
        const status = searchParams.get('status') || 'pending';
        const limit = parseInt(searchParams.get('limit') || '50');

        // ===== FETCH AFFILIATES WITH PENDING PAYOUTS =====
        const query: any = {};

        if (status === 'pending') {
            query.pendingCommissions = { $gt: 0 };
            query.status = 'active';
        }

        const affiliatesWithPayouts = await Affiliate.find(query)
            .populate('userId', 'username email')
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean();

        // ===== FORMAT PAYOUT REQUESTS =====
        const requests = affiliatesWithPayouts
            .filter(affiliate => affiliate.pendingCommissions > 0)
            .map(affiliate => {
                // Handle populated user data safely
                const populatedUser = affiliate.userId as any;
                const affiliateName = populatedUser?.username || populatedUser?.email || affiliate.name || 'Unknown';

                return {
                    _id: affiliate._id,
                    affiliateId: affiliate._id,
                    affiliateEmail: affiliate.email,
                    affiliateName,
                    amount: affiliate.pendingCommissions,
                    payoutMethod: affiliate.payoutMode,
                    requestedAt: affiliate.updatedAt,
                    status: 'pending', // All are pending since we filtered for pendingCommissions > 0
                    payoutDetails: affiliate.paymentMethod
                };
            });

        // ===== SUCCESS RESPONSE =====
        return NextResponse.json({
            requests,
            totalPending: requests.length
        });

    } catch (error) {
        console.error('Admin payout requests error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payout requests' },
            { status: 500 }
        );
    }
}

// ===== CREATE MANUAL PAYOUT REQUEST =====
export async function POST(request: NextRequest) {
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

        // ===== REQUEST BODY =====
        const { affiliateId, amount, reason } = await request.json();

        if (!affiliateId || !amount || amount <= 0) {
            return NextResponse.json(
                { error: 'Valid affiliate ID and amount required' },
                { status: 400 }
            );
        }

        // ===== FIND AFFILIATE =====
        const affiliate = await Affiliate.findById(affiliateId).populate('userId', 'username email');

        if (!affiliate) {
            return NextResponse.json(
                { error: 'Affiliate not found' },
                { status: 404 }
            );
        }

        // ===== UPDATE PENDING COMMISSIONS =====
        affiliate.pendingCommissions += amount;
        await affiliate.save();

        // ===== SUCCESS RESPONSE =====
        return NextResponse.json({
            message: 'Manual payout request created successfully',
            affiliate: {
                id: affiliate._id,
                email: affiliate.email,
                username: affiliate.name || affiliate.email,
                pendingCommissions: affiliate.pendingCommissions
            }
        });

    } catch (error) {
        console.error('Manual payout request error:', error);
        return NextResponse.json(
            { error: 'Failed to create payout request' },
            { status: 500 }
        );
    }
}
