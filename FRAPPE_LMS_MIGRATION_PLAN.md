# 🚀 FrappeLMS Migration Plan - MaalEdu Frontend

**Branch:** `maaleduv2-frappe`  
**Date:** October 28, 2025  
**Status:** Ready for Implementation

---

## 📊 Executive Summary

### Key Finding: **EXCELLENT NEWS!** 🎉

After comprehensive codebase analysis, I discovered that **OpenEdX is NOT actively integrated** in the production code. All OpenEdX files are in the `xxtraa/_archive/` folder and are NOT being used. This makes the migration to FrappeLMS **significantly easier** than expected!

### What This Means:
- ✅ **No breaking changes** - OpenEdX was never actually connected
- ✅ **Simple addition** - We're adding new functionality, not replacing existing
- ✅ **Low risk** - All current flows continue to work
- ✅ **Fast implementation** - Estimated 2-3 days instead of 2 weeks

---

## 🔍 Current Architecture Analysis

### Payment & Enrollment Flow (AS-IS)

```
User → Course Page → Checkout API → Two Paths:
                                    ├─ Free Coupon → Direct Enrollment → Success Page
                                    └─ Paid → Stripe Checkout → Webhook → Update DB → Success Page
```

### Key Files Currently in Use:

1. **`app/api/checkout/route.ts`** - Main checkout API
   - Handles both free (coupon) and paid (Stripe) enrollments
   - Creates enrollment records in MongoDB
   - Stores `openedxUsername` and `openedxEmail` as metadata ONLY
   - **NO actual LMS sync happens**

2. **`app/api/webhook/route.ts`** - Stripe webhook handler
   - Receives payment confirmations from Stripe
   - Updates enrollment status from 'pending' to 'paid'
   - Processes affiliate commissions
   - Sends confirmation emails
   - **NO LMS sync happens**

3. **`lib/models/enrollment.ts`** - Enrollment database model
   - Stores all enrollment data
   - Has `openedxSync` field that's NEVER used
   - Has `lmsContext` with username/email but never synced

4. **`app/courses/[id]/page.tsx`** - Course detail page
   - Collects user information
   - Submits to checkout API
   - Shows loading states and errors

5. **`app/success/page.tsx`** - Success page
   - Shows enrollment confirmation
   - Links to "https://lms.maaledu.com" (hardcoded, not dynamic)

### Data Flow:

```typescript
// What's stored in database (but never used):
{
  lmsContext: {
    openedxUsername: "user123",  // ❌ Never synced to any LMS
    openedxEmail: "user@email.com",  // ❌ Never synced
    redirectSource: "direct"
  },
  openedxSync: {
    synced: false,  // ❌ Always false
    syncStatus: "pending"  // ❌ Never changes
  }
}
```

---

## 🎯 Migration Strategy: Add FrappeLMS Integration

### Overview

We'll add FrappeLMS enrollment after payment/coupon validation. The integration point is **AFTER** successful payment confirmation, not before.

### Implementation Approach

**Phase 1: Add FrappeLMS Service Layer** ✅  
**Phase 2: Integrate with Checkout Flow** ✅  
**Phase 3: Integrate with Webhook** ✅  
**Phase 4: Update Success Page** ✅  
**Phase 5: Testing & Deployment** ✅

---

## 📁 New File Structure

```
MaalEdu_Frontend/
├── lib/
│   ├── services/
│   │   ├── frappeLMS/
│   │   │   ├── index.ts          # Main export
│   │   │   ├── config.ts         # FrappeLMS configuration
│   │   │   ├── enrollment.ts     # Enrollment API calls
│   │   │   └── types.ts          # TypeScript types
│   │   └── enrollment.ts         # (Update to call FrappeLMS)
│   └── models/
│       └── enrollment.ts          # (Update field names)
└── app/
    └── api/
        ├── checkout/route.ts      # (Update to call FrappeLMS)
        └── webhook/route.ts       # (Update to call FrappeLMS)
```

---

## 🔧 Detailed Implementation Plan

### **Phase 1: Create FrappeLMS Service Layer**

#### File 1: `lib/services/frappeLMS/config.ts`

```typescript
/**
 * FrappeLMS Configuration
 */

export const FRAPPE_LMS_CONFIG = {
    baseUrl: process.env.FRAPPE_LMS_URL || 'http://139.59.229.250:8000',
    enrollmentEndpoint: '/api/method/lms.lms.payment_confirmation.confirm_payment',
    courseInfoEndpoint: '/api/method/lms.lms.payment_confirmation.get_course_info',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
};

export function getFrappeLMSUrl(endpoint: string): string {
    return `${FRAPPE_LMS_CONFIG.baseUrl}${endpoint}`;
}
```

