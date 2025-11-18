# Zoho OAuth Setup Guide
## AI Performance Mirror - Phase 2 Integration

**Version:** 1.0  
**Last Updated:** November 2025  
**For:** System Administrators & IT Team

---

## 📋 Prerequisites

Before setting up Zoho integration, ensure you have:

✅ **Zoho People Account** with Administrator access  
✅ **Replit Account** with access to your AI Performance Mirror project  
✅ **Production Domain** (e.g., `https://ai-performance-mirror-suraj95.replit.app/`)  
✅ **Email Access** for Zoho account verification  

---

## 🎯 Overview

This guide walks you through configuring Zoho OAuth 2.0 authentication for AI Performance Mirror. Users will be able to:

- Sign in with their Zoho credentials (Single Sign-On)
- Automatically sync employee data from Zoho People
- Use all Performance Mirror features with their real organizational data

**Estimated Setup Time:** 30-45 minutes

---

## Part 1: Create Zoho OAuth Client

### Step 1: Access Zoho API Console

1. Go to **[Zoho Developer Console](https://api-console.zoho.com/)**
2. Log in with your Zoho Administrator account
3. Click **GET STARTED** or **ADD CLIENT**

### Step 2: Select Client Type

1. Choose **Server-Based Applications**
   - This is correct for web applications running on a server (Replit)
2. Click **CREATE NOW**

### Step 3: Configure Client Details

Fill in the following information:

| Field | Value | Example |
|-------|-------|---------|
| **Client Name** | AI Performance Mirror | `AI Performance Mirror` |
| **Homepage URL** | Your Replit app URL | `https://ai-performance-mirror-suraj95.replit.app` |
| **Authorized Redirect URI** | Callback endpoint | `https://ai-performance-mirror-suraj95.replit.app/auth/zoho/callback` |

**⚠️ CRITICAL:** The **Authorized Redirect URI** must match exactly. Include `/auth/zoho/callback` at the end.

**For Development/Testing:**
If testing locally, you can also add:
- `http://localhost:5000/auth/zoho/callback`

### Step 4: Get Your Credentials

After creating the client:

1. Click on the **Client Secret** tab
2. Copy the following values (you'll need these later):
   - **Client ID** (looks like: `1000.ABC123XYZ456`)
   - **Client Secret** (long alphanumeric string)

**🔒 SECURITY:** Keep these credentials confidential! Never commit them to Git or share publicly.

---

## Part 2: Configure OAuth Scopes

### Step 1: Set Required Scopes

Your OAuth client needs access to:

1. Go to your client in Zoho API Console
2. Click **Settings** → **Scopes**
3. Add the following scopes:

```
ZohoPeople.forms.READ
ZohoPeople.attendance.READ
openid
profile
email
```

### Scope Explanation:

| Scope | Purpose |
|-------|---------|
| `ZohoPeople.forms.READ` | Read employee records from Zoho People |
| `ZohoPeople.attendance.READ` | Read attendance data (optional but recommended) |
| `openid` | Enable OpenID Connect for authentication |
| `profile` | Access user's basic profile (name, picture) |
| `email` | Access user's email address |

### Step 2: Save Scope Configuration

Click **UPDATE** to save your scope settings.

---

## Part 3: Determine Your Zoho Data Center

Zoho operates in multiple data centers. You need to identify yours:

### Check Your Zoho URL

Look at your Zoho People URL when logged in:

| URL Pattern | Data Center | Value to Use |
|-------------|-------------|--------------|
| `https://people.zoho.com/...` | United States | `com` |
| `https://people.zoho.eu/...` | Europe | `eu` |
| `https://people.zoho.in/...` | India | `in` |
| `https://people.zoho.com.au/...` | Australia | `au` |
| `https://people.zoho.com.cn/...` | China | `cn` |

**Note the data center value** - you'll need it in the next section.

---

## Part 4: Configure Replit Secrets

### Step 1: Open Replit Secrets

1. Go to your Replit project
2. Click **Tools** → **Secrets** (or lock icon 🔒 in left sidebar)

### Step 2: Add Required Secrets

Add the following environment variables:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `ZOHO_CLIENT_ID` | Your Client ID from Step 1 | `1000.ABC123XYZ456` |
| `ZOHO_CLIENT_SECRET` | Your Client Secret from Step 1 | `your_secret_here` |
| `ZOHO_REDIRECT_URI` | Full callback URL | `https://yourapp.replit.app/auth/zoho/callback` |
| `ZOHO_DATA_CENTER` | Your data center | `com` (or `eu`, `in`, `au`, `cn`) |

### How to Add a Secret:

1. Click **+ New Secret**
2. Enter **Key** (secret name from table above)
3. Enter **Value** (your actual value)
4. Click **Add Secret**
5. Repeat for all 4 secrets

### ✅ Verification Checklist:

- [ ] All 4 secrets added
- [ ] No typos in secret names (case-sensitive!)
- [ ] `ZOHO_REDIRECT_URI` matches exactly what's in Zoho API Console
- [ ] `ZOHO_DATA_CENTER` matches your Zoho URL (.com, .eu, .in, .au, or .cn)

---

## Part 5: Restart Application

After adding secrets, restart your Replit application:

1. In Replit, click **Stop** on the application
2. Click **Run** to restart
3. Check the console output for any errors

---

## Part 6: Test Zoho SSO Login

### Step 1: Access Login Page

1. Navigate to your app: `https://your-app.replit.app/`
2. You should see two login options:
   - **Sign In with Zoho** (new!)
   - **Try Demo Mode** (existing)

### Step 2: Initiate Zoho Login

1. Click **Sign In with Zoho**
2. You'll be redirected to Zoho's login page

### Step 3: Authorize Application

1. Log in with your Zoho credentials
2. Review the permissions requested
3. Click **Accept** to authorize

### Step 4: Verify Redirect

After authorization, you should be:

1. Redirected back to your app
2. Automatically logged in
3. See your Zoho profile picture and name
4. Land on the appropriate dashboard (based on your role)

---

## Part 7: First-Time Data Sync

### Automatic User Sync

When you log in with Zoho SSO for the first time:

1. **Your user record is created** automatically from Zoho People data
2. **Your profile is populated** with:
   - First Name & Last Name
   - Email Address
   - Department
   - Manager (if assigned)
   - Profile Picture
3. **You're ready to use the app** immediately!

### Full Organization Sync (Optional)

To sync all employees from Zoho People:

1. Log in as an **HR Administrator**
2. Go to **Settings** → **Zoho Integration**
3. Click **Sync All Employees from Zoho**
4. Wait for sync to complete (progress bar shown)

This will:
- Import all active employees
- Set up manager hierarchies
- Sync department information
- Fetch profile pictures

---

## 🔐 Security Best Practices

### 1. Protect Your Secrets

✅ **DO:**
- Store credentials in Replit Secrets (encrypted)
- Limit access to Zoho API Console to authorized admins only
- Rotate Client Secret periodically (every 90 days recommended)

❌ **DON'T:**
- Commit secrets to Git
- Share Client Secret via email or chat
- Hard-code secrets in your application code

### 2. Monitor OAuth Usage

- Regularly review authorized applications in Zoho Admin Console
- Check for suspicious login patterns
- Revoke compromised credentials immediately

### 3. API Rate Limits

Zoho has API rate limits:
- **30 requests per minute** per user
- The app handles this automatically with request queuing
- Full org syncs may take a few minutes for large organizations

---

## 🐛 Troubleshooting

### Issue: "Invalid Redirect URI" Error

**Cause:** Mismatch between configured URI and actual callback URL

**Solution:**
1. Go to Zoho API Console
2. Check **Authorized Redirect URI**
3. Ensure it EXACTLY matches: `https://your-app.replit.app/auth/zoho/callback`
4. No trailing slash, no typos

---

### Issue: "Invalid Client ID or Secret"

**Cause:** Wrong credentials in Replit Secrets

**Solution:**
1. Go to Zoho API Console → Client Secret tab
2. Copy Client ID and Secret again
3. Update Replit Secrets with correct values
4. Restart application

---

### Issue: "Insufficient Scope" Error

**Cause:** Missing required OAuth scopes

**Solution:**
1. Go to Zoho API Console → your client → Scopes
2. Ensure these scopes are added:
   - `ZohoPeople.forms.READ`
   - `ZohoPeople.attendance.READ`
   - `openid`
   - `profile`
   - `email`
3. Click **UPDATE**
4. Try logging in again (may need to re-authorize)

---

### Issue: "Access Token Expired" After 1 Hour

**Cause:** Access tokens expire after 1 hour (normal behavior)

**Solution:**
- **No action needed** - The app automatically refreshes tokens
- If you see this error, refresh the page and it should work
- If persists, re-login with Zoho

---

### Issue: User Data Not Syncing

**Cause:** User doesn't exist in Zoho People

**Solution:**
1. Verify user exists in Zoho People
2. Check user's email matches Zoho People email exactly
3. Ensure user has "Active" employment status
4. Contact HR to update Zoho People records

---

### Issue: Wrong Data Center

**Cause:** `ZOHO_DATA_CENTER` secret doesn't match your Zoho account region

**Solution:**
1. Check your Zoho People URL
2. Update `ZOHO_DATA_CENTER` in Replit Secrets:
   - `.com` → `com`
   - `.eu` → `eu`
   - `.in` → `in`
   - `.au` → `au`
   - `.cn` → `cn`
3. Restart application

---

## 📊 Monitoring & Maintenance

### Sync Logs

View sync history:
1. Log in as HR Admin
2. Go to **Settings** → **Zoho Integration** → **Sync Logs**
3. Review:
   - Last sync time
   - Records processed
   - Errors (if any)

### Token Health

Check OAuth connection status:
1. Go to **User Profile** → **Settings**
2. Look for "Connected to Zoho People" badge
3. Shows "Last synced: X hours ago"

### Scheduled Syncs

By default, the app:
- Syncs individual users on login (real-time)
- Optional: Can enable daily full sync at 2 AM (configure in settings)

---

## 🔄 Switching Between Demo and Zoho Modes

### For Testing

You can use **both** authentication methods simultaneously:

- **Demo Mode:** Test features with sample data
- **Zoho SSO:** Use with real production data

### User Experience

When users visit the login page, they choose:
- **Sign In with Zoho** → Production mode (real data)
- **Try Demo Mode** → Exploration mode (sample data)

Both work with **identical features** - only the data source differs!

---

## 📞 Support & Resources

### Documentation

- **Phase 2 Design Document:** `PHASE_2_DESIGN_DOCUMENT.md`
- **Zoho OAuth Docs:** https://www.zoho.com/accounts/protocol/oauth.html
- **Zoho People API:** https://www.zoho.com/people/api/

### Common Questions

**Q: Can we disable Demo Mode in production?**  
A: Yes, but not recommended during initial rollout. Keep both for gradual migration.

**Q: How often does data sync from Zoho?**  
A: Individual user data syncs on every login. Full org sync can be manual or scheduled daily.

**Q: What if a user leaves the company?**  
A: When removed from Zoho People, they won't be able to log in. Their historical data remains in the database.

**Q: Can users from different Zoho orgs use the same app?**  
A: No, one Replit app = one Zoho organization. You'd need separate deployments for multiple orgs.

---

## ✅ Setup Completion Checklist

Before going live, verify:

- [ ] Zoho OAuth client created in API Console
- [ ] All 4 Replit secrets configured correctly
- [ ] Test login with Zoho SSO successful
- [ ] User profile shows correct Zoho data
- [ ] Manager hierarchy mapping works
- [ ] Dashboard displays real performance data
- [ ] Profile pictures load correctly
- [ ] Token refresh works (test after 1+ hour)
- [ ] Sync logs accessible by HR Admin
- [ ] Demo mode still works (for comparison/testing)

---

**🎉 Congratulations!** Your Zoho SSO integration is complete. Users can now log in with their Zoho credentials and access AI Performance Mirror with real organizational data!

---

**Document Version:** 1.0  
**Created:** November 2025  
**Maintained By:** Development Team
