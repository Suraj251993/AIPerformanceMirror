# AI Performance Mirror - Performance Score Calculation Guide

## Overview

The AI Performance Mirror calculates employee performance scores automatically using data from your Excel imports (tasks, time logs, projects). This guide explains how scores are calculated, what factors matter, and how to use this system effectively.

---

## 📊 What is a Performance Score?

A performance score is a number from **0 to 100** that represents how well an employee is performing based on their work activities over the **last 30 days**.

**Example Score Breakdown:**
- **Overall Score: 68.2** (out of 100)
  - Efficiency: 40.0 × 25% weight = **10.0 points**
  - Timeliness: 100.0 × 25% weight = **25.0 points**
  - Task Completion: 4.6 × 30% weight = **1.4 points**
  - Progress Quality: 50.7 × 15% weight = **7.6 points**
  - Priority Focus: 4.5 × 5% weight = **0.2 points**

---

## 🎯 The 5 Score Components

Your performance score is made up of **5 key components**, each measuring a different aspect of work quality:

### 1️⃣ **Task Completion Score (30% of total score)**

**What it measures:** How many of your assigned tasks you actually complete

**How it's calculated:**
- Looks at all tasks created in the last 30 days
- Counts how many have status = "Done" or "Completed"
- Formula: (Completed Tasks ÷ Total Tasks) × 100

**Excel fields used:**
- `Status` column (values: "Done", "Completed", "In Progress", "To Do")
- `Created Date` (to filter last 30 days)

**Example:**
- You have 10 tasks assigned
- 8 are marked "Done"
- Task Completion Score = (8 ÷ 10) × 100 = **80.0**
- Your contribution to overall score: 80.0 × 30% = **24.0 points**

**Special features:**
- Supports **shared tasks**: If you own 50% of a task, it counts as 0.5 tasks
- Default score: **70** (if you have no tasks yet)

---

### 2️⃣ **Timeliness Score (25% of total score)**

**What it measures:** How often you complete tasks before their due date

**How it's calculated:**
- Looks at all completed tasks from the last 30 days
- Compares "Completion Date" vs "Due Date"
- Formula: (Tasks Completed On-Time ÷ Total Completed Tasks) × 100

**Excel fields used:**
- `Due Date` column
- `Completion Date` column (or `completedAt`)
- `Status` (must be "Done" or "Completed")

**Example:**
- You completed 8 tasks
- 7 were finished before the due date
- 1 was finished after the due date
- Timeliness Score = (7 ÷ 8) × 100 = **87.5**
- Your contribution to overall score: 87.5 × 25% = **21.9 points**

**Special features:**
- Only counts completed tasks (ignores in-progress tasks)
- Supports shared tasks with ownership percentages
- Default score: **70** (if no completed tasks with due dates)

---

### 3️⃣ **Efficiency Score (25% of total score)**

**What it measures:** How accurately you estimate task duration (actual work time vs estimated time)

**How it's calculated:**
- Compares total "Work Hours" logged vs total "Duration" (estimated hours)
- Ratio = Actual Hours ÷ Estimated Hours
- Scoring:
  - **100 points**: Ratio between 0.8 - 1.2 (within 20% of estimate) ✅ Excellent
  - **85 points**: Ratio between 0.6 - 1.5 (within reasonable range) ✅ Good
  - **65 points**: Ratio between 0.4 - 2.0 (some deviation) ⚠️ Fair
  - **40 points**: Ratio outside 0.4 - 2.0 (significant deviation) ❌ Poor

**Excel fields used:**
- `Duration` column (estimated hours per task)
- Time logs with `Work hours` (actual hours logged)
- `Created Date` (for 30-day window)

**Example:**
- Your tasks have 40 estimated hours total
- You logged 36 actual hours of work
- Ratio = 36 ÷ 40 = 0.9 (within 20% of estimate)
- Efficiency Score = **100** (excellent!)
- Your contribution to overall score: 100 × 25% = **25.0 points**

**Why this matters:**
- Shows you can plan work accurately
- Helps managers trust your estimates
- Low scores mean you over/under-estimate significantly