#### File 2: `lib/services/frappeLMS/types.ts`

```typescript
/**
 * FrappeLMS API Types
 */

export interface FrappeEnrollmentRequest {
    user_email: string;
    course_id: string;
    paid_status: boolean;
    payment_id?: string;
    amount?: number;
    currency?: string;
    referral_code?: string;
}

export interface FrappeEnrollmentResponse {
    success: boolean;
    message?: string;
    enrollment_id?: string;
    user_email?: string;
    course_id?: string;
    error?: string;
}

export interface FrappeCourseInfo {
    success: boolean;
    course?: {
        id: string;
        title: string;
        description: string;
        price: number;
        currency: string;
        paid_course: boolean;
        image?: string;
        instructors?: string[];
    };
    error?: string;
}
```

#### File 3: `lib/services/frappeLMS/enrollment.ts`

```typescript
/**
 * FrappeLMS Enrollment Service
 */

import { FRAPPE_LMS_CONFIG, getFrappeLMSUrl } from './config';
import { FrappeEnrollmentRequest, FrappeEnrollmentResponse } from './types';
import ProductionLogger from '@/lib/utils/production-logger';

/**
 * Enroll user in FrappeLMS course
 */
export async function enrollInFrappeLMS(
    request: FrappeEnrollmentRequest
): Promise<FrappeEnrollmentResponse> {
    try {
        ProductionLogger.info('🎓 Starting FrappeLMS enrollment', {
            user_email: request.user_email,
            course_id: request.course_id,
            paid_status: request.paid_status
        });

        const url = getFrappeLMSUrl(FRAPPE_LMS_CONFIG.enrollmentEndpoint);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(FRAPPE_LMS_CONFIG.timeout)
        });

        if (!response.ok) {
            throw new Error(`FrappeLMS API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // FrappeLMS wraps response in 'message' field
        const result = data.message || data;

        if (result.success) {
            ProductionLogger.info('✅ FrappeLMS enrollment successful', {
                enrollment_id: result.enrollment_id,
                user_email: result.user_email,
                course_id: result.course_id
            });

            return {
                success: true,
                message: result.message || 'User enrolled successfully',
                enrollment_id: result.enrollment_id,
                user_email: result.user_email,
                course_id: result.course_id
            };
        } else {
            ProductionLogger.error('❌ FrappeLMS enrollment failed', {
                error: result.error || 'Unknown error'
            });

            return {
                success: false,
                error: result.error || 'Enrollment failed'
            };
        }

    } catch (error) {
        ProductionLogger.error('❌ FrappeLMS enrollment error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Enroll with retry logic
 */
export async function enrollInFrappeLMSWithRetry(
    request: FrappeEnrollmentRequest
): Promise<FrappeEnrollmentResponse> {
    let lastError: FrappeEnrollmentResponse | null = null;

    for (let attempt = 1; attempt <= FRAPPE_LMS_CONFIG.retryAttempts; attempt++) {
        ProductionLogger.info(`🔄 FrappeLMS enrollment attempt ${attempt}/${FRAPPE_LMS_CONFIG.retryAttempts}`);

        const result = await enrollInFrappeLMS(request);

        if (result.success) {
            return result;
        }

        lastError = result;

        // Wait before retrying (except on last attempt)
        if (attempt < FRAPPE_LMS_CONFIG.retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, FRAPPE_LMS_CONFIG.retryDelay * attempt));
        }
    }

    ProductionLogger.error('❌ FrappeLMS enrollment failed after all retries');
    return lastError || { success: false, error: 'All retry attempts failed' };
}
```

#### File 4: `lib/services/frappeLMS/index.ts`

```typescript
/**
 * FrappeLMS Service - Main Export
 */

export * from './config';
export * from './types';
export * from './enrollment';

