/**
 * ===============================
 * RETRY JOB MODEL - Database-Backed Queue System
 * ===============================
 * 
 * This model implements a database-backed job queue system specifically designed
 * for retrying failed FrappeLMS operations. Since Redis might not be available
 * in all environments, this provides a reliable MongoDB-based alternative.
 * 
 * KEY FEATURES:
 * 1. 🔄 EXPONENTIAL BACKOFF: 2min, 4min, 8min, 16min, 32min retry intervals
 * 2. 📊 FAILURE TRACKING: Detailed error logging and attempt counting
 * 3. 🎯 JOB TYPES: Support for different types of retry operations
 * 4. 🛡️ CONCURRENCY SAFE: Atomic job claiming to prevent duplicate processing
 * 5. 📈 MONITORING: Built-in statistics and health checking
 * 
 * JOB LIFECYCLE:
 * 1. Job created in 'pending' status with immediate retry time
 * 2. Worker picks up job and marks as 'processing'
 * 3. Job succeeds -> marked as 'completed'
 * 4. Job fails -> retry count incremented, next retry time calculated
 * 5. Max attempts reached -> marked as 'failed'
 * 
 * SUPPORTED JOB TYPES:
 * - 'frappe_enrollment': Retry failed FrappeLMS course enrollments
 * - 'frappe_course_sync': Retry failed course information synchronization
 * 
 * @model RetryJob
 * @collection retry_jobs
 * @version 1.0 - Initial Implementation
 */

import mongoose, { Schema, Document } from 'mongoose';

// ===== RETRY JOB INTERFACE =====

export interface IRetryJob extends Document {
    jobType: 'frappe_enrollment' | 'frappe_course_sync';
    enrollmentId: mongoose.Types.ObjectId;

    // Job payload - contains all data needed to retry the operation
    payload: {
        user_email: string;
        course_id: string;
        paid_status: boolean;
        payment_id: string;
        amount: number;
        currency?: string;
        referral_code?: string;
        // Additional context data
        enrollmentType?: string;
        originalRequestId?: string;
    };

    // Retry management
    attempts: number;
    maxAttempts: number;
    nextRetryAt: Date;
    lastError?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';

    // Tracking
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;

    // Worker management
    workerNodeId?: string;      // Which worker claimed this job
    processingStartedAt?: Date; // When processing started
    processingTimeout?: Date;   // When to consider job abandoned

    // Instance methods
    calculateNextRetry(): Date;
    isExpired(): boolean;
    getSummary(): any;
}

// ===== RETRY JOB SCHEMA =====

const retryJobSchema = new Schema<IRetryJob>({
    jobType: {
        type: String,
        enum: {
            values: ['frappe_enrollment', 'frappe_course_sync'],
            message: 'Job type must be frappe_enrollment or frappe_course_sync'
        },
        required: [true, 'Job type is required']
    },

    enrollmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: [true, 'Enrollment ID is required']
    },

    payload: {
        user_email: {
            type: String,
            required: [true, 'User email is required'],
            lowercase: true,
            trim: true
        },
        course_id: {
            type: String,
            required: [true, 'Course ID is required'],
            trim: true
        },
        paid_status: {
            type: Boolean,
            required: [true, 'Paid status is required']
        },
        payment_id: {
            type: String,
            required: [true, 'Payment ID is required']
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount must be non-negative']
        },
        currency: {
            type: String,
            default: 'USD',
            uppercase: true
        },
        referral_code: String,
        enrollmentType: String,
        originalRequestId: String
    },

    attempts: {
        type: Number,
        default: 0,
        min: [0, 'Attempts cannot be negative']
    },

    maxAttempts: {
        type: Number,
        default: 5,
        min: [1, 'Max attempts must be at least 1'],
        max: [10, 'Max attempts cannot exceed 10']
    },

    nextRetryAt: {
        type: Date,
        required: [true, 'Next retry time is required'],
        default: Date.now
    },

    lastError: {
        type: String,
        maxlength: [2000, 'Error message too long']
    },

    status: {
        type: String,
        enum: {
            values: ['pending', 'processing', 'completed', 'failed'],
            message: 'Status must be pending, processing, completed, or failed'
        },
        default: 'pending'
    },

    completedAt: Date,

    // Worker management fields
    workerNodeId: {
        type: String,
        maxlength: [100, 'Worker node ID too long']
    },
    processingStartedAt: Date,
    processingTimeout: Date

}, {
    timestamps: true,
    collection: 'retry_jobs'
});

// ===== INDEXES FOR PERFORMANCE =====

