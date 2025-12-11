# 🔐 Frappe LMS Email Verification Implementation Plan

**Created:** December 9, 2025  
**Status:** Implementation Ready  
**Priority:** HIGH - Pre-Payment User Verification

---

## 📋 EXECUTIVE SUMMARY

### Current Flow:
```
User → Enters Email → Checkout → Payment → Create Enrollment → Try Frappe → Send Email
```

### NEW Flow (Required):
```
User → Enters Email → **Verify Frappe Account Exists** → Proceed if YES / Redirect if NO
                                                       ↓
                                            Checkout → Payment → Enrollment
```

---

## 🎯 OBJECTIVES

1. **Verify user exists in Frappe LMS BEFORE payment**
2. **Remove username field** from checkout (redundant if email verified)
3. **Block non-existent users** from proceeding with payment
4. **Redirect to Frappe registration** if account doesn't exist
5. **Maintain current affiliate/coupon flow** intact

---

## 📊 CURRENT SYSTEM ANALYSIS

### 1. Checkout Component (`components/enhanced-checkout-flow.tsx`)
**Status:** Basic flow exists, needs email verification step  
**Current Steps:**
```typescript
1. Validation (basic email format check)
2. Coupon Processing
3. Enrollment Creation
4. Payment Processing
```

**Issues:**
- ❌ No Frappe user verification
- ❌ Username field still required
- ❌ Users can pay even if they don't exist in Frappe

### 2. Checkout API (`app/api/checkout/route.ts`)
**Status:** Robust payment/enrollment logic, no pre-verification  
**Current Logic:**
```typescript
POST /api/checkout {
  courseId,
  email,
  couponCode?,
  affiliateEmail?,
  username?, // ← REMOVE THIS
  redirectSource?
}

Flow:
1. Validate input
2. Get course data
3. Check duplicate enrollment
4. Validate affiliate (if provided)
5. Process coupon OR create Stripe checkout
6. Return response
```

**Issues:**
- ❌ No Frappe user check before creating enrollment
- ❌ Username field exists but not used properly
- ❌ Frappe enrollment happens AFTER payment (webhook)

### 3. Frappe LMS Service (`lib/services/frappeLMS.ts`)
**Status:** Only has enrollment function, needs user check function  
**Current Functions:**
```typescript
- enrollInFrappeLMS() // Creates enrollment after payment
- getCourseInfo()     // Gets course details
```

**Missing:**
- ❌ checkUserExists() function

---

## 🔧 FRAPPE LMS API DETAILS

### New Endpoint: Check User Exists

**From Frappe LMS Developer:**

```
Endpoint: lms.lms.doctype.lms_enrollment.lms_enrollment.check_user_exists

URL (POST):
POST /api/method/lms.lms.doctype.lms_enrollment.lms_enrollment.check_user_exists

URL (GET):
GET /api/method/lms.lms.doctype.lms_enrollment.lms_enrollment.check_user_exists?user_email=user@example.com

Access: Guest access enabled (no authentication required)

Request Body (POST):
{
  "user_email": "user@example.com"
  // OR
  "email": "user@example.com"
}

Response Format:
{
  "message": {
    "exists": true,
    "user": {
      "email": "user@example.com",
      "full_name": "John Doe",
      "username": "johndoe"
    }
  }
}

OR

{
  "message": {
    "exists": false,
    "registration_url": "https://lms.maaledu.com/register"
  }
}
```

---

## 🏗️ IMPLEMENTATION PLAN

### Phase 1: Create Frappe User Check Service ✅

**File:** `lib/services/frappeLMS.ts`  
**Action:** Add new function to check if user exists