export { enrollInFrappeLMS, enrollInFrappeLMSWithRetry } from './enrollment';
```

---

### **Phase 2: Update Checkout API**

#### Changes to `app/api/checkout/route.ts`

**Location 1: Import FrappeLMS service**

```typescript
// Add at top of file
import { enrollInFrappeLMSWithRetry } from '@/lib/services/frappeLMS';
```

**Location 2: In `processCouponEnrollment` function**

After enrollment is saved and coupon is marked as used, add:

```typescript
// 9. Enroll in FrappeLMS
try {
    const frappeResult = await enrollInFrappeLMSWithRetry({
        user_email: email.toLowerCase(),
        course_id: courseId,
        paid_status: true,
        payment_id: savedEnrollment.paymentId,
        amount: 0,
        currency: 'USD',
        referral_code: data.affiliateEmail || undefined
    });

    if (frappeResult.success) {
        // Update enrollment with FrappeLMS data
        await Enrollment.findByIdAndUpdate(savedEnrollment._id, {
            'openedxSync.synced': true,
            'openedxSync.syncStatus': 'success',
            'openedxSync.enrollmentId': frappeResult.enrollment_id,
            'openedxSync.syncCompletedAt': new Date()
        });

        ProductionLogger.info('✅ FrappeLMS enrollment synced', {
            enrollmentId: savedEnrollment._id,
            frappeEnrollmentId: frappeResult.enrollment_id
        });
    } else {
        // Mark as failed but don't fail the enrollment
        await Enrollment.findByIdAndUpdate(savedEnrollment._id, {
            'openedxSync.synced': false,
            'openedxSync.syncStatus': 'failed',
            'openedxSync.errorMessage': frappeResult.error,
            'openedxSync.lastSyncAttempt': new Date()
        });

        ProductionLogger.error('❌ FrappeLMS enrollment sync failed', {
            enrollmentId: savedEnrollment._id,
            error: frappeResult.error
        });
    }
} catch (frappeError) {
    ProductionLogger.error('❌ FrappeLMS enrollment exception', {
        enrollmentId: savedEnrollment._id,
        error: frappeError instanceof Error ? frappeError.message : 'Unknown error'
    });
    // Don't fail the enrollment if Frappe sync fails
}
```

---

### **Phase 3: Update Webhook**

#### Changes to `app/api/webhook/route.ts`

**Location 1: Import FrappeLMS service**

```typescript
// Add at top of file
import { enrollInFrappeLMSWithRetry } from '@/lib/services/frappeLMS';
```

**Location 2: After enrollment is updated to 'paid' status**

Add after the enrollment update section:

```typescript
// Enroll in FrappeLMS after successful payment
try {
    ProductionLogger.info('🎓 Enrolling in FrappeLMS after payment', {
        enrollmentId: updatedEnrollment._id,
        email: customerEmail,
        courseId: metadata.courseId
    });

    const frappeResult = await enrollInFrappeLMSWithRetry({
        user_email: customerEmail,
        course_id: metadata.courseId,
        paid_status: true,
        payment_id: session.payment_intent as string,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || 'usd',
        referral_code: metadata.affiliateEmail || undefined
    });

    if (frappeResult.success) {
        // Update enrollment with FrappeLMS data
        await Enrollment.findByIdAndUpdate(updatedEnrollment._id, {
            'openedxSync.synced': true,
            'openedxSync.syncStatus': 'success',
            'openedxSync.enrollmentId': frappeResult.enrollment_id,
            'openedxSync.syncCompletedAt': new Date()
        });

        ProductionLogger.info('✅ FrappeLMS enrollment synced via webhook', {
            enrollmentId: updatedEnrollment._id,
            frappeEnrollmentId: frappeResult.enrollment_id
        });
    } else {
        // Mark as failed but don't fail the payment
        await Enrollment.findByIdAndUpdate(updatedEnrollment._id, {
            'openedxSync.synced': false,
            'openedxSync.syncStatus': 'failed',
            'openedxSync.errorMessage': frappeResult.error,
            'openedxSync.lastSyncAttempt': new Date(),
            'openedxSync.retryCount': { $inc: 1 }
        });

        ProductionLogger.error('❌ FrappeLMS enrollment sync failed via webhook', {
            enrollmentId: updatedEnrollment._id,
            error: frappeResult.error
        });
    }
} catch (frappeError) {
    ProductionLogger.error('❌ FrappeLMS enrollment exception in webhook', {
        enrollmentId: updatedEnrollment._id,
        error: frappeError instanceof Error ? frappeError.message : 'Unknown error'
    });
    // Don't fail the payment if Frappe sync fails
}
```

---

### **Phase 4: Update Environment Variables**

#### Add to `.env.local` and `.env.example`

```bash
# FrappeLMS Configuration
FRAPPE_LMS_URL=http://139.59.229.250:8000
```

---

### **Phase 5: Update Success Page (Optional Enhancement)**

#### Changes to `app/success/page.tsx`

Update the hardcoded LMS link to be dynamic:

```typescript
const lmsUrl = process.env.NEXT_PUBLIC_FRAPPE_LMS_URL || 'http://139.59.229.250:8000';

