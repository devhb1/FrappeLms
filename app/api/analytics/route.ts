import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Enrollment } from '@/lib/models/enrollment';
import { Affiliate } from '@/lib/models/affiliate';
import logger from '@/lib/utils/logger';

// Simple analytics functions
async function getEnrollmentStats(timeframe: 'hour' | 'day' | 'week') {
    const timeframeDuration = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000
    }

    const since = new Date(Date.now() - timeframeDuration[timeframe])

    const [total, successful] = await Promise.all([
        Enrollment.countDocuments({ createdAt: { $gte: since } }),
        Enrollment.countDocuments({ createdAt: { $gte: since }, status: { $in: ['paid', 'grant'] } })
    ])

    return {
        totalAttempts: total,
        successfulEnrollments: successful,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        topErrors: [] // Simplified
    }
}

async function getCouponStats(couponCode?: string, timeframe: 'day' | 'week' = 'week') {
    const timeframeDuration = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000
    }

    const since = new Date(Date.now() - timeframeDuration[timeframe])
    const matchFilter: any = { createdAt: { $gte: since } }

    if (couponCode) {
        matchFilter['grantData.couponCode'] = couponCode
    }

    const [totalUsage, successfulUsage] = await Promise.all([
        Enrollment.countDocuments({ ...matchFilter, 'grantData.couponCode': { $exists: true } }),
        Enrollment.countDocuments({ ...matchFilter, 'grantData.couponCode': { $exists: true }, status: 'grant' })
    ])

    return {
        totalUsage,
        successfulUsage,
        failedUsage: totalUsage - successfulUsage,
        topFailureReasons: [] // Simplified
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const timeframe = (searchParams.get('timeframe') as 'hour' | 'day' | 'week') || 'day'
    const couponCode = searchParams.get('couponCode') || undefined

    try {
        logger.info('Fetching analytics', { timeframe });
        await connectToDatabase()

        // Simple enrollment stats
        const enrollmentStats = await getEnrollmentStats(timeframe)
        const couponStats = await getCouponStats(couponCode, timeframe === 'hour' ? 'day' : timeframe)

        // Calculate derived metrics
        const metrics = {
            enrollment: {
                ...enrollmentStats,
                failureRate: 100 - enrollmentStats.successRate,
                averagePerDay: timeframe === 'week'
                    ? Math.round(enrollmentStats.totalAttempts / 7)
                    : enrollmentStats.totalAttempts
            },
            coupons: {
                ...couponStats,
                successRate: couponStats.totalUsage > 0
                    ? Math.round((couponStats.successfulUsage / couponStats.totalUsage) * 100 * 100) / 100
                    : 0,
                failureRate: couponStats.totalUsage > 0
                    ? Math.round((couponStats.failedUsage / couponStats.totalUsage) * 100 * 100) / 100
                    : 0
            },
            overview: {
                totalRevenue: enrollmentStats.successfulEnrollments * 100, // Estimated
                conversionRate: enrollmentStats.totalAttempts > 0
                    ? Math.round((enrollmentStats.successfulEnrollments / enrollmentStats.totalAttempts) * 100 * 100) / 100
                    : 0,
                timeframe,
                generatedAt: new Date().toISOString()
            }
        }

        logger.success('Analytics generated successfully');

        return NextResponse.json({
            success: true,
            data: metrics,
            meta: {
                timeframe,
                couponCode: couponCode || 'all',
                generatedAt: new Date().toISOString()
            }
        })

    } catch (error) {
        logger.error('Analytics API Error', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch analytics',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
    )
}
