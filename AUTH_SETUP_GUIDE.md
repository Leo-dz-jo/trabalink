# Trabalink Authentication Setup Guide

## Overview

This guide covers setting up **real user authentication** (sign up, sign in, email verification) using **EmailJS** for transactional emails, and **disabling demo mode** for production use.

---

## Current Architecture Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Auth Provider** | `@convex-dev/auth` (Password + Anonymous) | User authentication |
| **Email Verification** | Convex `Email` provider + VLY Integrations | Sends 6-digit OTP codes |
| **Demo Accounts** | Hardcoded in `src/lib/demo.ts` | Pre-seeded applicant/employer accounts |
| **Frontend Auth** | `src/pages/Auth.tsx` | Sign in, sign up, reset, verify flows |
| **Email Service** | Currently VLY (`@vly-ai/integrations`) | Sends verification emails |

**Key Files:**
- `src/convex/auth.ts` - Auth configuration (Password + Anonymous providers)
- `src/convex/auth/emailOtp.ts` - Email OTP sending logic (currently uses VLY)
- `src/convex/auth.config.ts` - JWT validation config
- `src/convex/demo.ts` - Demo account setup & seeding
- `src/lib/demo.ts` - Demo credentials (hardcoded)
- `src/pages/Auth.tsx` - Full auth UI with all flows
- `src/hooks/use-auth.ts` - React auth hook

---

## Part 1: Replace VLY Email with EmailJS

### Step 1.1: Create EmailJS Account & Template

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Create a new **Email Service** (Gmail, Outlook, SendGrid, etc.)
3. Create an **Email Template** for verification codes:

**Template Variables:**
```html
<!-- Subject: Your Trabalink Verification Code -->
<h2>Your Verification Code</h2>
<p>Hello {{to_name}},</p>
<p>Your 6-digit verification code is: <strong>{{otp_code}}</strong></p>
<p>This code expires in 15 minutes.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>— The Trabalink Team</p>
```

4. Note down your:
   - **Service ID** (e.g., `service_xyz123`)
   - **Template ID** (e.g., `template_abc789`)
   - **Public Key** (from Account → API Keys)
   - **Private Key** (for server-side, optional but recommended)

### Step 1.2: Add EmailJS Environment Variables

Create/update `.env.local`:
```env
# Convex (existing)
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
CONVEX_DEPLOYMENT=dev:your-deployment

# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID=service_xyz123
VITE_EMAILJS_TEMPLATE_ID=template_abc789
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here

# Optional: For server-side sending (more secure)
EMAILJS_PRIVATE_KEY=your_private_key_here
```

### Step 1.3: Create EmailJS Convex Action

Create `src/convex/auth/emailjsOtp.ts`:

```typescript
import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { action } from "./_generated/server";

// EmailJS REST API endpoint
const EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send";

export const emailjsOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  
  async sendVerificationRequest({ identifier: email, token }) {
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY; // Optional
    
    if (!serviceId || !templateId || !publicKey) {
      throw new Error(
        "EmailJS configuration missing. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY environment variables."
      );
    }
    
    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey, // Optional, for private key auth
      template_params: {
        to_email: email,
        to_name: email.split("@")[0],
        otp_code: token,
        // Add any other template variables here
      },
    };
    
    try {
      const response = await fetch(EMAILJS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EmailJS API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      console.log("[EmailJS] Verification email sent:", result);
    } catch (error) {
      console.error("[EmailJS] Failed to send verification email:", error);
      throw new Error(
        `Could not send verification email: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
```

### Step 1.4: Update Auth Configuration

Edit `src/convex/auth.ts`:

```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailjsOtp } from "./auth/emailjsOtp"; // Changed from emailOtp

