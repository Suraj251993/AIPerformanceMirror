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

#### 📚 Detailed Scenarios for Task Completion

**Scenario 1: The Overachiever**
- Sarah has 15 tasks assigned in the last 30 days
- She completed all 15 tasks
- Task Completion Score = (15 ÷ 15) × 100 = **100.0** ⭐⭐⭐⭐⭐
- Contribution to overall: 100.0 × 30% = **30.0 points** (maximum possible!)
- **Why it's excellent:** Perfect completion rate shows strong work ethic

**Scenario 2: The Shared Task Collaborator**
- Mike works on team projects with shared ownership
- Tasks in last 30 days:
  - Task A (100% ownership) - Completed ✅
  - Task B (50% ownership) - Completed ✅
  - Task C (50% ownership) - Completed ✅
  - Task D (25% ownership) - Not completed ❌
  - Task E (100% ownership) - Not completed ❌
- Calculation:
  - Completed weighted tasks: 1.0 + 0.5 + 0.5 = 2.0
  - Total weighted tasks: 1.0 + 0.5 + 0.5 + 0.25 + 1.0 = 3.25
  - Score = (2.0 ÷ 3.25) × 100 = **61.5**
- Contribution to overall: 61.5 × 30% = **18.5 points**
- **Interpretation:** Fair performance, but needs to complete more individual tasks

**Scenario 3: The New Employee**
- Lisa just started and has no tasks in the last 30 days
- Task Completion Score = **70.0** (default for new users)
- Contribution to overall: 70.0 × 30% = **21.0 points**
- **Why neutral:** System doesn't penalize new hires without task history

**Scenario 4: The Overwhelmed Employee**
- James has 20 tasks assigned
- Only completed 6 tasks (14 still in progress or to-do)
- Task Completion Score = (6 ÷ 20) × 100 = **30.0** ⚠️
- Contribution to overall: 30.0 × 30% = **9.0 points**
- **Red flag:** May be overloaded or need help prioritizing

**Scenario 5: The Selective Completer**
- Emma has 12 tasks, mixture of sizes
- Completed 9 small tasks, left 3 large ones incomplete
- Task Completion Score = (9 ÷ 12) × 100 = **75.0**
- Contribution to overall: 75.0 × 30% = **22.5 points**
- **Good performance:** Above average, but manager should check if large tasks need support

**Scenario 6: The Sprint Finisher**
- Carlos had a productive week at month-end
- Week 1-3: 3 tasks completed out of 8 (38%)
- Week 4: Completed remaining 5 tasks + 2 new ones (100% sprint finish)
- Total: 10 completed ÷ 10 assigned = **100.0**
- **Lesson:** Strong finish can recover from slow start within 30-day window

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

#### 📚 Detailed Scenarios for Timeliness

**Scenario 1: The Early Finisher**
- Rachel completed 10 tasks in the last 30 days
- All 10 were completed 2-5 days **before** their due dates
- Timeliness Score = (10 ÷ 10) × 100 = **100.0** ⭐⭐⭐⭐⭐
- Contribution to overall: 100.0 × 25% = **25.0 points** (maximum!)
- **Why it's excellent:** Consistently beating deadlines shows strong time management

**Scenario 2: The Just-in-Time Worker**
- David completed 8 tasks
- 7 completed on the exact due date (counts as on-time ✅)
- 1 completed 1 day late (counts as late ❌)
- Timeliness Score = (7 ÷ 8) × 100 = **87.5**
- Contribution to overall: 87.5 × 25% = **21.9 points**
- **Good performance:** Meeting deadlines, but no buffer for unexpected issues

**Scenario 3: The Chronic Late Submitter**
- Marcus completed 6 tasks
- 2 completed on-time
- 4 completed 3-7 days late
- Timeliness Score = (2 ÷ 6) × 100 = **33.3** ⚠️⚠️
- Contribution to overall: 33.3 × 25% = **8.3 points**
- **Major issue:** Needs coaching on time management or deadline negotiation

**Scenario 4: The Shared Deadline Team Player**
- Jennifer works on collaborative projects
- Completed tasks with shared ownership:
  - Task A (100% ownership) - On-time ✅
  - Task B (50% ownership) - On-time ✅
  - Task C (50% ownership) - Late by 2 days ❌
  - Task D (25% ownership) - On-time ✅
- Calculation:
  - On-time weighted: 1.0 + 0.5 + 0 + 0.25 = 1.75
  - Total weighted completed: 1.0 + 0.5 + 0.5 + 0.25 = 2.25
  - Score = (1.75 ÷ 2.25) × 100 = **77.8**
- Contribution to overall: 77.8 × 25% = **19.4 points**
- **Solid performance:** Mostly on-time, one team task slipped

