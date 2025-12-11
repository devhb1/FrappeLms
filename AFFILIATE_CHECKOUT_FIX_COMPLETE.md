# Affiliate Checkout 500 Error - Complete Fix

## Issue Summary
Users redirected from Frappe LMS with affiliate referral links were experiencing **500 Internal Server Error** during checkout, specifically when trying to enroll in courses.

**Test Case:**
- Email: `yabage8165@crsay.com`
- Affiliate: `b4harshit01@gmail.com`
- Course: `block-chain-basics`
- Error: `/api/checkout 500 Internal Server Error`

## Root Cause Analysis

The 500 error was caused by **incomplete `affiliateData` objects** being passed to Mongoose during enrollment creation. The Enrollment model schema expects specific fields in the `affiliateData` structure, but the checkout API was creating incomplete objects missing several required/expected fields.

### Schema Requirements (lib/models/enrollment.ts)
```typescript
affiliateData: {
    affiliateEmail: String,
    referralSource: ['affiliate_link', 'grant_with_affiliate', 'lms_redirect_affiliate'],
    commissionEligible: Boolean,
    referralTimestamp: Date,          // ❌ MISSING
    commissionAmount: Number,
    commissionRate: Number,
    commissionProcessed: Boolean,     // ❌ MISSING
    commissionProcessedAt: Date,
    commissionPaid: Boolean,          // ❌ MISSING
    paidAt: Date,
    payoutId: ObjectId
}
```

### Issues Found

#### 1. **processStripeCheckout** (Paid Enrollments - Fixed)
**Location:** `app/api/checkout/route.ts` lines 723-731

**Problems:**
- Missing `referralTimestamp` field
- Missing `commissionProcessed` field
- Missing `commissionPaid` field
- Using `null` instead of `undefined` for empty affiliateData

**Fix Applied:**
```typescript
affiliateData: affiliate ? {
    affiliateEmail: affiliate.email,
    commissionEligible: true,
    commissionRate: affiliate.commissionRate || 10,
    commissionAmount: calculateCommission(course.price, affiliate.commissionRate || 10),
    referralSource: 'affiliate_link',
    referralTimestamp: new Date(),       // ✅ ADDED
    commissionProcessed: false,           // ✅ ADDED
    commissionPaid: false                 // ✅ ADDED
} : undefined,  // ✅ Changed from null
```

#### 2. **processCouponEnrollment** (Free 100% Grant Enrollments - Fixed)
**Location:** `app/api/checkout/route.ts` lines 439-449

**Problems:**
- No `affiliateData` object created at all when affiliate present
- Only set basic `referralSource` and `hasReferral` flags
- Missing complete tracking structure for affiliate referrals

**Fix Applied:**
```typescript
// Affiliate data for free enrollments (tracking only, no commission)
affiliateData: data.affiliateEmail ? {
    affiliateEmail: data.affiliateEmail.toLowerCase(),
    commissionEligible: false,            // ✅ Free = no commission
    commissionRate: 0,
    commissionAmount: 0,
    referralSource: 'grant_with_affiliate', // ✅ Correct enum value
    referralTimestamp: new Date(),         // ✅ ADDED
    commissionProcessed: true,             // ✅ Already processed (no commission)
    commissionPaid: false
} : undefined,

// Track referral source for free enrollments
referralSource: data.affiliateEmail ? 'grant_with_affiliate' : 'direct',
hasReferral: !!data.affiliateEmail,
```

**Key Change:** Even though free enrollments don't earn commissions, we still create a proper `affiliateData` structure for:
- Consistent data modeling
- Tracking referral sources
- Avoiding validation errors
- Future analytics capabilities

#### 3. **processPartialDiscountCheckout** (Partial Grant + Payment - Fixed)
**Location:** `app/api/checkout/route.ts` lines 956-965

**Problems:**
- Missing `referralTimestamp` field
- Missing `commissionProcessed` field
- Missing `commissionPaid` field
- Using `null` instead of `undefined` for empty affiliateData

**Fix Applied:**
```typescript
affiliateData: affiliate ? {
    affiliateEmail: affiliate.email,
    commissionEligible: true,
    commissionRate: affiliate.commissionRate || 10,
    commissionAmount: Math.round((finalPrice * (affiliate.commissionRate || 10)) / 100 * 100) / 100,
    referralSource: 'affiliate_link',
    referralTimestamp: new Date(),       // ✅ ADDED
    commissionProcessed: false,           // ✅ ADDED
    commissionPaid: false                 // ✅ ADDED
} : undefined,  // ✅ Changed from null
```

## Additional Related Fixes

### Previous Fix: redirectSource Parameter
**Location:** `app/api/checkout/route.ts` line 706

**Problem:** `redirectSource` wasn't being destructured from function parameters

**Fix:**
```typescript
// Before
async function processStripeCheckout(data: any) {
    const { courseId, email, course, affiliate } = data;
    
// After
async function processStripeCheckout(data: any) {
    const { courseId, email, course, affiliate, redirectSource } = data;
```

## Testing Checklist

### ✅ Completed
- [x] Fixed `affiliateData` structure in all three enrollment functions
- [x] Added missing fields: `referralTimestamp`, `commissionProcessed`, `commissionPaid`
- [x] Changed `null` to `undefined` for empty affiliateData (Mongoose best practice)
- [x] Verified TypeScript compilation (no errors)
- [x] Ensured consistency across all enrollment paths

### ⏳ Pending User Testing
- [ ] Test affiliate enrollment from Frappe LMS redirect
- [ ] Test direct affiliate enrollment (no redirect)
- [ ] Test free enrollment with coupon + affiliate
- [ ] Test partial discount enrollment with affiliate
- [ ] Verify enrollment saves successfully in MongoDB
- [ ] Check webhook properly processes affiliate commissions
- [ ] Validate commission calculations are accurate
- [ ] Monitor production logs for 500 errors