**Special features:**
- Supports shared tasks (uses ownership percentage to weight estimated hours)
- Default score: **70** (if no time logs or tasks with estimates)

---

### 4️⃣ **Progress Quality Score (15% of total score)**

**What it measures:** How well you keep your in-progress tasks updated with accurate progress percentages

**How it's calculated:**
- Looks at all **active** (not completed) tasks
- Averages their progress percentages
- Formula: Average of `% Completed` field for active tasks

**Excel fields used:**
- `% Completed` column (0-100%)
- `Status` (excludes "Done" and "Completed" tasks)
- `Created Date` (for 30-day window)

**Example:**
- You have 4 active tasks:
  - Task A: 75% complete
  - Task B: 60% complete
  - Task C: 40% complete
  - Task D: 25% complete
- Average progress = (75 + 60 + 40 + 25) ÷ 4 = **50%**
- Progress Quality Score = **50.0**
- Your contribution to overall score: 50.0 × 15% = **7.5 points**

**Why this matters:**
- Shows you actively track your work
- Helps managers see realistic progress
- High scores = good project visibility

**Special features:**
- If you have **no active tasks** (all completed), score = **90** (reward for finishing everything!)
- If you're a new user with no tasks, score = **70** (neutral)
- Supports shared tasks with ownership percentages

---

### 5️⃣ **Priority Focus Score (5% of total score)**

**What it measures:** Whether you focus on high-priority tasks first

**How it's calculated:**
- Weights task completion by priority level
- Priority weights:
  - **High priority** = 3× weight
  - **Medium priority** = 2× weight
  - **Low priority** = 1× weight
- Formula: (Completed Priority Weight ÷ Total Priority Weight) × 100

**Excel fields used:**
- `Priority` column (values: "High", "Medium", "Low")
- `Status` (must be "Done" or "Completed" to count)
- `Created Date` (for 30-day window)

**Example:**
- You have 6 tasks:
  - 2 High priority (weight 3 each) = 6 total weight
  - 2 Medium priority (weight 2 each) = 4 total weight
  - 2 Low priority (weight 1 each) = 2 total weight
  - **Total possible weight**: 6 + 4 + 2 = 12
- You completed:
  - 1 High priority = 3 points
  - 1 Medium priority = 2 points
  - 0 Low priority = 0 points
  - **Total earned weight**: 3 + 2 + 0 = 5
- Priority Focus Score = (5 ÷ 12) × 100 = **41.7**
- Your contribution to overall score: 41.7 × 5% = **2.1 points**

**Why this matters:**
- Rewards employees who tackle important work first
- Encourages focus on business-critical tasks
- Small weight (5%) means it's a bonus, not a penalty

**Special features:**
- Supports shared tasks with ownership percentages
- Default score: **70** (if no tasks)

---

## ⚙️ Weight Configuration (How Components Combine)

The **5 components** are combined using these weights:

| Component | Weight | Why This Weight? |
|-----------|--------|------------------|
| **Task Completion** | 30% | Most important: Did you finish your work? |
| **Efficiency** | 25% | Very important: Did you estimate accurately? |
| **Timeliness** | 25% | Very important: Did you meet deadlines? |
| **Progress Quality** | 15% | Important: Do you track work well? |
| **Priority Focus** | 5% | Bonus: Do you focus on what matters? |

**Total:** 100%

**Final Score Formula:**
```
Overall Score = 
  (Task Completion × 0.30) +
  (Efficiency × 0.25) +
  (Timeliness × 0.25) +
  (Progress Quality × 0.15) +
  (Priority Focus × 0.05)
```

**Administrators can adjust these weights** through the system settings if your organization wants to emphasize different aspects of performance.

---

## 🗄️ Database Factors & Data Sources

### Tables Used in Score Calculation

1. **`users` table**
   - Links scores to specific employees
   - Filters by employee role

2. **`tasks` table**
   - Status (Done, Completed, In Progress, To Do)
   - Priority (High, Medium, Low)
   - Due Date
   - Completion Date (completedAt)
   - Estimated Hours
   - Progress Percentage (% Completed)
   - Created Date (for 30-day window)

