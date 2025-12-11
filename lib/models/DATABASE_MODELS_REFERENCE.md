# MaalEdu Platform - Complete Database Models Reference

**Version:** 3.0 | **Last Updated:** December 8, 2025 | **Status:** ✅ Production Ready

> **Enterprise-grade MongoDB/Mongoose data architecture documentation**  
> Complete reference for development, API integration, maintenance, and team onboarding

---

## 📑 Table of Contents

**Quick Start**
- [Architecture Overview](#architecture-overview)
- [Model Index](#model-index)
- [Relationships](#model-relationships)

**Core Models**
1. [User](#1-user-model) - Authentication & Profiles
2. [Enrollment](#2-enrollment-model) - Central Transaction Hub
3. [Course](#3-course-model) - Catalog Management
4. [Affiliate](#4-affiliate-model) - Partner Program
5. [Grant](#5-grant-model) - Scholarship System
6. [PayoutHistory](#6-payouthistory-model) - Financial Audit
7. [RetryJob](#7-retryjob-model) - Background Queue
8. [PaymentMethod](#8-paymentmethod-model) - Payment Preferences

**Reference**
- [Indexing Strategy](#indexing-strategy)
- [Data Flows](#business-workflows)
- [Development Guide](#development-guidelines)
- [API Patterns](#api-integration-patterns)

---

## Architecture Overview

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Domain-Driven Design** | Each model = one business entity with clear boundaries |
| **ACID Compliance** | Atomic operations, transactions for multi-doc updates |
| **Type Safety** | Full TypeScript interfaces with strict validation |
| **Performance First** | Strategic compound indexes, query optimization |
| **Audit Trail** | Immutable financial records, complete timestamps |
| **Eventual Consistency** | Background sync queue for external integrations |

### Technology Stack

```
├─ MongoDB 5.0+ (Atlas M10 cluster)
├─ Mongoose 8.x (ODM with strict validation)
├─ TypeScript 5.x (strict mode)
├─ Node.js 18+ LTS
└─ Next.js 14.x (App Router)
```

---

## Model Index

| Model | Collection | Primary Key | Core Purpose |
|-------|-----------|-------------|--------------|
| **User** | users | email (unique) | Authentication, course history, role management |
| **Enrollment** | enrollments | paymentId (unique) | Payment tracking, course access, commission calculation |
| **Course** | courses | courseId (unique) | Catalog, pricing, enrollment statistics |
| **Affiliate** | affiliates | affiliateId (unique) | Partner management, referral tracking, payouts |
| **Grant** | grants | couponCode (unique) | Scholarship applications, discount coupons |
| **PayoutHistory** | payouthistories | _id | Immutable financial transaction log |
| **RetryJob** | retryjobs | _id | Frappe LMS sync queue with exponential backoff |
| **PaymentMethod** | paymentmethods | methodId (unique) | User payment account details |

---

## Model Relationships

```
USER
 ├─→ Enrollment (email)
 ├─→ Affiliate (userId)
 ├─→ PaymentMethod (userId)
 └─→ purchasedCourses[] (embedded)

ENROLLMENT (Central Hub)
 ├─→ User (email)
 ├─→ Course (courseId)
 ├─→ Grant (grantData.grantId)
 ├─→ Affiliate (affiliateData.affiliateEmail)
 └─→ RetryJob (frappeSync.retryJobId)

COURSE
 ├─← Enrollment (virtual population)
 └─← Grant (courseId reference)

AFFILIATE
 ├─← Enrollment (affiliateData.affiliateEmail)
 └─→ PayoutHistory (affiliateId)

GRANT
 └─→ Enrollment (enrollmentId after redemption)

PAYOUTHISTORY
 ├─→ Affiliate (affiliateId)
 └─→ Enrollment[] (commissionsPaid array)

RETRYJOB
 └─→ Enrollment (enrollmentId)
```

---

## 1. User Model

**File:** `lib/models/user.ts` | **Collection:** `users`

### Purpose
Core authentication system with embedded course purchase history and role-based access control.

### Schema

```typescript
interface IUser extends Document {
  // Identity
  username: string;              // 3-30 chars, unique
  email: string;                 // unique, lowercase
  password: string;              // bcrypt hash (select: false)
  name?: string;                 // display name
  
  // Email Verification
  verifyCode?: string;           // 6-digit OTP
  verifyCodeExpiry?: Date;
  isVerified: boolean;
  
  // Authorization
  role: 'admin' | 'user';
  
  // Course History (Embedded)
  purchasedCourses: Array<{
    courseId: string;
    title: string;
    enrolledAt: Date;
    paymentId: string;
    amount: number;
    progress: number;            // 0-100
    completedAt?: Date;
    certificateIssued: boolean;
  }>;
  
  // Analytics
  totalSpent: number;            // auto-calculated
  lastLogin?: Date;
  profileImage?: string;         // HTTPS URL
  createdAt: Date;               // immutable
}
```

### Key Methods

```typescript
user.addPurchasedCourse(course)           // Add course to history
user.updateCourseProgress(courseId, %)    // Update completion (auto-completes at 100%)
user.getLearningStats()                   // Analytics summary
user.hasPurchasedCourse(courseId)         // Access check
user.isSuperAdmin()                       // Admin role check
```

### Indexes

```typescript
{ email: 1 }            // unique, login
{ username: 1 }         // unique, profile
{ role: 1 }             // admin queries
{ totalSpent: -1 }      // top spenders
{ lastLogin: -1 }       // activity
```

### Business Rules

- All emails stored lowercase
- `totalSpent` calculated via pre-save hook
- Progress auto-completes at 100%
- Admin role required for management routes

---

## 2. Enrollment Model

**File:** `lib/models/enrollment.ts` | **Collection:** `enrollments`

### Purpose
Central hub linking users, courses, payments, grants, affiliates, and Frappe LMS sync status.

### Schema

```typescript
interface IEnrollment extends Document {
  // Core Transaction
  courseId: string;
  email: string;                 // lowercase
  paymentId: string;             // UNIQUE (Stripe intent ID)
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  timestamp: string;             // ISO
  enrollmentType: 'paid_stripe' | 'free_grant' | 'partial_grant' | 
                  'affiliate_referral' | 'lms_redirect';
  
  // LMS Integration
  lmsContext?: {
    frappeUsername?: string;
    frappeEmail?: string;
    redirectSource?: 'lms_redirect' | 'direct' | 'affiliate';
  };
  
  // Affiliate Commission
  affiliateData?: {
    affiliateEmail: string;
    referralSource: string;
    commissionEligible: boolean;
    referralTimestamp: Date;
    commissionAmount: number;    // 2 decimals
    commissionPaid: boolean;
    paidAt?: Date;
    payoutId?: ObjectId;
  };
  
  // Grant/Coupon
  grantData?: {
    grantId: ObjectId;
    couponCode: string;
    approvalDate: Date;
    originalPrice: number;
    discountPercentage: number;  // 1-100
    grantVerified: boolean;
  };
  
  // Verification
  verification: {
    emailVerified?: boolean;
    paymentVerified?: boolean;
    accessLevel?: 'basic' | 'verified' | 'premium';
    grantVerified?: boolean;
  };
  
  // Frappe LMS Sync
  frappeSync: {
    synced: boolean;
    syncStatus: 'pending' | 'success' | 'failed' | 'retrying';
    enrollmentId?: string;       // Frappe LMS ID
    errorMessage?: string;
    retryCount: number;
    syncCompletedAt?: Date;
    lastSyncAttempt?: Date;
    retryJobId?: ObjectId;
  };
  
  // Payment Metadata
  paymentMethod?: string;
  currency?: string;
  transactionId?: string;
  commissionBaseAmount?: number;
  
  // Stripe Webhook Deduplication
  stripeEvents: Array<{
    eventId: string;
    eventType: string;
    processedAt: Date;
    status: 'processed' | 'failed';
  }>;
  
  // Metadata
  metadata: {
    requestId?: string;
    userAgent?: string;
    ipAddress?: string;
    source?: string;
  };
}
```

### Key Indexes

```typescript
{ paymentId: 1 }                                          // UNIQUE
{ courseId: 1, email: 1 }                                 // access lookup
{ status: 1, timestamp: -1 }                              // paid enrollments
{ 'affiliateData.affiliateEmail': 1, status: 1 }          // commissions
{ 'frappeSync.syncStatus': 1, createdAt: -1 }            // sync queue
{ 'grantData.couponCode': 1 }                             // coupon validation
{ 'stripeEvents.eventId': 1 }                             // webhook dedup
```

### Business Rules

- `paymentId` globally unique (prevents duplicate webhooks)
- Commission only for `status: 'paid'`
- Frappe sync happens async via RetryJob
- Stripe events array prevents double-processing

---

## 3. Course Model

**File:** `lib/models/course.ts` | **Collection:** `courses`

### Purpose
Course catalog with pricing, enrollment tracking, and virtual relationships.

### Schema

```typescript
interface ICourse extends Document {
  courseId: string;              // unique slug (lowercase-hyphen)
  title: string;                 // 3-200 chars
  description: string;           // 10-2000 chars
  price: number;                 // min: 0
  duration: string;              // e.g., "8 weeks"
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  image: string;                 // HTTP(S) URL
  features: string[];
  
  // Analytics
  totalEnrollments: number;      // cached count
  
  // Embedded Enrollments
  enrolledUsers: Array<{
    userId?: ObjectId;           // sparse (allows null)
    email: string;
    enrolledAt: Date;
    paymentId: string;
  }>;
  
  // Display
  isActive: boolean;
  status: 'draft' | 'published' | 'archived';
  order: number;                 // 1-9999 (homepage priority)
  createdAt: Date;               // immutable
}
```

### Virtual Relationships

```typescript
course.fullEnrollments          // All Enrollment docs
course.paidEnrollments          // status: 'paid' only
course.grantEnrollments         // enrollmentType: *grant*
```

### Key Methods

```typescript
course.isUserEnrolled(email)
course.addEnrollment({ userId, email, paymentId })
course.getEnrollmentStats()     // total, recent, revenue
```

### Indexes

```typescript
{ courseId: 1 }                 // unique
{ isActive: 1, order: 1 }       // homepage query
{ isActive: 1, price: 1 }       // free/paid filter
{ totalEnrollments: -1 }        // popularity sort
```

---

## 4. Affiliate Model

**File:** `lib/models/affiliate.ts` | **Collection:** `affiliates`

### Purpose
Partner account management with commission tracking and payout disbursements.

### Schema

```typescript
interface IAffiliate extends Document {
  // Identity
  affiliateId: string;           // auto: af_xxxxxxxxxx
  userId: ObjectId;              // User reference
  email: string;                 // unique, referral identifier
  name: string;                  // max 100 chars
  status: 'active' | 'inactive' | 'suspended';
  
  // Commission
  commissionRate: number;        // 0-100% (default: 10)
  
  // Payment Setup
  payoutMode: 'bank' | 'paypal' | 'crypto';
  paymentMethodDetails: {
    type: 'bank' | 'paypal' | 'crypto';
    // Bank
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    accountHolderName?: string;
    swiftCode?: string;
    // PayPal
    paypalEmail?: string;
    // Crypto
    cryptoWallet?: string;
    cryptoCurrency?: 'bitcoin' | 'ethereum' | 'usdt';
  };
  
  // Financial Tracking
  stats: {
    totalEarnings: number;       // lifetime
    totalReferrals: number;      // count
    coursesSold: Map<string, number>;
  };
  totalPaid: number;             // disbursed
  pendingCommissions: number;    // awaiting payout
  lastPayoutDate?: Date;
  
  // Payout History (Embedded)
  payoutDisbursements: Array<{
    payoutId: ObjectId;          // PayoutHistory reference
    amount: number;
    currency: string;
    payoutMethod: 'bank' | 'paypal' | 'crypto';
    transactionId?: string;
    status: 'completed' | 'pending' | 'failed';
    processedBy: string;         // admin email
    processedAt: Date;
    proofLink?: string;
    adminNotes?: string;
    commissionsCount: number;
    periodStart: Date;
    periodEnd: Date;
  }>;
}
```

### Key Methods

```typescript
affiliate.generateAffiliateLink(courseId?)  // Returns: /?ref=email@example.com
affiliate.refreshStats()                     // Sync from Enrollment collection
Affiliate.updateStatsFromEnrollments(email) // Static method
```

### Indexes

```typescript
{ affiliateId: 1 }                           // unique
{ email: 1 }                                 // unique, referral lookup
{ userId: 1 }                                // user link
{ status: 1 }                                // active filter
{ totalPaid: -1 }                            // top earners
{ pendingCommissions: -1 }                   // pending payouts
```

### Business Rules

- `affiliateId` auto-generated on create
- Pending = totalEarnings - totalPaid
- Commission = `enrollment.amount * (commissionRate / 100)`
- Payment method validated by type

---

## 5. Grant Model

**File:** `lib/models/grant.ts` | **Collection:** `grants`

### Purpose
Scholarship applications with coupon-based discount system (10-100% off).

### Schema

```typescript
interface IGrant extends Document {
  // Application
  name: string;                  // max 100 chars
  email: string;                 // applicant
  username: string;              // desired Frappe username
  age: number;                   // 16-100
  socialAccounts: string;
  reason: string;                // max 2000 chars
  
  // Grant Details
  courseId: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  
  // Coupon System
  couponCode?: string;           // generated on approval
  couponType?: string;
  couponUsed: boolean;
  couponUsedAt?: Date;
  reservedByEmail?: string;      // atomic reservation
  reservedAt?: Date;
  enrollmentId?: ObjectId;
  
  // Discount (v2.1)
  discountPercentage: number;    // 1-100 (default: 100)
  discountType: 'percentage';
  originalPrice?: number;
  finalPrice?: number;
  requiresPayment: boolean;      // false if 100% off
  
  // Metadata
  couponMetadata: {
    grantType: 'full_grant' | 'partial_grant';
    originalAmount?: number;
    discountedAmount?: number;
    expirationDate?: Date;
    generatedAt: Date;
  };
  
  // Audit
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;           // admin email
}
```

### Key Methods

```typescript
grant.calculatePricing(coursePrice)  // Returns: { originalPrice, discountAmount, finalPrice, requiresPayment }
grant.isValid()                      // Check: approved, not used, not expired
grant.getCouponInfo()                // Summary for display
```

### Indexes

```typescript
{ email: 1, courseId: 1 }            // user applications
{ status: 1, createdAt: -1 }         // admin review queue
{ couponCode: 1 }                    // unique, validation
{ status: 1, requiresPayment: 1 }    // payment flow filter
{ 'couponMetadata.expirationDate': 1 } // cleanup expired
```

### Business Rules

- 100% discount = free (no Stripe)
- <100% discount = partial (Stripe required)
- Atomic reservation via `reservedAt`
- Coupon tied to applicant email

---

## 6. PayoutHistory Model

**File:** `lib/models/payoutHistory.ts` | **Collection:** `payouthistories`

### Purpose
Immutable audit trail for all affiliate commission payouts.

### Schema

```typescript
interface IPayoutHistory extends Document {
  // Affiliate Reference
  affiliateId: string;           // Affiliate.affiliateId
  affiliateEmail: string;
  affiliateName: string;
  
  // Payout Details
  amount: number;                // 2 decimals
  payoutMethod: 'paypal' | 'bank' | 'crypto';
  currency: string;              // default: 'USD'
  
  // Transaction
  transactionId?: string;        // unique per payout
  proofLink?: string;            // receipt URL
  adminMessage?: string;
  
  // Processing
  processedBy: string;           // admin email
  processedAt: Date;
  status: 'processed' | 'failed' | 'pending';
  
  // Commission Breakdown
  commissionsPaid: Array<{
    enrollmentId: ObjectId;
    commissionAmount: number;
    courseId: string;
    customerEmail: string;
    enrolledAt: Date;
  }>;
  commissionsCount: number;      // must match array.length
  
  // Period
  periodStart: Date;
  periodEnd: Date;
}
```

### Key Static Methods

```typescript
PayoutHistory.getAffiliateHistory(email, { limit, page, status })
PayoutHistory.getTotalPaid(email)           // { totalPaid, payoutCount, lastPayoutDate }
PayoutHistory.getMonthlySummary()           // Group by month
```

### Indexes

```typescript
{ affiliateId: 1, processedAt: -1 }
{ affiliateEmail: 1, status: 1 }
{ processedAt: -1 }
{ status: 1, processedAt: -1 }
```

### Business Rules

- Records are **immutable** (no updates)
- Amount must equal sum of commissionsPaid
- Creates entry in Affiliate.payoutDisbursements
- Each record links multiple enrollments

---

## 7. RetryJob Model

**File:** `lib/models/retry-job.ts` | **Collection:** `retryjobs`

### Purpose
Background job queue for Frappe LMS synchronization with exponential backoff.

### Schema

```typescript
interface IRetryJob extends Document {
  jobType: 'frappe_enrollment' | 'frappe_course_sync';
  enrollmentId: ObjectId;
  
  payload: {
    user_email: string;
    course_id: string;
    paid_status: boolean;
    payment_id: string;
    amount: number;
    currency: string;
    referral_code?: string;
    originalRequestId?: string;
  };
  
  // Retry Logic
  attempts: number;              // current
  maxAttempts: number;           // default: 5 (1-10)
  nextRetryAt: Date;             // exponential backoff
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Worker Management
  workerNodeId?: string;
  processingStartedAt?: Date;
  processingTimeout?: Date;      // auto-release if stuck
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

### Retry Strategy

**Exponential Backoff Formula:** `2^attempts * 2 minutes ± 10% jitter`

| Attempt | Delay |
|---------|-------|
| 1 | 2 min |
| 2 | 4 min |
| 3 | 8 min |
| 4 | 16 min |
| 5 | 32 min |

### Key Static Methods

```typescript
RetryJob.claimNextJob(workerNodeId)      // Atomic worker claim
RetryJob.releaseStuckJobs()              // Reset timeout > 10 min
RetryJob.getQueueStats()                 // Health monitoring
```

### Indexes

```typescript
{ status: 1, nextRetryAt: 1 }            // worker pickup
{ enrollmentId: 1 }                      // enrollment link
{ status: 1, processingTimeout: 1 }      // stuck job detection
```

---

## 8. PaymentMethod Model

**File:** `lib/models/paymentMethod.ts` | **Collection:** `paymentmethods`

### Purpose
User payment account preferences (multiple methods supported).

### Schema

```typescript
interface IPaymentMethod extends Document {
  userId: ObjectId;
  methodId: string;              // unique
  type: 'paypal' | 'bank' | 'crypto';
  label: string;                 // user-friendly name
  isDefault: boolean;
  isActive: boolean;
  
  // Conditional Fields
  paypalEmail?: string;
  bankDetails?: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    accountHolderName: string;
    accountType: 'checking' | 'savings';
  };
  cryptoWallet?: string;
  cryptoType?: 'bitcoin' | 'ethereum' | 'usdt' | 'other';
  cryptoNetwork?: string;
}
```

### Indexes

```typescript
{ userId: 1, isActive: 1 }
{ userId: 1, isDefault: 1 }
{ methodId: 1 }                  // unique
```

---

## Indexing Strategy

### Performance Optimization

| Query Pattern | Index | Benefit |
|--------------|-------|---------|
| User login | `{ email: 1 }` | O(log n) auth lookup |
| Homepage catalog | `{ isActive: 1, order: 1 }` | Sorted filter in single scan |
| User enrollments | `{ email: 1, courseId: 1, status: 1 }` | Compound covers all conditions |
| Affiliate earnings | `{ affiliateEmail: 1, status: 1 }` | Commission reports |
| Retry worker | `{ status: 1, nextRetryAt: 1 }` | Time-based job pickup |
| Webhook dedup | `{ stripeEvents.eventId: 1 }` | Idempotency check |

### Best Practices

1. **Compound indexes** cover multiple query fields
2. **Unique constraints** prevent data duplication
3. **Sparse indexes** for optional unique fields
4. Use `.lean()` for read-only queries
5. Select only needed fields with `.select()`
6. Paginate with `.limit()` and `.skip()`

---

## Business Workflows

### 1. Paid Enrollment Flow

```
User Checkout
   ↓
Create Enrollment (status: 'pending')
   ↓
Stripe Checkout Session
   ↓
Webhook: payment_intent.succeeded
   ↓
Update Enrollment (status: 'paid')
   ├─→ Calculate Affiliate Commission (if applicable)
   ├─→ Queue Frappe Sync (RetryJob)
   ├─→ Update Course.totalEnrollments
   └─→ Add to User.purchasedCourses
```

### 2. Grant Redemption Flow

```
Admin Approves Grant
   ↓
Generate Coupon Code
   ↓
User Applies Coupon at Checkout
   ↓
Validate Grant (not used, correct email)
   ↓
Atomic Reservation (Grant.reservedAt)
   ↓
Create Enrollment (enrollmentType: 'free_grant')
   ├─→ Mark Grant as Used
   ├─→ Queue Frappe Sync
   └─→ Update Course Stats
```

### 3. Affiliate Payout Process

```
Admin Selects Period
   ↓
Query Unpaid Commissions
   ↓
Calculate Total
   ↓
Create PayoutHistory Record
   ├─→ Add to Affiliate.payoutDisbursements
   ├─→ Update Affiliate.totalPaid
   └─→ Update Enrollment.affiliateData.commissionPaid
   ↓
Process External Payment (bank/PayPal/crypto)
   ↓
Add transactionId + proofLink
```

---

## Development Guidelines

### Adding New Fields

```typescript
// 1. Update TypeScript interface
interface IUser extends Document {
  newField: string;              // Add here
}

// 2. Update schema with default for backward compatibility
const userSchema = new Schema({
  newField: { 
    type: String, 
    default: 'defaultValue'
  }
});

// 3. Add index if queried
userSchema.index({ newField: 1 });

// 4. Optional: Migration script
await User.updateMany({}, { $set: { newField: 'defaultValue' } });
```

### Handling Concurrent Updates

```typescript
// Use optimistic locking
const updated = await Model.findOneAndUpdate(
  { _id: id, __v: currentVersion },
  { 
    $set: { field: value }, 
    $inc: { __v: 1 }
  },
  { new: true }
);

if (!updated) {
  throw new Error('Document modified by another process');
}
```

### Query Optimization Checklist

- [ ] Use indexes for filter/sort fields
- [ ] Select only needed fields
- [ ] Use `.lean()` for read-only queries
- [ ] Paginate large result sets
- [ ] Avoid N+1 queries (use populate wisely)
- [ ] Cache frequently accessed data
- [ ] Monitor slow queries in production

---

## API Integration Patterns

### Creating Enrollment with Commission

```typescript
import { calculateCommission } from '@/lib/utils/commission';

const enrollment = await Enrollment.create({
  courseId,
  email: email.toLowerCase(),
  paymentId,
  amount,
  status: 'paid',
  enrollmentType: 'paid_stripe',
  affiliateData: affiliateEmail ? {
    affiliateEmail,
    referralSource: 'affiliate_link',
    commissionEligible: true,
    referralTimestamp: new Date(),
    commissionAmount: calculateCommission(amount, affiliate.commissionRate),
    commissionPaid: false
  } : undefined,
  frappeSync: {
    synced: false,
    syncStatus: 'pending',
    retryCount: 0
  }
});
```

### Processing Payout

```typescript
import { processAffiliatePayout } from '@/lib/services/payout';

const result = await processAffiliatePayout({
  affiliateEmail,
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-01-31'),
  payoutMethod: 'paypal',
  transactionId: 'PAYPAL_TXN_123',
  proofLink: 'https://paypal.com/proof/123',
  processedBy: 'admin@maaledu.com'
});
```

---

## Data Integrity Checks

### Financial Consistency

```typescript
// 1. Affiliate total paid matches disbursements
Affiliate.totalPaid === sum(payoutDisbursements.amount where status='completed')

// 2. Pending commissions calculation
Affiliate.pendingCommissions === totalEarnings - totalPaid

// 3. Payout amount matches commission sum
PayoutHistory.amount === sum(commissionsPaid[].commissionAmount)

// 4. Commission count validation
PayoutHistory.commissionsCount === commissionsPaid.length
```

### Monetary Precision

All financial fields validated to 2 decimals:

```typescript
validate: {
  validator: (value: number) => Number.isInteger(value * 100),
  message: 'Amount must have at most 2 decimal places'
}
```

---

## Recent Updates (v3.0 - Dec 8, 2025)

### ✅ Fixed Issues

1. **Commission Calculation Standardization**
   - Centralized `lib/utils/commission.ts` with `calculateCommission()`
   - Consistent formula with proper rounding across all services

2. **Enrollment Service Validation**
   - Auto-calculates commission if not provided
   - Validates provided commission against expected calculation

3. **Commission Payment Tracking**
   - `processAffiliateCommission` sets `commissionPaid: false` on creation
   - Payment status updated via payout service

4. **Payout Service Created**
   - New `lib/services/payout.ts` with complete workflow
   - Functions: `processAffiliatePayout()`, `getUnpaidCommissionsSummary()`, `validatePayoutConsistency()`
   - Atomic transactions ensure consistency

5. **Interface Synchronization**
   - Models and services fully aligned
   - All affiliate fields included in service interfaces

---

## Support & Resources

**Documentation Version:** 3.0  
**Maintained By:** MaalEdu Development Team  
**Last Reviewed:** December 8, 2025

**Related Documentation:**
- [Services Documentation](../services/SERVICES_README.md)
- [API Routes Reference](../../app/api/README.md)
- [Frappe LMS Integration](../../FRAPPE_LMS_COMPLETE_AUDIT.md)
- [Deployment Guide](../../VERCEL_DEPLOYMENT_GUIDE.md)

**Contact:**
- Email: dev@maaledu.com
- Issues: Project repository
- Slack: #backend-support

---

*End of Database Models Reference v3.0*
