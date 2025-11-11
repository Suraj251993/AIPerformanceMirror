-- ========================================
-- AI Performance Mirror - Production Data Import
-- Generated: November 11, 2025
-- ========================================
-- IMPORTANT: Run this AFTER publishing your app
-- This will import all development data into production
--
-- Usage:
-- 1. Publish your app first (schema will be created automatically)
-- 2. Navigate to Database pane → Production Database
-- 3. Open SQL editor and paste this entire file
-- 4. Execute the SQL
-- ========================================

-- Disable triggers temporarily for faster inserts
SET session_replication_role = replica;

-- Clear existing data (if any)
TRUNCATE task_validation_history, scores, activity_events, time_logs, tasks, projects, users, sessions CASCADE;

-- ========================================
-- TABLE: users
-- ========================================
