# 🔄 Frappe LMS Integration - Complete Sync Flow

## 📍 Production Configuration

### Frappe LMS Endpoint
```
POST https://lms.maaledu.com/api/method/lms.lms.payment_confirmation.confirm_payment
```

### Environment Variables
```bash
FRAPPE_LMS_BASE_URL=https://lms.maaledu.com
FRAPPE_LMS_API_KEY=  # Optional - may not be required for payment endpoint
```

---

## 🎯 Payment & Enrollment Flow

### **Scenario 1: Free Grant Enrollment (100% Discount)**
**Flow**: User applies coupon → Immediate enrollment

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User completes checkout with grant coupon               │
│    POST /api/checkout                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Create enrollment in MongoDB                             │
│    - status: 'paid'                                         │
│    - enrollmentType: 'free_grant'                           │
│    - amount: 0                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Sync to Frappe LMS immediately                           │
│    POST /api/method/lms.lms.payment_confirmation           │
│    .confirm_payment                                         │
│    {                                                        │
│      "user_email": "user@example.com",                      │
│      "course_id": "block-chain-basics",                     │
│      "paid_status": true,                                   │
│      "payment_id": "free_123abc",                           │
│      "amount": 0,                                           │
│      "currency": "USD",                                     │
│      "referral_code": "affiliate@example.com",              │
│      "original_amount": 499,                                │
│      "discount_percentage": 100,                            │
│      "grant_id": "grant_id_123",                            │
│      "enrollment_type": "free_grant"                        │
│    }                                                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Update enrollment record in MongoDB                      │
│    frappeSync: {                                            │
│      synced: true,                                          │
│      syncStatus: 'success',                                 │
│      enrollmentId: 'frappe_enrollment_id',                  │
│      syncCompletedAt: Date                                  │
│    }                                                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. User redirected to success page                          │
│    /success?type=free&course=...                            │
└─────────────────────────────────────────────────────────────┘
```

---

### **Scenario 2: Paid Enrollment (Full Price or Partial Discount)**
**Flow**: User pays via Stripe → Webhook confirms → Sync to Frappe

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User initiates checkout                                  │
│    POST /api/checkout                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Create pending enrollment in MongoDB                     │
│    - status: 'pending'                                      │
│    - enrollmentType: 'paid_stripe' or 'partial_grant'       │
│    - amount: finalPrice                                     │
│    - originalAmount: coursePrice                            │
│    - commissionBaseAmount: finalPrice                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Create Stripe checkout session                           │
│    - Redirect user to Stripe                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User completes payment on Stripe                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Stripe sends webhook event                               │
│    POST /api/webhook                                        │
│    checkout.session.completed                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Verify webhook signature                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Update enrollment in MongoDB                             │
│    - status: 'paid'                                         │
│    - paymentId: stripe_payment_id                           │
│    - verification.paymentVerified: true                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Calculate affiliate commission (if applicable)           │
│    - Commission on commissionBaseAmount                     │
│    - Update affiliate stats                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. SYNC TO FRAPPE LMS                                       │
│    POST /api/method/lms.lms.payment_confirmation           │
│    .confirm_payment                                         │
│    {                                                        │
│      "user_email": "user@example.com",                      │
│      "course_id": "block-chain-basics",                     │
│      "paid_status": true,                                   │
│      "payment_id": "pi_3abc123",                            │
│      "amount": 249.50,                                      │
│      "currency": "USD",                                     │
│      "referral_code": "affiliate@example.com",              │
│      "original_amount": 499,                                │
│      "discount_percentage": 50,                             │
│      "grant_id": "grant_id_123"                             │
│    }                                                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Update enrollment in MongoDB                            │
│     frappeSync: {                                           │
│       synced: true,                                         │
│       syncStatus: 'success',                                │
│       enrollmentId: 'frappe_enrollment_id',                 │
│       syncCompletedAt: Date                                 │
│     }                                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. Send confirmation email to user                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 12. User redirected to success page                         │
│     /success?session_id=...                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Retry & Failure Handling

### **If Frappe Sync Fails on First Attempt**

```
┌─────────────────────────────────────────────────────────────┐
│ Frappe enrollment fails                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Create retry job in MongoDB                                 │
│ - nextRetryAt: now + 2 minutes                              │
│ - attempts: 0                                               │
│ - maxAttempts: 5                                            │
│ - payload: { user_email, course_id, ... }                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Update enrollment status                                    │
│ frappeSync: {                                               │
│   synced: false,                                            │
│   syncStatus: 'retrying',                                   │
│   errorMessage: 'Connection timeout',                       │
│   retryJobId: retry_job_id                                  │
│ }                                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Cron job runs (every 5 minutes)                             │
│ GET /api/cron/frappe-retry                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Pick up pending retry jobs                                  │
│ - Exponential backoff: 2min, 4min, 8min, 16min, 32min      │
│ - Idempotency check: Skip if already enrolled              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Retry Frappe enrollment                                     │
│ POST /api/method/lms.lms.payment_confirmation              │
│ .confirm_payment                                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    SUCCESS              FAILURE
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌──────────────────┐
│ Mark completed  │  │ Increment retry  │
│ Update sync     │  │ Schedule next    │
│ status          │  │ attempt          │
└─────────────────┘  └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ Max attempts (5) │
                     │ reached?         │
                     └────────┬─────────┘
                              │
                          YES │ NO
                              │  └──> Retry again
                              ▼
                     ┌──────────────────┐
                     │ Mark as failed   │
                     │ No more retries  │
                     └──────────────────┘
