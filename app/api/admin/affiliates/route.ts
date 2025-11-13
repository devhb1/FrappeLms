import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { User, Affiliate, Enrollment } from '@/lib/models';

/**
 * ===============================
 * ADMIN AFFILIATE MANAGEMENT API
 * ===============================
 * 
 * GET: List all affiliates with stats
 * - Affiliate performance metrics
 * - Referral counts and revenue
 * - Payout status tracking
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

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status'); // 'active', 'inactive', 'suspended'

        // Build filter
        const filter: any = {};
        if (status && ['active', 'inactive', 'suspended'].includes(status)) {
            filter.status = status;
        }

        // Fetch affiliates
        const affiliates = await Affiliate.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await Affiliate.countDocuments(filter);

        // Calculate stats for each affiliate
        const affiliatesWithStats = [];

        for (const affiliate of affiliates) {
            // Get referral stats from enrollments
            const referralStats = await Enrollment.aggregate([
                {
                    $match: {
                        'affiliateData.affiliateEmail': affiliate.email.toLowerCase(),
                        status: 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalReferrals: { $sum: 1 },
                        totalRevenue: { $sum: '$amount' },
                        averageOrderValue: { $avg: '$amount' }
                    }
                }
            ]);

            const stats = referralStats[0] || {
                totalReferrals: 0,
                totalRevenue: 0,
                averageOrderValue: 0
            };

            // Calculate commission based on actual affiliate data
            const commissionRate = affiliate.commissionRate || 10;
            const totalCommission = Math.round((stats.totalRevenue * commissionRate) / 100 * 100) / 100;

            // ===== USE ACTUAL PENDING COMMISSIONS (DO NOT FALLBACK) =====
            const pendingPayout = Math.round((affiliate.pendingCommissions || 0) * 100) / 100;

            // Get recent referrals
            const recentReferrals = await Enrollment.find({
                'affiliateData.affiliateEmail': affiliate.email.toLowerCase(),
                status: 'paid'
            })
                .sort({ createdAt: -1 })
                .limit(3)
                .select('courseId amount createdAt')
                .lean();

            affiliatesWithStats.push({
                _id: affiliate._id,
                email: affiliate.email,
                name: affiliate.name,
                status: affiliate.status,
                payoutMode: affiliate.payoutMode,
                commissionRate: affiliate.commissionRate || 10,
                createdAt: affiliate.createdAt,
                lastLoginAt: affiliate.lastLoginAt,

                // Performance stats with precision rounding
                stats: {
                    totalReferrals: stats.totalReferrals,
                    totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
                    totalCommission: Math.round(totalCommission * 100) / 100,
                    pendingPayout: pendingPayout, // Already rounded above
                    totalPaid: Math.round((affiliate.totalPaid || 0) * 100) / 100,
                    averageOrderValue: Math.round((stats.averageOrderValue || 0) * 100) / 100,
                    conversionRate: 0 // TODO: Calculate with click tracking
                },

                // Recent activity
                recentReferrals: recentReferrals.map(ref => ({
                    courseId: ref.courseId,
                    amount: ref.amount,
                    date: ref.createdAt
                })),

                // Payment info
                paymentMethod: affiliate.paymentMethod
            });
        }

        // Calculate summary stats
        const totalAffiliates = await Affiliate.countDocuments();
        const activeAffiliates = await Affiliate.countDocuments({ status: 'active' });

        const totalCommissionResult = await Enrollment.aggregate([
            { $match: { 'affiliateData.affiliateEmail': { $exists: true, $ne: '' }, status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalAffiliateRevenue = totalCommissionResult[0]?.total || 0;
        const totalCommissionOwed = (totalAffiliateRevenue * 10) / 100; // Assuming 10% commission

        return NextResponse.json({
            affiliates: affiliatesWithStats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: page * limit < total
            },
            summary: {
                totalAffiliates,
                activeAffiliates,
                totalAffiliateRevenue: Math.round(totalAffiliateRevenue),
                totalCommissionOwed: Math.round(totalCommissionOwed),
                averageCommissionPerAffiliate: activeAffiliates > 0
                    ? Math.round(totalCommissionOwed / activeAffiliates)
                    : 0
            }
        });

    } catch (error) {
        console.error('❌ Admin affiliates API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Update affiliate status or process payout
export async function PUT(request: NextRequest) {
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

        const { affiliateId, action, payoutData } = await request.json();

        if (!affiliateId || !action) {
            return NextResponse.json({ error: 'Affiliate ID and action required' }, { status: 400 });
        }

        const affiliate = await Affiliate.findById(affiliateId);
        if (!affiliate) {
            return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
        }

        let message = '';

        switch (action) {
            case 'activate':
                affiliate.status = 'active';
                message = 'Affiliate activated successfully';
                break;

            case 'suspend':
                affiliate.status = 'suspended';
                message = 'Affiliate suspended successfully';
                break;

            case 'payout':
                if (!payoutData || !payoutData.amount) {
                    return NextResponse.json({ error: 'Payout data required' }, { status: 400 });
                }

                // For MVP, just update stats - no actual payment processing
                // In production, this would integrate with payment processor

                // Update simplified payout tracking
                affiliate.lastPayoutDate = new Date();
                affiliate.pendingCommissions = Math.max(0, affiliate.pendingCommissions - payoutData.amount);
                affiliate.totalPaid = (affiliate.totalPaid || 0) + payoutData.amount;

                message = `Payout of $${payoutData.amount} processed for ${affiliate.name}`;
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await affiliate.save();

        return NextResponse.json({
            message,
            affiliate: {
                _id: affiliate._id,
                email: affiliate.email,
                name: affiliate.name,
                status: affiliate.status,
                stats: affiliate.stats
            }
        });

    } catch (error) {
        console.error('❌ Admin affiliate update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
