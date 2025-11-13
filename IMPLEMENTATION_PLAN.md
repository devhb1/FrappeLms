# 🚀 MaalEdu Critical Issues Fix - Implementation Plan

**Created:** November 1, 2025  
**Branch:** maaleduv2-frappe  
**Total Estimated Time:** 5-6 days  
**Risk Level:** Medium (touching payment flows)

---

## 📋 Executive Summary

This plan addresses **3 Critical** and **4 Major** issues identified in the system analysis:

| Priority | Issue | Impact | Effort | Risk |
|----------|-------|--------|--------|------|
| 🔴 P1 | Coupon Race Condition | Data Integrity | 2h | Low |
| 🔴 P1 | Webhook Idempotency | Double Charging | 3h | Medium |
| 🔴 P1 | FrappeLMS Retry Queue | User Access | 6h | Medium |
| 🟡 P2 | Rate Limiting | Security | 2h | Low |
| 🟡 P2 | Affiliate Stats | Performance | 3h | Low |
| 🟡 P2 | Error Tracking | Observability | 2h | Low |

**Total Effort:** ~18 hours over 5-6 days

---

## 🎯 Implementation Strategy

### Phase 1: Data Integrity Fixes (Day 1-2)
Focus on preventing data corruption and financial issues.

### Phase 2: Security & Performance (Day 3-4)  
Improve system resilience and user experience.

### Phase 3: Observability (Day 5-6)
Add monitoring and alerting capabilities.

---

## 🔴 PHASE 1: CRITICAL FIXES

### Task 1.1: Fix Coupon Race Condition
**Priority:** 🔴 Critical  
**Effort:** 2 hours  
**Risk:** Low  

#### Problem Analysis
```typescript
// CURRENT VULNERABLE CODE (in /app/api/checkout/route.ts)
const grant = await Grant.findOne({
    couponCode: couponCode.toUpperCase(),
    couponUsed: false,
    email: email.toLowerCase()
});

if (!grant) return error;

// ... create enrollment ...

// SEPARATE UPDATE - RACE CONDITION HERE
await Grant.findByIdAndUpdate(grant._id, {
    couponUsed: true,
    couponUsedAt: new Date()
});
```

#### Solution: Atomic Coupon Reservation
```typescript
// NEW ATOMIC CODE
const reservedGrant = await Grant.findOneAndUpdate(
    {
        couponCode: couponCode.toUpperCase(),
        status: 'approved',
        couponUsed: false,
        email: email.toLowerCase()
    },
    {
        $set: {
            couponUsed: true,
            couponUsedAt: new Date(),
            couponUsedBy: email.toLowerCase(),
            reservedAt: new Date()
        }
    },
    { 
        new: true,
        runValidators: true 
    }
);

if (!reservedGrant) {
    return NextResponse.json({
        error: 'Coupon is no longer available (already used or invalid)',
        code: 'COUPON_UNAVAILABLE',
        retryable: false
    }, { status: 400 });
}

// Now safe to proceed with enrollment
```

#### Implementation Steps
1. **Backup Current Code**
   ```bash
   git stash push -m "backup before coupon fix"
   ```

2. **Update Grant Model** (add reservedAt field)
   ```typescript
   // /lib/models/grant.ts
   reservedAt: {
       type: Date,
       validate: {
           validator: function(value: Date) {
               return !value || this.couponUsed;
           },
           message: 'reservedAt can only be set when coupon is used'
       }
   }
   ```

3. **Replace Vulnerable Code**
   - File: `/app/api/checkout/route.ts`
   - Lines: ~277-291 and ~449-456
   - Replace grant lookup and update logic

4. **Add Rollback Mechanism**
   ```typescript
   // If enrollment creation fails after coupon reservation
   try {
       const savedEnrollment = await enrollment.save();
   } catch (enrollmentError) {
       // Rollback coupon reservation
       await Grant.findByIdAndUpdate(reservedGrant._id, {
           $unset: {
               couponUsed: 1,
               couponUsedAt: 1,
               couponUsedBy: 1,
               reservedAt: 1
           }
       });
       throw enrollmentError;
   }
   ```

