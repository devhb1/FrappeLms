/**
 * ===============================
 * PAYOUT SERVICE LAYER
 * ===============================
 * 
 * Handles affiliate payout processing with complete audit trail.
 * Ensures data consistency across Affiliate, PayoutHistory, and Enrollment models.
 */

import connectToDatabase from '../db';
import { Affiliate } from '../models/affiliate';
import { PayoutHistory, IPayoutHistory } from '../models/payoutHistory';
import { Enrollment } from '../models/enrollment';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export interface CreatePayoutData {
    affiliateEmail: string;
    periodStart: Date;
    periodEnd: Date;
    payoutMethod: 'paypal' | 'bank' | 'crypto';
    currency?: string;
    transactionId?: string;
    processedBy: string;
    proofLink?: string;
    adminNotes?: string;
}

export interface PayoutSummary {
    affiliateId: string;
    affiliateEmail: string;
    affiliateName: string;
    totalCommission: number;
    commissionsCount: number;
    periodStart: Date;
    periodEnd: Date;
    unpaidEnrollments: Array<{
        enrollmentId: string;
        courseId: string;
        customerEmail: string;
        commissionAmount: number;
        enrolledAt: Date;
    }>;
}

/**
 * Get unpaid commissions summary for an affiliate
 */
export async function getUnpaidCommissionsSummary(
    affiliateEmail: string,
    periodStart?: Date,
    periodEnd?: Date
): Promise<PayoutSummary | null> {
    try {
        await connectToDatabase();

        // Find affiliate
        const affiliate = await Affiliate.findOne({
            email: affiliateEmail.toLowerCase()
        });

        if (!affiliate) {
            throw new Error('Affiliate not found');
        }

        // Build query for unpaid enrollments
        const query: any = {
            'affiliateData.affiliateEmail': affiliateEmail.toLowerCase(),
            'affiliateData.commissionEligible': true,
            'affiliateData.commissionPaid': { $ne: true },
            status: 'paid'
        };

        // Add period filters if provided
        if (periodStart) {
            query.createdAt = { $gte: periodStart };
        }
        if (periodEnd) {
            query.createdAt = { ...query.createdAt, $lte: periodEnd };
        }

        // Get unpaid enrollments
        const unpaidEnrollments = await Enrollment.find(query)
            .sort({ createdAt: 1 })
            .select('_id courseId email affiliateData.commissionAmount createdAt');

        // Calculate totals
        const totalCommission = unpaidEnrollments.reduce(
            (sum, e) => sum + (e.affiliateData?.commissionAmount || 0),
            0
        );

        return {
            affiliateId: affiliate.affiliateId,
            affiliateEmail: affiliate.email,
            affiliateName: affiliate.name,
            totalCommission: Math.round(totalCommission * 100) / 100,
            commissionsCount: unpaidEnrollments.length,
            periodStart: periodStart || new Date(unpaidEnrollments[0]?.createdAt || Date.now()),
            periodEnd: periodEnd || new Date(),
            unpaidEnrollments: unpaidEnrollments.map(e => ({
                enrollmentId: e._id.toString(),
                courseId: e.courseId,
                customerEmail: e.email,
                commissionAmount: e.affiliateData?.commissionAmount || 0,
                enrolledAt: e.createdAt
            }))
        };

    } catch (error) {
        logger.error('Failed to get unpaid commissions summary', {
            affiliateEmail,
            error
        });
        throw error;
    }
}

/**
 * Process affiliate payout with complete audit trail
 * Updates: Affiliate.payoutDisbursements, PayoutHistory, Enrollment.affiliateData.commissionPaid
 */