## Deployment Steps

1. **Commit changes:**
   ```bash
   git add app/api/checkout/route.ts
   git commit -m "fix: Complete affiliateData structure for all enrollment types

   - Add missing referralTimestamp, commissionProcessed, commissionPaid fields
   - Fix processCouponEnrollment to create proper affiliateData for tracking
   - Change null to undefined for empty affiliateData (Mongoose best practice)
   - Ensure consistency across processStripeCheckout, processCouponEnrollment, processPartialDiscountCheckout
   - Fixes 500 error for affiliate enrollments from Frappe LMS redirects"
   ```

2. **Push to repository:**
   ```bash
   git push origin main
   ```

3. **Monitor Vercel deployment:**
   - Wait for automatic deployment to complete
   - Check deployment logs for any build errors
   - Verify successful production deployment

4. **Test in production:**
   - Use test case: Email with affiliate link from Frappe LMS
   - Verify no 500 errors occur
   - Check enrollment creation succeeds
   - Validate Stripe session creation
   - Confirm email delivery via AWS SES

## Expected Behavior After Fix

### Scenario 1: Paid Enrollment with Affiliate (from Frappe LMS)
- ✅ User clicks affiliate link in Frappe LMS
- ✅ Redirected to course page with `ref` parameter
- ✅ Clicks "Buy Now" or "Enroll Now"
- ✅ Enrollment created with complete `affiliateData` structure
- ✅ Stripe checkout session created successfully
- ✅ Commission tracked for affiliate

### Scenario 2: Free Enrollment with Affiliate + Coupon
- ✅ User has 100% grant coupon
- ✅ User uses affiliate referral link
- ✅ Enrollment created with `affiliateData` (tracking only)
- ✅ `commissionEligible: false` and `commissionAmount: 0`
- ✅ `commissionProcessed: true` (no commission to process)
- ✅ Referral tracked for analytics

### Scenario 3: Partial Discount with Affiliate
- ✅ User has partial grant (e.g., 50% off)
- ✅ User uses affiliate referral link
- ✅ Enrollment created with `affiliateData` for remaining payment
- ✅ Commission calculated on amount user actually pays
- ✅ Stripe session created for discounted amount

## Consistency Improvements

All three enrollment functions now use identical `affiliateData` structures:

| Field | processStripeCheckout | processCouponEnrollment | processPartialDiscountCheckout |
|-------|----------------------|------------------------|-------------------------------|
| `affiliateEmail` | ✅ | ✅ | ✅ |
| `commissionEligible` | ✅ true | ✅ false | ✅ true |
| `commissionRate` | ✅ | ✅ 0 | ✅ |
| `commissionAmount` | ✅ | ✅ 0 | ✅ |
| `referralSource` | ✅ affiliate_link | ✅ grant_with_affiliate | ✅ affiliate_link |
| `referralTimestamp` | ✅ ADDED | ✅ ADDED | ✅ ADDED |
| `commissionProcessed` | ✅ ADDED | ✅ ADDED (true) | ✅ ADDED |
| `commissionPaid` | ✅ ADDED | ✅ ADDED | ✅ ADDED |
| Empty handling | ✅ undefined | ✅ undefined | ✅ undefined |

## Technical Details

### Why `undefined` instead of `null`?
Mongoose treats `undefined` and `null` differently:
- `undefined`: Field not set (allows schema defaults to apply)
- `null`: Field explicitly set to null (can cause validation issues)

For optional nested objects like `affiliateData`, using `undefined` is the Mongoose best practice.

### Why track affiliates in free enrollments?
Even though free enrollments don't generate commissions:
1. **Analytics:** Track which affiliates drive the most referrals
2. **Future conversion:** Free users might buy other courses
3. **Consistency:** Same data model across all enrollment types
4. **Validation:** Prevents schema validation errors

### Commission Calculation for Partial Discounts
```typescript
// Commission on amount user ACTUALLY PAYS, not original price
commissionAmount: Math.round((finalPrice * commissionRate) / 100 * 100) / 100
```

Example:
- Original price: $100
- 50% grant discount: $50
- Final price: $50
- Commission (10%): $5 (on $50, not $100)

## Related Documentation

- **Enrollment Model Schema:** `lib/models/enrollment.ts` lines 150-210
- **Checkout API Route:** `app/api/checkout/route.ts`
- **Self-Referral Protection:** `app/courses/[id]/page.tsx` lines 219-247
- **AWS SES Email Configuration:** `.env.local` (SMTP settings)
- **Email Template Updates:** `lib/emails/templates/course-purchase-confirmation.ejs`

## Session History

This fix is part of a larger troubleshooting session:
1. ✅ Fixed SendGrid quota issue (switched to AWS SES)
2. ✅ Removed email verification requirement
3. ✅ Updated email template links to Frappe LMS
4. ✅ Added self-referral auto-detection
5. ✅ Fixed variable declaration order (toast error)
6. ✅ Fixed redirectSource parameter destructuring
7. ✅ **Fixed incomplete affiliateData structures (CURRENT)**

## Success Criteria

Fix is considered successful when:
- ✅ No TypeScript compilation errors
- ⏳ No 500 errors for affiliate enrollments from Frappe LMS
- ⏳ Enrollments save successfully to MongoDB
- ⏳ All affiliate data fields populated correctly
- ⏳ Commission calculations accurate
- ⏳ Webhook processing works correctly
- ⏳ Email confirmations sent via AWS SES
- ⏳ Stripe checkout sessions created successfully

---

**Status:** All code fixes applied. Ready for deployment and testing.

**Next Step:** Deploy to production and test with actual affiliate enrollment from Frappe LMS redirect.
