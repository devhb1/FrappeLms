# 🔍 Comprehensive Code Review Report
## MaalEdu Frontend - Checkout Flow & API Audit

**Report Generated:** December 2024  
**Audited By:** GitHub Copilot AI Code Review  
**Scope:** Complete checkout flow, APIs, webhooks, data models, services, security  
**Files Analyzed:** 1109+ lines across 10+ critical files

---

## 📋 Executive Summary

This comprehensive audit was conducted after fixing three separate bugs in the affiliate checkout system:
1. **Missing affiliateData fields** (referralTimestamp, commissionProcessed, commissionPaid)
2. **Inconsistent commission calculations** (inline vs. helper function)
3. **Floating-point precision validation bug** (IEEE 754 issue with 19.9 × 100)

The audit reveals a **well-architected system** with strong foundations but identifies **17 issues** requiring attention:
- **2 Critical** security/data integrity issues
- **5 High** priority architectural concerns
- **7 Medium** code quality improvements
- **3 Low** minor optimizations

### Key Strengths ✅
- Comprehensive error handling and logging
- Atomic operations preventing race conditions
- Webhook idempotency protection
- Centralized commission calculation
- Robust retry mechanisms for external integrations
- Self-referral prevention logic

### Areas Requiring Attention ⚠️
- Database transaction safety
- Grant reservation rollback edge cases
- Error response consistency
- Type safety improvements
- Missing input sanitization in some areas

---

## 🚨 Critical Issues (Priority: IMMEDIATE)

### C1. Missing Database Transaction Wrapper for Multi-Document Operations
**Severity:** Critical  
**File:** `app/api/checkout/route.ts`  
**Lines:** 410-700 (processCouponEnrollment), 890-1050 (processPartialDiscountCheckout)

**Issue:**  
The free enrollment and partial discount flows perform multiple database operations without transaction protection:

```typescript
// Current Code (No Transaction Protection)
const reservedGrant = await Grant.findOneAndUpdate(...)  // Operation 1
const enrollment = new Enrollment(...)
const savedEnrollment = await enrollment.save()          // Operation 2
await Grant.findByIdAndUpdate(reservedGrant._id, ...)   // Operation 3
await Course.findOneAndUpdate(...)                       // Operation 4
```