3. **`task_owners` table**
   - Links employees to tasks (supports multiple owners)
   - Share Percentage (for shared tasks)

4. **`time_logs` table**
   - Minutes worked per task
   - Logged date
   - Links to specific users and tasks

5. **`scores` table**
   - Stores calculated scores
   - Stores component breakdown (as JSON)
   - Historical data for trends

### Time Window

**All scores are calculated for the last 30 days** from today's date.

- Start Date: Today minus 30 days
- End Date: Today
- Only tasks/logs within this window are counted

---

## 📋 Application Guidelines

### For HR Administrators

**Best Practices:**
1. **Import complete data**: Ensure Excel files have all required fields (Status, Priority, Due Date, etc.)
2. **Review weight settings**: Adjust component weights to match your organization's values
3. **Monitor score trends**: Use the performance trend charts to spot patterns
4. **Set clear expectations**: Share this guide with employees so they understand how they're measured
5. **Weekly reviews**: Check scores weekly to catch issues early

**What to look for:**
- Employees with consistently low scores (< 60) may need support
- Sudden score drops indicate potential problems
- High performers (> 85) can be recognized/rewarded

---

### For Managers

**Best Practices:**
1. **Validate task completion**: Use the Task Validation feature to verify employee-reported progress
2. **Set realistic due dates**: Help employees succeed by setting achievable deadlines
3. **Provide estimates**: Work with employees to set accurate task duration estimates
4. **Regular 1-on-1s**: Discuss scores in weekly check-ins
5. **Focus on trends**: One bad week doesn't define performance - look at trends

**What to look for:**
- **Low Task Completion**: Employee may be overloaded or need help
- **Low Timeliness**: Employee may need better time management or more realistic deadlines
- **Low Efficiency**: Employee may need help estimating or is working inefficiently
- **Low Progress Quality**: Employee needs to update tasks more frequently

---

### For Employees

**How to Improve Your Score:**

1. **Complete Tasks (30% weight)**
   - Mark tasks as "Done" when finished
   - Don't let tasks sit in "In Progress" indefinitely
   - Ask for help if stuck

2. **Meet Deadlines (25% weight)**
   - Review due dates regularly
   - Flag unrealistic deadlines early
   - Communicate delays proactively

3. **Estimate Accurately (25% weight)**
   - Track how long tasks actually take
   - Use past data to improve future estimates
   - Be honest about complexity

4. **Update Progress (15% weight)**
   - Update task progress percentages weekly
   - Keep % Completed field accurate
   - Don't leave it at 0% until complete

5. **Prioritize Well (5% weight)**
   - Focus on high-priority tasks first
   - Ask manager to clarify priorities if unclear

**Common Mistakes to Avoid:**
- ❌ Leaving tasks in "In Progress" for weeks
- ❌ Not updating progress percentages
- ❌ Missing due dates without communicating
- ❌ Drastically over/under-estimating hours
- ❌ Ignoring high-priority tasks

---

## 💡 Benefits of the Scoring System

### For the Organization

1. **Data-Driven Decisions**
   - Objective performance measurement
   - Identify top performers for promotions
   - Spot underperformers who need support

2. **Improved Planning**
   - Better project estimates from efficiency data
   - Realistic timelines based on historical performance
   - Resource allocation based on actual capacity

3. **Increased Accountability**
   - Clear expectations for all employees
   - Transparent performance criteria
   - Fair evaluation process

4. **Early Problem Detection**
   - Spot performance issues before they escalate
   - Identify overworked teams
   - Catch estimation problems early

---

### For Managers

1. **Objective Feedback**
   - Data-backed performance reviews
   - Specific areas for improvement identified
   - No guesswork or bias

2. **Time Savings**
   - Automated score calculation
   - Weekly reports delivered automatically
   - Less time on manual tracking

3. **Team Insights**
   - Compare team members fairly
   - Identify skill gaps
   - Recognize high performers

