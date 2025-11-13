/**
 * ===============================
 * STRIPE EVENTS CLEANUP API
 * ===============================
 * 
 * Cleans up old Stripe event records from enrollments to prevent 
 * the stripeEvents array from growing too large over time.
 * 
 * This endpoint should be called periodically (e.g., via cron job)
 * to maintain database performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Enrollment } from '@/lib/models/enrollment';
import ProductionLogger from '@/lib/utils/production-logger';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        // Get cleanup parameters from request (optional)
        const body = await request.json().catch(() => ({}));
        const retentionDays = body.retentionDays || 30; // Default: keep last 30 days
        const batchSize = body.batchSize || 100; // Process 100 enrollments at a time

        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        ProductionLogger.info('Starting Stripe events cleanup', {
            retentionDays,
            cutoffDate: cutoffDate.toISOString(),
            batchSize
        });

        // Clean old events from enrollments in batches
        const result = await Enrollment.updateMany(
            {
                'stripeEvents.processedAt': { $lt: cutoffDate }
            },
            {
                $pull: {
                    stripeEvents: {
                        processedAt: { $lt: cutoffDate }
                    }
                }
            }
        );

        // Get some statistics
        const totalEnrollments = await Enrollment.countDocuments();
        const enrollmentsWithEvents = await Enrollment.countDocuments({
            'stripeEvents.0': { $exists: true }
        });

        ProductionLogger.info('Stripe events cleanup completed', {
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount,
            totalEnrollments,
            enrollmentsWithEvents,
            retentionDays
        });

        return NextResponse.json({
            success: true,
            message: 'Stripe events cleanup completed',
            stats: {
                modifiedEnrollments: result.modifiedCount,
                matchedEnrollments: result.matchedCount,
                totalEnrollments,
                enrollmentsWithEvents,
                retentionDays,
                cutoffDate: cutoffDate.toISOString()
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        ProductionLogger.error('Stripe events cleanup failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// GET: Show cleanup status and statistics
export async function GET() {
    try {
        await connectToDatabase();

        const totalEnrollments = await Enrollment.countDocuments();
        const enrollmentsWithEvents = await Enrollment.countDocuments({
            'stripeEvents.0': { $exists: true }
        });

        // Get some sample statistics
        const sampleEnrollments = await Enrollment.aggregate([
            { $match: { 'stripeEvents.0': { $exists: true } } },
            {
                $project: {
                    _id: 1,
                    email: 1,
                    eventsCount: { $size: '$stripeEvents' },
                    oldestEvent: { $min: '$stripeEvents.processedAt' },
                    newestEvent: { $max: '$stripeEvents.processedAt' }
                }
            },
            { $limit: 10 }
        ]);

        return NextResponse.json({
            status: 'operational',
            message: 'Stripe events cleanup service ready',
            stats: {
                totalEnrollments,
                enrollmentsWithEvents,
                enrollmentsWithoutEvents: totalEnrollments - enrollmentsWithEvents,
                coveragePercentage: Math.round((enrollmentsWithEvents / totalEnrollments) * 100)
            },
            sampleEnrollments,
            usage: {
                cleanup: 'POST with optional { retentionDays: 30, batchSize: 100 }',
                defaultRetention: '30 days',
                recommendedFrequency: 'Weekly or monthly'
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}