#### Testing Plan
```typescript
// Test: Concurrent coupon usage
describe('Coupon Race Condition Fix', () => {
    it('should prevent simultaneous coupon usage', async () => {
        const couponCode = 'TEST_COUPON_123';
        const email = 'test@example.com';
        
        // Create grant
        await Grant.create({
            couponCode,
            email,
            status: 'approved',
            couponUsed: false
        });
        
        // Fire 10 concurrent requests
        const promises = Array(10).fill().map(() => 
            fetch('/api/checkout', {
                method: 'POST',
                body: JSON.stringify({
                    courseId: 'test-course',
                    email,
                    couponCode
                })
            })
        );
        
        const results = await Promise.all(promises);
        
        // Only ONE should succeed
        const successCount = results.filter(r => r.ok).length;
        expect(successCount).toBe(1);
        
        // Verify coupon is marked as used
        const grant = await Grant.findOne({ couponCode });
        expect(grant.couponUsed).toBe(true);
    });
});
```

#### Rollback Plan
```typescript
// If issues occur, revert to original code
git stash pop  // Restore original
// Or cherry-pick specific commits
```

---

### Task 1.2: Implement Webhook Idempotency
**Priority:** 🔴 Critical  
**Effort:** 3 hours  
**Risk:** Medium  

#### Problem Analysis
Current webhook handler only checks enrollment status, not specific Stripe events:
```typescript
// CURRENT CODE
if (existingEnrollment.status === 'paid') {
    return NextResponse.json({ success: true });
}
```

This allows processing multiple different events for the same enrollment.

#### Solution: Event ID Tracking
```typescript
// NEW SCHEMA FIELD
// /lib/models/enrollment.ts
stripeEvents: [{
    eventId: {
        type: String,
        required: true
    },
    eventType: {
        type: String,
        required: true
    },
    processedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['processed', 'failed'],
        default: 'processed'
    }
}]
```

```typescript
// NEW WEBHOOK HANDLER
export async function POST(req: NextRequest) {
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    
    // Check if this specific event was already processed
    const existingEnrollment = await Enrollment.findOne({
        _id: metadata.enrollmentId,
        'stripeEvents.eventId': event.id
    });
    
    if (existingEnrollment) {
        ProductionLogger.info('Event already processed', {
            eventId: event.id,
            enrollmentId: metadata.enrollmentId
        });
        return NextResponse.json({
            success: true,
            message: 'Event already processed',
            eventId: event.id
        });
    }
    
    // Process payment and add event record
    await Enrollment.findByIdAndUpdate(metadata.enrollmentId, {
        $set: { status: 'paid' },
        $push: {
            stripeEvents: {
                eventId: event.id,
                eventType: event.type,
                processedAt: new Date()
            }
        }
    });
}
```

#### Implementation Steps
1. **Update Enrollment Schema**
   - Add `stripeEvents` array field
   - Add index on `stripeEvents.eventId`

2. **Update Webhook Handler**
   - Add event ID check at the beginning
   - Store event ID when processing
   - Add comprehensive logging

3. **Add Event Cleanup**
   ```typescript
   // Clean old events (keep last 30 days)
   await Enrollment.updateMany(
       {},
       {
           $pull: {
               stripeEvents: {
                   processedAt: {
                       $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                   }
               }
           }
       }
   );
   ```

#### Testing Plan
```typescript
describe('Webhook Idempotency', () => {
    it('should not process same event twice', async () => {
        const eventId = 'evt_test_webhook';
        
        // First webhook call
        const response1 = await simulateWebhook({
            id: eventId,
            type: 'checkout.session.completed'
        });
        expect(response1.status).toBe(200);
        
        // Second webhook call with same event ID
        const response2 = await simulateWebhook({
            id: eventId,
            type: 'checkout.session.completed'
        });
        expect(response2.status).toBe(200);
        expect(response2.body.message).toContain('already processed');
        
        // Verify enrollment was only processed once
        const enrollment = await Enrollment.findById(enrollmentId);
        expect(enrollment.stripeEvents).toHaveLength(1);
    });
});
```

