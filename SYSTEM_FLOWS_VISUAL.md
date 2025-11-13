# 🔄 MaalEdu System Flows - Visual Reference

This document provides visual representations of all critical system flows in the MaalEdu platform.

---

## 📊 Flow Summary

| Flow | Complexity | Payment | Affiliate | Grant | LMS Sync |
|------|-----------|---------|-----------|-------|----------|
| Paid Enrollment (No Affiliate) | Medium | ✅ Stripe | ❌ | ❌ | ✅ FrappeLMS |
| Paid Enrollment (With Affiliate) | High | ✅ Stripe | ✅ 10% | ❌ | ✅ FrappeLMS |
| Free Grant (100%) | Medium | ❌ | ❌ | ✅ | ✅ FrappeLMS |
| Partial Grant (10-99%) | High | ✅ Stripe | ❌ | ✅ | ✅ FrappeLMS |
| Affiliate Registration | Low | ❌ | N/A | ❌ | ❌ |

---

## 🎯 Flow 1: Standard Paid Enrollment (No Affiliate)

### User Journey
```
[User] → [Course Page] → [Checkout Form] → [Stripe Payment] → [Success Page]
```

### System Flow
```
┌─────────┐
│  USER   │ Clicks "Enroll"
└────┬────┘
     │
     ▼
┌────────────────┐
│ Course Page    │ Shows course details, price, features
│ /courses/[id]  │
└────┬───────────┘
     │ Fills email
     ▼
┌────────────────────────────────────────────────────────┐
│ POST /api/checkout                                     │
├────────────────────────────────────────────────────────┤
│ 1. Validate email format                               │
│ 2. Get course data (DB first, fallback to static)     │
│ 3. Check duplicate enrollment                          │
│    ├─ Query: { courseId, email, status: paid/pending }│
│    └─ If found: Return error 400                       │
│ 4. Create pending enrollment in MongoDB                │
│    ├─ status: "pending"                                │
│    ├─ paymentId: "PENDING_timestamp"                   │
│    └─ amount: course.price                             │
│ 5. Create Stripe checkout session                      │
│    ├─ amount: course.price * 100 (cents)               │
│    ├─ success_url: /success?session_id={id}            │
│    └─ cancel_url: /cancel?enrollment_id={id}           │
│ 6. Return Stripe checkout URL                          │
└────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────┐
│ Stripe Hosted  │ User enters card details
│ Checkout Page  │ Stripe processes payment
└────┬───────────┘
     │ Payment successful
     ▼
┌────────────────────────────────────────────────────────┐
│ POST /api/webhook (from Stripe)                        │
├────────────────────────────────────────────────────────┤
│ Event: checkout.session.completed                      │
│                                                         │
│ 1. Verify webhook signature                            │
│ 2. Extract metadata (enrollmentId, courseId, email)    │
│ 3. Find pending enrollment                             │
│ 4. Check if already processed                          │
│    └─ If status='paid': Return 200 (idempotent)        │
│ 5. Update enrollment to 'paid'                         │
│    ├─ status: "paid"                                   │
│    ├─ paymentId: stripe payment_intent_id              │
│    └─ verification.paymentVerified: true               │
│ 6. Call FrappeLMS API                                  │
│    ├─ Endpoint: /api/method/lms.lms.payment_confirmation │
│    ├─ Payload: { user_email, course_id, paid_status } │
│    └─ Timeout: 30 seconds                              │
│ 7. Update frappeSync status                            │
│    ├─ If success: synced=true, enrollmentId=frappe_id │
│    └─ If failed: synced=false, syncStatus='failed'    │
│ 8. Send confirmation email                             │
│ 9. Return 200 OK to Stripe                             │
└────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────┐
│ Success Page   │ Shows "Enrollment Complete"
│ /success       │ Provides link to FrappeLMS
└────────────────┘
```

### Database State Changes
```
BEFORE:
Enrollment { status: "pending", paymentId: "PENDING_12345", frappeSync: { syncStatus: "pending" } }

AFTER WEBHOOK:
Enrollment { 
  status: "paid", 
  paymentId: "pi_3xyz", 
  frappeSync: { 
    synced: true, 
    syncStatus: "success",
    enrollmentId: "lc0p11ft48"
  } 
}
```

---

## 🤝 Flow 2: Paid Enrollment WITH Affiliate

