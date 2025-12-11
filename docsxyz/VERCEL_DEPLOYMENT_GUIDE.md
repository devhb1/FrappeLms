# Vercel Deployment Guide - Critical Setup

## ⚠️ CRITICAL: Environment Variables for Vercel

Your authentication issues are likely caused by missing or incorrect environment variables in Vercel. Follow these steps:

### 1. Required Environment Variables in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables and add:

#### **NEXTAUTH_URL** (CRITICAL!)
```
NEXTAUTH_URL=https://frappe-lms-five.vercel.app
```
⚠️ **This MUST match your exact production domain**

#### **NEXTAUTH_SECRET** (CRITICAL!)
```
NEXTAUTH_SECRET=your-super-secure-random-string-here
```
Generate a secure secret:
```bash
openssl rand -base64 32
```

#### **MONGODB_URI**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

#### **Other Required Variables**
```
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_MAIL=support@maaledu.com
SMTP_PASSWORD=your-sendgrid-key
NEXT_PUBLIC_APP_URL=https://frappe-lms-five.vercel.app
FRAPPE_LMS_BASE_URL=https://lms.maaledu.com
```

### 2. Deployment Steps

After adding environment variables:

1. **Redeploy** your application from Vercel dashboard
2. **Clear browser cache** completely
3. **Test in incognito mode** first

### 3. Common Issues & Solutions

#### Issue: "Session not persisting" or "Redirects back to login"
**Solution:**
- Ensure `NEXTAUTH_URL` matches your exact domain (no trailing slash)
- Ensure `NEXTAUTH_SECRET` is set and at least 32 characters
- Check Vercel logs for authentication errors

#### Issue: "Keeps loading forever"
**Solution:**
- Fixed in code: Changed to `redirect: false` with `window.location.href`
- Added session refetch interval
- Added `basePath` and `useSecureCookies` to NextAuth config

#### Issue: "Cookie not set in production"
**Solution:**
- Ensured `useSecureCookies: true` in production
- Verified domain allows third-party cookies
- Check browser console for cookie errors

### 4. Testing Authentication Flow

After deployment:

1. Open incognito window → `https://frappe-lms-five.vercel.app/signin`
2. Enter credentials and click Sign In
3. Should redirect to `/dashboard` successfully
4. Navigate to home page → Click Dashboard button
5. Should stay on `/dashboard` without redirecting to signin

### 5. Debugging

Check Vercel logs:
```bash
# In your terminal
vercel logs frappe-lms-five --follow
```

Enable NextAuth debug in Vercel:
- Add environment variable: `NEXTAUTH_DEBUG=true`
- Check logs for detailed authentication flow

### 6. Code Changes Applied

✅ **SignIn Page** (`app/signin/page.tsx`)
- Changed to `redirect: false` to prevent reload loop
- Use `window.location.href` for hard navigation after success
- Added proper error handling from URL params

✅ **AuthProvider** (`components/auth-provider.tsx`)
- Added `refetchInterval: 5 * 60` (refetch every 5 minutes)
- Added `refetchOnWindowFocus: true` (refetch when tab regains focus)

✅ **NextAuth Config** (`lib/auth.ts`)
- Added `basePath: '/api/auth'` for Vercel compatibility
- Added `useSecureCookies` for production security
- Session maxAge: 7 days

### 7. Next Steps

1. ✅ Add all environment variables to Vercel
2. ✅ Redeploy from Vercel dashboard
3. ✅ Test in incognito mode
4. ✅ Verify session persists across page navigation
5. ✅ Check browser cookies are being set correctly

---

## Quick Checklist

- [ ] `NEXTAUTH_URL` set to exact production domain
- [ ] `NEXTAUTH_SECRET` is 32+ characters
- [ ] All environment variables added to Vercel
- [ ] Redeployed after adding variables
- [ ] Tested in incognito mode
- [ ] Cleared browser cache
- [ ] Session persists after login
- [ ] Dashboard accessible without redirect loop