```

---

## 📊 Database Records

### **Enrollment Document (MongoDB)**
```javascript
{
  _id: ObjectId("..."),
  courseId: "block-chain-basics",
  email: "user@example.com",
  paymentId: "pi_3abc123",
  amount: 249.50,
  status: "paid",
  enrollmentType: "partial_grant",
  
  // Original pricing info
  originalAmount: 499,
  commissionBaseAmount: 249.50,
  
  // Grant info
  grantData: {
    grantId: ObjectId("..."),
    couponCode: "GRANT50OFF",
    discountPercentage: 50,
    originalPrice: 499,
    finalPrice: 249.50
  },
  
  // Affiliate tracking
  affiliateData: {
    affiliateEmail: "affiliate@example.com",
    commissionAmount: 24.95,  // 10% of 249.50
    commissionRate: 10,
    commissionEligible: true
  },
  
  // Frappe LMS sync status
  frappeSync: {
    synced: true,
    syncStatus: "success",
    enrollmentId: "ENR-2025-001",  // From Frappe LMS
    syncCompletedAt: ISODate("2025-11-19T..."),
    lastSyncAttempt: ISODate("2025-11-19T...")
  },
  
  // Verification
  verification: {
    paymentVerified: true,
    courseEligible: true,
    stripePaymentId: "pi_3abc123"
  },
  
  createdAt: ISODate("2025-11-19T..."),
  updatedAt: ISODate("2025-11-19T...")
}
```

---

## 🔍 Monitoring & Health Checks

### **Check Frappe Sync Status**
```bash
# Get enrollments pending sync
db.enrollments.find({
  "frappeSync.syncStatus": "retrying"
})

# Get failed syncs
db.enrollments.find({
  "frappeSync.syncStatus": "failed"
})

# Get retry queue health
GET /api/cron/frappe-retry
```

### **Retry Queue Stats**
```json
{
  "status": "operational",
  "queueStats": {
    "totalJobs": 5,
    "pendingJobs": 2,
    "queueHealth": "healthy"
  }
}
```

---

## ✅ Production Checklist

- [x] Update `FRAPPE_LMS_BASE_URL` to `https://lms.maaledu.com`
- [x] Frappe endpoint configured: `/api/method/lms.lms.payment_confirmation.confirm_payment`
- [x] Checkout flow syncs free enrollments immediately
- [x] Webhook syncs paid enrollments after Stripe payment
- [x] Retry queue handles failed syncs with exponential backoff
- [x] Idempotency checks prevent duplicate enrollments
- [x] Affiliate commission calculated on correct amounts
- [x] Grant metadata sent to Frappe LMS
- [ ] Test end-to-end flow in production
- [ ] Monitor retry queue daily
- [ ] Set up alerts for failed syncs

---

## 🚀 API Integration Details

### **Request Format**
```bash
curl -X POST https://lms.maaledu.com/api/method/lms.lms.payment_confirmation.confirm_payment \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "user@example.com",
    "course_id": "block-chain-basics",
    "paid_status": true,
    "payment_id": "pi_3abc123",
    "amount": 99.99,
    "currency": "USD",
    "referral_code": "affiliate@example.com",
    "original_amount": 499,
    "discount_percentage": 50,
    "grant_id": "grant_id_123",
    "enrollment_type": "partial_grant"
  }'
```

### **Expected Response**
```json
{
  "message": {
    "success": true,
    "enrollment_id": "ENR-2025-001",
    "user_email": "user@example.com",
    "course_id": "block-chain-basics",
    "message": "Payment confirmed and user enrolled"
  }
}
```

### **Error Response**
```json
{
  "message": {
    "success": false,
    "error": "Course not found"
  }
}
```

---

## 📞 Support & Troubleshooting

### **Common Issues**

1. **Enrollment stuck in "retrying" status**
   - Check retry queue: `GET /api/cron/frappe-retry`
   - Manually trigger retry cron: `POST /api/cron/frappe-retry`
   - Check Frappe LMS logs at https://lms.maaledu.com

2. **Commission not calculated**
   - Verify `commissionBaseAmount` is set in enrollment
   - Check affiliate exists and is active
   - Review webhook logs in ProductionLogger

3. **Duplicate enrollments**
   - Idempotency checks in place
   - Check `frappeSync.enrollmentId` before creating new enrollment

### **Key Files**
- Service: `lib/services/frappeLMS.ts`
- Checkout: `app/api/checkout/route.ts`
- Webhook: `app/api/webhook/route.ts`
- Retry Cron: `app/api/cron/frappe-retry/route.ts`
- Enrollment Model: `lib/models/enrollment.ts`

---

**Last Updated**: November 19, 2025
**Status**: ✅ Production Ready
