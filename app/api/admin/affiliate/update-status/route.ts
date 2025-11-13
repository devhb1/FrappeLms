/**
 * ====================================
 * ADMIN UPDATE AFFILIATE STATUS API
 * ====================================
 * 
 * Allows admins to activate, suspend, or change affiliate statuses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Affiliate } from '@/lib/models/affiliate';
import { validateAdminAuth, logAdminAction } from '@/lib/utils/admin-middleware';
import { logger } from '@/lib/utils/production-logger';

export async function POST(request: NextRequest) {
    try {
        // ===== AUTHENTICATION CHECK =====
        const authResult = await validateAdminAuth(request);
        if (!authResult.success) {
            return authResult.error!;
        }

        const { user, session } = authResult;

        // ===== DATABASE CONNECTION =====
        await dbConnect();

        // ===== REQUEST BODY =====
        const { affiliateId, status } = await request.json();

        if (!affiliateId || !status) {
            return NextResponse.json(
                { error: 'Affiliate ID and status are required' },
                { status: 400 }
            );
        }

        // Validate status
        const validStatuses = ['active', 'suspended', 'pending'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be active, suspended, or pending' },
                { status: 400 }
            );
        }

        // ===== FIND AND UPDATE AFFILIATE =====
        const affiliate = await Affiliate.findById(affiliateId).populate('userId', 'username email');

        if (!affiliate) {
            return NextResponse.json(
                { error: 'Affiliate not found' },
                { status: 404 }
            );
        }

        const oldStatus = affiliate.status;
        affiliate.status = status;
        await affiliate.save();

        // ===== LOG STATUS CHANGE =====
        logAdminAction('affiliate_status_change', session.user.email, {
            affiliateId: affiliate._id,
            affiliateEmail: affiliate.email,
            oldStatus,
            newStatus: status
        });

        logger.info('Affiliate status updated', {
            adminEmail: session.user.email,
            affiliateEmail: affiliate.email,
            statusChange: `${oldStatus} → ${status}`
        });

        // ===== SUCCESS RESPONSE =====
        return NextResponse.json({
            message: `Affiliate status updated from ${oldStatus} to ${status}`,
            affiliate: {
                id: affiliate._id,
                email: affiliate.email,
                username: affiliate.name || affiliate.email,
                status: affiliate.status,
                updatedAt: affiliate.updatedAt
            }
        });

    } catch (error: any) {
        logger.error('Failed to update affiliate status', {
            error: error.message,
            stack: error.stack,
            requestBody: await request.json().catch(() => ({}))
        });
        return NextResponse.json(
            { error: 'Failed to update affiliate status' },
            { status: 500 }
        );
    }
}