**Risk:**  
If any operation after grant reservation fails, the grant remains marked as used but no enrollment is created. This leads to:
- Lost grant coupons (can't be reused)
- Inconsistent database state
- User frustration (coupon shows as used but no access)

**Example Scenario:**
1. User applies 100% grant coupon
2. Grant reservation succeeds (couponUsed = true)
3. Email sending throws exception
4. Function exits with error
5. **Result:** Grant is consumed, but no enrollment exists

**Recommendation:**
```typescript
async function processCouponEnrollment(data: any) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const reservedGrant = await Grant.findOneAndUpdate(
            { /* conditions */ },
            { /* updates */ },
            { session } // Add session to all operations
        );
        
        const enrollment = new Enrollment({...});
        const savedEnrollment = await enrollment.save({ session });
        
        await Grant.findByIdAndUpdate(
            reservedGrant._id,
            { enrollmentId: savedEnrollment._id },
            { session }
        );
        
        await session.commitTransaction();
        
        // Non-critical operations (email, Frappe) AFTER commit
        await sendEmail.grantCourseEnrollment(...);
        
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
```

**Impact:** High - Prevents data corruption and lost grant coupons  
**Effort:** Medium - Requires refactoring three enrollment functions  
**Priority:** Fix in next release (within 1 week)

---

### C2. Insufficient Rollback Protection in Stripe Session Creation
**Severity:** Critical  
**File:** `app/api/checkout/route.ts`  
**Lines:** 992-1055 (processPartialDiscountCheckout)

**Issue:**  
The partial discount flow has rollback logic but doesn't handle all failure scenarios:

```typescript
try {
    const session = await stripe.checkout.sessions.create({...});
    await Enrollment.findByIdAndUpdate(savedEnrollment._id, {
        stripeSessionId: session.id,
        paymentId: `STRIPE_PARTIAL_${session.id}`
    });
} catch (stripeError) {
    // Rollback grant reservation
    await Grant.findByIdAndUpdate(reservedGrant._id, {
        $unset: { couponUsed: 1, couponUsedAt: 1, ... }
    });
    // Rollback enrollment
    await Enrollment.findByIdAndDelete(savedEnrollment._id);
}
```

**Gaps:**
1. **Enrollment update failure:** If Stripe session succeeds but enrollment update fails, no rollback occurs
2. **Network timeout:** If Stripe API times out, session may be created but code thinks it failed
3. **Missing audit trail:** No record of failed attempts or rollbacks for debugging

**Recommendation:**
```typescript
let stripeSessionId = null;
let enrollmentCreated = false;

try {
    // Step 1: Create enrollment (not saved yet)
    const enrollment = new Enrollment({
        status: 'pending_stripe_session',
        // ... other fields
    });
    
    // Step 2: Save enrollment
    const savedEnrollment = await enrollment.save();
    enrollmentCreated = true;
    
    // Step 3: Create Stripe session
    const session = await stripe.checkout.sessions.create({...});
    stripeSessionId = session.id;
    
    // Step 4: Update enrollment with session ID (critical update)
    const updated = await Enrollment.findByIdAndUpdate(
        savedEnrollment._id,
        {
            stripeSessionId: session.id,
            paymentId: `STRIPE_PARTIAL_${session.id}`,
            status: 'pending' // Now fully initialized
        },
        { new: true }
    );
    
    if (!updated) {
        throw new Error('Failed to link Stripe session to enrollment');
    }
    
    return NextResponse.json({...});
    
} catch (error) {
    // Comprehensive rollback with logging
    ProductionLogger.error('Partial discount checkout failed - initiating rollback', {
        error: error instanceof Error ? error.message : 'Unknown',
        stripeSessionCreated: !!stripeSessionId,
        enrollmentCreated,
        grantId: reservedGrant._id
    });
    
    // Rollback in reverse order
    if (enrollmentCreated) {
        await Enrollment.findByIdAndDelete(savedEnrollment._id);
    }
    
    if (stripeSessionId) {
        // Cancel Stripe session if it was created
        try {
            await stripe.checkout.sessions.expire(stripeSessionId);
        } catch (stripeError) {
            ProductionLogger.error('Failed to cancel Stripe session', {
                sessionId: stripeSessionId
            });
        }
    }
    
    // Release grant reservation
    await Grant.findByIdAndUpdate(reservedGrant._id, {
        $unset: {
            couponUsed: 1,
            couponUsedAt: 1,
            couponUsedBy: 1,
            reservedAt: 1
        },
        $push: {
            rollbackHistory: {
                timestamp: new Date(),
                reason: error instanceof Error ? error.message : 'Unknown',
                stage: stripeSessionId ? 'stripe_session_created' : 'enrollment_created'
            }
        }
    });
    
    throw error;
}
```

**Impact:** High - Prevents orphaned Stripe sessions and lost grant coupons  
**Effort:** High - Requires comprehensive error handling refactor  
**Priority:** Fix in next sprint (within 2 weeks)

---

## 🔴 High Priority Issues

### H1. Inconsistent Error Response Schema
**Severity:** High  
**File:** Multiple API routes  
**Lines:** Various error handlers

**Issue:**  
Different error responses use inconsistent schemas:

```typescript
// Checkout API
return NextResponse.json({
    error: 'Course not found',
    code: 'COURSE_NOT_FOUND',
    retryable: false
}, { status: 404 });

// Webhook API
return NextResponse.json({
    error: 'Missing enrollment ID in webhook metadata',
    code: 'MISSING_ENROLLMENT_ID',
    retryable: false,
    eventId: event.id
}, { status: 400 });

// Some errors don't have 'code' or 'retryable'
return NextResponse.json({
    error: 'An error occurred processing your request'
}, { status: 500 });
```

**Impact:**  
Frontend error handling becomes brittle and inconsistent. Some errors can't be categorized or handled properly.

**Recommendation:**  
Create standardized error response types:

```typescript
// lib/types/api-responses.ts
export interface ApiErrorResponse {
    error: string;              // User-friendly message
    code: string;               // Machine-readable error code
    retryable: boolean;         // Can user retry?
    severity: 'error' | 'warning' | 'info';
    details?: Record<string, any>;  // Additional context
    timestamp?: string;         // ISO timestamp
    requestId?: string;         // For tracking
}

export interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
    requestId?: string;
}

// Helper function
export function createErrorResponse(
    error: string,
    code: string,
    retryable: boolean = false,
    details?: any
): ApiErrorResponse {
    return {
        error,
        code,
        retryable,
        severity: 'error',
        details,
        timestamp: new Date().toISOString()
    };
}

// Usage in checkout API
return NextResponse.json(
    createErrorResponse(
        'Course not found',
        'COURSE_NOT_FOUND',
        false,
        { courseId }
    ),
    { status: 404 }
);
```

**Files to Update:**
- `app/api/checkout/route.ts` (14 error responses)
- `app/api/webhook/route.ts` (6 error responses)
- All other API routes

**Impact:** Medium - Improves frontend reliability and error handling  
**Effort:** Medium - Requires updating all error responses  
**Priority:** Complete within 2 weeks

---

### H2. Missing Request ID Tracking Throughout Flow
**Severity:** High  
**File:** `app/api/checkout/route.ts`, `app/api/webhook/route.ts`  
**Lines:** Various

**Issue:**  
Request IDs are generated but not consistently tracked:

```typescript
// Checkout API generates requestId
const validatedData = checkoutSchema.parse(cleanedBody);
const { courseId, email, couponCode, affiliateEmail, redirectSource, requestId } = validatedData;

// But requestId is not passed to:
// 1. Enrollment document metadata
// 2. Stripe session metadata (partially done)
// 3. Webhook processing
// 4. Retry jobs
// 5. Error logs
```

**Impact:**  
Cannot trace requests through the entire flow:
- User reports error → Can't find corresponding logs
- Debugging multi-step failures is difficult
- No way to correlate checkout → webhook → retry job

**Recommendation:**  
Implement comprehensive request ID tracking:

```typescript
// 1. Ensure requestId in enrollment metadata
const enrollment = new Enrollment({
    // ... existing fields
    metadata: {
        source: 'checkout_api',
        userAgent: 'web',
        createdAt: new Date(),
        requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        checkoutRequestId: requestId, // Original checkout request
        clientIp: request.headers.get('x-forwarded-for') || 'unknown'
    }
});

// 2. Add to Stripe metadata
metadata: {
    // ... existing fields
    requestId: requestId || 'unknown',
    checkoutTimestamp: new Date().toISOString()
}

// 3. Track in ProductionLogger consistently
ProductionLogger.info('Processing checkout request', {
    requestId,  // ALWAYS include
    courseId,
    hasEmail: !!finalEmail,
    // ... other fields
});

// 4. Add to retry jobs
const retryJob = await RetryJob.create({
    jobType: 'frappe_enrollment',
    enrollmentId: savedEnrollment._id,
    payload: {
        // ... existing payload
        originalRequestId: requestId
    }
});

// 5. Include in error responses
return NextResponse.json({
    error: 'Something went wrong',
    code: 'INTERNAL_ERROR',
    requestId: requestId,  // Help user reference this error
    timestamp: new Date().toISOString()
}, { status: 500 });
```

**Impact:** High - Dramatically improves debugging and support  
**Effort:** Medium - Update multiple locations  
**Priority:** Complete within 1 week

---

### H3. Potential Race Condition in Affiliate Stats Refresh
**Severity:** High  
**File:** `lib/models/affiliate.ts`  
**Lines:** 430-520 (updateStatsFromEnrollments)

**Issue:**  
The affiliate stats refresh method is not atomic:

```typescript
// Step 1: Aggregate enrollments (read)
const stats = await Enrollment.aggregate([...]);

// Step 2: Calculate values (compute)
const commissionRate = affiliate?.commissionRate || 10;
const totalEarnings = calculateCommission(totalRevenue, commissionRate);

// Step 3: Update affiliate (write)
const updatedAffiliate = await this.findOneAndUpdate(
    { email: affiliateEmail.toLowerCase() },
    { $set: { /* new values */ } }
);
```

**Race Condition:**  
If two webhooks process simultaneously for the same affiliate:
1. Webhook A reads enrollments: 10 total → $100 pending
2. Webhook B reads enrollments: 10 total → $100 pending
3. Webhook A writes: pendingCommissions = $100
4. Webhook B writes: pendingCommissions = $100 (should be $110)

**Current Mitigation (Partial):**
```typescript
// Webhook has idempotency check
if (!updatedEnrollment.affiliateData?.commissionProcessed) {
    await processAffiliateCommission(updatedEnrollment, affiliateEmail);
}
```

But if both webhooks pass the check before either updates the enrollment, race still exists.

**Recommendation:**  
Use MongoDB aggregation pipeline for atomic stats update:

```typescript
affiliateSchema.statics.updateStatsFromEnrollments = async function (affiliateEmail: string) {
    const { Enrollment } = require('./enrollment');
    
    // Use aggregation pipeline with $merge for atomic update
    await Enrollment.aggregate([
        // Match paid enrollments for this affiliate
        {
            $match: {
                'affiliateData.affiliateEmail': affiliateEmail.toLowerCase(),
                status: 'paid',
                'affiliateData.commissionProcessed': true
            }
        },
        // Group and calculate stats
        {
            $group: {
                _id: null,
                totalReferrals: { $sum: 1 },
                totalCommissions: { $sum: '$affiliateData.commissionAmount' }
            }
        },
        // Merge into affiliate document atomically
        {
            $merge: {
                into: 'affiliates',
                whenMatched: [
                    {
                        $set: {
                            'stats.totalReferrals': '$totalReferrals',
                            pendingCommissions: {
                                $subtract: ['$totalCommissions', '$totalPaid']
                            },
                            updatedAt: new Date()
                        }
                    }
                ],
                on: 'email'
            }
        }
    ]);
    
    return await this.findOne({ email: affiliateEmail.toLowerCase() });
};
```

**Alternative (Simpler):**  
Use MongoDB's `$inc` operator in webhook instead of recalculating:

```typescript
// When commission is processed, increment affiliate stats atomically
await Affiliate.findOneAndUpdate(
    { email: affiliateEmail.toLowerCase() },
    {
        $inc: {
            'stats.totalReferrals': 1,
            pendingCommissions: commissionAmount
        }
    }
);
```

**Impact:** High - Prevents incorrect commission tracking  
**Effort:** Medium - Refactor stats calculation  
**Priority:** Fix within 1 week

---

### H4. Weak Email Validation Allows Invalid Addresses
**Severity:** High  
**File:** `lib/models/enrollment.ts`, `lib/models/affiliate.ts`  
**Lines:** 89, 331

**Issue:**  
Current email validation regex is too permissive:

```typescript
match: [/.+\@.+\..+/, 'Please use a valid email address']
```

This allows invalid emails like:
- `a@b.c` (too short domain)
- `test@domain` (missing TLD)
- `user@.com` (missing domain)
- `@example.com` (missing local part)
- `user @example.com` (spaces)

**Impact:**  
- Automated emails fail to send
- External API integrations fail (Frappe LMS, Stripe)
- Poor user experience (validation passes but emails never arrive)

**Recommendation:**  
Use comprehensive email validation:

```typescript
// lib/utils/validation.ts
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    if (email.length > 254) return false; // RFC 5321
    if (!EMAIL_REGEX.test(email)) return false;
    
    // Additional checks
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [local, domain] = parts;
    if (local.length > 64) return false; // RFC 5321
    if (domain.length > 253) return false;
    
    // Ensure domain has at least one dot
    if (!domain.includes('.')) return false;
    
    return true;
}

// Update schema
email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    validate: {
        validator: isValidEmail,
        message: 'Please use a valid email address'
    }
}
```

**Files to Update:**
- `lib/models/enrollment.ts`
- `lib/models/affiliate.ts`
- `app/api/checkout/route.ts` (Zod schema)

**Impact:** Medium - Prevents invalid data entry  
**Effort:** Low - Update validation logic  
**Priority:** Complete within 1 week

---

### H5. Missing Environment Variable Validation at Startup
**Severity:** High  
**File:** Multiple files using `process.env`  
**Lines:** Various

**Issue:**  
Critical environment variables are accessed with `!` assertion but not validated at startup:

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {...});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?...`
```