**Scenario 5: The High-Stakes Deadline Juggler**
- Kevin completed 5 critical tasks
- All completed on-time, but some very close to deadline:
  - Task 1: Due Jan 15, completed Jan 14 (1 day early) ✅
  - Task 2: Due Jan 20, completed Jan 20 (same day) ✅
  - Task 3: Due Jan 25, completed Jan 23 (2 days early) ✅
  - Task 4: Due Jan 28, completed Jan 28 (same day) ✅
  - Task 5: Due Feb 1, completed Jan 30 (2 days early) ✅
- Timeliness Score = (5 ÷ 5) × 100 = **100.0**
- **Perfect score:** All deadlines met, regardless of buffer time

**Scenario 6: The No-Deadline Worker**
- Tina completed 12 tasks in last 30 days
- BUT: Excel import had blank due dates for all tasks
- Tasks without due dates are excluded from calculation
- No valid data → Timeliness Score = **70.0** (default)
- Contribution to overall: 70.0 × 25% = **17.5 points**
- **Action needed:** Manager should add due dates to future tasks

**Scenario 7: The Weekend Warrior**
- Alex has a mix of performance:
  - Week 1: Completed 2 tasks, both late (0% on-time)
  - Week 2: Completed 3 tasks, all on-time (100% on-time)
  - Week 3: Completed 4 tasks, 3 on-time (75% on-time)
  - Week 4: Completed 1 task, on-time (100% on-time)
- Overall: 8 on-time ÷ 10 total = **80.0%**
- Timeliness Score = **80.0**
- **Improving trend:** Started poorly, finished strong

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

#### 📚 Detailed Scenarios for Efficiency

**Scenario 1: The Perfect Estimator**
- Sophie's tasks over 30 days:
  - Estimated total: 100 hours
  - Actual logged: 102 hours
  - Ratio: 102 ÷ 100 = 1.02 (within 20% range)
- Efficiency Score = **100.0** ⭐⭐⭐⭐⭐ (Excellent!)
- Contribution to overall: 100.0 × 25% = **25.0 points**
- **Why it's excellent:** Near-perfect estimation accuracy builds manager trust

**Scenario 2: The Conservative Estimator (Over-Estimator)**
- Tom tends to pad his estimates:
  - Estimated total: 80 hours
  - Actual logged: 50 hours
  - Ratio: 50 ÷ 80 = 0.625 (in 0.6-1.5 range)
- Efficiency Score = **85.0** (Good)
- Contribution to overall: 85.0 × 25% = **21.3 points**
- **Interpretation:** Safe estimates, but may be assigned more work than capacity

**Scenario 3: The Optimistic Under-Estimator**
- Nina consistently underestimates:
  - Estimated total: 40 hours
  - Actual logged: 72 hours
  - Ratio: 72 ÷ 40 = 1.8 (in 0.4-2.0 range, but high)
- Efficiency Score = **65.0** ⚠️ (Fair)
- Contribution to overall: 65.0 × 25% = **16.3 points**
- **Warning:** Underestimating by 80% causes project delays

**Scenario 4: The Wildly Off Estimator**
- Derek has poor estimation skills:
  - Estimated total: 20 hours
  - Actual logged: 80 hours (4× over estimate!)
  - Ratio: 80 ÷ 20 = 4.0 (way outside 0.4-2.0 range)
- Efficiency Score = **40.0** ❌ (Poor)
- Contribution to overall: 40.0 × 25% = **10.0 points**
- **Critical issue:** Needs training on task breakdown and estimation

**Scenario 5: The Shared Task Precision Worker**
- Maria works on collaborative projects:
  - Task A (100% ownership): 10 hrs estimated, 9 hrs logged
  - Task B (50% ownership): 20 hrs estimated → 10 hrs weighted, 11 hrs logged
  - Task C (25% ownership): 40 hrs estimated → 10 hrs weighted, 9 hrs logged
  - Total weighted estimated: 10 + 10 + 10 = 30 hours
  - Total logged: 9 + 11 + 9 = 29 hours
  - Ratio: 29 ÷ 30 = 0.967
- Efficiency Score = **100.0** (Excellent!)
- **Shared tasks counted fairly:** Only her portion of work is measured

**Scenario 6: The Rusher (Too Fast)**
- Brian works very quickly but may cut corners:
  - Estimated total: 60 hours
  - Actual logged: 20 hours
  - Ratio: 20 ÷ 60 = 0.33 (outside 0.4-2.0 range)
- Efficiency Score = **40.0** ❌
- Contribution to overall: 40.0 × 25% = **10.0 points**
- **Red flag:** May be skipping important steps or quality checks

**Scenario 7: The No-Logging Employee**
- Chris completes tasks but never logs time:
  - Estimated total: 50 hours
  - Actual logged: 0 hours (forgot to track time!)
  - No time logs → Efficiency Score = **70.0** (default)
- Contribution to overall: 70.0 × 25% = **17.5 points**
- **Action needed:** Manager must emphasize time logging importance