// Primary index for worker queries
retryJobSchema.index({
    status: 1,
    nextRetryAt: 1
});

// Lookup by enrollment
retryJobSchema.index({ enrollmentId: 1 });

// Admin queries
retryJobSchema.index({ createdAt: -1 });
retryJobSchema.index({ jobType: 1, status: 1 });

// Worker management
retryJobSchema.index({
    status: 1,
    processingTimeout: 1
});

// ===== INSTANCE METHODS =====

/**
 * Calculate the next retry time using exponential backoff
 * Formula: baseDelay * 2^(attempts - 1), capped at maxDelay
 */
retryJobSchema.methods.calculateNextRetry = function (): Date {
    const baseDelay = 2 * 60 * 1000; // 2 minutes in milliseconds
    const maxDelay = 32 * 60 * 1000; // 32 minutes max

    const exponentialDelay = baseDelay * Math.pow(2, this.attempts);
    const delay = Math.min(exponentialDelay, maxDelay);

    // Add some jitter to prevent thundering herd (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    const finalDelay = Math.max(1000, delay + jitter); // Minimum 1 second

    return new Date(Date.now() + finalDelay);
};

/**
 * Check if this job has expired (been processing too long)
 */
retryJobSchema.methods.isExpired = function (): boolean {
    if (this.status !== 'processing' || !this.processingTimeout) {
        return false;
    }
    return new Date() > this.processingTimeout;
};

/**
 * Get job summary for monitoring
 */
retryJobSchema.methods.getSummary = function () {
    return {
        id: this._id,
        jobType: this.jobType,
        enrollmentId: this.enrollmentId,
        status: this.status,
        attempts: this.attempts,
        maxAttempts: this.maxAttempts,
        nextRetryAt: this.nextRetryAt,
        lastError: this.lastError?.substring(0, 100) + (this.lastError?.length > 100 ? '...' : ''),
        createdAt: this.createdAt,
        timeSinceCreation: Date.now() - this.createdAt.getTime()
    };
};

// ===== STATIC METHODS =====

// ===== STATIC METHODS INTERFACE =====
interface IRetryJobModel extends mongoose.Model<IRetryJob> {
    claimNextJob(workerNodeId: string): Promise<IRetryJob | null>;
    releaseStuckJobs(): Promise<number>;
    getQueueStats(): Promise<any>;
}

/**
 * Find and claim a job for processing (atomic operation)
 */
retryJobSchema.statics.claimNextJob = async function (workerNodeId: string) {
    const processingTimeout = new Date(Date.now() + 10 * 60 * 1000); // 10 minute timeout

    const job = await this.findOneAndUpdate(
        {
            status: 'pending',
            nextRetryAt: { $lte: new Date() },
            attempts: { $lt: 5 } // Max attempts check
        },
        {
            $set: {
                status: 'processing',
                workerNodeId,
                processingStartedAt: new Date(),
                processingTimeout
            },
            $inc: { attempts: 1 }
        },
        {
            new: true,
            sort: { nextRetryAt: 1 } // Oldest jobs first
        }
    );

    return job;
};

/**
 * Release stuck jobs (processing too long)
 */
retryJobSchema.statics.releaseStuckJobs = async function () {
    const result = await this.updateMany(
        {
            status: 'processing',
            processingTimeout: { $lt: new Date() }
        },
        {
            $set: {
                status: 'pending',
                nextRetryAt: new Date(Date.now() + 2 * 60 * 1000) // Retry in 2 minutes
            },
            $unset: {
                workerNodeId: 1,
                processingStartedAt: 1,
                processingTimeout: 1
            }
        }
    );

    return result.modifiedCount;
};

/**
 * Get queue statistics
 */
retryJobSchema.statics.getQueueStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                oldestJob: { $min: '$createdAt' },
                newestJob: { $max: '$createdAt' }
            }
        }
    ]);

    const totalJobs = await this.countDocuments();
    const pendingJobs = await this.countDocuments({
        status: 'pending',
        nextRetryAt: { $lte: new Date() }
    });

    return {
        totalJobs,
        pendingJobs,
        statusBreakdown: stats,
        queueHealth: pendingJobs < 100 ? 'healthy' : pendingJobs < 500 ? 'warning' : 'critical'
    };
};

// ===== RETRY JOB MODEL =====

export const RetryJob = (mongoose.models.RetryJob || mongoose.model<IRetryJob, IRetryJobModel>('RetryJob', retryJobSchema)) as IRetryJobModel;

export default RetryJob;