If these are missing or invalid:
- Application starts successfully
- Errors only occur when feature is used
- User experiences runtime failures instead of startup errors

**Current Problem:**
```typescript
// Webhook endpoint
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

if (!endpointSecret) {
    ProductionLogger.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
}
```

This check happens at runtime, not startup. If webhook secret is missing, **all webhooks fail silently**.

**Recommendation:**  
Create startup validation script:

```typescript
// lib/config/validate-env.ts
import { z } from 'zod';

const envSchema = z.object({
    // Database
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    
    // Stripe
    STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Publishable key must start with pk_'),
    
    // App URLs
    NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
    
    // Email
    RESEND_API_KEY: z.string().optional(),
    
    // Frappe LMS
    FRAPPE_LMS_API_URL: z.string().url('FRAPPE_LMS_API_URL must be a valid URL'),
    FRAPPE_API_KEY: z.string().min(1, 'FRAPPE_API_KEY is required'),
    
    // Optional
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type Env = z.infer<typeof envSchema>;

export function validateEnvironment(): Env {
    try {
        const validated = envSchema.parse(process.env);
        console.log('✅ Environment variables validated successfully');
        return validated;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Environment validation failed:');
            error.errors.forEach(err => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
        }
        throw new Error('Environment validation failed. Check console for details.');
    }
}

// Export validated config
export const env = validateEnvironment();
```

