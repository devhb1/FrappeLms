/**
 * ===============================
 * ADMIN MIDDLEWARE UTILITY
 * ===============================
 * 
 * Centralized admin authentication and authorization middleware.
 * Ensures consistent admin access control across all admin endpoints.
 * 
 * Features:
 * - Session validation
 * - Role-based access control
 * - Request logging
 * - Error standardization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { User } from '@/lib/models/user';
import { logger, authLogger } from './production-logger';

export interface AdminAuthResult {
    success: boolean;
    user?: any;
    error?: NextResponse;
    session?: any;
}

/**
 * Validate admin authentication and authorization
 * 
 * @param request - Next.js request object
 * @param requireSuperAdmin - Whether to require super admin role (default: false)
 * @returns AdminAuthResult with success status and user info
 */
export async function validateAdminAuth(
    request: NextRequest,
    requireSuperAdmin: boolean = false
): Promise<AdminAuthResult> {
    try {
        // Get session
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            authLogger.log('Admin endpoint access without session', {
                path: request.nextUrl.pathname,
                method: request.method
            });

            return {
                success: false,
                error: NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                )
            };
        }

        // Connect to database and validate user
        await connectToDatabase();
        const user = await User.findOne({ email: session.user.email })
            .select('-password -verifyCode -verifyCodeExpiry');

        if (!user) {
            authLogger.log('Admin endpoint access by non-existent user', {
                email: session.user.email,
                path: request.nextUrl.pathname
            });

            return {
                success: false,
                error: NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                )
            };
        }

        // Check admin role
        if (user.role !== 'admin') {
            authLogger.log('Admin endpoint access by non-admin user', {
                email: session.user.email,
                role: user.role,
                path: request.nextUrl.pathname
            });

            return {
                success: false,
                error: NextResponse.json(
                    { error: 'Admin access required' },
                    { status: 403 }
                )
            };
        }

        // Check super admin if required
        if (requireSuperAdmin && !user.isSuperAdmin) {
            authLogger.log('Super admin endpoint access by regular admin', {
                email: session.user.email,
                path: request.nextUrl.pathname
            });

            return {
                success: false,
                error: NextResponse.json(
                    { error: 'Super admin access required' },
                    { status: 403 }
                )
            };
        }

        // Log successful admin access
        logger.info('Admin endpoint access authorized', {
            email: session.user.email,
            role: user.role,
            path: request.nextUrl.pathname,
            method: request.method,
            userAgent: request.headers.get('user-agent')?.slice(0, 100)
        });

        return {
            success: true,
            user,
            session
        };

    } catch (error: any) {
        logger.error('Admin authentication error', {
            error: error.message,
            path: request.nextUrl.pathname,
            stack: error.stack
        });

        return {
            success: false,
            error: NextResponse.json(
                { error: 'Authentication failed' },
                { status: 500 }
            )
        };
    }
}

/**
 * Create standardized admin API response
 */
export function createAdminResponse(
    data: any,
    options: {
        status?: number;
        message?: string;
        requestId?: string;
    } = {}
): NextResponse {
    const { status = 200, message, requestId } = options;

    const response = {
        success: status < 400,
        data: status < 400 ? data : undefined,
        error: status >= 400 ? data : undefined,
        message,
        timestamp: new Date().toISOString(),
        requestId
    };

    return NextResponse.json(response, { status });
}

/**
 * Log admin action for audit trail
 */
export function logAdminAction(
    action: string,
    userEmail: string,
    details: Record<string, any> = {}
): void {
    logger.info(`Admin Action: ${action}`, {
        adminEmail: userEmail,
        action,
        timestamp: new Date().toISOString(),
        ...details
    });
}

/**
 * Validate request body for admin operations
 */
export function validateAdminRequestBody<T>(
    body: any,
    requiredFields: (keyof T)[],
    optionalFields: (keyof T)[] = []
): { isValid: boolean; errors: string[]; data?: Partial<T> } {
    const errors: string[] = [];
    const data: Partial<T> = {};

    // Check required fields
    for (const field of requiredFields) {
        if (!body[field]) {
            errors.push(`${String(field)} is required`);
        } else {
            data[field] = body[field];
        }
    }

    // Include optional fields if present
    for (const field of optionalFields) {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data : undefined
    };
}

/**
 * Rate limiting for admin endpoints
 */
const adminRateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkAdminRateLimit(
    userEmail: string,
    action: string,
    maxRequests: number = 100,
    windowMinutes: number = 60
): { allowed: boolean; resetTime?: number } {
    const key = `${userEmail}:${action}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const current = adminRateLimits.get(key);

    if (!current || now > current.resetTime) {
        // First request or window expired
        adminRateLimits.set(key, {
            count: 1,
            resetTime: now + windowMs
        });
        return { allowed: true };
    }

    if (current.count >= maxRequests) {
        logger.warn('Admin rate limit exceeded', {
            userEmail,
            action,
            count: current.count,
            maxRequests
        });
        return { allowed: false, resetTime: current.resetTime };
    }

    // Increment count
    current.count++;
    adminRateLimits.set(key, current);

    return { allowed: true };
}

export default {
    validateAdminAuth,
    createAdminResponse,
    logAdminAction,
    validateAdminRequestBody,
    checkAdminRateLimit
};