### URL with Referral
```
https://maaledu.com/courses/blockchain-101?ref=affiliate@example.com
```

### System Flow
```
┌─────────┐
│  USER   │ Clicks affiliate link
└────┬────┘
     │
     ▼
┌────────────────┐
│ Course Page    │ ?ref=affiliate@example.com
│                │ Pre-fills affiliate email in form
└────┬───────────┘
     │ User enters their own email
     ▼
┌────────────────────────────────────────────────────────┐
│ Frontend Validation                                    │
├────────────────────────────────────────────────────────┤
│ Check: affiliateEmail !== userEmail                    │
│ If same: Show warning "Cannot self-refer"             │
│ If different: Allow submission                         │
└────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────┐
│ POST /api/checkout                                     │
├────────────────────────────────────────────────────────┤
│ 1. Validate affiliateEmail provided                    │
│ 2. Check self-referral (BACKEND VALIDATION)            │
│    ├─ if (affiliateEmail === userEmail):               │
│    └─ Return 400 "SELF_REFERRAL_NOT_ALLOWED"           │
│ 3. Find affiliate in database                          │
│    ├─ Query: { email: affiliateEmail, status: active } │
│    └─ If not found: Log warning, continue without      │
│ 4. Create pending enrollment WITH affiliateData        │
│    ├─ affiliateData: {                                 │
│    │    affiliateEmail: affiliate.email                │
│    │    commissionEligible: true                       │
│    │    commissionRate: 10                             │
│    │    commissionAmount: price * 0.1                  │
│    │  }                                                 │
│    ├─ referralSource: "affiliate_link"                 │
│    └─ hasReferral: true                                │
│ 5. Create Stripe session (same as Flow 1)             │
└────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────┐
│ Stripe Payment │ (Same as Flow 1)
└────┬───────────┘
     │
     ▼
┌────────────────────────────────────────────────────────┐
│ POST /api/webhook                                      │
├────────────────────────────────────────────────────────┤
│ Steps 1-5: Same as Flow 1                             │
│ Step 6: FrappeLMS enrollment with referral_code        │
│ Step 7: Process Affiliate Commission                   │
│    ├─ Calculate commission: amount * rate              │
│    ├─ Update enrollment.affiliateData:                 │
│    │    ├─ commissionProcessed: true                   │
│    │    └─ commissionProcessedAt: Date.now()           │
│    └─ Call affiliate.refreshStats()                    │
│         ├─ Aggregates ALL enrollments for affiliate    │
│         ├─ Calculates totalCommissions                 │
│         ├─ Updates pendingCommissions                  │
│         └─ Updates stats.totalReferrals                │
│ Step 8-9: Send email, return 200                       │
└────────────────────────────────────────────────────────┘
```

### Affiliate Stats Calculation
```javascript
// In affiliate.refreshStats()
const stats = await Enrollment.aggregate([
    {
        $match: {
            'affiliateData.affiliateEmail': 'affiliate@example.com',
            status: 'paid'
        }
    },
    {
        $group: {
            _id: null,
            totalReferrals: { $sum: 1 },
            totalRevenue: { $sum: '$amount' },
            courses: { $push: '$courseId' }
        }
    }
]);

// Result
{
    totalReferrals: 15,
    totalRevenue: 7485,  // $7,485
    totalCommissions: 748.50,  // 10% of revenue
    pendingCommissions: 748.50 - totalPaid
}
```

### Self-Referral Protection
```
┌─────────────────────────────────────────────────┐
│ Self-Referral Validation (Dual Layer)           │
├─────────────────────────────────────────────────┤
│ FRONTEND:                                        │
│   if (affiliateEmail === userEmail)             │
│     → Show warning, disable submit button       │
│                                                  │
│ BACKEND:                                         │
│   if (affiliateEmail.toLowerCase() ===          │
│       finalEmail.toLowerCase())                 │
│     → Return 400 error                          │
│                                                  │
│ Both emails normalized (lowercase, trimmed)     │
└─────────────────────────────────────────────────┘
```

---

## 🎫 Flow 3: Free Enrollment with Grant Coupon (100% Off)