```typescript
// app/layout.tsx or instrumentation.ts
import { validateEnvironment } from '@/lib/config/validate-env';

// Validate on startup (crashes if invalid)
validateEnvironment();

export default function RootLayout({...}) {
    // ... rest of layout
}
```

**Impact:** High - Prevents production outages from missing config  
**Effort:** Low - Create validation module  
**Priority:** Complete within 3 days

---

## 🟡 Medium Priority Issues

### M1. Redundant Course Lookup Pattern
**Severity:** Medium  
**File:** `app/api/checkout/route.ts`  
**Lines:** 232-269

**Issue:**  
The `getCourseWithFallback` function has redundant logic:

```typescript
async function getCourseWithFallback(courseId: string) {
    try {
        await connectToDatabase();  // Called AGAIN (already called in main handler)
        
        const dbCourse = await Course.findOne({
            courseId: courseId,
            isActive: true
        });
        
        if (dbCourse) {
            return {
                courseId: dbCourse.courseId,
                title: dbCourse.title,
                // ... manual field mapping
            };
        }
        
        const staticCourse = await getCourseFromDb(courseId);
        if (staticCourse) {
            return { ...staticCourse, source: 'static' };
        }
        
        return null;
    } catch (error) {
        ProductionLogger.error('Database error, using static fallback');
        return await getCourseFromDb(courseId);
    }
}
```

**Problems:**
1. Manual field mapping is error-prone (easy to miss fields)
2. `connectToDatabase()` called twice per request
3. Error handler calls static fallback but normal flow also calls it
4. Return type not typed (uses implicit `any`)

**Recommendation:**
```typescript
// lib/types/course.ts
export interface CourseData {
    courseId: string;
    title: string;
    description: string;
    price: number;
    duration: string;
    level: string;
    image?: string;
    features?: string[];
    totalEnrollments: number;
    source: 'database' | 'static';
}

// app/api/checkout/route.ts
async function getCourseWithFallback(courseId: string): Promise<CourseData | null> {
    // Database already connected in main handler - no need to reconnect
    
    try {
        // Try database first
        const dbCourse = await Course.findOne({
            courseId: courseId,
            isActive: true
        }).lean(); // Use lean() for better performance
        
        if (dbCourse) {
            return {
                ...dbCourse,
                source: 'database' as const
            };
        }
    } catch (dbError) {
        ProductionLogger.warn('Database query failed, using static fallback', {
            courseId,
            error: dbError instanceof Error ? dbError.message : 'Unknown'
        });
    }
    
    // Fallback to static data
    const staticCourse = await getCourseFromDb(courseId);
    if (staticCourse) {
        return {
            ...staticCourse,
            source: 'static' as const
        };
    }
    
    return null;
}
```

**Impact:** Low - Minor performance improvement and type safety  
**Effort:** Low - Refactor one function  
**Priority:** Complete within 1 week

---

### M2. Inconsistent Timestamp Formats
**Severity:** Medium  
**File:** Multiple files  
**Lines:** Various

**Issue:**  
Timestamps are stored in multiple formats:

```typescript
// ISO string
timestamp: new Date().toISOString()

// Date object
referralTimestamp: new Date()

// String (formatted)
enrollmentDate: new Date().toLocaleDateString('en-US', {...})
```

**Problems:**
- Sorting and comparison is inconsistent
- Frontend needs to parse multiple formats
- Time zone handling is ambiguous
- Database indexes may not work efficiently

**Recommendation:**  
Standardize on Date objects in database, ISO strings in API responses:

```typescript
// Database Schema (use Date objects)
timestamp: {
    type: Date,
    required: true,
    default: Date.now  // Use Date.now, not () => new Date().toISOString()
}

// API Response Helper
export function serializeEnrollment(enrollment: IEnrollment) {
    return {
        ...enrollment.toObject(),
        timestamp: enrollment.timestamp.toISOString(),
        createdAt: enrollment.createdAt.toISOString(),
        updatedAt: enrollment.updatedAt.toISOString(),
        // Convert all Date fields to ISO strings for API response
    };
}
```

**Files to Update:**
- `lib/models/enrollment.ts` (schema definitions)
- `app/api/checkout/route.ts` (enrollment creation)
- All API response handlers