4. **Better Coaching**
   - Focus 1-on-1s on specific metrics
   - Track improvement over time
   - Celebrate wins with data

---

### For Employees

1. **Clear Expectations**
   - Know exactly how you're measured
   - Understand what "good" looks like
   - No surprises in reviews

2. **Self-Improvement**
   - See your scores weekly
   - Identify weak areas yourself
   - Track your own progress

3. **Fair Recognition**
   - Hard work gets noticed
   - Objective rewards/bonuses
   - No favoritism

4. **Career Growth**
   - Build a performance history
   - Demonstrate improvement over time
   - Qualify for promotions with data

---

## 🔍 Score Interpretation Guide

### Score Ranges

| Score Range | Rating | Meaning | Action |
|-------------|--------|---------|--------|
| **90-100** | ⭐⭐⭐⭐⭐ Outstanding | Exceptional performer, exceeds all expectations | Recognize publicly, consider for promotion |
| **75-89** | ⭐⭐⭐⭐ Excellent | Strong performer, consistently meets expectations | Keep it up! Consider stretch goals |
| **60-74** | ⭐⭐⭐ Good | Solid performer, meets most expectations | Minor improvements needed |
| **45-59** | ⭐⭐ Fair | Below expectations, needs improvement | Schedule coaching session |
| **0-44** | ⭐ Poor | Significantly below expectations | Urgent intervention required |

---

## 📈 Example Score Calculation

Let's calculate a complete score for "John Doe" over the last 30 days:

### John's Data:
- 10 tasks total
- 7 completed (70% completion rate)
- 6 completed on-time, 1 late (85.7% timeliness)
- Estimated 50 hours total, logged 48 hours (96% accuracy = 100 efficiency score)
- 3 active tasks with average 55% progress
- Completed 2 high-priority, 3 medium-priority, 2 low-priority tasks

### Component Scores:

1. **Task Completion**: (7 ÷ 10) × 100 = **70.0**
2. **Timeliness**: (6 ÷ 7) × 100 = **85.7**
3. **Efficiency**: Ratio 0.96 (within 20%) = **100.0**
4. **Progress Quality**: Average 55% = **55.0**
5. **Priority Focus**: 
   - Completed weight: (2×3) + (3×2) + (2×1) = 6+6+2 = 14
   - Total weight: (3×3) + (4×2) + (3×1) = 9+8+3 = 20
   - Score: (14 ÷ 20) × 100 = **70.0**

### Final Score:
```
Overall Score = 
  (70.0 × 0.30) = 21.0 +
  (85.7 × 0.25) = 21.4 +
  (100.0 × 0.25) = 25.0 +
  (55.0 × 0.15) = 8.3 +
  (70.0 × 0.05) = 3.5
  
= 79.2 / 100 ⭐⭐⭐⭐ Excellent
```

**Interpretation:** John is a strong performer with excellent time estimation skills and good deadline adherence. He could improve by updating task progress more frequently and completing a higher percentage of assigned tasks.

---

## 🎓 Quick Reference: Excel Fields Required

To ensure accurate score calculation, your Excel imports must include:

| Excel Column Name | Used For | Required? |
|-------------------|----------|-----------|
| **Status** | Task Completion, Timeliness, Priority Focus | ✅ Yes |
| **Priority** | Priority Focus Score | ✅ Yes |
| **Due Date** | Timeliness Score | ✅ Yes |
| **Completion Date** | Timeliness Score | ✅ Yes |
| **Duration** (estimated hours) | Efficiency Score | ✅ Yes |
| **% Completed** (progress) | Progress Quality Score | ✅ Yes |
| **Work hours** (time logs) | Efficiency Score | ✅ Yes |
| **Created Date** | All components (30-day window) | ✅ Yes |
| **Assignee** / **Owner** | Linking tasks to employees | ✅ Yes |

---

## 📞 Support

If you have questions about:
- **How scores are calculated**: Review this guide
- **How to improve a specific component**: See the "Application Guidelines" section
- **Adjusting weight settings**: Contact your HR administrator
- **Data import issues**: Contact your system administrator

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**System:** AI Performance Mirror
