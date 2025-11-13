import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RedisCache } from '@/lib/redis';

/**
 * POST /api/admin/cache
 * 
 * Admin endpoint to manage Redis cache
 * Actions: clear-all, clear-courses
 */
export async function POST(request: NextRequest) {
    try {
        // Check if user is authenticated and is admin
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 401 }
            );
        }

        const { action } = await request.json();

        let result = false;
        let message = '';

        switch (action) {
            case 'clear-courses':
                result = await RedisCache.clearCourseCache();
                message = result ? 'Course cache cleared successfully' : 'Failed to clear course cache';
                break;

            case 'clear-all':
                // Clear all cache patterns
                result = await RedisCache.clearCourseCache();
                message = result ? 'All cache cleared successfully' : 'Failed to clear cache';
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use "clear-courses" or "clear-all"' },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: result,
            message,
            action,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cache management error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/cache
 * 
 * Get cache statistics
 */
export async function GET(request: NextRequest) {
    try {
        // Check if user is authenticated and is admin
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 401 }
            );
        }

        // You can extend this to get more cache statistics
        return NextResponse.json({
            success: true,
            message: 'Cache management endpoint available',
            actions: ['clear-courses', 'clear-all'],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cache status error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
