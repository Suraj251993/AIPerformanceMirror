# Phase 2 Design Document
## Zoho People Integration & Zoho SSO Implementation

**Project:** AI Performance Mirror  
**Phase:** 2 - Production Readiness  
**Status:** Design Review (Awaiting Approval)  
**Date:** November 2025

---

## 🎯 Phase 2 Objectives

1. **Zoho People Integration** - Sync real employee data from Zoho People
2. **Zoho Single Sign-On (SSO)** - Enable OAuth 2.0 authentication via Zoho accounts
3. **Hybrid Authentication** - Maintain demo mode alongside production Zoho SSO
4. **Automated Data Sync** - Real-time or scheduled employee data synchronization

---

## 📐 Architecture Overview

### Current State (Phase 1)
```
┌─────────────────────────────────────────┐
│   AI Performance Mirror (Demo Mode)     │
├─────────────────────────────────────────┤
│ • Hardcoded demo users                  │
│ • Role-based demo login                 │
│ • Static employee data                  │
│ • PostgreSQL (local data)               │
│ • Replit Auth (OpenID Connect)          │
└─────────────────────────────────────────┘
```

### Target State (Phase 2)
```
┌──────────────────────────────────────────────────────────┐
│        AI Performance Mirror (Production Ready)          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────┐        ┌──────────────────┐          │
│  │  Demo Mode    │        │  Production Mode │          │
│  │  (Existing)   │        │  (NEW - Zoho)    │          │
│  ├───────────────┤        ├──────────────────┤          │
│  │ • Demo Login  │        │ • Zoho SSO       │          │
│  │ • 3 Test Users│        │ • Real Employees │          │
│  └───────────────┘        └──────────────────┘          │
│         │                         │                      │
│         └─────────┬───────────────┘                      │
│                   ▼                                      │
│         ┌──────────────────┐                             │
│         │  PostgreSQL DB   │                             │
│         │  • users table   │                             │
│         │  • auth_source   │◄────── NEW COLUMN          │
│         │  • zoho_user_id  │◄────── NEW COLUMN          │
│         └──────────────────┘                             │
│                   ▲                                      │
│                   │                                      │
│         ┌─────────┴────────┐                             │
│         │   Zoho People    │                             │
│         │   API Sync       │                             │
│         │  • Employees     │                             │
│         │  • Departments   │                             │
│         │  • Attendance    │                             │
│         └──────────────────┘                             │
└──────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flows

### Flow 1: Demo Mode (Existing - No Changes)
```
User clicks "Demo Login"
   ↓
Select Role (HR_ADMIN/MANAGER/EMPLOYEE)
   ↓
Set session with hardcoded user ID
   ↓
Access dashboard
```

### Flow 2: Zoho SSO (New Production Mode)
```
User clicks "Sign In with Zoho"
   ↓
Redirect to Zoho OAuth Authorization
   ↓
https://accounts.zoho.com/oauth/v2/auth?
  scope=openid,profile,email,ZohoPeople.forms.READ
  &client_id={CLIENT_ID}
  &response_type=code
  &redirect_uri=https://yourapp.replit.app/auth/zoho/callback
   ↓
User logs in with Zoho credentials
   ↓
Zoho redirects back with authorization code
   ↓
Exchange code for access token + ID token (JWT)
   ↓
Decode ID token to get:
  - sub (unique Zoho user ID)
  - email
  - name
  - picture
   ↓
Check if user exists in database (by zoho_user_id)
   ↓
If NEW user → Sync from Zoho People API
If EXISTING → Update last login timestamp
   ↓
Create session with user.id
   ↓
Access dashboard with real data
```

---

## 🗄️ Database Schema Changes

### New Columns in `users` Table

```typescript
// shared/schema.ts modifications