### Grant Workflow
```
┌──────────┐
│  ADMIN   │
└────┬─────┘
     │ 1. Reviews grant application
     ▼
┌────────────────────────────────────────┐
│ Admin Panel                            │
│ Approves grant with:                   │
│  - discountPercentage: 100             │
│  - Generates couponCode: GRANT2024XYZ  │
└────┬───────────────────────────────────┘
     │ 2. System sends email with coupon
     ▼
┌──────────┐
│  USER    │
└────┬─────┘
     │ 3. Receives email, clicks course link
     ▼
┌────────────────┐
│ Course Page    │
│ Enters coupon  │
└────┬───────────┘
     │
     ▼
┌────────────────────────────────────────────────────────┐
│ POST /api/checkout (with couponCode)                   │
├────────────────────────────────────────────────────────┤
│ 1. Validate coupon code format                         │
│ 2. Query Grant:                                        │
│    ├─ couponCode: GRANT2024XYZ (uppercase)             │
│    ├─ email: user@email.com (lowercase)                │
│    ├─ status: 'approved'                               │
│    └─ couponUsed: false                                │
│ 3. Check if grant found                                │
│    └─ If not found: Return 400 "Invalid coupon"        │
│ 4. Check expiration                                    │
│    └─ If expired: Return 400 "Coupon expired"          │
│ 5. Calculate discount                                  │
│    ├─ discountPercentage: 100                          │
│    ├─ originalPrice: $499                              │
│    ├─ finalPrice: $0                                   │
│    └─ requiresPayment: false                           │
│ 6. Create enrollment (status='paid', amount=0)         │
│    ├─ enrollmentType: 'free_grant'                     │
│    ├─ grantData: {                                     │
│    │    grantId: grant._id,                            │
│    │    couponCode: GRANT2024XYZ,                      │
│    │    discountPercentage: 100                        │
│    │  }                                                 │
│    └─ paymentId: 'free_timestamp_random'               │
│ 7. ⚠️ Mark coupon as used (SEPARATE UPDATE)            │
│    └─ Grant.findByIdAndUpdate({ couponUsed: true })    │
│ 8. Enroll in FrappeLMS immediately                     │
│ 9. Send grant course enrollment email                  │
│ 10. Return success + redirect URL                      │
└────────────────────────────────────────────────────────┘
```

### 🚨 Race Condition Issue
```
Timeline with 2 simultaneous requests:

Time  | Request A                    | Request B
------|------------------------------|------------------------------
T0    | Find grant (couponUsed:false)| Find grant (couponUsed:false)
T1    | ✅ Grant found               | ✅ Grant found
T2    | Create enrollment A          |
T3    |                              | Create enrollment B
T4    | Mark coupon used             |
T5    |                              | Mark coupon used (DUPLICATE!)

Result: Both users enrolled with same coupon ❌
```

### Fix: Atomic Update
```javascript
// CURRENT (VULNERABLE)
const grant = await Grant.findOne({ couponCode, couponUsed: false });
if (!grant) return error;
await enrollment.save();
await Grant.findByIdAndUpdate(grant._id, { couponUsed: true });

// FIXED (ATOMIC)
const grant = await Grant.findOneAndUpdate(
    { couponCode, couponUsed: false },  // Only update if unused
    { $set: { couponUsed: true } },     // Mark as used
    { new: true }                       // Return updated doc
);

if (!grant) {
    return error('Coupon already used or invalid');
}

// Now safe to create enrollment
```

---

## 💰 Flow 4: Partial Grant (10-99% Discount)

### Example: 50% Off Coupon

```
Original Price: $499
Discount: 50%
Final Price: $249.50
```