// In the button:
<a href={lmsUrl} target="_blank" rel="noopener noreferrer">
```

---

## 🧪 Testing Plan

### Test Scenarios

1. **Free Enrollment with Coupon**
   - Submit enrollment with valid coupon code
   - Verify MongoDB enrollment created
   - Verify FrappeLMS enrollment created
   - Check `openedxSync.synced = true`

2. **Paid Enrollment via Stripe**
   - Complete Stripe checkout
   - Verify webhook processes payment
   - Verify FrappeLMS enrollment created
   - Check email confirmation sent

3. **Affiliate Referral**
   - Enroll with affiliate email
   - Verify affiliate commission calculated
   - Verify referral tracked in FrappeLMS

4. **Error Handling**
   - Test FrappeLMS API down
   - Verify enrollment still completes in MongoDB
   - Verify error logged, retry attempted
   - Check `openedxSync.syncStatus = 'failed'`

### Testing Commands

```bash
# Test free enrollment
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "block-chain-basics",
    "email": "test@example.com",
    "couponCode": "GRANT_TEST123"
  }'

# Test paid enrollment (will redirect to Stripe)
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "block-chain-basics",
    "email": "test@example.com"
  }'
```

---

## 📊 Migration Checklist

### Pre-Migration
- [ ] Review current codebase analysis
- [ ] Review FrappeLMS API documentation
- [ ] Backup production database
- [ ] Set up FrappeLMS test environment

### Implementation
- [ ] Create FrappeLMS service layer
- [ ] Update checkout API
- [ ] Update webhook handler
- [ ] Add environment variables
- [ ] Update success page

### Testing
- [ ] Test free enrollment flow
- [ ] Test paid enrollment flow
- [ ] Test affiliate tracking
- [ ] Test error handling
- [ ] Test retry logic

### Deployment
- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor logs for errors

### Post-Migration
- [ ] Monitor FrappeLMS enrollment success rate
- [ ] Check for sync failures
- [ ] Implement manual retry for failed syncs
- [ ] Update documentation

---

## 🚨 Risk Mitigation

### Critical Considerations

1. **FrappeLMS Downtime**
   - ✅ Enrollment still succeeds in our database
   - ✅ Error logged for manual retry
   - ✅ User can still access course (we have payment record)

2. **Network Timeout**
   - ✅ 30-second timeout configured
   - ✅ Retry logic with exponential backoff
   - ✅ Maximum 3 retry attempts

3. **Duplicate Enrollments**
   - ✅ FrappeLMS API handles duplicates
   - ✅ Returns existing enrollment if duplicate

4. **Data Consistency**
   - ✅ MongoDB is source of truth for payments
   - ✅ FrappeLMS sync is secondary
   - ✅ Can re-sync from MongoDB if needed

---

## 📈 Success Metrics

### Key Performance Indicators

1. **Enrollment Success Rate**
   - Target: 99%+ enrollments complete successfully
   - Measure: `openedxSync.synced = true` / total enrollments

2. **Sync Latency**
   - Target: < 5 seconds for FrappeLMS enrollment
   - Measure: Time from payment to FrappeLMS confirmation

3. **Error Rate**
   - Target: < 1% sync failures
   - Measure: `openedxSync.syncStatus = 'failed'` / total enrollments

4. **Retry Success Rate**
   - Target: 95%+ failures recover on retry
   - Measure: Successful retries / total failures

---

## 🎯 Next Steps

1. **Review this plan** - Confirm approach with team
2. **Set up FrappeLMS access** - Verify API credentials
3. **Create feature branch** - Already on `maaleduv2-frappe` ✅
4. **Implement Phase 1** - Create service layer
5. **Implement Phase 2-3** - Update APIs
6. **Test thoroughly** - All scenarios
7. **Deploy to production** - Gradual rollout

---

## 📞 Support & Questions

If you have questions during implementation:
- Check FrappeLMS API docs at `/Users/harshit/Desktop/Lms/MAALEDU_FRONTEND/frappeplan.md`
- Review archived OpenEdX code for reference patterns
- Test with FrappeLMS dev instance first

---

**Ready to begin implementation? Let me know and I'll start creating the files!** 🚀