const password = Password({
  profile: (params) => {
    const email =
      typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      throw new Error("A valid email address is required.");
    }
    return { email };
  },
  validatePasswordRequirements: (value) => {
    if (typeof value !== "string" || value.length < 8) {
      throw new Error("Use at least 8 characters for your password.");
    }
    if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
      throw new Error(
        "Your password needs at least one letter and one number.",
      );
    }
  },
  verify: emailjsOtp,  // Changed from emailOtp
  reset: emailjsOtp,   // Changed from emailOtp
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password, Anonymous],
});
```

### Step 1.5: Deploy Convex Functions

```bash
cd D:/PTSD/trabalink-latest
npx convex dev
```

This will:
1. Push the new `emailjsOtp` function to Convex
2. Make the auth provider use EmailJS
3. Set environment variables in Convex dashboard (see Step 1.6)

### Step 1.6: Set Environment Variables in Convex Dashboard

1. Go to [Convex Dashboard](https://dashboard.convex.dev/)
2. Select your deployment
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `EMAILJS_SERVICE_ID` = your service ID
   - `EMAILJS_TEMPLATE_ID` = your template ID
   - `EMAILJS_PUBLIC_KEY` = your public key
   - `EMAILJS_PRIVATE_KEY` = your private key (optional but recommended)

### Step 1.7: Test Email Verification Flow

1. Start the dev server: `npm run dev`
2. Go to `/auth?mode=signup`
3. Create a new account with a real email
4. Check email for 6-digit code
5. Enter code to verify
6. You should be signed in and redirected to `/app`

---

## Part 2: Disable Demo Mode for Production

### Option A: Remove Demo Buttons from Auth Page (Quick)

Edit `src/pages/Auth.tsx` - Remove or hide the demo section (lines 871-915):

```tsx
// Comment out or remove this entire block:
{/* 
{screen === "signin" && (
  <div className="mt-6 border-t border-border/70 pt-5">
    <div className="flex items-center gap-2.5">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Or open a demo
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Button ... onClick={() => void handleDemo("applicant")}>
        Applicant demo
      </Button>
      <Button ... onClick={() => void handleDemo("employer")}>
        Employer demo
      </Button>
    </div>
    <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
      One click, no email. Shared sample data; create an account
      for a clean workspace.
    </p>
  </div>
)}
*/}
```

### Option B: Conditional Demo (Recommended for Staging)

Keep demo for staging, disable for production:

```tsx
// In Auth.tsx, add at top of component:
const isProduction = import.meta.env.PROD;
const showDemo = !isProduction && import.meta.env.VITE_ENABLE_DEMO !== "false";

// Then wrap demo section:
{showDemo && screen === "signin" && (
  <div className="mt-6 border-t border-border/70 pt-5">
    {/* ... demo buttons ... */}
  </div>
)}
```

Add to `.env.production`:
```env
VITE_ENABLE_DEMO=false
```

### Option C: Remove Demo Infrastructure Completely (Cleanest)

**1. Remove demo action from convex:**

Delete or comment out in `src/convex/demo.ts`:
- `setup` action (lines 626-651)
- `verifyDemoAccounts` mutation (lines 653-678)
- `seed` mutation (lines 681-887)

**2. Remove demo imports:**

In `src/pages/Auth.tsx`:
```tsx
// Remove these imports:
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo";
// Remove handleDemo function and demo-related state
```

In `src/convex/auth.ts`:
```tsx
// The Anonymous provider allows demo-like access without passwords
// Keep it if you want guest access, remove if not:
// import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
// providers: [password], // Remove Anonymous
```

**3. Delete demo constants:**
```bash
rm src/lib/demo.ts
```

**4. Update HTTP routes if needed:**
Check `src/convex/http.ts` for any demo-related routes.

---

## Part 3: Complete Production Checklist

### Environment Variables Checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CONVEX_URL` | ✅ | Convex deployment URL |
| `VITE_CONVEX_SITE_URL` | ✅ | Convex site URL for auth |
| `CONVEX_DEPLOYMENT` | ✅ | Convex deployment name |
| `VITE_EMAILJS_SERVICE_ID` | ✅ | EmailJS service ID |
| `VITE_EMAILJS_TEMPLATE_ID` | ✅ | EmailJS template ID |
| `VITE_EMAILJS_PUBLIC_KEY` | ✅ | EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | Recommended | EmailJS private key (server-side) |
| `VITE_ENABLE_DEMO` | Optional | Set to "false" to disable demo |

### Convex Dashboard Environment Variables

Set these in **Convex Dashboard → Settings → Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `EMAILJS_SERVICE_ID` | ✅ | EmailJS service ID |
| `EMAILJS_TEMPLATE_ID` | ✅ | EmailJS template ID |
| `EMAILJS_PUBLIC_KEY` | ✅ | EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | Recommended | EmailJS private key |
| `VLY_INTEGRATION_KEY` | ❌ | **Remove** - no longer needed |
| `VLY_INTEGRATION_BASE_URL` | ❌ | **Remove** - no longer needed |

### Security Considerations

1. **Never expose private keys in client bundle**
   - `VITE_*` variables are embedded in the client bundle
   - `EMAILJS_PRIVATE_KEY` should ONLY be in Convex env vars (no `VITE_` prefix)

2. **EmailJS Template Security**
   - Don't include sensitive data in templates
   - Use `accessToken` (private key) for server-side auth

3. **Rate Limiting**
   - EmailJS free tier: 200 emails/month
   - Consider upgrading for production
   - Add Convex-side rate limiting if needed

---

## Part 4: Testing the Complete Flow

### Test Scenarios

#### 1. New User Sign Up
```
1. Navigate to /auth?mode=signup
2. Enter email: test@example.com
3. Enter password: SecurePass123
4. Confirm password: SecurePass123
5. Click "Create account"
6. Check email for 6-digit code
7. Enter code in verification screen
8. Click "Verify and continue"
9. Should redirect to /app
```

