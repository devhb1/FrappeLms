# 🔧 MaalEdu Platform - Services Layer Documentation

**Version:** 1.0  
**Last Updated:** December 8, 2025  
**Status:** Production Ready ✅

> **Comprehensive documentation for the business logic layer**  
> Industry-standard service architecture for maintainability and testability

---

## 📋 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Service Index](#-service-index)
3. [Service Details](#-service-details)
4. [Usage Examples](#-usage-examples)
5. [Error Handling](#-error-handling)
6. [Testing Guidelines](#-testing-guidelines)
7. [Best Practices](#-best-practices)

---

## 🏗️ Architecture Overview

### Service Layer Pattern

The MaalEdu platform follows a **3-tier architecture**:

```
┌─────────────────────────────────────────────────┐
│              PRESENTATION LAYER                 │
│  (Next.js App Router, API Routes, Components)  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│               SERVICE LAYER                     │
│   (Business Logic, Validation, Orchestration)  │  ◄── YOU ARE HERE
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│               DATA LAYER                        │
│     (Mongoose Models, Database Operations)     │
└─────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Business logic isolated from routes
2. **Reusability**: Services used across multiple API endpoints
3. **Testability**: Pure functions easy to unit test
4. **Type Safety**: Full TypeScript interfaces
5. **Single Responsibility**: Each service handles one domain

### Why Service Layer?

| Without Services | With Services |
|------------------|---------------|
| ❌ Business logic in routes | ✅ Clean, reusable functions |
| ❌ Code duplication | ✅ DRY principle |
| ❌ Hard to test | ✅ Easy unit testing |
| ❌ Mixed concerns | ✅ Clear separation |
| ❌ Tight coupling | ✅ Loose coupling |

---

## 📦 Service Index

| Service | File | Purpose | Key Functions |
|---------|------|---------|--------------|
| **User** | `user.ts` | User management | `createUser`, `getUserById`, `updateUser` |
| **Affiliate** | `affiliate.ts` | Affiliate operations | `getAffiliateStats`, `getAffiliateEnrollments` |
| **Course** | `course.ts` | Course retrieval | `getCourseFromDb`, `updateCourseEnrollment` |
| **Enrollment** | `enrollment.ts` | Enrollment creation | `createEnrollment` (with auto-commission calc) |
| **Payout** | `payout.ts` | **NEW** Affiliate payouts | `processAffiliatePayout`, `getUnpaidCommissionsSummary` |
| **FrappeLMS** | `frappeLMS.ts` | External LMS sync | `enrollInFrappeLMS` |
| **Commission Utils** | `../utils/commission.ts` | **NEW** Commission calculations | `calculateCommission`, `validateCommission` |

---

## 🔍 Service Details

### 1. User Service (`user.ts`)

**Purpose**: Centralized user management operations

#### Class: `UserService`

```typescript
class UserService {
    // Create new user account
    static async createUser(userData: CreateUserData): Promise<IUser>
    
    // Get user by MongoDB _id
    static async getUserById(userId: string): Promise<IUser | null>
    
    // Get user by email
    static async getUserByEmail(email: string): Promise<IUser | null>
    
    // Update user profile
    static async updateUser(
        userId: string, 
        updates: Partial<IUser>
    ): Promise<IUser | null>
    
    // Delete user account
    static async deleteUser(userId: string): Promise<boolean>
    
    // Check course ownership
    static async hasPurchasedCourse(
        userId: string, 
        courseId: string
    ): Promise<boolean>
    
    // Record course purchase
    static async addPurchasedCourse(
        userId: string, 
        course: PurchasedCourseData
    ): Promise<IUser | null>
    
    // Update course progress
    static async updateCourseProgress(
        userId: string, 
        courseId: string, 
        progress: number
    ): Promise<IUser | null>
    
    // Get user's courses
    static async getUserCourses(userId: string): Promise<IPurchasedCourse[]>
}
```

#### Input Interfaces

```typescript
interface CreateUserData {
    username: string;
    email: string;
    password: string;
    role?: 'user' | 'admin';
}

interface PurchasedCourseData {
    courseId: string;
    title: string;
    paymentId: string;
    amount: number;
    progress?: number;
}
```

#### Usage Example

```typescript
import { UserService } from '@/lib/services';

// Create new user
const user = await UserService.createUser({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'securePassword123'
});

// Check course access
const hasAccess = await UserService.hasPurchasedCourse(
    user._id.toString(),
    'blockchain-101'
);

// Update progress
await UserService.updateCourseProgress(
    user._id.toString(),
    'blockchain-101',
    75 // 75% complete
);
```

#### Error Handling

```typescript
try {
    const user = await UserService.createUser(userData);
} catch (error) {
    if (error.code === 11000) {
        // Duplicate email/username
        return res.status(409).json({ error: 'User already exists' });
    }
    throw error;
}
```

---

### 2. Affiliate Service (`affiliate.ts`)

**Purpose**: Affiliate program statistics and enrollment tracking

#### Functions

```typescript
// Get affiliate statistics (earnings, referrals, etc.)
async function getAffiliateStats(affiliateEmail: string): Promise<AffiliateStats>

// Get paginated enrollment list for affiliate
async function getAffiliateEnrollments(
    affiliateEmail: string,
    options?: PaginationOptions
): Promise<PaginatedEnrollments>
```

#### Input/Output Interfaces

```typescript
interface AffiliateStats {
    totalReferrals: number;           // Total enrollments tracked
    conversionRate: number;           // Paid enrollments / total
    totalEarnings: number;            // Sum of commissions
    pendingEarnings: number;          // Unpaid commissions
    paidEarnings: number;             // Already disbursed
    coursesSold: {
        courseId: string;
        courseName: string;
        count: number;
        totalRevenue: number;
    }[];
}

interface PaginationOptions {
    page?: number;                    // Default: 1
    limit?: number;                   // Default: 20
    status?: 'paid' | 'pending';      // Filter by status
    sortBy?: 'date' | 'amount';       // Sort order
}

interface PaginatedEnrollments {
    enrollments: IEnrollment[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
}
```

#### Usage Example

```typescript
import { getAffiliateStats, getAffiliateEnrollments } from '@/lib/services/affiliate';

// Get affiliate dashboard stats
const stats = await getAffiliateStats('affiliate@example.com');
console.log(stats);
// {
//   totalReferrals: 150,
//   conversionRate: 0.67,
//   totalEarnings: 1500.00,
//   pendingEarnings: 500.00,
//   paidEarnings: 1000.00,
//   coursesSold: [...]
// }

// Get paginated enrollments
const enrollments = await getAffiliateEnrollments(
    'affiliate@example.com',
    { page: 1, limit: 10, status: 'paid' }
);
```

#### Business Logic

```typescript
// Stats calculation
1. Query all enrollments where affiliateData.affiliateEmail = email
2. Filter by status: 'paid' for earnings
3. Sum commissionAmount for each status
4. Group by courseId for coursesSold breakdown
5. Calculate conversion rate: paid / total
```

---

### 3. Course Service (`course.ts`)

**Purpose**: Course data retrieval and enrollment count updates

#### Functions

```typescript
// Get course from database by courseId
async function getCourseFromDb(courseId: string): Promise<ICourse | null>

// Update enrollment count (called after enrollment)
async function updateCourseEnrollment(
    courseId: string,
    email: string,
    paymentId: string,
    userId?: string
): Promise<void>
```

#### Input/Output Interfaces

```typescript
interface CourseQueryOptions {
    isActive?: boolean;               // Filter active courses
    level?: 'Beginner' | 'Intermediate' | 'Advanced';
    minPrice?: number;
    maxPrice?: number;
}
```

#### Usage Example

```typescript
import { getCourseFromDb, updateCourseEnrollment } from '@/lib/services/course';

// Get course details
const course = await getCourseFromDb('blockchain-101');
if (!course) {
    return res.status(404).json({ error: 'Course not found' });
}

// After successful enrollment
await updateCourseEnrollment(
    'blockchain-101',
    'student@example.com',
    'pi_abc123',
    userId // Optional
);
```

#### Business Logic

```typescript
// updateCourseEnrollment flow
1. Find course by courseId
2. Check if user already in enrolledUsers array
3. If not, add new entry to enrolledUsers
4. Increment totalEnrollments counter
5. Save course document
```

---

### 4. Enrollment Service (`enrollment.ts`)

**Purpose**: Create and validate course enrollments

#### Main Function

```typescript
async function createEnrollment(
    data: CreateEnrollmentData
): Promise<IEnrollment>
```

#### Input Interface

```typescript
interface CreateEnrollmentData {
    courseId: string;
    email: string;
    paymentId: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    enrollmentType: 'paid_stripe' | 'free_grant' | 'partial_grant' | 
                    'affiliate_referral' | 'lms_redirect';
    
    // Optional fields
    lmsContext?: {
        frappeUsername?: string;
        frappeEmail?: string;
        source?: string;
    };
    
    affiliateData?: {
        affiliateEmail: string;
        referralSource: string;
        commissionEligible: boolean;
        commissionAmount: number;
    };
    
    grantData?: {
        grantId: string;
        couponCode: string;
        approvalDate: Date;
    };
}
```

#### Usage Example

```typescript
import { createEnrollment } from '@/lib/services/enrollment';

// Standard paid enrollment
const enrollment = await createEnrollment({
    courseId: 'blockchain-101',
    email: 'student@example.com',
    paymentId: 'pi_abc123',
    amount: 299.00,
    status: 'paid',
    enrollmentType: 'paid_stripe'
});

// Enrollment with affiliate tracking
const affiliateEnrollment = await createEnrollment({
    courseId: 'blockchain-101',
    email: 'student@example.com',
    paymentId: 'pi_abc124',
    amount: 299.00,
    status: 'paid',
    enrollmentType: 'affiliate_referral',
    affiliateData: {
        affiliateEmail: 'partner@example.com',
        referralSource: 'affiliate_link',
        commissionEligible: true,
        commissionAmount: 29.90 // 10% commission
    }
});

// Grant enrollment (100% discount)
const grantEnrollment = await createEnrollment({
    courseId: 'blockchain-101',
    email: 'student@example.com',
    paymentId: 'FREE_GRANT_abc123',
    amount: 0,
    status: 'paid',
    enrollmentType: 'free_grant',
    grantData: {
        grantId: grant._id.toString(),
        couponCode: 'SCHOLARSHIP2025',
        approvalDate: new Date()
    }
});
```

#### Business Logic

```typescript
// createEnrollment flow
1. Validate input data
2. Check for duplicate paymentId
3. Create enrollment document
4. Set verification status
5. Queue Frappe LMS sync (RetryJob)
6. If affiliate: update affiliate stats
7. If grant: mark grant as used
8. Update course enrollment count
9. Return created enrollment
```

#### Error Handling

```typescript
try {
    const enrollment = await createEnrollment(data);
} catch (error) {
    if (error.code === 11000) {
        // Duplicate paymentId
        return res.status(409).json({ 
            error: 'Enrollment already exists' 
        });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ 
            error: 'Invalid enrollment data',
            details: error.message 
        });
    }
    throw error;
}
```

---

### 5. Frappe LMS Service (`frappeLMS.ts`)

**Purpose**: External LMS integration for course enrollment synchronization

#### Main Function

```typescript
async function enrollInFrappeLMS(
    enrollmentData: FrappeEnrollmentRequest
): Promise<FrappeEnrollmentResponse>
```

#### Input/Output Interfaces

```typescript
interface FrappeEnrollmentRequest {
    user_email: string;               // User's email
    course_id: string;                // Course identifier
    paid_status: boolean;             // Payment verification
    payment_id: string;               // Transaction reference
    amount: number;                   // Amount paid
    currency: string;                 // Currency code
    referral_code?: string;           // Optional affiliate email
    enrollmentType?: string;          // Enrollment context
}

interface FrappeEnrollmentResponse {
    success: boolean;
    message: string;
    enrollment_id?: string;           // Frappe LMS ID
    error?: string;
}
```

#### Usage Example

```typescript
import { enrollInFrappeLMS } from '@/lib/services/frappeLMS';

try {
    const response = await enrollInFrappeLMS({
        user_email: 'student@example.com',
        course_id: 'blockchain-101',
        paid_status: true,
        payment_id: 'pi_abc123',
        amount: 299.00,
        currency: 'USD',
        referral_code: 'affiliate@example.com',
        enrollmentType: 'affiliate_referral'
    });
    
    if (response.success) {
        console.log('Enrolled in Frappe LMS:', response.enrollment_id);
    }
} catch (error) {
    console.error('Frappe sync failed:', error);
    // Enrollment queued for retry via RetryJob
}
```

#### API Configuration

```typescript
// Environment variables
FRAPPE_LMS_URL=https://lms.example.com
FRAPPE_API_KEY=your_api_key_here
FRAPPE_API_SECRET=your_secret_here

// Request headers
{
    'Authorization': `token ${API_KEY}:${API_SECRET}`,
    'Content-Type': 'application/json'
}
```

#### Error Handling

```typescript
// Service handles various failure scenarios
1. Network timeout (10 seconds)
2. Invalid API credentials (401)
3. Course not found in LMS (404)
4. Server error (500)
5. Rate limiting (429)

// All errors are caught and logged
// Failed requests queued for retry via RetryJob model
```

#### Retry Logic

```typescript
// Handled by RetryJob model, not by service
1. Service throws error
2. Caller catches and creates RetryJob
3. Background worker picks up job
4. Exponential backoff: 2m, 4m, 8m, 16m, 32m
5. Max 5 attempts before marking as failed
```

---

## 💡 Usage Examples

### Example 1: Complete User Registration Flow

```typescript
import { UserService } from '@/lib/services';
import { createEnrollment } from '@/lib/services/enrollment';

async function registerAndEnroll(userData, courseId) {
    // 1. Create user account
    const user = await UserService.createUser({
        username: userData.username,
        email: userData.email,
        password: userData.password
    });
    
    // 2. Create enrollment
    const enrollment = await createEnrollment({
        courseId,
        email: user.email,
        paymentId: userData.paymentId,
        amount: userData.amount,
        status: 'paid',
        enrollmentType: 'paid_stripe'
    });
    
    // 3. Add to user's purchased courses
    await UserService.addPurchasedCourse(
        user._id.toString(),
        {
            courseId,
            title: enrollment.courseTitle,
            paymentId: userData.paymentId,
            amount: userData.amount
        }
    );
    
    return { user, enrollment };
}
```

### Example 2: Affiliate Commission Calculation

```typescript
import { getAffiliateStats } from '@/lib/services/affiliate';
import { Affiliate } from '@/lib/models/affiliate';

async function processAffiliatePayout(affiliateEmail, periodStart, periodEnd) {
    // 1. Get current stats
    const stats = await getAffiliateStats(affiliateEmail);
    
    // 2. Find affiliate
    const affiliate = await Affiliate.findOne({ email: affiliateEmail });
    if (!affiliate) throw new Error('Affiliate not found');
    
    // 3. Calculate payout amount
    const payoutAmount = stats.pendingEarnings;
    
    if (payoutAmount <= 0) {
        throw new Error('No pending earnings');
    }
    
    // 4. Create payout record
    const payout = await PayoutHistory.create({
        affiliateId: affiliate.affiliateId,
        affiliateEmail,
        amount: payoutAmount,
        payoutMethod: affiliate.payoutMode,
        currency: 'USD',
        status: 'processed',
        processedBy: 'admin@example.com',
        processedAt: new Date(),
        commissionsCount: stats.pendingCommissions.length,
        commissionsPaid: stats.pendingCommissions,
        periodStart,
        periodEnd
    });
    
    // 5. Update affiliate
    await affiliate.updateOne({
        $inc: { totalPaid: payoutAmount },
        $push: {
            payoutDisbursements: {
                payoutId: payout._id,
                amount: payoutAmount,
                currency: 'USD',
                payoutMethod: affiliate.payoutMode,
                status: 'completed',
                processedBy: 'admin@example.com',
                processedAt: new Date(),
                commissionsCount: stats.pendingCommissions.length,
                periodStart,
                periodEnd
            }
        }
    });
    
    return payout;
}
```

### Example 3: Grant Application & Redemption

```typescript
import { Grant } from '@/lib/models/grant';
import { createEnrollment } from '@/lib/services/enrollment';

async function redeemGrantCoupon(email, couponCode, courseId) {
    // 1. Find grant
    const grant = await Grant.findOne({
        email: email.toLowerCase(),
        couponCode: couponCode.toUpperCase(),
        status: 'approved',
        couponUsed: false
    });
    
    if (!grant) {
        throw new Error('Invalid or already used coupon');
    }
    
    // 2. Atomic reservation (prevent race condition)
    const reserved = await Grant.findOneAndUpdate(
        {
            _id: grant._id,
            couponUsed: false,
            reservedAt: { $exists: false }
        },
        { $set: { reservedAt: new Date() } },
        { new: true }
    );
    
    if (!reserved) {
        throw new Error('Coupon was just used by another request');
    }
    
    // 3. Calculate pricing
    const pricing = grant.calculatePricing(coursePrice);
    
    // 4. Create enrollment
    const enrollment = await createEnrollment({
        courseId,
        email,
        paymentId: `GRANT_${grant.couponCode}_${Date.now()}`,
        amount: pricing.finalPrice,
        status: 'paid',
        enrollmentType: pricing.finalPrice === 0 ? 'free_grant' : 'partial_grant',
        grantData: {
            grantId: grant._id.toString(),
            couponCode: grant.couponCode,
            approvalDate: grant.updatedAt
        }
    });
    
    // 5. Mark grant as used
    await grant.updateOne({ 
        $set: { couponUsed: true, usedAt: new Date() } 
    });
    
    return { enrollment, pricing };
}
```

---

## ⚠️ Error Handling

### Standard Error Patterns

```typescript
// 1. Not Found
if (!resource) {
    throw new Error('Resource not found');
}

// 2. Duplicate Entry
try {
    await Model.create(data);
} catch (error) {
    if (error.code === 11000) {
        throw new Error('Resource already exists');
    }
    throw error;
}

// 3. Validation Error
try {
    await model.validate();
} catch (error) {
    if (error.name === 'ValidationError') {
        throw new Error(`Validation failed: ${error.message}`);
    }
    throw error;
}

// 4. External API Error
try {
    const response = await externalApi.call(data);
} catch (error) {
    console.error('External API failed:', error);
    // Queue for retry, don't throw to caller
    await createRetryJob(data);
}
```

### Error Response Format

```typescript
// Success
{
    success: true,
    data: { ... }
}

// Error
{
    success: false,
    error: 'Human-readable message',
    code: 'ERROR_CODE',
    details: { ... }  // Optional
}
```

---

## 🧪 Testing Guidelines

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserService } from '@/lib/services/user';
import { connectDB, disconnectDB } from '@/lib/db';

describe('UserService', () => {
    beforeEach(async () => {
        await connectDB();
    });
    
    afterEach(async () => {
        await disconnectDB();
    });
    
    it('should create a new user', async () => {
        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
        };
        
        const user = await UserService.createUser(userData);
        
        expect(user).toBeDefined();
        expect(user.email).toBe(userData.email.toLowerCase());
        expect(user.isVerified).toBe(false);
    });
    
    it('should throw error for duplicate email', async () => {
        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
        };
        
        await UserService.createUser(userData);
        
        await expect(
            UserService.createUser(userData)
        ).rejects.toThrow('User already exists');
    });
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from '@jest/globals';
import { createEnrollment } from '@/lib/services/enrollment';
import { getCourseFromDb } from '@/lib/services/course';

describe('Enrollment Flow', () => {
    it('should create enrollment and update course count', async () => {
        const courseId = 'test-course';
        const initialCourse = await getCourseFromDb(courseId);
        const initialCount = initialCourse.totalEnrollments;
        
        await createEnrollment({
            courseId,
            email: 'test@example.com',
            paymentId: 'test_payment_123',
            amount: 100,
            status: 'paid',
            enrollmentType: 'paid_stripe'
        });
        
        const updatedCourse = await getCourseFromDb(courseId);
        expect(updatedCourse.totalEnrollments).toBe(initialCount + 1);
    });
});
```

---

## ✨ Best Practices

### 1. Always Validate Input

```typescript
function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function createUser(data: CreateUserData) {
    if (!validateEmail(data.email)) {
        throw new Error('Invalid email format');
    }
    // Proceed with creation
}
```

### 2. Use Transactions for Multi-Model Operations

```typescript
import mongoose from 'mongoose';

async function createEnrollmentWithUserUpdate(data) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const enrollment = await createEnrollment(data, { session });
        await UserService.addPurchasedCourse(
            data.userId,
            enrollmentData,
            { session }
        );
        
        await session.commitTransaction();
        return enrollment;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
```

### 3. Handle External API Failures Gracefully

```typescript
async function enrollWithSync(data) {
    // Create local enrollment first
    const enrollment = await createEnrollment(data);
    
    // Try external sync, but don't fail if it errors
    try {
        await enrollInFrappeLMS(data);
    } catch (error) {
        console.error('Frappe sync failed, queuing for retry:', error);
        await createRetryJob(enrollment);
    }
    
    return enrollment;
}
```

### 4. Use Service Layer in API Routes

```typescript
// ❌ Bad: Business logic in route
export async function POST(request: Request) {
    const data = await request.json();
    const user = await User.create(data);  // Model directly in route
    await sendEmail(user.email);
    return Response.json(user);
}

// ✅ Good: Use service layer
export async function POST(request: Request) {
    const data = await request.json();
    const user = await UserService.createUser(data);  // Service handles logic
    return Response.json(user);
}
```

### 5. Keep Services Pure (No Side Effects)

```typescript
// ❌ Bad: Service modifies external state
async function createUser(data) {
    const user = await User.create(data);
    req.session.userId = user._id;  // Side effect!
    return user;
}

// ✅ Good: Service returns data, caller handles side effects
async function createUser(data) {
    const user = await User.create(data);
    return user;
}
```

### 6. Document Complex Business Logic

```typescript
/**
 * Calculates affiliate commission based on enrollment amount and rate
 * 
 * Business Rules:
 * - Commission only on paid enrollments (status: 'paid')
 * - Free grants (amount: 0) earn no commission
 * - Commission = amount * (rate / 100)
 * - Result rounded to 2 decimal places
 * 
 * @param amount - Enrollment amount in USD
 * @param rate - Commission rate (0-100)
 * @returns Commission amount with 2 decimal precision
 */
function calculateCommission(amount: number, rate: number): number {
    if (amount <= 0) return 0;
    return Math.round(amount * rate) / 100;
}
```

---

## 🔄 Service Dependencies

### Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│                  SERVICE DEPENDENCIES               │
└─────────────────────────────────────────────────────┘

UserService
    │
    └── Uses: User model
    
AffiliateService
    │
    ├── Uses: Affiliate model
    └── Uses: Enrollment model
    
CourseService
    │
    └── Uses: Course model
    
EnrollmentService
    │
    ├── Uses: Enrollment model
    ├── Uses: Course model (updateCourseEnrollment)
    ├── Uses: Affiliate model (commission tracking)
    ├── Uses: Grant model (coupon validation)
    ├── Uses: RetryJob model (Frappe sync queue)
    └── Uses: FrappeLMS service (external sync)
    
FrappeLMSService
    │
    └── Uses: External API (Frappe LMS)
```

---

## 📚 Additional Resources

- [Models Documentation](../models/MODELS_README.md)
- [API Routes Documentation](../../app/api/README.md)
- [Database Schema Guide](../models/MODELS_DOCUMENTATION.md)
- [Testing Guide](../../tests/README.md)

---

### 6. Payout Service (`payout.ts`) **NEW**

**Purpose**: Complete affiliate payout processing with audit trail and data consistency

#### Functions

```typescript
// Get summary of unpaid commissions for an affiliate
async function getUnpaidCommissionsSummary(
    affiliateEmail: string,
    periodStart?: Date,
    periodEnd?: Date
): Promise<PayoutSummary | null>

// Process affiliate payout with atomic transaction
async function processAffiliatePayout(
    data: CreatePayoutData
): Promise<IPayoutHistory>

// Get payout history for an affiliate
async function getAffiliatePayoutHistory(
    affiliateEmail: string,
    options?: PaginationOptions
): Promise<{ payouts: IPayoutHistory[]; total: number }>

// Validate data consistency across models
async function validatePayoutConsistency(
    affiliateEmail: string
): Promise<ConsistencyReport>

// Recalculate affiliate totals from source data
async function recalculateAffiliateTotals(
    affiliateEmail: string
): Promise<RecalculationResult>
```

#### Input Interfaces

```typescript
interface CreatePayoutData {
    affiliateEmail: string;
    periodStart: Date;
    periodEnd: Date;
    payoutMethod: 'paypal' | 'bank' | 'crypto';
    currency?: string;              // Default: 'USD'
    transactionId?: string;         // External payment reference
    processedBy: string;            // Admin email
    proofLink?: string;             // Receipt URL
    adminNotes?: string;            // Internal notes
}

interface PayoutSummary {
    affiliateId: string;
    affiliateEmail: string;
    affiliateName: string;
    totalCommission: number;
    commissionsCount: number;
    periodStart: Date;
    periodEnd: Date;
    unpaidEnrollments: Array<{
        enrollmentId: string;
        courseId: string;
        customerEmail: string;
        commissionAmount: number;
        enrolledAt: Date;
    }>;
}
```

#### Usage Example

```typescript
import { 
    getUnpaidCommissionsSummary, 
    processAffiliatePayout 
} from '@/lib/services/payout';

// 1. Get unpaid commissions summary
const summary = await getUnpaidCommissionsSummary(
    'affiliate@example.com',
    new Date('2025-01-01'),
    new Date('2025-01-31')
);

console.log(summary);
// {
//   affiliateId: 'af_abc123',
//   totalCommission: 500.00,
//   commissionsCount: 15,
//   unpaidEnrollments: [...]
// }

// 2. Process payout
const payout = await processAffiliatePayout({
    affiliateEmail: 'affiliate@example.com',
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2025-01-31'),
    payoutMethod: 'paypal',
    transactionId: 'PAYPAL_TXN_123456',
    processedBy: 'admin@example.com',
    proofLink: 'https://paypal.com/receipt/123',
    adminNotes: 'January 2025 payout'
});

// This atomically:
// - Creates PayoutHistory record
// - Adds to Affiliate.payoutDisbursements[]
// - Updates Affiliate.totalPaid
// - Marks all Enrollment.affiliateData.commissionPaid = true
// - Sets Enrollment.affiliateData.paidAt and payoutId
```

#### Transaction Safety

The `processAffiliatePayout` function uses **MongoDB transactions** to ensure atomicity:

```typescript
// All these operations succeed together or fail together:
1. Create PayoutHistory record
2. Update Affiliate.payoutDisbursements (push)
3. Update Affiliate.totalPaid (increment)
4. Update Affiliate.pendingCommissions (decrement)
5. Mark all enrollments as paid (bulk update)

// If any step fails, ALL changes are rolled back
```

#### Validation & Reconciliation

```typescript
// Check data consistency
const validation = await validatePayoutConsistency('affiliate@example.com');

if (!validation.isConsistent) {
    console.log('Discrepancy found:', validation.discrepancy);
    // {
    //   totalPaidDiff: 0.02,      // $0.02 difference
    //   pendingDiff: -0.02
    // }
    
    // Fix automatically
    await recalculateAffiliateTotals('affiliate@example.com');
}
```

---

### 7. Commission Utilities (`../utils/commission.ts`) **NEW**

**Purpose**: Centralized commission calculation to ensure consistency

#### Functions

```typescript
// Calculate commission with consistent rounding
function calculateCommission(amount: number, rate: number): number

// Calculate with strict validation
function calculateCommissionStrict(amount: number, rate: number): number

// Validate commission matches calculation
function validateCommission(
    amount: number, 
    rate: number, 
    expectedCommission: number
): boolean

// Get detailed breakdown
function getCommissionBreakdown(
    amount: number, 
    rate: number
): CommissionBreakdown

// Calculate total for multiple enrollments
function calculateTotalCommissions(
    enrollments: Array<{ amount: number; rate: number }>
): number

// Format for display
function formatCommission(amount: number, currency?: string): string

// Calculate required rate for target commission
function calculateRequiredRate(amount: number, targetCommission: number): number
```

#### Usage Example

```typescript
import { 
    calculateCommission, 
    validateCommission,
    getCommissionBreakdown 
} from '@/lib/services';

// 1. Calculate commission
const commission = calculateCommission(299.99, 10);
console.log(commission); // 30.00

// 2. Validate commission
const isValid = validateCommission(299.99, 10, 30.00);
console.log(isValid); // true

// 3. Get breakdown
const breakdown = getCommissionBreakdown(299.99, 10);
console.log(breakdown);
// {
//   baseAmount: 299.99,
//   rate: 10,
//   rateDecimal: 0.1,
//   commission: 30.00,
//   netAmount: 269.99
// }

// 4. Calculate total
const total = calculateTotalCommissions([
    { amount: 100, rate: 10 },
    { amount: 200, rate: 15 },
    { amount: 150, rate: 10 }
]);
console.log(total); // 55.00 (10 + 30 + 15)
```

#### Rounding Strategy

**Consistent Formula**: `Math.round((amount * rate / 100) * 100) / 100`

This ensures:
- **Monetary precision**: Exactly 2 decimal places
- **Consistency**: Same result across all calculations
- **No floating point errors**: Multiply by 100, round to integer, divide by 100

```typescript
// Examples
calculateCommission(99.99, 10)   // 10.00
calculateCommission(100.00, 10)  // 10.00
calculateCommission(100.01, 10)  // 10.00
calculateCommission(299.99, 10)  // 30.00
calculateCommission(0, 10)       // 0.00 (free courses)
```

---

## 🐛 Known Issues

### Current Limitations

1. **FrappeLMS Service**:
   - No connection pooling (each request creates new connection)
   - Fixed 10-second timeout (should be configurable)
   - Retry logic handled by caller (could be internal)

2. **Affiliate Service**:
   - `conversionRate` calculation incomplete (clicks not tracked)
   - No caching for frequently accessed stats

3. **Enrollment Service**:
   - Frappe sync is fire-and-forget (no immediate failure feedback)

---

## ✅ Recently Fixed Issues (December 8, 2025)

### Issues Resolved

#### 1. **CRITICAL: Inconsistent Commission Calculations**

**Problem**: Commission calculated differently across multiple files
- `checkout/route.ts` used one formula
- `webhook/route.ts` used slightly different approach
- `affiliate.ts` model had its own calculation
- Risk of penny discrepancies in financial records

**Solution**: Created `lib/utils/commission.ts` with centralized `calculateCommission()` function
- Single source of truth for all commission calculations
- Consistent rounding: `Math.round((amount * rate / 100) * 100) / 100`
- Validation functions to ensure accuracy
- Now exported from `lib/services/index.ts`

**Files Updated**:
- ✅ Created `lib/utils/commission.ts`
- ✅ Updated `lib/services/enrollment.ts` to use it
- ✅ Updated `lib/services/index.ts` exports

---

#### 2. **CRITICAL: Missing Commission Validation in Enrollment Service**

**Problem**: Service accepted `commissionAmount` but never validated it
- Callers had to calculate commission themselves
- No validation that amount matched rate
- Duplicated calculation logic across codebase

**Solution**: Enhanced enrollment service with auto-calculation and validation
- Auto-calculates commission if not provided
- Validates provided commission against expected calculation
- Uses affiliate's default rate if not specified
- Throws error if validation fails

**Code Example**:
```typescript
// Before: Caller must calculate
await createEnrollment({
    amount: 299.99,
    affiliateData: {
        commissionAmount: 30.00,  // Must calculate manually
        commissionRate: 10
    }
});

// After: Auto-calculated
await createEnrollment({
    amount: 299.99,
    affiliateData: {
        affiliateEmail: 'partner@example.com'
        // commissionAmount and rate calculated automatically
    }
});
```

**Files Updated**:
- ✅ Updated `lib/services/enrollment.ts`

---

#### 3. **MAJOR: Commission Payment Tracking Incomplete**

**Problem**: New fields added to model but never updated
- `Enrollment.affiliateData.commissionPaid` never set to `true`
- `Enrollment.affiliateData.paidAt` never populated
- `Enrollment.affiliateData.payoutId` never linked
- No way to distinguish paid vs unpaid commissions

**Solution**: Complete payout workflow via new payout service
- `processAffiliatePayout()` marks all enrollments as paid
- Sets `commissionPaid: true`, `paidAt: Date`, `payoutId: ObjectId`
- Uses MongoDB transactions for atomicity
- Updates 3 models consistently (Affiliate, PayoutHistory, Enrollment)

**Files Updated**:
- ✅ Created `lib/services/payout.ts`
- ✅ Updated `lib/services/enrollment.ts` to track unpaid status

---

#### 4. **MAJOR: No Service Layer for Payout Processing**

**Problem**: PayoutHistory model existed but had no service implementation
- Admins would need to manually query enrollments
- No transaction safety
- Risk of data inconsistency across 3 models

**Solution**: Complete payout service with 5 key functions
- `getUnpaidCommissionsSummary()`: Get enrollments ready for payout
- `processAffiliatePayout()`: Execute payout with atomic transaction
- `getAffiliatePayoutHistory()`: Retrieve payout records
- `validatePayoutConsistency()`: Check data integrity
- `recalculateAffiliateTotals()`: Fix discrepancies

**Features**:
- ✅ Atomic transactions (all-or-nothing updates)
- ✅ Complete audit trail
- ✅ Validation and reconciliation tools
- ✅ Period-based payout filtering
- ✅ Transaction ID and proof link support

**Files Created**:
- ✅ `lib/services/payout.ts` (400+ lines)

---

#### 5. **MODERATE: Service Interface Mismatch with Model**

**Problem**: Enrollment service interface didn't include all model fields
- Missing: `commissionPaid`, `paidAt`, `payoutId`
- Missing: `referralSource`, `referralTimestamp`
- Service couldn't create enrollments with complete data

**Solution**: Extended interface to match model
- Made `commissionAmount` and `commissionRate` optional
- Added `referralSource` and `referralTimestamp` fields
- Service now supports all affiliate data fields

**Files Updated**:
- ✅ Updated `lib/services/enrollment.ts` interface

---

### Migration Guide for API Routes

If you're using commission calculations in API routes, update them to use the centralized function:

```typescript
// ❌ Old way (inconsistent)
const commission = Math.round((amount * rate) / 100 * 100) / 100;

// ✅ New way (consistent)
import { calculateCommission } from '@/lib/services';
const commission = calculateCommission(amount, rate);
```

**Files to update**:
- `app/api/checkout/route.ts`
- `app/api/webhook/route.ts`
- `app/api/admin/affiliates/route.ts`
- Any other routes calculating commissions

---

## 🚀 Future Enhancements

1. **Caching Layer**: Add Redis for frequently accessed data
2. **Rate Limiting**: Implement per-service rate limits
3. **Metrics**: Add Prometheus/Grafana monitoring
4. **Logging**: Structured logging with Winston/Pino
5. **Event System**: Emit events for audit trail

---

## 📞 Support & Contact

**Maintained by**: MaalEdu Development Team  
**Documentation Version**: 1.0  
**Last Reviewed**: December 8, 2025

For questions or issues:
- Create issue in project repository
- Contact: dev@maaledu.com
- Slack: #backend-support

---

**End of Services Documentation**