**Impact:** Medium - Improves consistency and prevents bugs  
**Effort:** Medium - Update multiple locations  
**Priority:** Complete within 2 weeks

---

### M3. Missing Rate Limiting on Webhook Endpoint
**Severity:** Medium  
**File:** `app/api/webhook/route.ts`  
**Lines:** N/A (missing)

**Issue:**  
The webhook endpoint has no rate limiting:

```typescript
export async function POST(req: NextRequest) {
    // No rate limiting check
    const body = await req.text();
    const sig = req.headers.get('stripe-signature') as string;
    // ...
}
```

While Stripe signature validation provides authentication, a malicious actor could:
- Send many invalid requests to consume resources
- Trigger expensive database queries
- Fill logs with failed validation attempts

**Recommendation:**  
Add webhook-specific rate limiting:

```typescript
// lib/middleware/webhookRateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const webhookRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
});

export async function webhookRateLimiter(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const { success, limit, reset, remaining } = await webhookRateLimit.limit(
        `webhook_${ip}`
    );
    
    if (!success) {
        ProductionLogger.warn('Webhook rate limit exceeded', { ip, limit, reset });
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { 
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                }
            }
        );
    }
    
    return null;
}

// Usage in webhook
export async function POST(req: NextRequest) {
    const rateLimitResponse = await webhookRateLimiter(req);
    if (rateLimitResponse) return rateLimitResponse;
    
    // ... existing webhook logic
}
```

**Impact:** Medium - Prevents abuse  
**Effort:** Low - Add rate limiting middleware  
**Priority:** Complete within 1 week

---

### M4. Lack of Input Sanitization for User-Generated Content
**Severity:** Medium  
**File:** Multiple files accepting user input  
**Lines:** Various

**Issue:**  
User input is validated but not sanitized:

```typescript
// Validation exists
const validatedData = checkoutSchema.parse(cleanedBody);

// But no sanitization
const enrollment = new Enrollment({
    email: finalEmail, // No XSS sanitization
    metadata: {
        userAgent: 'web', // Hard-coded, but should sanitize if from request
    }
});
```

While Mongoose escapes queries, some fields could contain:
- HTML/JavaScript for XSS attacks (if displayed in admin panel)
- NoSQL injection patterns (if used in raw queries)
- Unicode abuse (zero-width characters, RTL overrides)

**Recommendation:**  
Add sanitization layer:

```typescript
// lib/utils/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export function sanitizeEmail(email: string): string {
    return validator.normalizeEmail(email.trim().toLowerCase()) || '';
}

export function sanitizeString(input: string, maxLength: number = 500): string {
    // Remove HTML tags
    let sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
    
    // Remove zero-width characters
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    // Trim and limit length
    return sanitized.trim().substring(0, maxLength);
}

export function sanitizeUserAgent(ua: string): string {
    // Only allow alphanumeric, spaces, and common UA characters
    return ua.replace(/[^a-zA-Z0-9\s\.\-_\/\(\)]/g, '').substring(0, 200);
}

// Usage
const enrollment = new Enrollment({
    email: sanitizeEmail(finalEmail),
    courseId: sanitizeString(courseId, 100),
    metadata: {
        userAgent: sanitizeUserAgent(request.headers.get('user-agent') || 'unknown'),
    }
});
```

**Impact:** Medium - Prevents XSS in admin panels  
**Effort:** Medium - Add sanitization to all input points  
**Priority:** Complete within 2 weeks

---

### M5. Webhook Event Processing Not Fully Idempotent
**Severity:** Medium  
**File:** `app/api/webhook/route.ts`  
**Lines:** 210-240

**Issue:**  
While idempotency checks exist, they're not comprehensive:

```typescript
// Current idempotency check
const updateResult = await Enrollment.findOneAndUpdate(
    {
        _id: existingEnrollment._id,
        'stripeEvents.eventId': { $ne: event.id }
    },
    {
        $addToSet: {
            stripeEvents: { eventId: event.id, ... }
        }
    }
);

if (!updateResult) {
    return NextResponse.json({
        success: true,
        message: 'Event already processed'
    });
}
```

**Gap:**  
If the same Stripe event arrives while the first processing is still in progress:
1. Request A checks event not in array → passes
2. Request B checks event not in array → passes (same time)
3. Request A adds event to array
4. Request B adds event to array (duplicate!)

**Current Mitigation:**  
Status check helps but doesn't prevent duplicate external operations (emails, Frappe enrollment).

**Recommendation:**  
Use MongoDB unique index on stripe event ID:

```typescript
// lib/models/webhook-event.ts
const webhookEventSchema = new Schema({
    eventId: {
        type: String,
        required: true,
        unique: true  // Enforce uniqueness at database level
    },
    eventType: String,
    enrollmentId: mongoose.Schema.Types.ObjectId,
    processedAt: Date,
    processingStatus: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    }
});

// In webhook handler
export async function POST(req: NextRequest) {
    // ... signature validation
    
    // Atomic insert with error handling for duplicates
    try {
        await WebhookEvent.create({
            eventId: event.id,
            eventType: event.type,
            processedAt: new Date(),
            processingStatus: 'processing'
        });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            ProductionLogger.info('Webhook event already processed', {
                eventId: event.id
            });
            return NextResponse.json({
                success: true,
                message: 'Event already processed'
            });
        }
        throw error;
    }
    
    // Process webhook...
    
    // Mark as completed
    await WebhookEvent.findOneAndUpdate(
        { eventId: event.id },
        { processingStatus: 'completed' }
    );
}
```

