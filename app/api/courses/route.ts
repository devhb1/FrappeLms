/**
 * ===============================
 * COURSES CATALOG API ENDPOINT
 * ===============================
 * 
 * This API provides the public course catalog for the MaalEdu platform.
 * It serves as the primary data source for the course listing page,
 * search functionality, and course filtering features.
 * 
 * KEY FEATURES:
 * 1. 🚀 REDIS CACHING: Intelligent caching based on query parameters
 * 2. 🔍 FLEXIBLE FILTERING: Level-based filtering with validation
 * 3. 📊 MULTIPLE SORTING: Custom order, popularity, price, date, alphabetical
 * 4. ⚡ PERFORMANCE OPTIMIZED: Field selection and query optimization
 * 5. 📱 PAGINATION SUPPORT: Configurable result limits
 * 
 * CACHING STRATEGY:
 * - Cache key includes all query parameters for accurate cache hits
 * - Different TTL for different query types
 * - Cache invalidation handled by course update operations
 * - Fallback to database if cache miss
 * 
 * QUERY PARAMETERS:
 * - level: Filter by course difficulty (Beginner/Intermediate/Advanced)
 * - limit: Maximum number of results (1-50)
 * - sortBy: Sorting method (custom/newest/popular/price_low/price_high/alphabetical)
 * 
 * RESPONSE FORMAT:
 * {
 *   "courses": [...],     // Array of course objects
 *   "total": number,      // Number of courses returned
 *   "cached": boolean,    // Whether result came from cache
 *   "timestamp": string   // Response generation time
 * }
 * 
 * @route GET /api/courses
 * @version 2.0 - Enhanced with Caching & Filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { Course } from '@/lib/models/course';
import { RedisCache, REDIS_KEYS, CACHE_TTL } from '@/lib/redis';

/**
 * ===============================
 * MAIN COURSES ENDPOINT HANDLER
 * ===============================
 * 
 * Handles GET requests for the course catalog with support for:
 * - Intelligent Redis caching based on query parameters
 * - Multiple filtering and sorting options
 * - Performance optimization with field selection
 * - Comprehensive error handling
 * 
 * BUSINESS LOGIC FLOW:
 * 1. Parse and validate query parameters
 * 2. Generate cache key from parameters
 * 3. Check Redis cache for existing results
 * 4. If cache miss, query database with optimized query
 * 5. Transform data for frontend compatibility
 * 6. Cache results and return response
 */