### System Flow
```
┌──────────┐
│  USER    │ Has 50% off coupon
└────┬─────┘
     │
     ▼
┌────────────────────────────────────────────────────────┐
│ POST /api/checkout                                     │
├────────────────────────────────────────────────────────┤
│ 1-4: Same validation as 100% grant                    │
│ 5. Calculate discount:                                 │
│    ├─ discountPercentage: 50                           │
│    ├─ originalPrice: 499                               │
│    ├─ discountAmount: 499 * 0.5 = 249.50               │
│    ├─ finalPrice: 499 - 249.50 = 249.50                │
│    └─ requiresPayment: true                            │
│ 6. Detect partial discount (< 100%)                    │
│    └─ Route to processPartialDiscountCheckout()        │
│ 7. Create pending enrollment (partial_grant)           │
│    ├─ enrollmentType: 'partial_grant'                  │
│    ├─ amount: 249.50 (discounted price)                │
│    ├─ grantData: {                                     │
│    │    discountPercentage: 50,                        │
│    │    originalPrice: 499,                            │
│    │    finalPrice: 249.50,                            │
│    │    discountAmount: 249.50                         │
│    │  }                                                 │
│    └─ status: 'pending'                                │
│ 8. Create Stripe session with DISCOUNTED price         │
│    ├─ amount: 24950 cents ($249.50)                    │
│    ├─ description: "Course (50% Grant Discount)"       │
│    └─ metadata: { grantId, discountPercentage: 50 }    │
│ 9. ⚠️ DON'T mark coupon as used yet                    │
│ 10. Return Stripe checkout URL                         │
└────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────┐
│ Stripe Payment │ User pays discounted price ($249.50)
└────┬───────────┘
     │
     ▼
┌────────────────────────────────────────────────────────┐
│ POST /api/webhook                                      │
├────────────────────────────────────────────────────────┤
│ 1-5: Standard webhook processing                      │
│ 6. Detect enrollmentType='partial_grant'              │
│ 7. Mark coupon as used NOW (after successful payment) │
│    └─ Grant.findByIdAndUpdate({ couponUsed: true })    │
│ 8. Enroll in FrappeLMS                                │
│ 9. Send partial grant enrollment email                │
│    └─ Email shows: Original $499, Paid $249.50        │
│ 10. Return 200 OK                                      │
└────────────────────────────────────────────────────────┘
```

### Key Difference: 100% vs Partial
```
┌──────────────────────────────────────────────────────┐
│ 100% OFF GRANT                                        │
├──────────────────────────────────────────────────────┤
│ ✅ Coupon marked used BEFORE enrollment complete      │
│ ✅ No Stripe payment                                  │
│ ✅ Immediate FrappeLMS enrollment                     │
│ ✅ Status = 'paid' immediately                        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ PARTIAL DISCOUNT (10-99%)                             │
├──────────────────────────────────────────────────────┤
│ ⏳ Coupon marked used AFTER payment succeeds          │
│ 💳 Stripe payment with discounted price               │
│ ⏳ FrappeLMS enrollment in webhook                    │
│ 📧 Different email template (shows discount)          │
└──────────────────────────────────────────────────────┘
```

---

## 👥 Flow 5: Affiliate Registration

```
┌──────────┐
│  USER    │
└────┬─────┘
     │ 1. Creates account
     ▼
┌────────────────┐
│ POST /register │ Email verification required
└────┬───────────┘
     │ 2. Verifies email
     ▼
┌────────────────┐
│ User Verified  │ isVerified: true
└────┬───────────┘
     │ 3. Navigates to /affiliate-registration
     ▼
┌────────────────────────────────────────────────────────┐
│ POST /api/affiliate/register (Authenticated)           │
├────────────────────────────────────────────────────────┤
│ 1. Verify NextAuth session                            │
│    └─ If no session: Return 401 Unauthorized          │
│ 2. Get user from session                              │
│ 3. Check user is verified                             │
│    ├─ Query: User.findOne({ email, isVerified: true })│
│    └─ If not verified: Return 400                     │
│ 4. Check not already affiliate                        │
│    └─ Query: Affiliate.findOne({ email })             │
│    └─ If exists: Return 409 Conflict                  │
│ 5. Validate payment method                            │
│    ├─ If PayPal: Validate email format                │
│    ├─ If Bank: Validate account details               │
│    └─ If Crypto: Validate wallet address              │
│ 6. Create affiliate record                            │
│    ├─ affiliateId: "af_" + ObjectId                   │
│    ├─ userId: user._id                                │
│    ├─ email: user.email                               │
│    ├─ commissionRate: 10 (default)                    │
│    ├─ payoutMode: 'paypal|bank|crypto'                │
│    ├─ paymentMethod: { validated details }            │
│    ├─ status: 'active'                                │
│    └─ stats: { totalReferrals: 0 }                    │
│ 7. Generate affiliate link                            │
│    └─ https://maaledu.com/?ref=affiliate@email.com    │
│ 8. Send welcome email                                 │
│ 9. Return success + affiliate link                    │
└────────────────────────────────────────────────────────┘
```

