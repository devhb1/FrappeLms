import { Redis } from 'ioredis';

// Parse Redis URL from environment variable
// The REDIS_URL contains a CLI command, we need to extract the actual URL
const getRedisUrl = (): string => {
    const redisEnv = process.env.REDIS_URL || '';

    // Extract the redis:// URL from the CLI command
    const urlMatch = redisEnv.match(/redis:\/\/[^@\s]+@[^:\s]+:\d+/);
    if (urlMatch) {
        return urlMatch[0];
    }

    // Fallback to a default Redis URL if parsing fails
    console.warn('⚠️ Could not parse Redis URL, using localhost fallback');
    return 'redis://localhost:6379';
};

const redisUrl = getRedisUrl();

// Check if we're in development and Redis is actually available
const isProduction = process.env.NODE_ENV === 'production';
const hasValidRedisUrl = process.env.REDIS_URL && !process.env.REDIS_URL.includes('localhost');

if (!isProduction && !hasValidRedisUrl) {
    console.log('� Development mode: Redis caching disabled');
} else {
    console.log('�🔗 Redis URL:', redisUrl.replace(/\/\/[^@]+@/, '//***:***@')); // Log URL with hidden credentials
}

// Create Redis client with conditional connection
const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true, // Don't connect immediately
    // Add TLS config for Upstash
    tls: redisUrl.includes('upstash') ? {} : undefined,
    // Reduce connection timeout for faster failures
    connectTimeout: 3000,
    enableOfflineQueue: false, // Don't queue commands when disconnected
});

// Redis key prefixes
export const REDIS_KEYS = {
    COURSES_LIST: (sortBy: string) => `courses:list:${sortBy}`,
    COURSE_DETAIL: (courseId: string) => `course:detail:${courseId}`,
    COURSE_COUNT: 'courses:count',
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
    COURSES_LIST: 300, // 5 minutes
    COURSE_DETAIL: 600, // 10 minutes
    COURSE_COUNT: 300, // 5 minutes
} as const;

// Redis utility functions
export class RedisCache {
    /**
     * Get cached data
     */
    static async get<T>(key: string): Promise<T | null> {
        try {
            // Skip Redis in development if not properly configured
            if (process.env.NODE_ENV !== 'production' && !process.env.REDIS_URL?.includes('upstash')) {
                return null;
            }

            const cached = await redis.get(key);
            if (cached) {
                return JSON.parse(cached) as T;
            }
            return null;
        } catch (error) {
            // Only log error in production or when Redis should be working
            if (process.env.NODE_ENV === 'production') {
                console.error('Redis GET error:', error);
            }
            return null;
        }
    }

    /**
     * Set data in cache with TTL
     */
    static async set(key: string, data: any, ttl: number): Promise<boolean> {
        try {
            // Skip Redis in development if not properly configured
            if (process.env.NODE_ENV !== 'production' && !process.env.REDIS_URL?.includes('upstash')) {
                return false;
            }

            await redis.setex(key, ttl, JSON.stringify(data));
            return true;
        } catch (error) {
            // Only log error in production or when Redis should be working
            if (process.env.NODE_ENV === 'production') {
                console.error('Redis SET error:', error);
            }
            return false;
        }
    }

    /**
     * Delete cached data
     */
    static async del(key: string): Promise<boolean> {
        try {
            await redis.del(key);
            return true;
        } catch (error) {
            console.error('Redis DEL error:', error);
            return false;
        }
    }

    /**
     * Delete multiple keys with pattern
     */
    static async delPattern(pattern: string): Promise<boolean> {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
            return true;
        } catch (error) {
            console.error('Redis DEL pattern error:', error);
            return false;
        }
    }

    /**
     * Check if key exists
     */
    static async exists(key: string): Promise<boolean> {
        try {
            const result = await redis.exists(key);
            return result === 1;
        } catch (error) {
            console.error('Redis EXISTS error:', error);
            return false;
        }
    }

    /**
     * Get TTL for a key
     */
    static async ttl(key: string): Promise<number> {
        try {
            return await redis.ttl(key);
        } catch (error) {
            console.error('Redis TTL error:', error);
            return -1;
        }
    }

    /**
     * Clear all course-related cache
     */
    static async clearCourseCache(): Promise<boolean> {
        try {
            await Promise.all([
                this.delPattern('courses:*'),
                this.delPattern('course:*'),
            ]);
            console.log('✅ Course cache cleared');
            return true;
        } catch (error) {
            console.error('❌ Error clearing course cache:', error);
            return false;
        }
    }
}

// Connection status - only log in production or when Redis should work
redis.on('connect', () => {
    if (process.env.NODE_ENV === 'production' || process.env.REDIS_URL?.includes('upstash')) {
        console.log('✅ Redis connected');
    }
});

redis.on('error', (error) => {
    // Silently handle Redis errors - app works without cache
    // Only log critical errors, not connection failures
    if (process.env.NODE_ENV === 'production' && !error.message.includes('ENOTFOUND') && !error.message.includes('getaddrinfo')) {
        console.warn('⚠️ Redis unavailable, continuing without cache');
    }
});

export default redis;