export async function processAffiliatePayout(
    data: CreatePayoutData
): Promise<IPayoutHistory> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await connectToDatabase();

        // 1. Get unpaid commissions summary
        const summary = await getUnpaidCommissionsSummary(
            data.affiliateEmail,
            data.periodStart,
            data.periodEnd
        );

        if (!summary) {
            throw new Error('Affiliate not found');
        }

        if (summary.commissionsCount === 0) {
            throw new Error('No unpaid commissions found for this period');
        }

        if (summary.totalCommission <= 0) {
            throw new Error('Total commission must be greater than 0');
        }

        // 2. Find affiliate
        const affiliate = await Affiliate.findOne({
            email: data.affiliateEmail.toLowerCase()
        }).session(session);

        if (!affiliate) {
            throw new Error('Affiliate not found');
        }

        // 3. Create PayoutHistory record
        const payoutHistory = await PayoutHistory.create([{
            affiliateId: affiliate.affiliateId,
            affiliateEmail: affiliate.email,
            affiliateName: affiliate.name,
            amount: summary.totalCommission,
            payoutMethod: data.payoutMethod,
            currency: data.currency || 'USD',
            transactionId: data.transactionId,
            status: 'processed',
            processedBy: data.processedBy,
            processedAt: new Date(),
            proofLink: data.proofLink,
            adminNotes: data.adminNotes,
            commissionsCount: summary.commissionsCount,
            commissionsPaid: summary.unpaidEnrollments.map(e => ({
                enrollmentId: new mongoose.Types.ObjectId(e.enrollmentId),
                commissionAmount: e.commissionAmount,
                courseId: e.courseId,
                customerEmail: e.customerEmail,
                enrolledAt: e.enrolledAt
            })),
            periodStart: data.periodStart,
            periodEnd: data.periodEnd
        }], { session });

        const payout = payoutHistory[0];

        // 4. Add disbursement to Affiliate.payoutDisbursements
        await Affiliate.findByIdAndUpdate(
            affiliate._id,
            {
                $push: {
                    payoutDisbursements: {
                        payoutId: payout._id,
                        amount: summary.totalCommission,
                        currency: data.currency || 'USD',
                        payoutMethod: data.payoutMethod,
                        transactionId: data.transactionId,
                        status: 'completed',
                        processedBy: data.processedBy,
                        processedAt: new Date(),
                        proofLink: data.proofLink,
                        adminNotes: data.adminNotes,
                        commissionsCount: summary.commissionsCount,
                        periodStart: data.periodStart,
                        periodEnd: data.periodEnd
                    }
                },
                $inc: {
                    totalPaid: summary.totalCommission,
                    pendingCommissions: -summary.totalCommission
                },
                $set: {
                    lastPayoutDate: new Date()
                }
            },
            { session }
        );

        // 5. Mark all enrollments as paid
        const enrollmentIds = summary.unpaidEnrollments.map(e =>
            new mongoose.Types.ObjectId(e.enrollmentId)
        );

        await Enrollment.updateMany(
            { _id: { $in: enrollmentIds } },
            {
                $set: {
                    'affiliateData.commissionPaid': true,
                    'affiliateData.paidAt': new Date(),
                    'affiliateData.payoutId': payout._id
                }
            },
            { session }
        );

        // Commit transaction
        await session.commitTransaction();

        logger.success('Payout processed successfully', {
            payoutId: payout._id,
            affiliateEmail: data.affiliateEmail,
            amount: summary.totalCommission,
            commissionsCount: summary.commissionsCount
        });

        return payout;

    } catch (error) {
        await session.abortTransaction();
        logger.error('Failed to process payout', {
            affiliateEmail: data.affiliateEmail,
            error
        });
        throw error;
    } finally {
        session.endSession();
    }
}

/**
 * Get payout history for an affiliate
 */
export async function getAffiliatePayoutHistory(
    affiliateEmail: string,
    options?: {
        limit?: number;
        skip?: number;
        status?: 'processed' | 'failed' | 'pending';
    }
): Promise<{
    payouts: IPayoutHistory[];
    total: number;
}> {
    try {
        await connectToDatabase();

        const query: any = {
            affiliateEmail: affiliateEmail.toLowerCase()
        };

        if (options?.status) {
            query.status = options.status;
        }

        const [payouts, total] = await Promise.all([
            PayoutHistory.find(query)
                .sort({ processedAt: -1 })
                .limit(options?.limit || 50)
                .skip(options?.skip || 0),
            PayoutHistory.countDocuments(query)
        ]);

        return { payouts, total };

    } catch (error) {
        logger.error('Failed to get payout history', {
            affiliateEmail,
            error
        });
        throw error;
    }
}

/**
 * Validate payout data consistency
 * Checks that Affiliate.totalPaid matches sum of completed disbursements
 */