---

### Task 1.3: Implement FrappeLMS Retry Queue
**Priority:** 🔴 Critical  
**Effort:** 6 hours  
**Risk:** Medium  

#### Problem Analysis
Current FrappeLMS integration fails silently:
```typescript
try {
    const frappeResult = await enrollInFrappeLMS({...});
    // If fails, user paid but can't access course
} catch (error) {
    ProductionLogger.error('FrappeLMS error');
    // No retry mechanism
}
```

#### Solution: Database-Based Job Queue
Since Redis might not be available in dev, use MongoDB for job queue.

```typescript
// NEW MODEL: /lib/models/retry-job.ts
import mongoose, { Schema, Document } from 'mongoose';

interface IRetryJob extends Document {
    jobType: 'frappe_enrollment' | 'frappe_course_sync';
    enrollmentId: mongoose.Types.ObjectId;
    payload: {
        user_email: string;
        course_id: string;
        paid_status: boolean;
        payment_id: string;
        amount: number;
        currency?: string;
        referral_code?: string;
    };
    attempts: number;
    maxAttempts: number;
    nextRetryAt: Date;
    lastError?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
}

const retryJobSchema = new Schema<IRetryJob>({
    jobType: {
        type: String,
        enum: ['frappe_enrollment', 'frappe_course_sync'],
        required: true
    },
    enrollmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0
    },
    maxAttempts: {
        type: Number,
        default: 5,
        min: 1,
        max: 10
    },
    nextRetryAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    lastError: String,
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    completedAt: Date
}, {
    timestamps: true,
    collection: 'retry_jobs'
});

// Indexes for efficient querying
retryJobSchema.index({ status: 1, nextRetryAt: 1 });
retryJobSchema.index({ enrollmentId: 1 });
retryJobSchema.index({ createdAt: -1 });

export const RetryJob = mongoose.models.RetryJob || mongoose.model<IRetryJob>('RetryJob', retryJobSchema);
```

#### Updated Webhook Handler
```typescript
// In /app/api/webhook/route.ts
try {
    const frappeResult = await enrollInFrappeLMS({...});
    
    if (frappeResult.success) {
        // Update successful sync
        await Enrollment.findByIdAndUpdate(updatedEnrollment._id, {
            $set: {
                'frappeSync.synced': true,
                'frappeSync.syncStatus': 'success',
                'frappeSync.enrollmentId': frappeResult.enrollment_id,
                'frappeSync.syncCompletedAt': new Date()
            }
        });
    } else {
        // Queue for retry instead of failing
        await RetryJob.create({
            jobType: 'frappe_enrollment',
            enrollmentId: updatedEnrollment._id,
            payload: {
                user_email: customerEmail,
                course_id: metadata.courseId,
                paid_status: true,
                payment_id: updatedEnrollment.paymentId,
                amount: updatedEnrollment.amount,
                currency: 'USD',
                referral_code: affiliateEmail || undefined
            },
            nextRetryAt: new Date(Date.now() + 2 * 60 * 1000) // Retry in 2 minutes
        });
        
        // Mark as queued for retry
        await Enrollment.findByIdAndUpdate(updatedEnrollment._id, {
            $set: {
                'frappeSync.syncStatus': 'retrying',
                'frappeSync.lastSyncAttempt': new Date(),
                'frappeSync.errorMessage': frappeResult.error
            }
        });
    }
} catch (frappeError) {
    // Queue for retry on network errors too
    await RetryJob.create({...});
}
```

