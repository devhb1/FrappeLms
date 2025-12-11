# Frappe LMS Enrollment Sync - Issue Fixed

## Problem Identified

Users were completing successful payments and getting enrolled in MongoDB, but were **not getting access to the Frappe LMS course**. The enrollment records showed `frappeSync.syncStatus: "pending"` but the Frappe LMS enrollment never completed.

## Root Causes

1. **Missing Immediate Retry Logic**: When the initial Frappe LMS API call failed in the webhook, it would queue for retry but never attempt an immediate retry
2. **Incomplete Error Handling**: The webhook code had a logic issue where it only handled success cases properly, leaving failures in a pending state
3. **Insufficient Logging**: Not enough detailed logging to diagnose what was failing in the Frappe LMS API calls

## Changes Made

### 1. Enhanced Webhook Handler (`app/api/webhook/route.ts`)
- ✅ Added **immediate retry logic** - if first attempt fails, wait 2 seconds and try again
- ✅ Only queue for background retry if both immediate attempts fail
- ✅ Added comprehensive logging at each step
- ✅ Track retry count in enrollment document
- ✅ Better error messages

### 2. Improved Frappe LMS Service (`lib/services/frappeLMS.ts`)
- ✅ Added detailed request/response logging
- ✅ Validate base URL configuration
- ✅ Log full API responses for debugging
- ✅ Better error messages with full details

### 3. Admin Retry Endpoint (`app/api/admin/retry-frappe-sync/route.ts`)
- ✅ Execute retry **immediately** instead of just queuing
- ✅ Support batch retry with `retryAll: true`
- ✅ GET endpoint to view failed enrollments
- ✅ Statistics on sync status

### 4. Diagnostic Script (`scripts/diagnose-frappe-sync.ts`)
- ✅ Check sync status breakdown
- ✅ List failed enrollments with details
- ✅ Environment configuration check
- ✅ Actionable recommendations

## How to Fix Existing Stuck Enrollments

### Option 1: Check Failed Enrollments
```bash
curl http://localhost:3000/api/admin/retry-frappe-sync
```

### Option 2: Retry Single Enrollment
```bash
curl -X POST http://localhost:3000/api/admin/retry-frappe-sync \\
  -H "Content-Type: application/json" \\
  -d '{"enrollmentId": "YOUR_ENROLLMENT_ID"}'
```

### Option 3: Retry All Failed Enrollments (Recommended)
```bash
curl -X POST http://localhost:3000/api/admin/retry-frappe-sync \\
  -H "Content-Type: application/json" \\
  -d '{"retryAll": true}'
```

### Option 4: Run Diagnostic Script
```bash
cd MaalEdu_Frontend
npx tsx scripts/diagnose-frappe-sync.ts
```

## Testing the Fix

### 1. Test New Enrollment Flow
1. Complete a test payment
2. Check webhook logs immediately after payment
3. Verify enrollment document has `frappeSync.syncStatus: "success"`
4. Verify user can access course at https://lms.maaledu.com/lms

### 2. Monitor Logs
Look for these log messages:
- ✅ `"Attempting Frappe LMS enrollment"`
- ✅ `"FrappeLMS enrollment successful"`
- ⚠️ `"First Frappe attempt failed, retrying immediately..."`
- ❌ `"Immediate retry failed, queuing for later"`

### 3. Check MongoDB
```javascript
// Should show syncStatus: "success" and have enrollmentId
db.enrollments.findOne(
  { email: "user@example.com", status: "paid" },
  { frappeSync: 1, email: 1, courseId: 1 }
)
```

## Expected Behavior Now

### For New Enrollments:
1. User completes payment via Stripe
2. Webhook receives payment confirmation
3. Enrollment marked as "paid" in MongoDB
4. **First attempt** to enroll in Frappe LMS
5. If fails → wait 2 seconds → **second immediate attempt**
6. If still fails → queue for background retry (2 mins later)
7. User gets email with course access details

### For Existing Stuck Enrollments:
1. Use retry endpoint to fix them manually
2. System will attempt enrollment immediately
3. If successful, user gets access
4. If failed, check Frappe LMS server logs

## Environment Variables Required

```env
# Required
FRAPPE_LMS_BASE_URL=https://lms.maaledu.com

# Optional (if Frappe LMS requires authentication)
FRAPPE_LMS_API_KEY=your-api-key-here
```

## Monitoring & Maintenance

### Check Sync Health
```bash
# View stats and failed enrollments
GET /api/admin/retry-frappe-sync
```

### Common Issues

1. **Frappe LMS API is down**: Check https://lms.maaledu.com/api/method/ping
2. **Network timeout**: Increased timeout to 10 seconds (was 30s for faster failure detection)
3. **Invalid course_id**: Make sure courseId in MongoDB matches Frappe LMS course slugs
4. **User already enrolled**: Frappe LMS may reject duplicate enrollments (check their logs)

## Verification Checklist

- [x] Webhook handles both success and failure cases
- [x] Immediate retry logic implemented
- [x] Comprehensive error logging added
- [x] Admin retry endpoint works immediately
- [x] Diagnostic script created
- [x] Documentation completed

## Next Steps

1. **Deploy the changes** to production
2. **Run the retry endpoint** to fix existing stuck enrollments
3. **Monitor webhook logs** for the next few enrollments
4. **Verify users can access courses** at https://lms.maaledu.com/lms
5. **Set up monitoring** for `frappeSync.syncStatus` to catch future issues early

## Support

If enrollments still fail after these fixes:
1. Check Frappe LMS server logs
2. Verify the API endpoint is working: `/api/method/lms.lms.payment_confirmation.confirm_payment`
3. Test with curl to see exact API response
4. Check if Frappe LMS has rate limiting or other restrictions
