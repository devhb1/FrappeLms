/**
 * ===============================
 * FRAPPE LMS RETRY WORKER API
 * ===============================
 * 
 * This is the heart of the retry queue system. It processes failed FrappeLMS
 * enrollment jobs with exponential backoff and automatic retry logic.
 * 
 * FEATURES:
 * ✅ Atomic job claiming to prevent duplicate processing
 * ✅ Exponential backoff: 2min, 4min, 8min, 16min, 32min
 * ✅ Comprehensive error handling and logging
 * ✅ Stuck job recovery mechanism
 * ✅ Detailed metrics and monitoring
 * 
 * DEPLOYMENT:
 * - Scheduled via Vercel cron job daily (Hobby plan limitation)
 * - Can also be triggered manually for immediate processing
 * - Safe to run multiple instances concurrently
 * 
 * MONITORING:
 * - GET endpoint provides queue health and statistics
 * - ProductionLogger integration for error tracking
 * - Built-in performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { RetryJob } from '@/lib/models/retry-job';
import { Enrollment } from '@/lib/models/enrollment';
import { enrollInFrappeLMS } from '@/lib/services/frappeLMS';
import ProductionLogger from '@/lib/utils/production-logger';
import { randomBytes } from 'crypto';

// Generate unique worker ID for this instance
const WORKER_NODE_ID = `worker-${randomBytes(4).toString('hex')}-${Date.now()}`;

// POST: Process retry queue
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    let processedCount = 0;
    let succeededCount = 0;
    let failedCount = 0;
    let permanentlyFailedCount = 0;

    try {
        await connectToDatabase();

        ProductionLogger.info('Retry worker started', {
            workerNodeId: WORKER_NODE_ID,
            timestamp: new Date().toISOString()
        });

        // First, release any stuck jobs (processing too long)
        const releasedCount = await RetryJob.releaseStuckJobs();
        if (releasedCount > 0) {
            ProductionLogger.warn('Released stuck jobs', {
                count: releasedCount,
                workerNodeId: WORKER_NODE_ID
            });
        }

        // Process up to 50 jobs per run (daily schedule allows more processing)
        const maxJobs = 50;
        const processedJobs = [];

        for (let i = 0; i < maxJobs; i++) {
            // Atomically claim next available job
            const job = await RetryJob.claimNextJob(WORKER_NODE_ID);

            if (!job) {
                break; // No more jobs available
            }

            processedCount++;
            const jobStartTime = Date.now();

            try {
                ProductionLogger.info('Processing retry job', {
                    jobId: job._id,
                    jobType: job.jobType,
                    enrollmentId: job.enrollmentId,
                    attempts: job.attempts,
                    workerNodeId: WORKER_NODE_ID
                });

                // Process the FrappeLMS enrollment
                const result = await enrollInFrappeLMS(job.payload);

                if (result.success) {
                    // Success - update both job and enrollment
                    await Promise.all([
                        // Mark job as completed
                        RetryJob.findByIdAndUpdate(job._id, {
                            $set: {
                                status: 'completed',
                                completedAt: new Date()
                            },
                            $unset: {
                                workerNodeId: 1,
                                processingStartedAt: 1,
                                processingTimeout: 1
                            }
                        }),

                        // Update enrollment with success
                        Enrollment.findByIdAndUpdate(job.enrollmentId, {
                            $set: {
                                'frappeSync.synced': true,
                                'frappeSync.syncStatus': 'success',
                                'frappeSync.enrollmentId': result.enrollment_id,
                                'frappeSync.syncCompletedAt': new Date(),
                                'frappeSync.lastSyncAttempt': new Date()
                            },
                            $unset: {
                                'frappeSync.retryJobId': 1
                            }
                        })
                    ]);

                    succeededCount++;
                    const processingTime = Date.now() - jobStartTime;

                    ProductionLogger.info('Retry job succeeded', {
                        jobId: job._id,
                        enrollmentId: job.enrollmentId,
                        frappeEnrollmentId: result.enrollment_id,
                        attempts: job.attempts,
                        processingTimeMs: processingTime,
                        workerNodeId: WORKER_NODE_ID
                    });

                    processedJobs.push({
                        jobId: job._id,
                        status: 'success',
                        attempts: job.attempts,
                        processingTimeMs: processingTime
                    });

                } else {
                    throw new Error(result.error || 'Unknown FrappeLMS error');
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const processingTime = Date.now() - jobStartTime;

                // Calculate next retry time
                const nextRetry = job.calculateNextRetry();

                if (job.attempts >= job.maxAttempts) {
                    // Max attempts reached - mark as permanently failed
                    await Promise.all([
                        // Mark job as failed
                        RetryJob.findByIdAndUpdate(job._id, {
                            $set: {
                                status: 'failed',
                                lastError: errorMessage,
                                completedAt: new Date()
                            },
                            $unset: {
                                workerNodeId: 1,
                                processingStartedAt: 1,
                                processingTimeout: 1
                            }
                        }),

                        // Mark enrollment as permanently failed
                        Enrollment.findByIdAndUpdate(job.enrollmentId, {
                            $set: {
                                'frappeSync.syncStatus': 'failed',
                                'frappeSync.errorMessage': errorMessage,
                                'frappeSync.retryCount': job.attempts,
                                'frappeSync.lastSyncAttempt': new Date()
                            },
                            $unset: {
                                'frappeSync.retryJobId': 1
                            }
                        })
                    ]);

                    permanentlyFailedCount++;

                    ProductionLogger.error('Retry job permanently failed', {
                        jobId: job._id,
                        enrollmentId: job.enrollmentId,
                        attempts: job.attempts,
                        maxAttempts: job.maxAttempts,
                        error: errorMessage,
                        processingTimeMs: processingTime,
                        workerNodeId: WORKER_NODE_ID
                    });

                    processedJobs.push({
                        jobId: job._id,
                        status: 'permanently_failed',
                        attempts: job.attempts,
                        error: errorMessage,
                        processingTimeMs: processingTime
                    });

                } else {
                    // Schedule next retry
                    await Promise.all([
                        // Update job for next retry
                        RetryJob.findByIdAndUpdate(job._id, {
                            $set: {
                                status: 'pending',
                                lastError: errorMessage,
                                nextRetryAt: nextRetry
                            },
                            $unset: {
                                workerNodeId: 1,
                                processingStartedAt: 1,
                                processingTimeout: 1
                            }
                        }),

                        // Update enrollment retry status
                        Enrollment.findByIdAndUpdate(job.enrollmentId, {
                            $set: {
                                'frappeSync.syncStatus': 'retrying',
                                'frappeSync.errorMessage': errorMessage,
                                'frappeSync.retryCount': job.attempts,
                                'frappeSync.lastSyncAttempt': new Date()
                            }
                        })
                    ]);

                    failedCount++;

                    ProductionLogger.warn('Retry job failed, will retry', {
                        jobId: job._id,
                        enrollmentId: job.enrollmentId,
                        attempts: job.attempts,
                        maxAttempts: job.maxAttempts,
                        nextRetryAt: nextRetry,
                        error: errorMessage,
                        processingTimeMs: processingTime,
                        workerNodeId: WORKER_NODE_ID
                    });

                    processedJobs.push({
                        jobId: job._id,
                        status: 'will_retry',
                        attempts: job.attempts,
                        nextRetryAt: nextRetry,
                        error: errorMessage,
                        processingTimeMs: processingTime
                    });
                }
            }
        }

        const totalTime = Date.now() - startTime;

        // Get queue statistics
        const queueStats = await RetryJob.getQueueStats();

        ProductionLogger.info('Retry worker completed', {
            workerNodeId: WORKER_NODE_ID,
            processedCount,
            succeededCount,
            failedCount,
            permanentlyFailedCount,
            totalTimeMs: totalTime,
            queueStats: queueStats
        });

        return NextResponse.json({
            success: true,
            message: 'Retry worker completed',
            stats: {
                processedCount,
                succeededCount,
                failedCount,
                permanentlyFailedCount,
                totalTimeMs: totalTime,
                averageTimePerJob: processedCount > 0 ? Math.round(totalTime / processedCount) : 0
            },
            processedJobs,
            queueStats,
            nextRun: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Next run in 5 minutes
            workerNodeId: WORKER_NODE_ID,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const totalTime = Date.now() - startTime;

        ProductionLogger.error('Retry worker failed', {
            workerNodeId: WORKER_NODE_ID,
            error: errorMessage,
            processedCount,
            succeededCount,
            failedCount,
            totalTimeMs: totalTime
        });

        return NextResponse.json({
            success: false,
            error: errorMessage,
            stats: {
                processedCount,
                succeededCount,
                failedCount,
                permanentlyFailedCount,
                totalTimeMs: totalTime
            },
            workerNodeId: WORKER_NODE_ID,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

// GET: Queue status and health check
export async function GET() {
    try {
        await connectToDatabase();

        const queueStats = await RetryJob.getQueueStats();

        // Get some sample pending jobs
        const samplePendingJobs = await RetryJob.find({
            status: 'pending',
            nextRetryAt: { $lte: new Date() }
        })
            .sort({ nextRetryAt: 1 })
            .limit(5)
            .select('_id jobType enrollmentId attempts nextRetryAt lastError createdAt');

        // Get some recent completed jobs
        const recentCompletedJobs = await RetryJob.find({
            status: 'completed'
        })
            .sort({ completedAt: -1 })
            .limit(5)
            .select('_id jobType enrollmentId attempts completedAt createdAt');

        // Get some failed jobs
        const recentFailedJobs = await RetryJob.find({
            status: 'failed'
        })
            .sort({ completedAt: -1 })
            .limit(5)
            .select('_id jobType enrollmentId attempts completedAt lastError createdAt');

        return NextResponse.json({
            status: 'operational',
            message: 'FrappeLMS retry queue service',
            queueStats,
            samples: {
                pendingJobs: samplePendingJobs,
                recentCompletedJobs,
                recentFailedJobs
            },
            usage: {
                triggerRetry: 'POST to manually trigger retry processing',
                autoSchedule: 'Automatically runs every 5 minutes via cron',
                monitoring: 'Check queueStats.queueHealth for overall status'
            },
            healthStatus: queueStats.queueHealth,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        ProductionLogger.error('Retry queue health check failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}