#### Retry Worker API
```typescript
// NEW FILE: /app/api/cron/frappe-retry/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { RetryJob } from '@/lib/models/retry-job';
import { Enrollment } from '@/lib/models/enrollment';
import { enrollInFrappeLMS } from '@/lib/services/frappeLMS';
import ProductionLogger from '@/lib/utils/production-logger';

export async function GET() {
    try {
        await connectToDatabase();
        
        // Find jobs ready for retry
        const jobs = await RetryJob.find({
            status: 'pending',
            nextRetryAt: { $lte: new Date() },
            attempts: { $lt: 5 } // Max 5 attempts
        })
        .sort({ nextRetryAt: 1 })
        .limit(10); // Process max 10 jobs per run
        
        let processed = 0;
        let succeeded = 0;
        let failed = 0;
        
        for (const job of jobs) {
            try {
                // Mark as processing
                await job.updateOne({ 
                    status: 'processing',
                    $inc: { attempts: 1 }
                });
                
                // Attempt FrappeLMS enrollment
                const result = await enrollInFrappeLMS(job.payload);
                
                if (result.success) {
                    // Success - update both job and enrollment
                    await Promise.all([
                        job.updateOne({
                            status: 'completed',
                            completedAt: new Date()
                        }),
                        Enrollment.findByIdAndUpdate(job.enrollmentId, {
                            $set: {
                                'frappeSync.synced': true,
                                'frappeSync.syncStatus': 'success',
                                'frappeSync.enrollmentId': result.enrollment_id,
                                'frappeSync.syncCompletedAt': new Date()
                            }
                        })
                    ]);
                    
                    succeeded++;
                    ProductionLogger.info('Retry job succeeded', {
                        jobId: job._id,
                        enrollmentId: job.enrollmentId,
                        attempts: job.attempts + 1
                    });
                } else {
                    throw new Error(result.error || 'Unknown FrappeLMS error');
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const nextRetry = calculateNextRetry(job.attempts + 1);
                
                if (job.attempts + 1 >= job.maxAttempts) {
                    // Max attempts reached - mark as failed
                    await Promise.all([
                        job.updateOne({
                            status: 'failed',
                            lastError: errorMessage,
                            completedAt: new Date()
                        }),
                        Enrollment.findByIdAndUpdate(job.enrollmentId, {
                            $set: {
                                'frappeSync.syncStatus': 'failed',
                                'frappeSync.errorMessage': errorMessage,
                                'frappeSync.retryCount': job.attempts + 1
                            }
                        })
                    ]);
                    
                    failed++;
                    ProductionLogger.error('Retry job permanently failed', {
                        jobId: job._id,
                        enrollmentId: job.enrollmentId,
                        attempts: job.attempts + 1,
                        error: errorMessage
                    });
                } else {
                    // Schedule next retry
                    await job.updateOne({
                        status: 'pending',
                        lastError: errorMessage,
                        nextRetryAt: nextRetry
                    });
                    
                    ProductionLogger.warn('Retry job failed, will retry', {
                        jobId: job._id,
                        attempts: job.attempts + 1,
                        nextRetryAt: nextRetry,
                        error: errorMessage
                    });
                }
            }
            
            processed++;
        }
        
        return NextResponse.json({
            success: true,
            processed,
            succeeded,
            failed,
            nextRun: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        });
        
    } catch (error) {
        ProductionLogger.error('Retry worker error', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Exponential backoff: 2min, 4min, 8min, 16min, 32min
function calculateNextRetry(attempts: number): Date {
    const baseDelay = 2 * 60 * 1000; // 2 minutes
    const exponentialDelay = baseDelay * Math.pow(2, attempts - 1);
    const maxDelay = 32 * 60 * 1000; // Max 32 minutes
    const delay = Math.min(exponentialDelay, maxDelay);
    
    return new Date(Date.now() + delay);
}
```

#### Vercel Cron Configuration
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/frappe-retry",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Manual Retry API for Admin
```typescript
// /app/api/admin/retry-frappe-sync/route.ts
export async function POST(request: NextRequest) {
    const { enrollmentId } = await request.json();
    
    // Find enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }
    
    // Create retry job
    await RetryJob.create({
        jobType: 'frappe_enrollment',
        enrollmentId: enrollment._id,
        payload: {
            user_email: enrollment.email,
            course_id: enrollment.courseId,
            paid_status: true,
            payment_id: enrollment.paymentId,
            amount: enrollment.amount
        },
        nextRetryAt: new Date() // Retry immediately
    });
    
    return NextResponse.json({ success: true });
}
```