#### 2. Existing User Sign In
```
1. Navigate to /auth
2. Enter email: test@example.com
3. Enter password: SecurePass123
4. Click "Sign in"
5. If email not verified: enter 6-digit code
6. Should redirect to /app
```

#### 3. Password Reset
```
1. Navigate to /auth
2. Click "Forgot password?"
3. Enter email: test@example.com
4. Click "Send verification code"
5. Check email for 6-digit code
6. Enter code + new password + confirm
7. Click "Save new password"
8. Should redirect to /app (signed in)
```

#### 4. Verify Demo is Disabled
```
1. Navigate to /auth
2. Confirm NO "Applicant demo" / "Employer demo" buttons
3. Try /auth?demo=applicant - should NOT auto-sign-in
```

---

## Part 5: Troubleshooting

### Email Not Sending

**Check Convex Logs:**
```bash
npx convex logs --tail
```
Look for: `[EmailJS] Verification email sent:` or error messages

**Common Issues:**

| Error | Solution |
|-------|----------|
| `EmailJS configuration missing` | Set all 3 env vars in Convex dashboard |
| `EmailJS API error (400)` | Check service ID, template ID, public key |
| `EmailJS API error (401)` | Invalid private key or public key |
| `Could not send verification email` | Check network, EmailJS dashboard for quota |

### Verification Code Not Working

1. **Code expired** - Codes expire in 15 minutes (configurable in `emailjsOpt.ts`)
2. **Wrong email** - Ensure user enters code sent to exact email used
3. **Already verified** - Convex marks email as verified after first use

### Demo Still Showing

1. Clear browser cache/localStorage
2. Check `VITE_ENABLE_DEMO` is not set to "true"
3. Verify build: `npm run build` and check output
4. Check for `?demo=applicant` in URL

### Auth State Issues

```typescript
// Debug in browser console:
import { useConvexAuth } from "convex/react";
// Check isAuthenticated, isLoading values
```

---

## Part 6: EmailJS Template Examples

### Verification Email (HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Trabalink</h1>
  </div>
  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Verify Your Email</h2>
    <p style="font-size: 16px; color: #4b5563;">Hello {{to_name}},</p>
    <p style="font-size: 16px; color: #4b5563;">Welcome to Trabalink! Please use the verification code below to complete your account setup:</p>
    <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: 700; color: #92400e; letter-spacing: 8px; font-family: monospace;">{{otp_code}}</span>
    </div>
    <p style="font-size: 14px; color: #6b7280;">This code expires in <strong>15 minutes</strong>.</p>
    <p style="font-size: 14px; color: #6b7280;">If you didn't create an account, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">© 2025 Trabalink. All rights reserved.</p>
  </div>
</body>
</html>
```

### Password Reset Email (HTML)
```html
<!-- Similar structure, change title and message -->
<h2 style="color: #1f2937; margin-top: 0; font-size: 24px;">Reset Your Password</h2>
<p style="font-size: 16px; color: #4b5563;">You requested a password reset. Use this code to set a new password:</p>
<!-- Same code block -->
<p style="font-size: 14px; color: #6b7280;">This code expires in <strong>15 minutes</strong>.</p>
<p style="font-size: 14px; color: #6b7280;">If you didn't request this, please secure your account.</p>
```

---

## Part 7: Migration from VLY to EmailJS

### What Changes

| Before (VLY) | After (EmailJS) |
|--------------|-----------------|
| `VLY_INTEGRATION_KEY` | `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` |
| `freebuffEmailOtpUrl()` | Direct `fetch` to `api.emailjs.com` |
| Fixed email wording | Customizable templates |
| Auto-billed via VLY | EmailJS pricing (free tier: 200/mo) |

### Rollback Plan

If issues arise, revert `src/convex/auth.ts`:
```typescript
import { emailOtp } from "./auth/emailOtp"; // Original VLY version
// ...
verify: emailOtp,
reset: emailOtp,
```

And restore Convex env vars: `VLY_INTEGRATION_KEY`, `VLY_INTEGRATION_BASE_URL`

---

## Summary

✅ **To enable real users with EmailJS:**
1. Create EmailJS account + template
2. Add env vars (client + Convex dashboard)
3. Create `emailjsOtp.ts` Convex action
4. Update `auth.ts` to use `emailjsOtp`
5. Deploy: `npx convex dev`

✅ **To disable demo mode:**
- **Quick:** Comment out demo buttons in `Auth.tsx`
- **Conditional:** Use `VITE_ENABLE_DEMO=false` env var
- **Complete:** Remove `demo.ts`, `lib/demo.ts`, Anonymous provider

✅ **Test thoroughly** with the 4 test scenarios above before going live.

---

## Support Resources

- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [Convex Auth Documentation](https://auth.convex.dev/)
- [Trabalink Convex Schema](src/convex/schema.ts)
- [Auth UI Component](src/pages/Auth.tsx)