```typescript
/**
 * Check if user exists in Frappe LMS
 * @param email - User email to verify
 * @returns Promise with user existence status
 */
export interface FrappeUserCheckResponse {
    success: boolean;
    exists: boolean;
    user?: {
        email: string;
        full_name?: string;
        username?: string;
    };
    registration_url?: string;
    error?: string;
}

export async function checkFrappeUserExists(
    email: string
): Promise<FrappeUserCheckResponse> {
    try {
        ProductionLogger.info('Checking Frappe LMS user existence', {
            email: email.toLowerCase()
        });

        // Validate email format
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return {
                success: false,
                exists: false,
                error: emailValidation.error
            };
        }

        // Validate base URL
        if (!FRAPPE_CONFIG.baseUrl) {
            throw new Error('FRAPPE_LMS_BASE_URL is not configured');
        }

        const checkUrl = `${FRAPPE_CONFIG.baseUrl}/api/method/lms.lms.doctype.lms_enrollment.lms_enrollment.check_user_exists`;

        ProductionLogger.info('Making Frappe LMS user check API call', {
            url: checkUrl,
            email: email.toLowerCase()
        });

        // Make API call (guest access, no auth required)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FRAPPE_CONFIG.timeout);

        const response = await fetch(checkUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                user_email: email.toLowerCase()
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Frappe API returned ${response.status}`);
        }

        const result = await response.json();

        ProductionLogger.info('Frappe user check response', {
            exists: result.message?.exists,
            hasUserData: !!result.message?.user
        });

        if (result.message?.exists) {
            return {
                success: true,
                exists: true,
                user: result.message.user
            };
        } else {
            return {
                success: true,
                exists: false,
                registration_url: result.message?.registration_url || 
                                  `${FRAPPE_CONFIG.baseUrl}/register`
            };
        }

    } catch (error) {
        ProductionLogger.error('Frappe user check failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            email
        });

        return {
            success: false,
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
```

---

### Phase 2: Create API Route for User Verification ✅

**File:** `app/api/verify-frappe-user/route.ts` (NEW)  
**Action:** Create endpoint for frontend to verify user

```typescript
/**
 * API Route: Verify Frappe LMS User
 * 
 * Checks if user exists in Frappe LMS before allowing checkout
 * 
 * POST /api/verify-frappe-user
 * Body: { email: string }
 * 
 * Returns:
 * - exists: true -> User can proceed with checkout
 * - exists: false -> Redirect to Frappe registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkFrappeUserExists } from '@/lib/services/frappeLMS';
import ProductionLogger from '@/lib/utils/production-logger';
import { z } from 'zod';

const verifySchema = z.object({
    email: z.string().email('Valid email required').toLowerCase()
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = verifySchema.parse(body);

        ProductionLogger.info('User verification request', { email });

        // Check if user exists in Frappe LMS
        const result = await checkFrappeUserExists(email);

        if (!result.success) {
            return NextResponse.json({
                error: 'Unable to verify user account',
                code: 'VERIFICATION_FAILED',
                details: result.error
            }, { status: 500 });
        }

        if (result.exists) {
            ProductionLogger.info('User verified in Frappe LMS', {
                email,
                username: result.user?.username
            });

            return NextResponse.json({
                exists: true,
                user: {
                    email: result.user?.email,
                    fullName: result.user?.full_name,
                    username: result.user?.username
                },
                message: 'Account verified! You can proceed with enrollment.'
            });
        } else {
            ProductionLogger.info('User not found in Frappe LMS', { email });

            return NextResponse.json({
                exists: false,
                registrationUrl: result.registration_url,
                message: 'No account found. Please create an account first.'
            });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Invalid email format',
                code: 'VALIDATION_ERROR'
            }, { status: 400 });
        }

        ProductionLogger.error('User verification error', {
            error: error instanceof Error ? error.message : 'Unknown'
        });

        return NextResponse.json({
            error: 'Verification failed. Please try again.',
            code: 'INTERNAL_ERROR'
        }, { status: 500 });
    }
}
```

---

### Phase 3: Update Enhanced Checkout Flow ✅

**File:** `components/enhanced-checkout-flow.tsx`  
**Action:** Add email verification step BEFORE payment

**New Flow:**
```typescript
Step 0: Email Verification (NEW)
  └─ Call /api/verify-frappe-user
  └─ If exists: Continue
  └─ If not exists: Show registration prompt

Step 1: Validation
Step 2: Coupon Processing  
Step 3: Enrollment Creation
Step 4: Payment Processing
```

**Changes Required:**

1. **Add new step** to steps array:
```typescript
const [steps, setSteps] = useState<CheckoutStep[]>([
    { id: 'verify', label: 'Verifying account', status: 'pending' }, // NEW
    { id: 'validation', label: 'Validating request', status: 'pending' },
    { id: 'coupon', label: 'Processing coupon', status: 'pending' },
    { id: 'enrollment', label: 'Creating enrollment', status: 'pending' },
    { id: 'payment', label: 'Processing payment', status: 'pending' }
]);
```

2. **Add user verification state**:
```typescript
const [userVerified, setUserVerified] = useState(false);
const [frappeUser, setFrappeUser] = useState<any>(null);
```

3. **Add verification function**:
```typescript
const verifyFrappeUser = async (): Promise<boolean> => {
    updateStepStatus('verify', 'loading');

    try {
        const response = await fetch('/api/verify-frappe-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase() })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Verification failed');
        }

        if (result.exists) {
            setUserVerified(true);
            setFrappeUser(result.user);
            updateStepStatus('verify', 'completed');
            ProductionLogger.info('Frappe user verified', result.user);
            return true;
        } else {
            // User doesn't exist - show registration prompt
            updateStepStatus('verify', 'error', 'Account not found');
            
            // Show modal/alert with registration link
            const shouldRedirect = window.confirm(
                `No account found with email: ${email}\n\n` +
                `Please create an account on Frappe LMS first to enroll in courses.\n\n` +
                `Click OK to go to registration page.`
            );

            if (shouldRedirect) {
                window.location.href = result.registrationUrl;
            }

            return false;
        }

    } catch (error) {
        updateStepStatus('verify', 'error', 'Unable to verify account');
        onError('Unable to verify your account. Please try again or contact support.');
        return false;
    }
};
```

4. **Update processCheckout** to verify first:
```typescript
const processCheckout = async (isRetry: boolean = false) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
        // Step 0: Verify Frappe User (NEW)
        setCurrentStep(0);
        const userExists = await verifyFrappeUser();
        
        if (!userExists) {
            // Stop here - user needs to register
            setIsProcessing(false);
            return;
        }

        // Continue with existing steps...
        setCurrentStep(1);
        updateStepStatus('validation', 'loading');
        // ... rest of code
    } catch (error) {
        // error handling
    } finally {
        setIsProcessing(false);
    }
};
```

---

### Phase 4: Remove Username Field ✅

**Files to Update:**
1. `components/enhanced-checkout-flow.tsx` - Remove username prop
2. `app/api/checkout/route.ts` - Remove username from schema
3. Any parent components passing username

**Changes:**

1. **Checkout Schema** (`app/api/checkout/route.ts`):
```typescript
const checkoutSchema = z.object({
    courseId: z.string().min(1, 'Course ID is required'),
    email: z.string().email('Valid email required').toLowerCase(),
    couponCode: z.string().optional(),
    affiliateEmail: z.string().email().toLowerCase().optional().or(z.literal('')),
    // username: z.string().optional(), // ← REMOVE THIS LINE
    redirectSource: z.enum(['lms_redirect', 'direct', 'affiliate']).optional(),
    requestId: z.string().optional()
});
```

2. **Remove from destructuring**:
```typescript
// OLD:
const { courseId, email, couponCode, affiliateEmail, username, redirectSource, requestId } = validatedData;

// NEW:
const { courseId, email, couponCode, affiliateEmail, redirectSource, requestId } = validatedData;
```

---

### Phase 5: Update Webhook to Use Verified Email ✅

**File:** `app/api/webhook/route.ts`  
**Action:** Trust that email is already verified (no changes needed)

**Rationale:**
- Email is verified BEFORE payment
- Webhook receives verified email from Stripe metadata
- Frappe enrollment will succeed (user exists)

**No code changes required** - just ensure metadata contains verified email.

---

## 📝 IMPLEMENTATION CHECKLIST

### Backend Tasks:
- [ ] Add `checkFrappeUserExists()` to `lib/services/frappeLMS.ts`
- [ ] Create `app/api/verify-frappe-user/route.ts`
- [ ] Remove `username` field from checkout schema
- [ ] Test Frappe user check API endpoint
- [ ] Add logging for verification failures

### Frontend Tasks:
- [ ] Add verification step to `EnhancedCheckoutFlow`
- [ ] Add "Account Not Found" modal/alert
- [ ] Add registration redirect logic
- [ ] Remove username input field (if exists)
- [ ] Update UI to show verification status
- [ ] Add loading states for verification

### Testing Tasks:
- [ ] Test with existing Frappe user (should proceed)
- [ ] Test with non-existent user (should block)
- [ ] Test with invalid email format
- [ ] Test with Frappe API timeout
- [ ] Test with Frappe API error
- [ ] Test affiliate tracking still works
- [ ] Test coupon flow still works
- [ ] Test registration redirect works

### Documentation:
- [ ] Update API documentation
- [ ] Document new verification flow
- [ ] Add error codes reference
- [ ] Update user guide

---

## 🔄 USER EXPERIENCE FLOW

### Scenario 1: Existing User (Happy Path)
```
1. User lands on course page
2. Clicks "Enroll Now"
3. Enters email: user@example.com
4. System verifies email exists in Frappe ✅
5. Shows: "Account verified! Proceeding..."
6. User enters coupon/affiliate (if any)
7. Proceeds to payment
8. Payment succeeds
9. Enrollment created
10. Frappe enrollment succeeds ✅
11. Confirmation email sent ✅
```

### Scenario 2: New User (Registration Required)
```
1. User lands on course page
2. Clicks "Enroll Now"
3. Enters email: newuser@example.com
4. System checks Frappe LMS ❌
5. Shows: "No account found"
6. Modal: "Please create account first"
7. Button: "Go to Registration"
8. User clicks → Redirects to Frappe LMS registration
9. User creates account on Frappe
10. Returns to course page
11. Enters same email again
12. Verification succeeds ✅
13. Proceeds with enrollment
```

---

## ⚠️ EDGE CASES & ERROR HANDLING

### 1. Frappe API Timeout
```typescript
if (timeout) {
    return {
        success: false,
        exists: false,
        error: 'Unable to verify account (timeout). Please try again.'
    };
}
```

**User Action:** Retry verification button

### 2. Frappe API Returns Error
```typescript
if (api_error) {
    ProductionLogger.error('Frappe API error', { error });
    return {
        success: false,
        exists: false,
        error: 'Verification service unavailable. Please try again later.'
    };
}
```

**User Action:** Contact support

### 3. User Enters Wrong Email
```typescript
if (email_mismatch) {
    // Allow user to edit email and re-verify
    showEditEmailButton();
}
```

### 4. Network Connection Lost
```typescript
catch (NetworkError) {
    return {
        error: 'No internet connection. Please check your network and try again.'
    };
}
```

---

## 🚀 DEPLOYMENT STRATEGY

### Phase 1: Staging Testing
1. Deploy to staging environment
2. Test with real Frappe LMS staging instance
3. Verify all scenarios work
4. Load test verification endpoint

### Phase 2: Production Rollout
1. Deploy backend changes first
2. Monitor Frappe API calls
3. Deploy frontend changes
4. Watch for user feedback
5. Monitor error rates

### Phase 3: Monitoring
- Track verification success rate
- Monitor API response times
- Log registration redirects
- Track abandoned checkouts

---

## 📊 SUCCESS METRICS

### Key Metrics:
- **Verification Success Rate:** > 98%
- **API Response Time:** < 2 seconds
- **False Positives:** 0 (blocking valid users)
- **Registration Conversion:** Track how many new users register

### Alerts:
- Frappe API timeout > 5 seconds
- Verification failure rate > 5%
- High volume of non-existent users

---

## 🔗 RELATED DOCUMENTATION

- Frappe LMS API Documentation
- Current Checkout Flow Analysis
- Webhook Integration Guide
- Email Service Documentation

---

## ✅ FINAL NOTES

### Benefits:
1. ✅ Prevents payment failures (user verified upfront)
2. ✅ Better UX (clear registration requirement)
3. ✅ No wasted Stripe sessions
4. ✅ Cleaner checkout flow (no username field)
5. ✅ Guaranteed Frappe enrollment success

### Risks:
1. ⚠️ Frappe API dependency (add timeout/fallback)
2. ⚠️ Extra API call (optimize with caching if needed)
3. ⚠️ User friction (clear messaging needed)

---

**Plan Status:** ✅ READY FOR IMPLEMENTATION  
**Estimated Time:** 4-6 hours  
**Priority:** HIGH  
**Complexity:** Medium

**Next Step:** Begin Phase 1 - Create Frappe User Check Service