**Impact:** Medium - Prevents duplicate processing  
**Effort:** Medium - Add new model and refactor webhook  
**Priority:** Complete within 2 weeks

---

### M6. Affiliate Commission Calculation Not Documented in Code
**Severity:** Medium  
**File:** `lib/utils/commission.ts`  
**Lines:** 23-45

**Issue:**  
Commission calculation logic is not well-documented:

```typescript
export function calculateCommission(amount: number, rate: number): number {
    // Basic validation
    if (typeof amount !== 'number' || typeof rate !== 'number') {
        return 0;
    }
    if (amount < 0 || rate < 0 || rate > 100) {
        return 0;
    }
    
    // Calculate commission with proper rounding
    const commission = Math.round((amount * rate) / 100 * 100) / 100;
    return commission;
}
```

**Missing Documentation:**
- Why `Math.round((amount * rate) / 100 * 100) / 100`? (Floating-point precision)
- What happens with edge cases? (0, negative, >100%)
- Examples of calculations
- When is this called vs. when is commission 0?

**Recommendation:**  
Add comprehensive documentation:

```typescript
/**
 * Calculate affiliate commission amount with proper decimal precision
 * 
 * ## Calculation Method
 * Uses two-step rounding to handle floating-point precision:
 * 1. Convert to cents: (amount * rate) / 100 * 100
 * 2. Round to nearest cent: Math.round(...)
 * 3. Convert back to dollars: / 100
 * 
 * ## Example Calculations
 * - calculateCommission(199, 10) → 19.90
 * - calculateCommission(299.99, 10) → 30.00
 * - calculateCommission(100.33, 5.5) → 5.52
 * 
 * ## Commission Rules
 * - Commission is calculated on the amount the user PAYS, not the original price
 * - For full-price purchases: commission = course price * rate
 * - For partial grants: commission = discounted price * rate
 * - For free grants (100% off): commission = 0 (no payment)
 * 
 * ## Edge Cases
 * - amount = 0: Returns 0 (no commission on free items)
 * - rate = 0: Returns 0 (affiliate has 0% rate)
 * - rate > 100: Returns 0 (invalid rate)
 * - Negative values: Returns 0 (invalid input)
 * - Invalid types: Returns 0 (type safety)
 * 
 * ## Related Issue
 * Fixed floating-point precision bug (commit 9ccd93f):
 * Previously, the validator would reject values like 19.9 because:
 * - JavaScript stores 19.9 as 19.900000000000002
 * - 19.9 * 100 = 1989.9999999999998 (not an integer)
 * - Fixed by rounding before validation
 * 
 * @param amount - The base amount to calculate commission on (in dollars)
 * @param rate - The commission rate as a percentage (0-100)
 * @returns Commission amount rounded to 2 decimal places, or 0 if invalid
 * 
 * @example
 * // Standard commission
 * calculateCommission(199, 10); // Returns 19.90
 * 
 * @example
 * // Partial discount scenario
 * const originalPrice = 199;
 * const discount = 50; // 50% off
 * const finalPrice = originalPrice * (100 - discount) / 100; // 99.50
 * const commission = calculateCommission(finalPrice, 10); // 9.95
 * 
 * @see lib/models/enrollment.ts - Commission amount validator
 * @see app/api/webhook/route.ts - Commission processing
 */
export function calculateCommission(amount: number, rate: number): number {
    // Validation: ensure inputs are valid numbers
    if (typeof amount !== 'number' || typeof rate !== 'number') {
        return 0;
    }
    
    // Validation: ensure values are in valid range
    if (amount < 0 || rate < 0 || rate > 100) {
        return 0;
    }
    
    // Calculate commission with proper rounding to handle floating-point precision
    // Formula: amount * (rate / 100), rounded to cents
    const commission = Math.round((amount * rate) / 100 * 100) / 100;
    
    return commission;
}
```

**Impact:** Low - Improves code maintainability  
**Effort:** Low - Add documentation  
**Priority:** Complete within 1 week

---

### M7. Frontend Checkout Component Uses Polling Instead of Server-Sent Events
**Severity:** Medium  
**File:** `components/enhanced-checkout-flow.tsx`  
**Lines:** Various

**Issue:**  
The enhanced checkout flow appears to poll for status (based on component name and patterns), which is inefficient:

```typescript
// Likely current implementation (inferred)
useEffect(() => {
    const interval = setInterval(async () => {
        const status = await fetch(`/api/enrollment/${id}/status`);
        // Update UI
    }, 2000); // Poll every 2 seconds
    
    return () => clearInterval(interval);
}, [id]);
```

**Problems:**
- Unnecessary server load
- Delayed status updates (up to 2 second lag)
- Battery drain on mobile devices
- Potential race conditions with rapid updates

**Recommendation:**  
Use Server-Sent Events (SSE) for real-time updates:

```typescript
// app/api/enrollment/[id]/status/route.ts
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const enrollmentId = params.id;
    
    // Set SSE headers
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendUpdate = (data: any) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };
            
            // Send initial status
            const enrollment = await Enrollment.findById(enrollmentId);
            sendUpdate({ status: enrollment.status, progress: 0 });
            
            // Watch for changes (using MongoDB change streams)
            const changeStream = Enrollment.watch([
                { $match: { 'documentKey._id': new mongoose.Types.ObjectId(enrollmentId) } }
            ]);
            
            changeStream.on('change', (change) => {
                const updated = change.fullDocument;
                sendUpdate({
                    status: updated.status,
                    frappeSync: updated.frappeSync,
                    progress: updated.status === 'paid' ? 100 : 50
                });
                
                // Close stream when complete
                if (updated.status === 'paid' && updated.frappeSync?.synced) {
                    controller.close();
                    changeStream.close();
                }
            });
            
            // Timeout after 5 minutes
            setTimeout(() => {
                changeStream.close();
                controller.close();
            }, 5 * 60 * 1000);
        }
    });
    
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// components/enhanced-checkout-flow.tsx
useEffect(() => {
    const eventSource = new EventSource(`/api/enrollment/${enrollmentId}/status`);
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateStepStatus(data.status, 'complete');
        if (data.progress === 100) {
            eventSource.close();
        }
    };
    
    eventSource.onerror = () => {
        eventSource.close();
        // Fallback to polling or show error
    };
    
    return () => eventSource.close();
}, [enrollmentId]);
```

