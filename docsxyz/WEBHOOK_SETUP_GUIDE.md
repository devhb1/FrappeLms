# 🔧 Stripe Webhook Setup Guide

## Problem Identified
Your payment completes successfully, but the enrollment status stays "pending" instead of "paid" because **the Stripe webhook is not being triggered**.

## Root Causes
1. ❌ Webhook endpoint not configured in Stripe Dashboard
2. ❌ STRIPE_WEBHOOK_SECRET not set in Vercel environment variables

---

## ✅ Solution: Complete Webhook Setup

### Step 1: Configure Stripe Webhook Endpoint

1. **Go to Stripe Dashboard**
   - Login to https://dashboard.stripe.com
   - Navigate to: **Developers** → **Webhooks**

2. **Add Endpoint**
   - Click "Add endpoint"
   - Enter URL: `https://frappe-lms-five.vercel.app/api/webhook`
   - Description: "MaalEdu Payment Webhook"

3. **Select Events to Listen**
   - Select: `checkout.session.completed`
   - This is the ONLY event you need

4. **Save and Get Signing Secret**
   - After saving, click on the webhook
   - Find "Signing secret" (starts with `whsec_...`)
   - Click "Reveal" and copy it

---

### Step 2: Add Environment Variable to Vercel

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/devhb1/frappe-lms
   - Click on **Settings** → **Environment Variables**

2. **Add Variable**
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_[YOUR_SECRET_FROM_STRIPE]`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

3. **Redeploy**
   - After adding variable, go to **Deployments**
   - Click the "..." menu on latest deployment
   - Select "Redeploy"

---

### Step 3: Test the Webhook

1. **Make a Test Purchase**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC

2. **Verify in Stripe**
   - Go to: **Developers** → **Webhooks** → Your webhook
   - Check "Recent deliveries" tab
   - You should see successful `checkout.session.completed` events

3. **Verify in MongoDB**
   - Check enrollment status changed from "pending" → "paid"
   - Check `frappeSync.syncStatus` is "pending" or "success"

---

## 🚨 Common Issues & Fixes

### Issue: "Webhook verification failed"
**Cause:** Wrong STRIPE_WEBHOOK_SECRET  
**Fix:** Make sure you copied the signing secret from the CORRECT webhook endpoint (not the test mode secret)

### Issue: "Enrollment not found"
**Cause:** enrollmentId not in session metadata  
**Fix:** Already fixed in code - metadata is properly set in checkout/route.ts

### Issue: Webhook not being called at all
**Cause:** Webhook endpoint URL is wrong  
**Fix:** Must be exact: `https://frappe-lms-five.vercel.app/api/webhook`

---

## 📊 How to Monitor Webhooks

### In Stripe Dashboard:
- **Developers** → **Webhooks** → Click your webhook
- View "Recent deliveries" to see all webhook attempts
- Click on any event to see:
  - Request body
  - Response code
  - Error messages (if failed)

### In Vercel Logs:
- Go to your deployment → **Logs** tab
- Filter by `/api/webhook`
- Look for console.log messages:
  - ✅ "Webhook verified"
  - 💳 "Processing payment for"
  - ✅ "Enrollment updated"

---

## 🎯 Expected Flow After Fix

1. User completes Stripe checkout ✅
2. Stripe sends webhook to `/api/webhook` ✅
3. Webhook updates enrollment: `pending` → `paid` ✅
4. Webhook queues Frappe LMS enrollment ✅
5. User gets access to course ✅

---

## 🔍 Debug Commands

### Check if webhook secret is set in Vercel:
```bash
vercel env ls
```

### Test webhook locally with Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhook
stripe trigger checkout.session.completed
```

---

## ✅ Verification Checklist

- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] Webhook listens to `checkout.session.completed`
- [ ] STRIPE_WEBHOOK_SECRET added to Vercel
- [ ] Vercel redeployed after adding secret
- [ ] Test purchase shows webhook delivery in Stripe
- [ ] Enrollment status changes to "paid" in MongoDB
- [ ] User gets access to course in Frappe LMS

---

## 📞 Next Steps

1. **Complete Steps 1-3 above**
2. **Make a test purchase**
3. **If still not working:**
   - Share screenshot of Stripe webhook "Recent deliveries"
   - Share Vercel logs for `/api/webhook`
   - Share MongoDB enrollment document after payment