export const users = pgTable("users", {
  // ... existing columns ...
  
  // NEW: Authentication source tracking
  authSource: varchar("auth_source", { length: 20 })
    .notNull()
    .default("demo"), // Values: "demo" | "zoho" | "replit"
  
  // NEW: Zoho-specific fields
  zohoUserId: varchar("zoho_user_id", { length: 255 }).unique(),
  zohoEmail: varchar("zoho_email", { length: 255 }),
  zohoEmployeeId: varchar("zoho_employee_id", { length: 100 }),
  zohoRecordId: varchar("zoho_record_id", { length: 100 }),
  zohoProfilePicture: text("zoho_profile_picture"),
  
  // NEW: Sync tracking
  lastZohoSync: timestamp("last_zoho_sync"),
  zohoSyncStatus: varchar("zoho_sync_status", { length: 20 })
    .default("pending"), // Values: "pending" | "synced" | "error"
  
  // ... existing columns ...
});
```

### New Table: `zoho_connections`

```typescript
export const zohoConnections = pgTable("zoho_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // OAuth tokens
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenType: varchar("token_type", { length: 50 }).default("Bearer"),
  expiresAt: timestamp("expires_at").notNull(),
  
  // Zoho metadata
  zohoDataCenter: varchar("zoho_data_center", { length: 10 })
    .default("com"), // Values: "com", "eu", "in", "au", "cn"
  apiDomain: varchar("api_domain", { length: 255 }),
  
  // Tracking
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### New Table: `zoho_sync_logs`

```typescript
export const zohoSyncLogs = pgTable("zoho_sync_logs", {
  id: serial("id").primaryKey(),
  syncType: varchar("sync_type", { length: 50 }).notNull(), 
    // Values: "full_sync" | "user_sync" | "attendance_sync"
  
  status: varchar("status", { length: 20 }).notNull(),
    // Values: "running" | "completed" | "failed"
  
  recordsProcessed: integer("records_processed").default(0),
  recordsFailed: integer("records_failed").default(0),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  
  errorMessage: text("error_message"),
  errorDetails: json("error_details"),
  
  triggeredBy: varchar("triggered_by", { length: 255 }), // user_id or "scheduler"
});
```

---

## 🔌 Zoho People API Integration

### Required Zoho OAuth Scopes

```javascript
const REQUIRED_SCOPES = [
  'openid',                          // User authentication
  'profile',                         // Basic profile info
  'email',                           // Email address
  'ZohoPeople.forms.READ',           // Read employee records
  'ZohoPeople.attendance.READ',      // Read attendance data
  'ZohoPeople.leave.READ',           // Read leave records (optional)
  'ZohoPeople.timetracker.READ',     // Read time tracking (optional)
].join(',');
```

### Key API Endpoints to Implement

#### 1. **Fetch Employee List**
```http
GET https://people.zoho.com/people/api/forms/P_EmployeeView/getRecords
Authorization: Zoho-oauthtoken {access_token}
?sIndex=1&limit=200
```

**Response Fields We Need:**
- `Employee_ID` → map to `zohoEmployeeId`
- `First_Name` → map to `firstName`
- `Last_Name` → map to `lastName`
- `Email_ID` → map to `email`
- `Department` → map to `department`
- `Designation` → map to `role` (or create new field)
- `Reporting_To` → map to `managerId` (hierarchy)
- `Date_of_joining` → optional enrichment
- `Mobile` → optional enrichment

#### 2. **Fetch Single Employee**
```http
GET https://people.zoho.com/people/api/forms/P_EmployeeView/getRecords
?searchParams={'searchField':'EmailID','searchOperator':'eq','searchText':'user@company.com'}
```

#### 3. **Fetch Attendance Data**
```http
GET https://people.zoho.com/people/api/attendance/getUserReport
?sdate=2025-01-01&edate=2025-01-31&emailId=user@company.com&dateFormat=yyyy-MM-dd
```

**Use Case:** Sync attendance → create `activity_events` records

#### 4. **Fetch User Profile Photo**
```http
GET https://people.zoho.com/people/api/forms/P_EmployeeView/photo/{recordId}
```

---

## 🔧 Implementation Plan

### New Backend Files Structure

```
server/
├── auth/
│   ├── zoho.ts              ← NEW: Zoho OAuth handler
│   └── strategies.ts        ← MODIFY: Add Zoho strategy
├── services/
│   ├── zohoAuth.ts          ← NEW: Token management
│   ├── zohoPeople.ts        ← NEW: API client wrapper
│   └── zohoSync.ts          ← NEW: Data sync logic
├── middleware/
│   └── zohoAuth.ts          ← NEW: Token refresh middleware
└── routes.ts                ← MODIFY: Add Zoho endpoints
```

### New Frontend Files Structure

```
client/src/
├── pages/
│   ├── zoho-login.tsx       ← NEW: Zoho SSO login page
│   └── auth-callback.tsx    ← NEW: OAuth callback handler
├── components/
│   └── LoginOptions.tsx     ← NEW: Choose Demo vs Zoho
└── lib/
    └── zohoAuth.ts          ← NEW: Client-side auth helpers
```

---

## 🔄 Data Sync Strategy

### Sync Modes

#### **Mode 1: Initial Full Sync**
- **Trigger:** First-time Zoho admin setup
- **Process:**
  1. Fetch all employees from Zoho People
  2. Create/update `users` table records
  3. Map departments → `department` field
  4. Build manager hierarchy → `managerId` relationships
  5. Log sync results in `zoho_sync_logs`

#### **Mode 2: Individual User Sync**
- **Trigger:** User logs in with Zoho SSO (first time or data refresh)
- **Process:**
  1. Decode ID token to get `sub` (Zoho user ID)
  2. Check if `zohoUserId` exists in database
  3. If new → Fetch from Zoho People API → Create user
  4. If existing → Update `lastZohoSync` timestamp
  5. Return user session

#### **Mode 3: Scheduled Incremental Sync**
- **Trigger:** Cron job (e.g., daily at 2 AM)
- **Process:**
  1. Fetch all employees from Zoho People
  2. Compare with database records
  3. Update changed records (name, department, manager, etc.)
  4. Flag deleted employees (soft delete or archive)
  5. Send summary email to HR admin

---

## 🛡️ Security Implementation

### 1. **Secrets Management (Replit Secrets)**

Store sensitive credentials as encrypted environment variables:

```bash
ZOHO_CLIENT_ID=1000.ABC123XYZ456
ZOHO_CLIENT_SECRET=your_secret_key_here
ZOHO_REDIRECT_URI=https://yourapp.replit.app/auth/zoho/callback
ZOHO_DATA_CENTER=com  # or eu, in, au, cn
```

### 2. **Token Storage Security**

- **Access Tokens:** Encrypted in `zoho_connections` table
- **Refresh Tokens:** Encrypted, used to renew access tokens
- **Never expose in logs:** Redact tokens in error messages
- **Automatic refresh:** Middleware checks expiry before API calls

### 3. **User Data Privacy**

- Only fetch necessary employee fields
- Respect Zoho People permissions (users can only see what they're allowed)
- Implement GDPR-compliant data handling:
  - User deletion → cascade delete Zoho tokens
  - Data export capability
  - Consent tracking

---

## 🎨 User Experience Changes

### New Login Page Design

```
┌────────────────────────────────────────┐
│   AI Performance Mirror                │
│   Employee Performance Tracking        │
├────────────────────────────────────────┤
│                                        │
│   ┌──────────────────────────────┐    │
│   │  🔐 Sign In with Zoho        │    │
│   │  Access with your Zoho ID    │    │
│   └──────────────────────────────┘    │
│                                        │
│              - OR -                    │
│                                        │
│   ┌──────────────────────────────┐    │
│   │  🎭 Try Demo Mode            │    │
│   │  Explore with sample data    │    │
│   └──────────────────────────────┘    │
│                                        │
└────────────────────────────────────────┘
```

### User Profile Enhancements

When logged in via Zoho:
- Display Zoho profile picture
- Show "Connected to Zoho People" badge
- Add "Last synced: 2 hours ago" indicator
- Option to "Refresh my data from Zoho"

---

## 📊 Zoho People → Database Field Mapping

| Zoho People Field      | Database Field        | Notes                          |
|------------------------|-----------------------|--------------------------------|
| `ERECNO`               | `zohoRecordId`        | Unique record identifier       |
| `Zoho_ID`              | `zohoUserId`          | User's Zoho account ID         |
| `Employee_ID`          | `zohoEmployeeId`      | Company employee number        |
| `First_Name`           | `firstName`           | Direct mapping                 |
| `Last_Name`            | `lastName`            | Direct mapping                 |
| `Email_ID`             | `email`               | Primary email                  |
| `Department`           | `department`          | Direct mapping                 |
| `Designation`          | Custom field or role  | Job title                      |
| `Reporting_To`         | `managerId`           | Manager hierarchy              |
| `Date_of_joining`      | New field (optional)  | Tenure calculation             |
| `Employment_status`    | `isActive` (boolean)  | Active/Inactive employees      |

---

## 🔄 Migration Path: Demo → Production

### Option 1: Parallel Modes (Recommended)

**Keep both Demo and Zoho modes active:**

```typescript
// Server-side route structure
app.get('/demo-login', showDemoLogin);    // Existing demo flow
app.get('/zoho-login', initiateZohoSSO);  // New Zoho flow
app.get('/auth/zoho/callback', handleZohoCallback);

// Middleware checks authSource
function requireAuth(req, res, next) {
  if (req.session.userId) {
    // Check if user.authSource === "demo" or "zoho"
    // Both are valid, proceed
    return next();
  }
  res.redirect('/login');
}
```

**Benefits:**
- ✅ Existing demo users unaffected
- ✅ Easy testing of Zoho integration
- ✅ Gradual rollout to real users
- ✅ Fallback if Zoho API has issues

### Option 2: Full Migration (Post-Testing)

After Zoho integration is stable:
1. Disable demo mode in production
2. Keep demo mode for development/staging
3. All users must authenticate via Zoho SSO

---

## 🧪 Testing Strategy

### Phase 2A: Development Environment Testing

1. **Unit Tests**
   - Zoho API client functions
   - Token refresh logic
   - User sync mapping

2. **Integration Tests**
   - OAuth flow end-to-end
   - Database user creation/update
   - Manager hierarchy mapping

3. **Manual Testing Checklist**
   - [ ] Can register Zoho OAuth app
   - [ ] Can initiate Zoho SSO flow
   - [ ] Callback URL receives authorization code
   - [ ] Token exchange succeeds
   - [ ] ID token decodes correctly
   - [ ] New user auto-created in database
   - [ ] Existing user session created
   - [ ] Zoho People API fetches employee data
   - [ ] Data sync populates database
   - [ ] Manager relationships mapped correctly
   - [ ] Profile picture displays
   - [ ] Token refresh works (after 1 hour)
   - [ ] Error handling graceful (network issues, API limits)

### Phase 2B: Staging Environment Testing

1. **Load Testing**
   - Simulate 50+ concurrent Zoho logins
   - Test sync with 100+ employees
   - Verify API rate limit handling (30 req/min)

2. **Security Audit**
   - Verify tokens encrypted at rest
   - Check no token leaks in logs
   - Test token expiration handling
   - Validate HTTPS-only redirects

### Phase 2C: Production Rollout

1. **Pilot Group** (5-10 users)
   - IT department or volunteer testers
   - Monitor for issues over 1 week

2. **Gradual Rollout**
   - 25% of users → Week 1
   - 50% of users → Week 2
   - 100% of users → Week 3

3. **Monitoring**
   - Track login success/failure rates
   - Monitor sync errors in `zoho_sync_logs`
   - Alert on API rate limit issues

---

## 📋 Implementation Steps (After Approval)

### Step 1: Zoho Developer Setup (1-2 hours)
1. Create account at https://api-console.zoho.com/
2. Register new OAuth client
3. Configure redirect URIs
4. Add required scopes
5. Get Client ID + Client Secret
6. Add to Replit Secrets

### Step 2: Database Schema Migration (1 hour)
1. Add new columns to `users` table
2. Create `zoho_connections` table
3. Create `zoho_sync_logs` table
4. Run migration: `npm run db:push`

### Step 3: Backend Implementation (8-12 hours)
1. Build Zoho OAuth handler (`server/auth/zoho.ts`)
2. Create Zoho People API client (`server/services/zohoPeople.ts`)
3. Implement token management (`server/services/zohoAuth.ts`)
4. Build user sync logic (`server/services/zohoSync.ts`)
5. Add API routes for Zoho login/callback
6. Create token refresh middleware
7. Add admin endpoint for full sync

### Step 4: Frontend Implementation (6-8 hours)
1. Create Zoho login page (`client/src/pages/zoho-login.tsx`)
2. Build OAuth callback handler (`client/src/pages/auth-callback.tsx`)
3. Update login flow with Demo vs Zoho choice
4. Add Zoho profile picture display
5. Create "Sync from Zoho" button in settings
6. Add sync status indicators

### Step 5: Testing & QA (4-6 hours)
1. Test OAuth flow end-to-end
2. Verify user creation/update
3. Test token refresh after 1 hour
4. Test full employee sync
5. Verify manager hierarchy mapping
6. Test error scenarios (network failures, invalid tokens)

### Step 6: Documentation (2-3 hours)
1. Update README with Zoho setup instructions
2. Document environment variables needed
3. Create admin guide for running sync
4. Write troubleshooting guide

### Step 7: Deployment (2-3 hours)
1. Add secrets to production environment
2. Run database migrations
3. Deploy code to production
4. Test with pilot users
5. Monitor logs for issues

**Total Estimated Time: 24-35 hours**

---

## 💰 Cost Considerations

### Zoho Pricing
- **Zoho People Plans:** Essential HR, Professional, Premium, Enterprise
- **API Access:** Included in paid plans (no additional cost)
- **Rate Limits:** 30 requests/minute (generous for most use cases)

### Replit Costs
- **No additional Replit costs** - Uses existing database and secrets management

---

## 🚨 Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Zoho API downtime** | High | Keep demo mode as fallback |
| **Rate limit exceeded** | Medium | Implement request queuing + retry logic |
| **Token expiry issues** | Medium | Automatic refresh middleware |
| **Data sync errors** | Medium | Comprehensive error logging + alerts |
| **User onboarding friction** | Low | Clear instructions + demo mode option |
| **Employee hierarchy mismatch** | Low | Manual override capability for HR admins |

---

## ✅ Success Criteria

Phase 2 will be considered successful when:

1. ✅ **Users can log in with Zoho SSO** - OAuth flow completes successfully
2. ✅ **Employee data syncs automatically** - New users created from Zoho People
3. ✅ **Manager hierarchy maps correctly** - Reporting structure accurate
4. ✅ **Tokens refresh automatically** - No manual re-authentication needed
5. ✅ **Demo mode still works** - Existing demo flow unaffected
6. ✅ **Error handling robust** - Graceful failures with clear error messages
7. ✅ **Performance acceptable** - Login < 3 seconds, sync < 30 seconds for 100 users
8. ✅ **Security audit passes** - No token leaks, encrypted storage verified

---

## 📅 Proposed Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Setup** | 1-2 days | Zoho OAuth app registered, secrets configured |
| **Backend Development** | 3-4 days | API integration, sync logic complete |
| **Frontend Development** | 2-3 days | Login pages, OAuth callback UI |
| **Testing** | 2-3 days | All tests passing, bugs fixed |
| **Documentation** | 1 day | Admin guides, troubleshooting docs |
| **Pilot Rollout** | 1 week | 5-10 test users |
| **Full Deployment** | 1-2 weeks | Gradual rollout to all users |

**Total Timeline: 3-4 weeks**

---

## 🎯 Next Steps (Pending Your Approval)

1. **Review this design document**
2. **Approve or request changes**
3. **Provide Zoho account access** (for OAuth app registration)
4. **Confirm employee data fields** you want to sync
5. **Set deployment timeline**
6. **Begin implementation** (I'll create tasks and start coding)

---

## 📞 Questions for Clarification

Before implementation, please confirm:

1. **Zoho Data Center:** Which region? (US/EU/India/Australia/China)
2. **Employee Fields:** Any custom Zoho People fields to sync?
3. **Department Mapping:** How should Zoho departments map to app roles?
4. **Manager Hierarchy:** Should we auto-assign MANAGER role based on "Reporting_To"?
5. **Sync Frequency:** How often to sync employee data? (Daily? Real-time on login?)
6. **Pilot Users:** Who should test first?
7. **Demo Mode:** Keep active in production or development-only?

---

**Document Status:** ✅ Ready for Review  
**Author:** AI Agent  
**Last Updated:** November 18, 2025

---

*This design maintains backward compatibility with your existing demo application while adding enterprise-grade Zoho integration. No code has been changed - this is purely a planning document for your approval.*
