/**
 * ===============================
 * DATABASE CONNECTION MANAGER
 * ===============================
 * 
 * This module manages MongoDB connections for the MaalEdu platform using Mongoose.
 * It implements connection pooling and caching patterns optimized for serverless
 * environments like Vercel and Next.js API routes.
 * 
 * KEY FEATURES:
 * 1. 🔄 CONNECTION REUSE: Caches connections to prevent exhausting database limits
 * 2. 🚀 PERFORMANCE: Optimized for serverless cold starts and hot reloads
 * 3. 🛡️ RELIABILITY: Handles connection failures and automatic reconnection
 * 4. 📊 MONITORING: Built-in connection logging for debugging
 * 
 * SERVERLESS OPTIMIZATION:
 * - Global caching prevents new connections on every API call
 * - Efficient connection pooling for concurrent requests
 * - Graceful handling of connection timeouts
 * 
 * PRODUCTION CONSIDERATIONS:
 * - Uses MongoDB Atlas connection string with connection pooling
 * - Implements retry logic for transient connection failures
 * - Monitors connection health for operational alerts
 * 
 * @module DatabaseConnection
 * @version 2.0 - Serverless Optimized
 */

import mongoose from 'mongoose'
import { config } from '@/lib/config/environment'
import { logger } from '@/lib/utils/logger'

// ===============================
// CONNECTION CACHING INTERFACE
// ===============================

/**
 * Connection cache structure for serverless optimization.
 * Global caching prevents connection exhaustion in serverless environments
 * where each API call could potentially create a new connection.
 */
interface MongooseCache {
    conn: typeof mongoose | null            // Cached connection instance
    promise: Promise<typeof mongoose> | null   // Pending connection promise
}

// ===============================
// GLOBAL CONNECTION CACHE
// ===============================

/**
 * Global connection cache to maintain connections across hot reloads
 * in development and across function invocations in production.
 * 
 * This prevents the common serverless issue where each API call
 * creates a new database connection, leading to:
 * - Database connection pool exhaustion
 * - Increased latency from connection establishment
 * - Higher memory usage and resource costs
 */
let cached: MongooseCache = (global as any).mongoose

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null }
}

// ===============================
// MAIN CONNECTION FUNCTION
// ===============================

/**
 * Establishes and maintains MongoDB connection with caching and error handling.
 * 
 * CONNECTION STRATEGY:
 * 1. Return existing connection if available (cache hit)
 * 2. Return pending connection promise if connection in progress
 * 3. Create new connection with optimized settings
 * 4. Cache successful connection for future use
 * 
 * @returns Promise<mongoose> - Connected Mongoose instance
 */
async function connectToDatabase(): Promise<typeof mongoose> {
    // ===== CACHE HIT: Return existing connection =====
    if (cached.conn) {
        if (config.isDevelopment) {
            logger.debug('Using cached MongoDB connection')
        }
        return cached.conn
    }

    // ===== CONNECTION IN PROGRESS: Return existing promise =====
    if (!cached.promise) {
        if (config.isDevelopment) {
            logger.debug('Establishing new MongoDB connection')
        }

        // Configure connection options for production reliability
        // Configure connection options for production reliability
        const opts = {
            // ===== PERFORMANCE OPTIMIZATION =====
            bufferCommands: false,              // Disable command buffering for immediate errors
            maxPoolSize: 10,                    // Maximum number of connections in pool
            minPoolSize: 2,                     // Minimum connections to maintain
            maxIdleTimeMS: 30000,              // Close idle connections after 30s
            serverSelectionTimeoutMS: 5000,    // Timeout for server selection
            socketTimeoutMS: 45000,            // Socket timeout for operations

            // ===== RELIABILITY FEATURES =====
            heartbeatFrequencyMS: 10000,       // Ping server every 10s to maintain connection
            retryWrites: true,                 // Enable retryable writes for transient failures
            retryReads: true,                  // Enable retryable reads for network issues

            // ===== PRODUCTION OPTIMIZATIONS =====
            maxConnecting: 2,                  // Limit concurrent connection attempts
            connectTimeoutMS: 10000,           // Connection timeout
            family: 4,                         // Use IPv4 first
        }

        // ===== CONNECTION ESTABLISHMENT =====
        cached.promise = mongoose.connect(config.mongodbUri, opts).then((mongoose) => {
            if (config.isDevelopment) {
                logger.success('MongoDB connected successfully', {
                    database: mongoose.connection.db?.databaseName || 'unknown'
                })
            }
            return mongoose
        }).catch((error) => {
            logger.error('MongoDB connection failed', error);
            cached.promise = null  // Reset promise to allow retry
            throw error
        })
    }

    try {
        // ===== AWAIT CONNECTION COMPLETION =====
        cached.conn = await cached.promise
        if (config.isDevelopment) {
            logger.debug('Database connection ready for queries')
        }
        return cached.conn
    } catch (error) {
        logger.error('Fatal database connection error', error)
        cached.promise = null   // Reset for next attempt
        throw error
    }
}

// ===============================
// EXPORT DEFAULT CONNECTION
// ===============================

export default connectToDatabase

// ===============================
// CONNECTION HEALTH UTILITIES
// ===============================

/**
 * Checks if the database connection is healthy and ready for operations.
 * Useful for health checks and debugging connection issues.
 * 
 * @returns boolean - True if connection is ready
 */
export function isDatabaseConnected(): boolean {
    return mongoose.connection.readyState === 1
}

/**
 * Gets the current connection state as a human-readable string.
 * States: disconnected, connected, connecting, disconnecting
 * 
 * @returns string - Current connection state
 */
export function getConnectionState(): string {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
    return states[mongoose.connection.readyState] || 'unknown'
}

/**
 * Provides detailed connection information for debugging and monitoring.
 * Includes database name, host, and connection metrics.
 * 
 * @returns object - Connection details
 */
export function getConnectionInfo() {
    const { connection } = mongoose
    return {
        state: getConnectionState(),
        database: connection.db?.databaseName,
        host: connection.host,
        port: connection.port,
        name: connection.name,
        readyState: connection.readyState,
        collections: Object.keys(connection.collections),
    }
}
export { connectToDatabase as connectDB }