### Payment Method Validation
```javascript
// PayPal
{
    type: 'paypal',
    paypalEmail: 'payments@email.com'  // Must be valid email
}

// Bank Transfer
{
    type: 'bank',
    bankName: 'Chase Bank',
    accountNumber: '1234567890',
    routingNumber: '021000021',
    accountHolderName: 'John Doe',
    swiftCode: 'CHASUS33' (optional)
}

// Cryptocurrency
{
    type: 'crypto',
    cryptoWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    cryptoCurrency: 'ethereum'  // bitcoin | ethereum | usdt
}
```

---

## 🔄 FrappeLMS Integration Flow

### Enrollment API Call
```
┌────────────────────────────────────────────────────────┐
│ enrollInFrappeLMS()                                    │
├────────────────────────────────────────────────────────┤
│ URL: http://139.59.229.250:8000                        │
│ Endpoint: /api/method/lms.lms.payment_confirmation.    │
│           confirm_payment                              │
│                                                         │
│ Request Body:                                          │
│ {                                                      │
│   "user_email": "user@email.com",                     │
│   "course_id": "blockchain-basics",                    │
│   "paid_status": true,                                 │
│   "payment_id": "pi_3xyz",                             │
│   "amount": 499,                                       │
│   "currency": "USD",                                   │
│   "referral_code": "affiliate@email.com" (optional)    │
│ }                                                      │
│                                                         │
│ Timeout: 30 seconds                                    │
│                                                         │
│ Response (Success):                                    │
│ {                                                      │
│   "success": true,                                     │
│   "enrollment_id": "lc0p11ft48",                       │
│   "user_email": "user@email.com",                     │
│   "course_id": "blockchain-basics"                     │
│ }                                                      │
│                                                         │
│ Response (Failure):                                    │
│ {                                                      │
│   "success": false,                                    │
│   "error": "Course not found"                          │
│ }                                                      │
└────────────────────────────────────────────────────────┘
```

### Sync Status Tracking
```
Enrollment.frappeSync = {
    synced: false,              // Overall sync status
    syncStatus: 'pending',      // 'pending' | 'success' | 'failed' | 'retrying'
    enrollmentId: null,         // FrappeLMS enrollment ID
    lastSyncAttempt: Date,      // Last attempt timestamp
    syncCompletedAt: null,      // Success timestamp
    errorMessage: null,         // Error details if failed
    retryCount: 0              // Number of retry attempts
}
```

### Error Handling
```
┌────────────────────────────────────────────┐
│ FrappeLMS Call Result Handling             │
├────────────────────────────────────────────┤
│ SUCCESS (200 + success: true):             │
│   ✅ Update frappeSync.synced = true       │
│   ✅ Store enrollmentId                    │
│   ✅ Set syncStatus = 'success'            │
│   ✅ Record syncCompletedAt                │
│                                            │
│ FAILURE (200 + success: false):            │
│   ❌ Update frappeSync.synced = false      │
│   ❌ Set syncStatus = 'failed'             │
│   ❌ Store error message                   │
│   ❌ Increment retryCount                  │
│   ⚠️ DON'T throw error (payment succeeded) │
│                                            │
│ TIMEOUT/NETWORK ERROR:                     │
│   ❌ Same as failure                       │
│   ⚠️ Payment still succeeds                │
│   📝 Log error for investigation           │
└────────────────────────────────────────────┘
```

---

## 📧 Email Notification Flow

### Email Types
```
1. Welcome Email
   ├─ Trigger: User registers
   └─ Template: welcome

2. Email Verification
   ├─ Trigger: User registers
   └─ Contains: 6-digit code

3. Course Purchase Confirmation
   ├─ Trigger: Paid enrollment (Stripe)
   └─ Template: coursePurchaseConfirmation

4. Grant Course Enrollment
   ├─ Trigger: Free enrollment (100% grant)
   └─ Template: grantCourseEnrollment

5. Partial Grant Enrollment
   ├─ Trigger: Partial discount payment
   └─ Template: partialGrantEnrollment
   └─ Shows: Original price, discount %, final price

6. Affiliate Welcome
   ├─ Trigger: Affiliate registration
   └─ Template: welcome (affiliate)
```

### Email Failure Handling
```
try {
    await sendEmail.coursePurchaseConfirmation(email, name, course, amount);
    ProductionLogger.info('Email sent successfully');
} catch (emailError) {
    ProductionLogger.error('Failed to send email', { error: emailError });
    // ⚠️ DON'T throw - enrollment already succeeded
    // Payment has been captured, just log the failure
}
```