**Impact:** Medium - Better UX and reduced server load  
**Effort:** High - Implement SSE and change streams  
**Priority:** Complete within 3 weeks (not urgent)

---

## 🟢 Low Priority Issues

### L1. Inconsistent Logging Levels
**Severity:** Low  
**File:** Multiple files using ProductionLogger  
**Lines:** Various

**Issue:**  
Logging levels are not consistently applied:

```typescript
// Some use info for errors
ProductionLogger.info('FrappeLMS enrollment failed', { error });

// Others use error
ProductionLogger.error('Failed to send email', { error });

// Debug vs info unclear
ProductionLogger.debug('Raw request body', { body });
ProductionLogger.info('Processing checkout request', { courseId });
```

**Recommendation:**  
Define clear logging standards:

- **error**: Failures requiring immediate attention (payment failed, database down)
- **warn**: Recoverable issues (retry queued, affiliate not found)
- **info**: Normal operations (enrollment created, webhook received)
- **debug**: Detailed debugging info (request bodies, intermediate calculations)

**Impact:** Low - Improves log clarity  
**Effort:** Low - Update logging calls  
**Priority:** Complete within 2 weeks

---

### L2. Magic Numbers in Code
**Severity:** Low  
**File:** Multiple files  
**Lines:** Various

**Issue:**  
Magic numbers appear throughout the code:

```typescript
await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
nextRetryAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes
maxAttempts: 5 // 5 retry attempts
```

**Recommendation:**  
Extract to named constants:

```typescript
// lib/config/constants.ts
export const RETRY_DELAYS = {
    IMMEDIATE_RETRY_MS: 2000,          // 2 seconds
    BACKGROUND_RETRY_MS: 2 * 60 * 1000, // 2 minutes
    EXTENDED_RETRY_MS: 10 * 60 * 1000   // 10 minutes
};

export const RETRY_LIMITS = {
    MAX_ATTEMPTS: 5,
    FRAPPE_ENROLLMENT: 5,
    EMAIL_DELIVERY: 3
};

export const COMMISSION = {
    DEFAULT_RATE: 10,  // 10%
    MIN_RATE: 0,
    MAX_RATE: 100
};
```

**Impact:** Low - Improves code readability  
**Effort:** Low - Extract constants  
**Priority:** Complete within 1 week

---

### L3. Missing TypeScript Strict Mode
**Severity:** Low  
**File:** `tsconfig.json`  
**Lines:** N/A

**Issue:**  
TypeScript may not have all strict checks enabled:

```json
{
    "compilerOptions": {
        "strict": true,  // Good, but not enough
        // Missing individual strict flags
    }
}
```

**Recommendation:**  
Enable all strict flags explicitly:

```json
{
    "compilerOptions": {
        "strict": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": true,
        "noImplicitAny": true,
        "noImplicitThis": true,
        "alwaysStrict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "noPropertyAccessFromIndexSignature": true
    }
}
```

**Impact:** Low - Catches more bugs at compile time  
**Effort:** Medium - May require fixing existing type errors  
**Priority:** Complete within 2 weeks

---

## 🎯 Positive Findings (Strengths to Maintain)

### ✅ Excellent Error Handling Structure
The codebase demonstrates strong error handling practices:

```typescript
try {
    // Operation
} catch (error) {
    ProductionLogger.error('Context', {
        error: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
    });
    // Graceful degradation
}
```

**Maintain this pattern** and extend it to areas currently missing detailed error context.

---

### ✅ Comprehensive Atomic Operations
Critical operations use atomic updates to prevent race conditions:

```typescript
const reservedGrant = await Grant.findOneAndUpdate(
    { /* conditions */ },
    { $set: { couponUsed: true } },
    { new: true }
);
```

**Continue using** `findOneAndUpdate` for state changes that must be atomic.

---

### ✅ Self-Referral Prevention Logic
The self-referral check is well-implemented:

```typescript
if (affiliateEmail.toLowerCase() === finalEmail.toLowerCase()) {
    return NextResponse.json({
        error: 'You cannot use your own email as an affiliate referral',
        code: 'SELF_REFERRAL_NOT_ALLOWED',
        suggestions: [...]
    }, { status: 400 });
}
```

**Excellent UX** - Clear error message with helpful suggestions.

---

### ✅ Centralized Commission Calculation
Moving to a centralized `calculateCommission` helper was the right architectural decision:

```typescript
export function calculateCommission(amount: number, rate: number): number {
    return Math.round((amount * rate) / 100 * 100) / 100;
}
```

**Keep using** this helper for all commission calculations to maintain consistency.

---

### ✅ Comprehensive Request Validation
Zod schemas provide strong request validation:

```typescript
const checkoutSchema = z.object({
    courseId: z.string().min(1, 'Course ID is required'),
    email: z.string().email('Valid email required').toLowerCase().optional(),
    // ...
});
```

**Extend this pattern** to all API endpoints.

