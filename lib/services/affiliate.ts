/**
 * ===============================
 * SIMPLIFIED AFFILIATE SERVICE
 * ===============================
 * 
 * Clean, focused affiliate tracking after cleanup:
 * ✅ Use enrollment.affiliateData.affiliateEmail (from webhook)
 * ✅ Calculate earnings from enrollments directly
 * ✅ No redundant stats storage in affiliate model
 * ✅ Query enrollments directly for affiliate performance
 */

import connectToDatabase from '../db';
import { Affiliate } from '../models/affiliate';
import { Enrollment } from '../models/enrollment';

// ===== SIMPLIFIED AFFILIATE METRICS =====
export async function getAffiliateStats(affiliateEmail: string) {
    await connectToDatabase();

    try {
        // Get affiliate
        const affiliate = await Affiliate.findOne({
            email: affiliateEmail.toLowerCase()
        });

        if (!affiliate) {
            throw new Error('Affiliate not found');
        }

        // Get enrollments for this affiliate (simple query)
        const enrollments = await Enrollment.find({
            'affiliateData.affiliateEmail': affiliateEmail.toLowerCase(),
            status: 'paid'
        }).select('amount affiliateData.commissionAmount createdAt courseId');

        // Calculate totals directly from enrollments
        const totalReferrals = enrollments.length;
        const totalSales = enrollments.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalCommissions = enrollments.reduce((sum, e) => sum + (e.affiliateData?.commissionAmount || 0), 0);

        return {
            // From affiliate model (simplified)
            affiliate: {
                name: affiliate.name,
                email: affiliate.email,
                commissionRate: affiliate.commissionRate || 10,
                totalPaid: affiliate.totalPaid || 0,
                pendingCommissions: affiliate.pendingCommissions || 0,
                lastPayoutDate: affiliate.lastPayoutDate,
                stats: affiliate.stats
            },
            // Calculated fresh from enrollments
            performance: {
                totalReferrals,
                totalSales,
                totalCommissions,
                averageOrderValue: totalReferrals > 0 ? totalSales / totalReferrals : 0
            },
            // Recent enrollments
            recentEnrollments: enrollments.slice(0, 10).map(e => ({
                courseId: e.courseId,
                amount: e.amount,
                commission: e.affiliateData?.commissionAmount || 0,
                date: e.createdAt
            }))
        };

    } catch (error) {
        console.error('❌ Error getting affiliate stats:', error);
        throw error;
    }
}

// ===== SIMPLIFIED AFFILIATE ENROLLMENT LIST =====
export async function getAffiliateEnrollments(
    affiliateEmail: string,
    options: { limit?: number; page?: number } = {}
) {
    await connectToDatabase();

    const limit = options.limit || 20;
    const skip = ((options.page || 1) - 1) * limit;

    try {
        // Simple query - no complex transformations
        const enrollments = await Enrollment.find({
            'affiliateData.affiliateEmail': affiliateEmail.toLowerCase(),
            status: 'paid'
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('email courseId amount affiliateData.commissionAmount createdAt');

        const total = await Enrollment.countDocuments({
            'affiliateData.affiliateEmail': affiliateEmail.toLowerCase(),
            status: 'paid'
        });

        return {
            enrollments,
            pagination: {
                total,
                page: options.page || 1,
                limit,
                pages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error('❌ Error getting affiliate enrollments:', error);
        throw error;
    }
}