**Scenario 8: The Improving Estimator**
- Olivia learns over time:
  - Week 1: 10 hrs estimated, 20 hrs logged (ratio 2.0) → Score: 65
  - Week 2: 15 hrs estimated, 18 hrs logged (ratio 1.2) → Score: 100
  - Week 3: 20 hrs estimated, 21 hrs logged (ratio 1.05) → Score: 100
  - Week 4: 15 hrs estimated, 14 hrs logged (ratio 0.93) → Score: 100
  - **30-day aggregate**: 60 hrs estimated, 73 hrs logged
  - Ratio: 73 ÷ 60 = 1.22 (just outside perfect 0.8-1.2, but in 0.6-1.5 range)
- Efficiency Score = **85.0** (Good, despite early struggles)
- **Positive trend:** Early mistakes averaged out by recent improvements

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

#### 📚 Detailed Scenarios for Progress Quality

**Scenario 1: The Diligent Tracker**
- Amanda has 6 active (in-progress) tasks:
  - Task A: 85% complete (nearly done)
  - Task B: 75% complete
  - Task C: 60% complete
  - Task D: 55% complete
  - Task E: 40% complete
  - Task F: 25% complete (just started)
- Average progress = (85+75+60+55+40+25) ÷ 6 = 56.7%
- Progress Quality Score = **56.7**
- Contribution to overall: 56.7 × 15% = **8.5 points**
- **Good practice:** Regular updates show work visibility

**Scenario 2: The All-Done Achiever**
- Robert has 0 active tasks (all 12 tasks from last 30 days are completed)
- No active tasks to average
- Progress Quality Score = **90.0** ⭐⭐⭐⭐⭐ (Reward for completing everything!)
- Contribution to overall: 90.0 × 15% = **13.5 points**
- **Why high score:** Completing all tasks is better than having many in-progress

**Scenario 3: The Stale Progress Updater**
- Gary has 8 active tasks but never updates progress:
  - All 8 tasks stuck at 0% (default when created)
  - Average progress = 0%
- Progress Quality Score = **0.0** ❌❌❌
- Contribution to overall: 0.0 × 15% = **0.0 points**
- **Critical issue:** Tasks appear abandoned, manager has no visibility

**Scenario 4: The Optimistic Progress Reporter**
- Linda inflates her progress percentages:
  - Task A: 90% complete (actually maybe 60% done)
  - Task B: 85% complete (actually maybe 50% done)
  - Task C: 80% complete (actually maybe 40% done)
  - Task D: 75% complete (actually maybe 30% done)
- Average = (90+85+80+75) ÷ 4 = 82.5%
- Progress Quality Score = **82.5** (looks great!)
- **BUT**: Manager validation will catch discrepancies and hurt trust
- **Best practice:** Be honest with progress to maintain credibility

**Scenario 5: The Shared Task Progress Champion**
- Paul works collaboratively with transparent updates:
  - Task A (100% ownership): 70% complete
  - Task B (50% ownership): 60% complete
  - Task C (50% ownership): 40% complete
  - Task D (25% ownership): 80% complete
- Weighted calculation:
  - Total progress: (70×1.0) + (60×0.5) + (40×0.5) + (80×0.25) = 70+30+20+20 = 140
  - Total weight: 1.0 + 0.5 + 0.5 + 0.25 = 2.25
  - Average = 140 ÷ 2.25 = 62.2%
- Progress Quality Score = **62.2**
- **Collaborative transparency:** Shared tasks weighted fairly

**Scenario 6: The New User with No History**
- Emily just joined and has no tasks assigned yet
- No active tasks, no completed tasks
- Progress Quality Score = **70.0** (neutral default)
- Contribution to overall: 70.0 × 15% = **10.5 points**
- **Fair treatment:** New hires not penalized

**Scenario 7: The Inconsistent Updater**
- Mark updates progress sporadically:
  - Task A: Updated yesterday to 65%
  - Task B: Last updated 3 weeks ago, still at 10% (but probably 60% done)
  - Task C: Updated today to 50%
  - Task D: Never updated, still 0% (but 30% done)
  - Task E: Updated weekly, at 40%
- Recorded average = (65+10+50+0+40) ÷ 5 = 33%
- Progress Quality Score = **33.0** ⚠️
- **Reality**: Actual progress is ~50%, but poor tracking habits hurt score
- **Lesson:** Update progress weekly to maintain accurate scores

**Scenario 8: The Sprint Starter**
- Jessica just received 10 new tasks this week (in 30-day window):
  - All tasks are brand new (Day 1-3 of work)
  - Progress on all: 5%, 10%, 8%, 12%, 5%, 15%, 10%, 8%, 10%, 7%
- Average = 90 ÷ 10 = 9%
- Progress Quality Score = **9.0** (very low)
- **Is this bad?** No! Tasks are legitimately new
- **30-day rolling window helps:** As tasks progress, score improves naturally
- **Manager's view:** Context matters - new tasks vs. stalled old tasks

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