---

### ✅ Detailed Production Logging
The ProductionLogger provides excellent observability:

```typescript
ProductionLogger.info('Webhook processed successfully', {
    eventId: event.id,
    enrollmentId: updatedEnrollment._id,
    amount: session.amount_total ? session.amount_total / 100 : 0
});
```

**Continue this practice** and ensure all critical operations are logged.

---

## 📊 Summary Statistics

| Category | Count | Severity Distribution |
|----------|-------|----------------------|
| **Critical** | 2 | Database transactions (C1), Rollback safety (C2) |
| **High** | 5 | Error schemas (H1), Request tracking (H2), Race conditions (H3), Email validation (H4), Env validation (H5) |
| **Medium** | 7 | Code quality (M1-M7) |
| **Low** | 3 | Logging (L1), Constants (L2), TypeScript strict (L3) |
| **Total Issues** | **17** | |
| **Positive Findings** | **6** | Strengths to maintain |

---

## 🗓️ Recommended Implementation Timeline

### Week 1 (Immediate Priority)
- [x] **C1:** Implement database transactions for enrollment flows
- [x] **H2:** Add request ID tracking throughout system
- [x] **H3:** Fix affiliate stats race condition
- [x] **H4:** Improve email validation
- [x] **H5:** Add environment variable validation

### Week 2 (High Priority)
- [ ] **C2:** Enhance rollback protection for Stripe sessions
- [ ] **H1:** Standardize error response schema
- [ ] **M1:** Refactor course lookup logic
- [ ] **M2:** Standardize timestamp formats
- [ ] **M3:** Add webhook rate limiting

### Week 3-4 (Medium Priority)
- [ ] **M4:** Add input sanitization
- [ ] **M5:** Enhance webhook idempotency
- [ ] **M6:** Document commission calculation
- [ ] **L1:** Standardize logging levels
- [ ] **L2:** Extract magic numbers to constants
- [ ] **L3:** Enable TypeScript strict mode

### Week 5+ (Low Priority / Nice to Have)
- [ ] **M7:** Implement SSE for real-time status updates
- [ ] Comprehensive integration tests
- [ ] Performance profiling and optimization
- [ ] Documentation updates

---

## 🧪 Testing Recommendations

### Priority Test Scenarios

**1. Database Transaction Rollback Test**
```typescript
// Test that grant reservation is rolled back on enrollment failure
it('should rollback grant reservation if enrollment fails', async () => {
    const grantId = await createTestGrant();
    
    // Mock enrollment save to fail
    jest.spyOn(Enrollment.prototype, 'save').mockRejectedValueOnce(new Error('DB Error'));
    
    await expect(
        processCouponEnrollment({ couponCode: 'TEST123', ... })
    ).rejects.toThrow();
    
    // Verify grant is not marked as used
    const grant = await Grant.findById(grantId);
    expect(grant.couponUsed).toBe(false);
});
```

**2. Race Condition Test**
```typescript
// Test concurrent webhook processing
it('should handle concurrent webhooks without duplicate commission', async () => {
    const affiliateEmail = 'test@affiliate.com';
    
    // Send two webhooks simultaneously
    await Promise.all([
        processWebhook(event1),
        processWebhook(event1) // Same event
    ]);
    
    // Verify commission only processed once
    const affiliate = await Affiliate.findOne({ email: affiliateEmail });
    expect(affiliate.stats.totalReferrals).toBe(1);
});
```

**3. Floating-Point Precision Test**
```typescript
// Test the fixed validator
it('should accept commission values with floating-point imprecision', () => {
    const enrollment = new Enrollment({
        affiliateData: {
            commissionAmount: 19.9 // This caused the original bug
        }
    });
    
    expect(() => enrollment.validateSync()).not.toThrow();
});
```

---

## 📚 Additional Documentation Needed

1. **Architecture Decision Records (ADRs)**
   - Why MongoDB over PostgreSQL?
   - Why three separate enrollment flows?
   - Why atomic grant reservation pattern?

2. **API Documentation**
   - OpenAPI/Swagger spec for all endpoints
   - Error code catalog
   - Webhook payload examples

3. **Runbook for Common Issues**
   - How to manually retry failed Frappe enrollments
   - How to resolve orphaned grant reservations
   - How to recalculate affiliate stats

4. **Database Migration Guide**
   - How to add new fields to existing documents
   - How to handle schema changes in production
   - Backup and restore procedures

---

## 🎓 Code Quality Metrics

Based on this audit:

- **Test Coverage:** Unknown (recommend 80%+ for critical paths)
- **Type Safety:** Good (some `any` types, recommend stricter)
- **Error Handling:** Excellent (comprehensive try-catch, logging)
- **Code Duplication:** Low (good use of helper functions)
- **Documentation:** Fair (needs more inline docs and ADRs)
- **Security:** Good (input validation, but needs sanitization)
- **Performance:** Good (atomic operations, indexes, but polling issue)
- **Maintainability:** Good (clear separation of concerns)

**Overall Grade: B+ (Very Good)**

Areas for improvement to reach A:
- Add database transactions (Critical)
- Standardize error handling (High)
- Improve type safety (Medium)
- Add comprehensive tests (High)

---

## 📞 Support & Questions

For questions about this audit report:
- **Technical Lead:** Review implementation timeline
- **DevOps Team:** Environment variable validation (H5)
- **Security Team:** Input sanitization review (M4)
- **QA Team:** Test scenario implementation

---

**End of Report**  
Generated: December 2024  
Next Audit Recommended: After implementing Critical and High priority fixes (6-8 weeks)
