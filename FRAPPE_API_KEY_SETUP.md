# 🔑 Frappe LMS API Key Setup Required

## ⚠️ CRITICAL ISSUE

Your **Frappe LMS API Key is missing** in `.env.local`. This is why:

1. ✅ Payment succeeds (Stripe works)
2. ✅ Enrollment created in database
3. ❌ **Frappe LMS enrollment FAILS** (no API key)
4. ❌ **Email NOT sent** (only sends after successful Frappe enrollment)

---

## 🔍 Current Status

```bash
FRAPPE_LMS_BASE_URL=https://lms.maaledu.com
FRAPPE_LMS_API_KEY=                         ← EMPTY!
```

---

## 🛠️ How to Fix

### Step 1: Get Your Frappe LMS API Key

1. Go to your Frappe LMS instance: https://lms.maaledu.com
2. Login as administrator
3. Navigate to: **User Menu → API Access → API Secret**
4. Or go directly to: https://lms.maaledu.com/app/user/[your-username]/api-secret
5. Generate or copy your API key

### Step 2: Add to Environment Variables

Edit `.env.local`:

```bash
FRAPPE_LMS_API_KEY=your_api_key_here
```

### Step 3: Restart Your Application

```bash
# Stop the dev server (Ctrl+C)
# Restart
npm run dev
```

---

## 🔄 What Happens After Fix

Once you add the API key, the flow will work correctly:

```
Payment Success 
  ↓
Create Enrollment in Database ✅
  ↓
Enroll in Frappe LMS ✅ (will now succeed)
  ↓
Send Confirmation Email ✅ (will now be sent)
```

---

## 📧 For Your Current Enrollment

Your current purchase (Transaction ID: `cs_test_a1gTlVBV1yvEls21upP48a8pholaLkWdpXr2MgNOqIThmJn7rHc5VoBtMF`) is:

- ✅ **Paid successfully** ($199)
- ✅ **Saved in database** (Enrollment ID: `6936e33237f3f2d3d8d332032`)
- ❌ **NOT enrolled in Frappe LMS** (API key missing)
- ❌ **Email not sent** (waits for successful Frappe enrollment)

### Options:

**Option 1: Manual Retry (Recommended)**
Once you add the API key, the retry cron job will automatically:
1. Retry Frappe LMS enrollment (runs every 5 minutes)
2. Send confirmation email when successful

**Option 2: Trigger Manual Sync**
```bash
# After adding API key, trigger manual sync
curl -X POST http://localhost:3000/api/manual-sync
```

**Option 3: Contact Support**
Email support@maaledu.com with your transaction ID, and they can manually enroll you.

---

## 🎯 Testing After Fix

To verify everything works:

1. Add the Frappe LMS API key
2. Wait 5 minutes for automatic retry, OR
3. Make a test purchase with a test card
4. Check email inbox for confirmation

---

## 📝 Correct Email Flow

Emails are sent **ONLY after successful Frappe LMS enrollment**:

```typescript
// ✅ CORRECT FLOW (as implemented)
Payment Success 
  → Create Enrollment
  → Try Frappe LMS 
    → IF SUCCESS: Send Email ✅
    → IF FAIL: Queue for retry (no email yet)
    → When retry succeeds: Send Email ✅
```

This ensures users only receive confirmation when they **actually have course access**.

---

## 🔗 Related Files

- **Webhook Handler:** `app/api/webhook/route.ts` (lines 332-450)
- **Email Service:** `lib/emails/index.ts` (line 216-230)
- **Frappe LMS Service:** `lib/services/frappeLMS.ts`
- **Retry Cron Job:** `app/api/cron/frappe-retry/route.ts`

---

**Status:** ⚠️ Action Required - Add FRAPPE_LMS_API_KEY to .env.local