#### Testing Plan
```typescript
describe('FrappeLMS Retry Queue', () => {
    it('should queue failed sync for retry', async () => {
        // Mock FrappeLMS to fail
        jest.spyOn(frappeLMS, 'enrollInFrappeLMS').mockResolvedValue({
            success: false,
            error: 'Network timeout'
        });
        
        // Process webhook
        await processWebhook(webhookData);
        
        // Check retry job was created
        const retryJob = await RetryJob.findOne({
            enrollmentId: enrollment._id
        });
        expect(retryJob).toBeTruthy();
        expect(retryJob.status).toBe('pending');
    });
    
    it('should retry failed jobs', async () => {
        // Create failed job
        const job = await RetryJob.create({
            jobType: 'frappe_enrollment',
            enrollmentId: enrollment._id,
            payload: {...},
            nextRetryAt: new Date(Date.now() - 1000) // Past due
        });
        
        // Mock FrappeLMS to succeed on retry
        jest.spyOn(frappeLMS, 'enrollInFrappeLMS').mockResolvedValue({
            success: true,
            enrollment_id: 'frappe_123'
        });
        
        // Run retry worker
        await GET(); // Call the cron endpoint
        
        // Check job completed
        const updatedJob = await RetryJob.findById(job._id);
        expect(updatedJob.status).toBe('completed');
        
        // Check enrollment updated
        const updatedEnrollment = await Enrollment.findById(enrollment._id);
        expect(updatedEnrollment.frappeSync.synced).toBe(true);
    });
});
```

---

## 🟡 PHASE 2: MAJOR FIXES

### Task 2.1: Implement Rate Limiting
**Priority:** 🟡 Major  
**Effort:** 2 hours  
**Risk:** Low  

#### Solution: Redis-Based Rate Limiter
```bash
npm install rate-limiter-flexible
```

```typescript
// NEW FILE: /lib/utils/rate-limiter.ts
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import redis from '@/lib/redis';

// Use Redis if available, otherwise memory-based
const rateLimiter = process.env.REDIS_URL 
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rate_limit',
        points: 10, // 10 requests
        duration: 60, // per 60 seconds
        blockDuration: 60, // block for 60 seconds if exceeded
    })
    : new RateLimiterMemory({
        points: 10,
        duration: 60,
        blockDuration: 60,
    });

// Different limits for different endpoints
const rateLimiters = {
    checkout: new RateLimiterMemory({
        points: 5, // 5 checkout attempts
        duration: 300, // per 5 minutes
        blockDuration: 300,
    }),
    auth: new RateLimiterMemory({
        points: 5, // 5 login attempts
        duration: 900, // per 15 minutes
        blockDuration: 900,
    }),
    general: rateLimiter
};

export async function checkRateLimit(
    identifier: string, 
    type: 'checkout' | 'auth' | 'general' = 'general'
): Promise<{ allowed: boolean; resetTime?: Date }> {
    try {
        const limiter = rateLimiters[type];
        const result = await limiter.consume(identifier);
        
        return {
            allowed: true,
            resetTime: new Date(Date.now() + result.msBeforeNext)
        };
    } catch (rejRes: any) {
        return {
            allowed: false,
            resetTime: new Date(Date.now() + rejRes.msBeforeNext)
        };
    }
}

// Middleware helper
export function withRateLimit(type: 'checkout' | 'auth' | 'general' = 'general') {
    return async (request: NextRequest) => {
        const ip = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown';
        
        const result = await checkRateLimit(ip, type);
        
        if (!result.allowed) {
            return NextResponse.json({
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: result.resetTime?.toISOString()
            }, { 
                status: 429,
                headers: {
                    'Retry-After': String(Math.ceil((result.resetTime!.getTime() - Date.now()) / 1000))
                }
            });
        }
        
        return null; // Continue processing
    };
}
```