export async function GET(request: NextRequest) {
    try {
        // ===============================
        // QUERY PARAMETER EXTRACTION & VALIDATION
        // ===============================

        const { searchParams } = new URL(request.url);

        // Extract filtering parameters
        const level = searchParams.get('level');
        const limit = searchParams.get('limit');
        const sortBy = searchParams.get('sortBy') || 'custom'; // Default to admin-defined order

        // Validate level parameter
        const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
        const isValidLevel = !level || validLevels.includes(level);

        if (!isValidLevel) {
            return NextResponse.json({
                error: 'Invalid level parameter',
                validLevels,
                message: 'Level must be one of: Beginner, Intermediate, Advanced'
            }, { status: 400 });
        }

        // Validate and parse limit parameter
        let limitNum: number | null = null;
        if (limit) {
            limitNum = parseInt(limit);
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
                return NextResponse.json({
                    error: 'Invalid limit parameter',
                    message: 'Limit must be a number between 1 and 50'
                }, { status: 400 });
            }
        }

        // Validate sortBy parameter
        const validSortOptions = ['custom', 'newest', 'popular', 'price_low', 'price_high', 'alphabetical'];
        if (!validSortOptions.includes(sortBy)) {
            return NextResponse.json({
                error: 'Invalid sortBy parameter',
                validOptions: validSortOptions,
                message: 'sortBy must be one of the valid sorting options'
            }, { status: 400 });
        }

        // ===============================
        // REDIS CACHE LAYER
        // ===============================

        // Create unique cache key based on query parameters
        // This ensures different queries get different cache entries
        const cacheKey = REDIS_KEYS.COURSES_LIST(`${sortBy}-${level || 'all'}-${limitNum || 'all'}`);

        // Attempt to retrieve from Redis cache
        const cachedCourses = await RedisCache.get(cacheKey);
        if (cachedCourses && Array.isArray(cachedCourses)) {
            console.log(`✅ Courses served from Redis cache (key: ${cacheKey})`);
            return NextResponse.json({
                success: true,
                courses: cachedCourses,
                total: cachedCourses.length,
                cached: true,
                timestamp: new Date().toISOString(),
                cacheKey  // Include for debugging
            });
        }

        // ===============================
        // DATABASE QUERY CONSTRUCTION
        // ===============================

        // Cache miss - query database
        console.log(`💾 Cache miss for key: ${cacheKey}, querying database...`);
        await connectToDatabase();

        // Build MongoDB query object
        const query: any = { isActive: true };  // Only show active courses

        // Add level filter if specified
        if (level && validLevels.includes(level)) {
            query.level = level;
        }

        // ===============================
        // SORTING STRATEGY IMPLEMENTATION
        // ===============================

        /**
         * Determine sort order based on sortBy parameter:
         * 
         * - custom: Use admin-defined order field (1, 2, 3... priority)
         * - newest: Most recently created courses first
         * - popular: Highest enrollment count first, then newest
         * - price_low: Lowest price first, then custom order
         * - price_high: Highest price first, then custom order
         * - alphabetical: Title A-Z
         */
        let sortOrder: any;
        switch (sortBy) {
            case 'newest':
                sortOrder = { createdAt: -1 };
                break;
            case 'popular':
                sortOrder = { totalEnrollments: -1, createdAt: -1 };
                break;
            case 'price_low':
                sortOrder = { price: 1, order: 1 };
                break;
            case 'price_high':
                sortOrder = { price: -1, order: 1 };
                break;
            case 'alphabetical':
                sortOrder = { title: 1 };
                break;
            case 'custom':
            default:
                // Use admin-defined custom order (lower number = higher priority)
                sortOrder = { order: 1, createdAt: -1 };
                break;
        }

        // ===============================
        // OPTIMIZED DATABASE QUERY EXECUTION
        // ===============================

        // Build optimized query with field selection
        let coursesQuery = Course.find(query)
            .select('-__v -updatedAt -enrolledUsers')  // Exclude unnecessary/large fields
            .sort(sortOrder);

        // Apply limit if specified
        if (limitNum) {
            coursesQuery = coursesQuery.limit(limitNum);
        }

        // Execute query
        const courses = await coursesQuery.exec();

        console.log(`🔍 Found ${courses.length} courses matching query:`, {
            level: level || 'all',
            sortBy,
            limit: limitNum || 'unlimited'
        });

        // ===============================
        // DATA TRANSFORMATION FOR FRONTEND
        // ===============================

        /**
         * Transform database documents to frontend-compatible format.
         * This ensures consistent field naming and excludes internal fields.
         */
        const coursesData = courses.map(course => ({
            courseId: course.courseId,          // Unique identifier
            title: course.title,                // Course name
            description: course.description,    // Marketing description
            price: course.price,                // Price in USD (0 = free)
            duration: course.duration,          // Human-readable duration
            level: course.level,                // Difficulty level
            image: course.image,                // Thumbnail URL
            features: course.features,          // Key selling points
            totalEnrollments: course.totalEnrollments,  // Social proof
            createdAt: course.createdAt,        // For newest/oldest sorting
            order: course.order                 // Admin-defined priority
        }));

        // ===============================
        // CACHE STORAGE & RESPONSE
        // ===============================

        // Store results in Redis for future requests
        await RedisCache.set(cacheKey, coursesData, CACHE_TTL.COURSES_LIST);
        console.log(`💾 Courses cached to Redis with key: ${cacheKey}`);

        // Return successful response
        return NextResponse.json({
            success: true,
            courses: coursesData,
            total: coursesData.length,
            cached: false,
            query: {
                level: level || 'all',
                sortBy,
                limit: limitNum || 'unlimited'
            },
            timestamp: new Date().toISOString()
        }, { status: 200 });

    } catch (error) {
        // ===============================
        // COMPREHENSIVE ERROR HANDLING
        // ===============================

        console.error('❌ Error in courses API:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });

        // Return user-friendly error response
        return NextResponse.json({
            success: false,
            error: 'Unable to fetch courses',
            message: 'We\'re experiencing technical difficulties. Please try again later.',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
