import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: RateLimitConfig) {
    return async (req: NextRequest): Promise<NextResponse | null> => {
        // Get client IP (handle proxies)
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || req.headers.get('x-real-ip')
            || 'unknown';

        const key = `ratelimit:${ip}`;
        const now = Date.now();

        // Clean up expired entries periodically
        if (Math.random() < 0.01) { // 1% chance
            for (const [k, v] of rateLimitStore.entries()) {
                if (v.resetTime < now) {
                    rateLimitStore.delete(k);
                }
            }
        }

        const record = rateLimitStore.get(key);

        if (!record || record.resetTime < now) {
            // New window
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + config.windowMs
            });
            return null; // Allow request
        }

        if (record.count >= config.maxRequests) {
            // Rate limit exceeded
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            return NextResponse.json({
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter
            }, {
                status: 429,
                headers: {
                    'Retry-After': retryAfter.toString(),
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
                }
            });
        }

        // Increment count
        record.count++;
        return null; // Allow request
    };
}

// Pre-configured rate limiters
export const checkoutRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10
});

export const couponRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
});
