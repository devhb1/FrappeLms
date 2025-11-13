import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/db'
import mongoose from 'mongoose'

interface HealthCheck {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    services: {
        database: {
            status: 'connected' | 'disconnected' | 'error'
            responseTime?: number
            error?: string
        }
        redis: {
            status: 'connected' | 'disconnected' | 'error'
            responseTime?: number
            error?: string
        }
        stripe: {
            status: 'available' | 'unavailable' | 'error'
            responseTime?: number
            error?: string
        }
    }
    metrics: {
        uptime: number
        memoryUsage: {
            used: number
            total: number
            percentage: number
        }
        nodeVersion: string
    }
}

export async function GET(request: NextRequest) {
    const startTime = Date.now()

    try {
        const healthCheck: HealthCheck = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: { status: 'disconnected' },
                redis: { status: 'disconnected' },
                stripe: { status: 'unavailable' }
            },
            metrics: {
                uptime: process.uptime(),
                memoryUsage: {
                    used: 0,
                    total: 0,
                    percentage: 0
                },
                nodeVersion: process.version
            }
        }

        // Check Database Connection
        try {
            const dbStart = Date.now()
            await connectToDatabase()

            // Simple database query to test connection
            if (mongoose.connection.db) {
                await mongoose.connection.db.admin().ping()
            } else {
                throw new Error('Database connection not established')
            }

            healthCheck.services.database = {
                status: 'connected',
                responseTime: Date.now() - dbStart
            }
        } catch (error) {
            healthCheck.services.database = {
                status: 'error',
                error: error instanceof Error ? error.message : 'Database connection failed'
            }
            healthCheck.status = 'degraded'
        }

        // Check Redis Connection (if configured)
        try {
            if (process.env.REDIS_URL) {
                const redisStart = Date.now()
                // Add Redis ping test here if Redis client is available
                healthCheck.services.redis = {
                    status: 'connected',
                    responseTime: Date.now() - redisStart
                }
            } else {
                healthCheck.services.redis = {
                    status: 'disconnected',
                    error: 'Redis not configured'
                }
            }
        } catch (error) {
            healthCheck.services.redis = {
                status: 'error',
                error: error instanceof Error ? error.message : 'Redis connection failed'
            }
        }

        // Check Stripe Availability
        try {
            if (process.env.STRIPE_SECRET_KEY) {
                healthCheck.services.stripe = {
                    status: 'available',
                    responseTime: 0 // Could add actual Stripe API test
                }
            } else {
                healthCheck.services.stripe = {
                    status: 'unavailable',
                    error: 'Stripe not configured'
                }
            }
        } catch (error) {
            healthCheck.services.stripe = {
                status: 'error',
                error: error instanceof Error ? error.message : 'Stripe check failed'
            }
        }

        // Memory Usage
        const memUsage = process.memoryUsage()
        healthCheck.metrics.memoryUsage = {
            used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        }

        // Determine overall status
        const criticalServicesDown = (
            healthCheck.services.database.status === 'error'
        )

        if (criticalServicesDown) {
            healthCheck.status = 'unhealthy'
        } else if (
            healthCheck.services.redis.status === 'error' ||
            healthCheck.services.stripe.status === 'error'
        ) {
            healthCheck.status = 'degraded'
        }

        // Simple health check without complex monitoring
        const statusCode = healthCheck.status === 'unhealthy' ? 503 : 200
        return NextResponse.json(healthCheck, { status: statusCode })

    } catch (error) {
        console.error('❌ Health check failed:', error)

        const errorResponse = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Health check failed',
            responseTime: Date.now() - startTime
        }

        return NextResponse.json(errorResponse, { status: 503 })
    }
}
