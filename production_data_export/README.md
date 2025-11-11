# 📊 Production Data Import Guide

## ✅ **What's Exported:**

This folder contains a complete export of your development database:

- **29 Users** (employees, managers, HR admins)
- **1 Project** (HR Team Projects)
- **265 Tasks** with all details
- **300+ Time Logs**
- **63 Activity Events**
- **10 Performance Scores**
- **15 Task Validation History records**

**Total Data:** 296KB SQL file ready for production import

---

## 🚀 **Step-by-Step Import Process**

### **Step 1: Publish Your Application**

1. Click the **"Publish"** button (already created for you above)
2. Choose deployment type:
   - ✅ **Recommended:** Autoscale (automatically scales with traffic)
   - Alternative: Reserved VM (dedicated resources)
3. Configure settings (defaults are fine)
4. Click **"Publish"** and wait for deployment (2-3 minutes)

✅ **Result:** Your production database schema is automatically created

---

### **Step 2: Access Production Database**

1. In your Replit workspace, open the **"Database"** pane (left sidebar)
2. At the top, switch from **"Development"** to **"Production"**
3. You'll see your production database with empty tables (schema only)

---

### **Step 3: Import Data**

**Option A: Using Database Pane (Recommended)**

1. In the Production Database view, click on **"Query"** or **"SQL Editor"**
2. Open the file: `production_data_export/data_dump.sql`
3. Copy the ENTIRE contents of the file
4. Paste it into the SQL editor
5. Click **"Run"** or **"Execute"**
6. Wait for completion (~10-30 seconds)

**Option B: Using Command Line**

```bash
# From your Replit shell (make sure you're targeting PRODUCTION)
# Note: You'll need to use production DATABASE_URL
psql $PRODUCTION_DATABASE_URL < production_data_export/data_dump.sql
```

---

### **Step 4: Verify Import**

After import, check your production database:

```sql
-- Check user count
SELECT COUNT(*) FROM users;  -- Should return 29

-- Check task count
SELECT COUNT(*) FROM tasks;  -- Should return 265

-- Check activity events
SELECT COUNT(*) FROM activity_events;  -- Should return 63

-- View a sample user
SELECT * FROM users WHERE role = 'MANAGER' LIMIT 1;
```

---

## ⚠️ **Important Notes**

### **What Happens During Import:**

✅ **Imported to Production:**
- All users, tasks, projects
- Time logs and activity events
- Performance scores
- Task validation history

❌ **NOT Imported:**
- Sessions (user login sessions - these are temporary)
- Development-only test users

### **Safety:**

- The SQL file includes `TRUNCATE` statements to clear existing data
- This ensures a clean import without duplicates
- **Only run this ONCE** after publishing
- If you need to re-import, you can run it again (it will clear and re-import)

### **Authentication:**

- After import, users can log in with Replit Auth
- Test users from development will be in production
- You may want to clean up test accounts later

---

## 🎯 **What's Next?**

After successful import:

1. ✅ Visit your published app URL (provided after publishing)
2. ✅ Log in as a Manager (email: `meenakshi.dabral@company.com`)
3. ✅ Test the Task Validation feature
4. ✅ Check employee performance scores
5. ✅ Verify Activity Timeline shows real data

---

## 📝 **File Contents**

- `data_dump.sql` - Complete database export (296KB, 678 lines)
- `README.md` - This guide

---

## 🆘 **Troubleshooting**

**Issue: "Permission denied"**
- Solution: Make sure you're in the Production database view, not Development

**Issue: "Table does not exist"**
- Solution: Publish your app first - the schema must be created

**Issue: "Duplicate key error"**
- Solution: Run the script again - it will truncate tables first

**Issue: "Connection timeout"**
- Solution: The file is large - try importing in smaller chunks or wait longer

---

## 📧 **Support**

If you encounter any issues:
1. Check that your app is published successfully
2. Verify you're in the Production database view
3. Ensure the SQL file is complete (should be 296KB)

---

**Generated:** November 11, 2025
**Database:** PostgreSQL 16
**Records:** 600+ across 7 tables