---

## 🗄️ Database State Transitions

### Enrollment Lifecycle
```
┌─────────────────────────────────────────────────────────┐
│ PENDING                                                  │
│ ├─ Created in checkout API                              │
│ ├─ Waiting for Stripe payment                           │
│ └─ frappeSync.syncStatus: 'pending'                     │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ (Webhook receives payment)
┌─────────────────────────────────────────────────────────┐
│ PAID                                                     │
│ ├─ Payment verified                                     │
│ ├─ Attempting FrappeLMS sync                            │
│ └─ frappeSync.syncStatus: 'pending' → 'success'/'failed'│
└─────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┴────────────┐
        ▼                          ▼
┌──────────────────┐    ┌──────────────────┐
│ SYNCED           │    │ SYNC FAILED      │
│ (Complete)       │    │ (Partial)        │
│ ✅ Can access LMS│    │ ⚠️ Needs retry   │
└──────────────────┘    └──────────────────┘
```

### Grant Coupon Lifecycle
```
┌─────────────────────────────────────────────────────────┐
│ PENDING                                                  │
│ ├─ User applies for grant                               │
│ ├─ couponCode: null                                     │
│ └─ couponUsed: false                                    │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ (Admin approves)
┌─────────────────────────────────────────────────────────┐
│ APPROVED                                                 │
│ ├─ Admin sets discountPercentage                        │
│ ├─ couponCode: GRANT2024XYZ (generated)                 │
│ ├─ couponUsed: false                                    │
│ └─ Email sent to user                                   │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼ (User enrolls)
┌─────────────────────────────────────────────────────────┐
│ USED                                                     │
│ ├─ couponUsed: true                                     │
│ ├─ couponUsedAt: Date                                   │
│ ├─ couponUsedBy: user@email.com                         │
│ └─ enrollmentId: ObjectId                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Query Patterns

### Common Database Queries
```javascript
// 1. Check duplicate enrollment
await Enrollment.findOne({
    courseId: 'blockchain-101',
    email: 'user@email.com',
    status: { $in: ['paid', 'pending'] }
});

// 2. Get affiliate stats
await Enrollment.aggregate([
    {
        $match: {
            'affiliateData.affiliateEmail': 'affiliate@email.com',
            status: 'paid'
        }
    },
    {
        $group: {
            _id: null,
            totalReferrals: { $sum: 1 },
            totalRevenue: { $sum: '$amount' }
        }
    }
]);

// 3. Find unused grant
await Grant.findOne({
    couponCode: 'GRANT2024XYZ',
    email: 'user@email.com',
    status: 'approved',
    couponUsed: false
});

// 4. Get failed LMS syncs (for retry)
await Enrollment.find({
    'frappeSync.syncStatus': 'failed',
    'frappeSync.retryCount': { $lt: 5 },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});
```

---

## 📊 Performance Considerations

### Slow Queries
```
⚠️ SLOW: Affiliate stats on every webhook
  → Solution: Cache stats for 5 minutes

⚠️ SLOW: Aggregate enrollments for popular affiliates
  → Solution: Lazy calculation, only refresh on dashboard view

⚠️ SLOW: FrappeLMS API call in webhook (30s timeout)
  → Solution: Async job queue, don't block webhook response
```

### Optimization Opportunities
```
✅ Add Redis cache to:
   - Course listings
   - Affiliate stats
   - Enrollment counts

✅ Implement pagination on:
   - Enrollment queries
   - Affiliate dashboard
   - Admin grant list

✅ Add database indexes:
   - {email: 1, courseId: 1, status: 1}
   - {'affiliateData.affiliateEmail': 1, status: 1}
   - {'frappeSync.syncStatus': 1, createdAt: -1}
```

---

## 🚨 Critical Points Summary

1. **Race Condition in Coupon Usage** 🔴
   - Fix: Use atomic findOneAndUpdate

2. **Webhook Idempotency** 🔴
   - Fix: Store Stripe event IDs

3. **FrappeLMS Sync Failures** 🔴
   - Fix: Implement retry queue

4. **Affiliate Stats Performance** 🟡
   - Fix: Cache results, lazy refresh

5. **No Rate Limiting** 🟡
   - Fix: Add rate-limiter-flexible

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Branch:** maaleduv2-frappe