export async function validatePayoutConsistency(
    affiliateEmail: string
): Promise<{
    isConsistent: boolean;
    affiliate: {
        totalPaid: number;
        pendingCommissions: number;
    };
    calculated: {
        totalDisbursed: number;
        totalUnpaid: number;
    };
    discrepancy?: {
        totalPaidDiff: number;
        pendingDiff: number;
    };
}> {
    try {
        await connectToDatabase();

        const affiliate = await Affiliate.findOne({
            email: affiliateEmail.toLowerCase()
        });

        if (!affiliate) {
            throw new Error('Affiliate not found');
        }

        // Calculate total from disbursements
        const totalDisbursed = affiliate.payoutDisbursements
            ?.filter(d => d.status === 'completed')
            .reduce((sum, d) => sum + d.amount, 0) || 0;

        // Calculate unpaid commissions
        const unpaidEnrollments = await Enrollment.find({
            'affiliateData.affiliateEmail': affiliateEmail.toLowerCase(),
            'affiliateData.commissionEligible': true,
            'affiliateData.commissionPaid': { $ne: true },
            status: 'paid'
        });

        const totalUnpaid = unpaidEnrollments.reduce(
            (sum, e) => sum + (e.affiliateData?.commissionAmount || 0),
            0
        );

        const isConsistent =
            Math.abs(affiliate.totalPaid - totalDisbursed) < 0.01 &&
            Math.abs(affiliate.pendingCommissions - totalUnpaid) < 0.01;

        return {
            isConsistent,
            affiliate: {
                totalPaid: affiliate.totalPaid,
                pendingCommissions: affiliate.pendingCommissions
            },
            calculated: {
                totalDisbursed: Math.round(totalDisbursed * 100) / 100,
                totalUnpaid: Math.round(totalUnpaid * 100) / 100
            },
            ...((!isConsistent) && {
                discrepancy: {
                    totalPaidDiff: Math.round((affiliate.totalPaid - totalDisbursed) * 100) / 100,
                    pendingDiff: Math.round((affiliate.pendingCommissions - totalUnpaid) * 100) / 100
                }
            })
        };

    } catch (error) {
        logger.error('Failed to validate payout consistency', {
            affiliateEmail,
            error
        });
        throw error;
    }
}

/**
 * Recalculate and fix affiliate totals based on actual records
 * Use this if inconsistencies are detected
 */
export async function recalculateAffiliateTotals(
    affiliateEmail: string
): Promise<{
    updated: boolean;
    before: { totalPaid: number; pendingCommissions: number };
    after: { totalPaid: number; pendingCommissions: number };
}> {
    try {
        await connectToDatabase();

        const affiliate = await Affiliate.findOne({
            email: affiliateEmail.toLowerCase()
        });

        if (!affiliate) {
            throw new Error('Affiliate not found');
        }

        const before = {
            totalPaid: affiliate.totalPaid,
            pendingCommissions: affiliate.pendingCommissions
        };

        // Calculate correct totals
        const totalDisbursed = affiliate.payoutDisbursements
            ?.filter(d => d.status === 'completed')
            .reduce((sum, d) => sum + d.amount, 0) || 0;

        const unpaidEnrollments = await Enrollment.find({
            'affiliateData.affiliateEmail': affiliateEmail.toLowerCase(),
            'affiliateData.commissionEligible': true,
            'affiliateData.commissionPaid': { $ne: true },
            status: 'paid'
        });

        const totalUnpaid = unpaidEnrollments.reduce(
            (sum, e) => sum + (e.affiliateData?.commissionAmount || 0),
            0
        );

        // Update affiliate
        await affiliate.updateOne({
            $set: {
                totalPaid: Math.round(totalDisbursed * 100) / 100,
                pendingCommissions: Math.round(totalUnpaid * 100) / 100
            }
        });

        const after = {
            totalPaid: Math.round(totalDisbursed * 100) / 100,
            pendingCommissions: Math.round(totalUnpaid * 100) / 100
        };

        logger.info('Affiliate totals recalculated', {
            affiliateEmail,
            before,
            after
        });

        return { updated: true, before, after };

    } catch (error) {
        logger.error('Failed to recalculate affiliate totals', {
            affiliateEmail,
            error
        });
        throw error;
    }
}
