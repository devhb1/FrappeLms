/**
 * ====================================
 * SIMPLIFIED ADMIN PAYOUT API 
 * ====================================
 * This API handles affiliate payout requests and ensures
 * that all necessary validations and processes are in place.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';
import { Affiliate } from '@/lib/models/affiliate';
import { PayoutHistory } from '@/lib/models/payoutHistory';
import { sendEmail } from '@/lib/emails';
import { logger, affiliateLogger } from '@/lib/utils/production-logger';
import { safeEmailSend } from '@/lib/utils/email-error-handler';

export async function POST(request: NextRequest) {
    try {
        affiliateLogger.log('Processing affiliate payout request');

        // ===== AUTHENTICATION CHECK =====
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || session.user.role !== 'admin') {
            logger.warn('Unauthorized payout attempt', {
                hasSession: !!session,
                userRole: session?.user?.role
            });
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // ===== DATABASE CONNECTION =====
        await connectToDatabase();

        // ===== REQUEST BODY =====
        const {
            affiliateId,
            amount,
            transactionId,
            notes
        } = await request.json();

        logger.info('Payout request received', {
            affiliateId,
            amount,
            hasTransactionId: !!transactionId,
            hasNotes: !!notes,
            adminEmail: session.user.email
        });

        // ===== VALIDATION =====
        if (!affiliateId || !amount || !transactionId) {
            logger.warn('Invalid payout request - missing required fields', {
                hasAffiliateId: !!affiliateId,
                hasAmount: !!amount,
                hasTransactionId: !!transactionId
            });
            return NextResponse.json(
                { error: 'Affiliate ID, amount, and transaction ID are required' },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            logger.warn('Invalid payout amount', { amount });
            return NextResponse.json(
                { error: 'Amount must be greater than 0' },
                { status: 400 }
            );
        }

        // ===== FIND AFFILIATE =====
        const affiliate = await Affiliate.findById(affiliateId);

        if (!affiliate) {
            logger.warn('Payout requested for non-existent affiliate', { affiliateId });
            return NextResponse.json(
                { error: 'Affiliate not found' },
                { status: 404 }
            );
        }

        logger.info('Affiliate found for payout', {
            affiliateId,
            affiliateEmail: affiliate.email
        });

        // ===== VALIDATE PAYOUT AMOUNT =====
        if (amount > affiliate.pendingCommissions) {
            logger.warn('Payout amount exceeds pending commissions', {
                affiliateId,
                requestedAmount: amount,
                availableAmount: affiliate.pendingCommissions
            });
            return NextResponse.json(
                { error: 'Payout amount exceeds pending commissions' },
                { status: 400 }
            );
        }

        // ===== PROCESS PAYOUT =====
        const beforePaid = affiliate.totalPaid || 0;
        const beforePending = affiliate.pendingCommissions || 0;

        // ===== FIX FLOATING POINT PRECISION =====
        const payoutAmount = Math.round(amount * 100) / 100;
        const newTotalPaid = Math.round((beforePaid + payoutAmount) * 100) / 100;
        const newPendingCommissions = Math.round((beforePending - payoutAmount) * 100) / 100;

        // Update affiliate balance
        affiliate.totalPaid = newTotalPaid;
        affiliate.pendingCommissions = Math.max(0, newPendingCommissions); // Ensure non-negative
        affiliate.lastPayoutDate = new Date();

        await affiliate.save();

        // ===== CREATE PAYOUT HISTORY RECORD =====
        const payoutHistory = new PayoutHistory({
            affiliateId: affiliate._id,
            affiliateEmail: affiliate.email,
            affiliateName: affiliate.name || affiliate.email,
            amount: payoutAmount,
            payoutMethod: affiliate.payoutMode || 'bank',
            transactionId: transactionId,
            adminMessage: notes,
            processedBy: session.user.email,
            status: 'processed',
            commissionsPaid: [{
                enrollmentId: new mongoose.Types.ObjectId(), // Placeholder
                commissionAmount: payoutAmount,
                courseId: 'multiple',
                customerEmail: 'consolidated',
                enrolledAt: new Date()
            }],
            commissionsCount: 1
        });

        await payoutHistory.save();

        affiliateLogger.log('Payout processed successfully', {
            affiliateEmail: affiliate.email,
            amount: payoutAmount,
            beforePaid,
            afterPaid: newTotalPaid,
            beforePending,
            afterPending: newPendingCommissions,
            payoutHistoryId: payoutHistory._id,
            adminEmail: session.user.email
        });

        // ===== SEND EMAIL NOTIFICATION =====
        const emailResult = await safeEmailSend(
            sendEmail.affiliatePayout(
                affiliate.email,
                affiliate.name || affiliate.email,
                payoutAmount,
                affiliate.payoutMode || 'bank',
                transactionId,
                1 // Commission count placeholder
            ),
            `payout notification for ${affiliate.email}`,
            { critical: false }
        );

        if (emailResult.success) {
            logger.info('Payout notification email sent successfully', {
                affiliateEmail: affiliate.email
            });
        } else {
            logger.warn('Failed to send payout notification email', {
                affiliateEmail: affiliate.email,
                error: emailResult.error
            });
        }

        // ===== SUCCESS RESPONSE =====
        return NextResponse.json({
            success: true,
            message: 'Payout processed successfully',
            payout: {
                affiliateId: affiliate._id,
                affiliateEmail: affiliate.email,
                amount: payoutAmount,
                transactionId: transactionId,
                notes: notes,
                processedAt: new Date(),
                processedBy: session.user.email
            },
            updatedBalances: {
                totalPaid: newTotalPaid,
                pendingCommissions: newPendingCommissions
            }
        });

    } catch (error: any) {
        logger.error('Payout processing failed', {
            error: error.message,
            stack: error.stack,
            requestBody: await request.json().catch(() => ({}))
        });
        return NextResponse.json(
            {
                error: 'Failed to process payout',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}