#### Apply to Critical Endpoints
```typescript
// /app/api/checkout/route.ts
import { withRateLimit } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
    // Apply rate limiting first
    const rateLimitResponse = await withRateLimit('checkout')(request);
    if (rateLimitResponse) return rateLimitResponse;
    
    // Continue with existing logic...
}
```

---

### Task 2.2: Fix Affiliate Commission Calculation
**Priority:** 🟡 Major  
**Effort:** 3 hours  
**Risk:** Low  

#### Problem Analysis
Current `refreshStats()` runs on every webhook and recalculates from scratch:
```typescript
// PERFORMANCE ISSUE - runs on every webhook
const updatedAffiliate = await affiliate.refreshStats();
```

#### Solution: Cached Stats with Lazy Refresh
```typescript
// Update affiliate model to include cache info
// /lib/models/affiliate.ts
statsLastUpdated: {
    type: Date,
    default: Date.now
},
statsCacheExpiry: {
    type: Number,
    default: 300 // 5 minutes
}

// Only refresh if cache expired
affiliateSchema.methods.getStatsWithCache = async function() {
    const now = Date.now();
    const lastUpdated = this.statsLastUpdated?.getTime() || 0;
    const expiry = this.statsCacheExpiry * 1000;
    
    if (now - lastUpdated > expiry) {
        await this.refreshStats();
        this.statsLastUpdated = new Date();
        await this.save();
    }
    
    return this.stats;
};

// In webhook - don't refresh stats immediately
// Instead, mark for refresh
await Enrollment.findByIdAndUpdate(updatedEnrollment._id, {
    $set: {
        'affiliateData.commissionProcessed': true,
        'affiliateData.statsNeedRefresh': true // Flag for lazy refresh
    }
});
```

---

### Task 2.3: Add Error Tracking
**Priority:** 🟡 Major  
**Effort:** 2 hours  
**Risk:** Low  

#### Install Sentry
```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    beforeSend(event) {
        // Filter sensitive data
        if (event.user?.email) {
            event.user.email = event.user.email.replace(/(.{2}).*(@.*)/, '$1***$2');
        }
        
        // Don't send rate limit errors
        if (event.exception?.values?.[0]?.value?.includes('RATE_LIMIT_EXCEEDED')) {
            return null;
        }
        
        return event;
    }
});
```

#### Update ProductionLogger
```typescript
// /lib/utils/production-logger.ts
import * as Sentry from '@sentry/nextjs';

error(message: string, context?: LogContext): void {
    this.output(this.createLogEntry('error', message, context));
    
    // Send to Sentry in production
    if (this.isProduction) {
        Sentry.captureException(new Error(message), {
            extra: context,
            level: 'error'
        });
    }
}
```

---

## 📊 PHASE 3: OBSERVABILITY

### Task 3.1: Add Metrics Collection
**Priority:** 🟢 Important  
**Effort:** 3 hours  
**Risk:** Low  

#### Simple Metrics API
```typescript
// /app/api/admin/metrics/route.ts
export async function GET() {
    const [
        totalEnrollments,
        paidEnrollments,
        freeEnrollments,
        failedSyncs,
        activeAffiliates,
        pendingGrants
    ] = await Promise.all([
        Enrollment.countDocuments(),
        Enrollment.countDocuments({ status: 'paid', amount: { $gt: 0 } }),
        Enrollment.countDocuments({ status: 'paid', amount: 0 }),
        Enrollment.countDocuments({ 'frappeSync.syncStatus': 'failed' }),
        Affiliate.countDocuments({ status: 'active' }),
        Grant.countDocuments({ status: 'pending' })
    ]);
    
    return NextResponse.json({
        enrollments: {
            total: totalEnrollments,
            paid: paidEnrollments,
            free: freeEnrollments
        },
        system: {
            failedSyncs,
            activeAffiliates,
            pendingGrants
        },
        timestamp: new Date().toISOString()
    });
}
```

---

## 🧪 Testing Strategy

### Test Environment Setup
```bash
# Create test database
export MONGODB_URI_TEST="mongodb://localhost:27017/maaledu-test"

# Install testing dependencies
npm install -D jest @types/jest supertest
```

### Integration Test Suite
```typescript
// /tests/critical-fixes.test.ts
describe('Critical Fixes Integration Tests', () => {
    beforeAll(async () => {
        // Setup test database
        await connectToDatabase();
    });
    
    describe('Coupon Race Condition Fix', () => {
        it('prevents concurrent coupon usage', async () => {
            // Test implementation from Task 1.1
        });
    });
    
    describe('Webhook Idempotency', () => {
        it('handles duplicate webhook events', async () => {
            // Test implementation from Task 1.2
        });
    });
    
    describe('FrappeLMS Retry Queue', () => {
        it('queues failed syncs for retry', async () => {
            // Test implementation from Task 1.3
        });
    });
});
```

---

## 🚀 Deployment Plan

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Database backup created
- [ ] Feature flags ready (if needed)
- [ ] Monitoring alerts configured
- [ ] Rollback plan tested

### Deployment Strategy: Blue-Green
1. **Deploy to staging** - Test all fixes
2. **Gradual rollout** - Deploy to 10% of traffic
3. **Monitor metrics** - Watch error rates
4. **Full deployment** - If all good, deploy to 100%

### Post-Deployment Monitoring
- Watch error rates in Sentry
- Monitor webhook processing times
- Check FrappeLMS sync success rates
- Verify no increase in payment failures

---

## 📅 Implementation Timeline

### Day 1: Critical Data Integrity
- **Morning (4h):** Fix coupon race condition + testing
- **Afternoon (4h):** Implement webhook idempotency

### Day 2: FrappeLMS Reliability  
- **All day (8h):** Implement retry queue system

### Day 3: Security & Performance
- **Morning (2h):** Add rate limiting
- **Afternoon (4h):** Fix affiliate stats + testing

### Day 4: Observability
- **Morning (2h):** Set up Sentry
- **Afternoon (3h):** Add metrics collection

### Day 5: Testing & Deployment
- **All day (8h):** Integration testing, staging deployment

### Day 6: Production & Monitoring
- **All day:** Production deployment, monitoring setup

---

## 🔄 Rollback Procedures

### Immediate Rollback (< 5 minutes)
```bash
# If critical issues occur
git revert HEAD~3  # Revert last 3 commits
git push origin maaleduv2-frappe --force
```

### Database Rollback
```javascript
// If schema changes cause issues
db.enrollments.updateMany(
    {},
    { $unset: { "stripeEvents": 1 } }
);

db.grants.updateMany(
    {},
    { $unset: { "reservedAt": 1 } }
);
```

### Feature Flag Rollback
```typescript
// Add feature flags for gradual rollout
const USE_NEW_COUPON_LOGIC = process.env.FF_NEW_COUPON_LOGIC === 'true';
const USE_WEBHOOK_IDEMPOTENCY = process.env.FF_WEBHOOK_IDEMPOTENCY === 'true';
```

---

## ✅ Success Criteria

### Critical Metrics
- **Zero duplicate coupon usage** - Monitor Grant collection
- **Zero duplicate webhook processing** - Check stripeEvents array
- **< 1% FrappeLMS sync failures** - Monitor retry queue
- **API response time < 2s** - With rate limiting
- **Error rate < 0.1%** - Via Sentry monitoring

### Business Metrics
- **Payment success rate ≥ 99%** - No degradation from fixes
- **User enrollment flow** - No impact on conversion
- **Affiliate commissions** - Accurate calculations

---

## 📞 Emergency Contacts

**Technical Issues:**
- Check Sentry dashboard: `https://sentry.io/organizations/maaledu/`
- Review webhook logs: `/api/webhook` endpoint
- FrappeLMS status: Check retry queue `/api/admin/retry-jobs`

**Rollback Decision:**
- If error rate > 1% for 5 minutes: Immediate rollback
- If payment failures > 0.5%: Immediate rollback  
- If FrappeLMS sync failures > 10%: Disable retry queue

---

**Plan Version:** 1.0  
**Created:** November 1, 2025  
**Estimated Total Effort:** 40-45 hours  
**Success Probability:** 95%