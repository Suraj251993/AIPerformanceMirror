# 📊 Performance Score Calculation Logic

## How Your AI Performance Mirror Calculates Employee Scores

---

## **Final Score Formula**

```
Final Score = (Efficiency × 25%) + (Timeliness × 25%) + (Priority Focus × 5%) + 
              (Task Completion × 30%) + (Progress Quality × 15%)
```

**Example from your screenshot:**
- Efficiency: 40.0 × 25% = 10.0
- Timeliness: 62.7 × 25% = 15.7
- Priority Focus: 21.4 × 5% = 1.1
- Task Completion: 14.1 × 30% = 4.2
- Progress Quality: 46.0 × 15% = 6.9
- **Total = 37.9/100**

---

## **How Each Component is Calculated** (Last 30 Days)

### 1️⃣ **Task Completion (30% weight)**
**What it measures:** What percentage of assigned tasks are actually completed?

**Calculation:**
```
Task Completion = (Completed Tasks ÷ Total Tasks) × 100

Example:
- Total tasks: 10
- Completed tasks: 3
- Score: (3 ÷ 10) × 100 = 30%
```

**Key Details:**
- ✅ Counts tasks with status "Done" or "Completed"
- Looks at tasks from last 30 days
- For shared tasks, uses ownership percentage (e.g., 50% ownership = 0.5 weight)
- Default score if no tasks: 70

---

### 2️⃣ **Timeliness (25% weight)**
**What it measures:** Are tasks completed before their due dates?

**Calculation:**
```
Timeliness = (On-Time Completions ÷ Total Completed Tasks) × 100

Example:
- Completed tasks: 10
- Completed on time: 8
- Score: (8 ÷ 10) × 100 = 80%
```

**Key Details:**
- ✅ Only counts completed tasks with both due date and completion date
- On-time = Completed Date ≤ Due Date
- Late completion = 0 points for that task
- Default score if no completed tasks: 70

---

### 3️⃣ **Efficiency (25% weight)**
**What it measures:** How accurate are time estimates vs. actual work hours?

**Calculation:**
```
Ratio = Actual Hours ÷ Estimated Hours

Scoring:
- If ratio 0.8-1.2 (within 20%): Score = 100 (Excellent)
- If ratio 0.6-1.5 (within 50%): Score = 85 (Good)
- If ratio 0.4-2.0 (within 100%): Score = 65 (Fair)
- Otherwise: Score = 40 (Poor)

Example:
- Estimated: 10 hours
- Actual: 9 hours
- Ratio: 9 ÷ 10 = 0.9 (within 0.8-1.2 range)
- Score: 100
```

**Key Details:**
- Uses time logs (work hours) vs. task estimated hours
- Perfect score when actual matches estimate (not when it's faster!)
- Going too fast OR too slow = lower score (means poor estimation)
- Default score if no time logs: 70

---

### 4️⃣ **Progress Quality (15% weight)**
**What it measures:** How well are active tasks being tracked and progressed?

**Calculation:**
```
Progress Quality = Average Progress % of Active Tasks

Example:
- Active Task 1: 80% complete
- Active Task 2: 60% complete
- Active Task 3: 40% complete
- Score: (80 + 60 + 40) ÷ 3 = 60%
```

**Key Details:**
- ✅ Only looks at **active** (not completed) tasks
- Uses the progress percentage field from Excel
- Higher average = better tracking discipline
- If no active tasks (all completed): Score = 90 (excellent!)
- Default for new users: 70

---

### 5️⃣ **Priority Focus (5% weight)**
**What it measures:** Are high-priority tasks being completed first?

**Calculation:**
```
Priority Weights:
- High priority = 3 points
- Medium priority = 2 points
- Low priority = 1 point

Priority Focus = (Completed Priority Points ÷ Total Priority Points) × 100

Example:
Tasks assigned:
- 2 High priority (1 completed, 1 not) = 3 points earned out of 6
- 3 Medium priority (2 completed, 1 not) = 4 points earned out of 6
- 5 Low priority (3 completed, 2 not) = 3 points earned out of 5

Score: (3 + 4 + 3) ÷ (6 + 6 + 5) × 100 = 58.8%
```

**Key Details:**
- Rewards completing high-priority tasks
- Completing 1 high-priority task = 3× more valuable than 1 low-priority
- Default score if no tasks: 70

---

## **Default Scores (When No Data)**

All components use a **default score of 70** when there's insufficient data:
- New employees with no tasks yet
- No time logs recorded
- No completed tasks in period

This prevents unfair penalization for new users or missing data.

---

## **Weight Configuration**

The weights can be customized via sync settings:

| Component | Default Weight | Adjustable |
|-----------|---------------|------------|
| **Task Completion** | 30% | ✅ Yes |
| **Timeliness** | 25% | ✅ Yes |
| **Efficiency** | 25% | ✅ Yes |
| **Progress Quality** | 15% | ✅ Yes |
| **Priority Focus** | 5% | ✅ Yes |

Weights must total 100%.

---

## **Example Full Calculation**

**Employee: John Doe (Last 30 days)**

**Tasks:**
- Total tasks: 20
- Completed: 15 (75%)
- On-time: 12 out of 15 (80%)
- High priority completed: 2/3
- Medium priority completed: 8/10
- Low priority completed: 5/7

**Time Tracking:**
- Estimated hours: 100
- Actual hours: 95
- Ratio: 0.95 (within 0.8-1.2)

**Active Tasks Progress:**
- 5 active tasks with average 65% progress

**Component Scores:**

1. **Task Completion**: 75.0
   - (15 ÷ 20) × 100 = 75%

2. **Timeliness**: 80.0
   - (12 ÷ 15) × 100 = 80%

3. **Efficiency**: 100.0
   - Ratio 0.95 is within 0.8-1.2 range

4. **Progress Quality**: 65.0
   - Average of active task progress

5. **Priority Focus**: 66.7
   - High: 2/3 × 3 = 6 points out of 9
   - Medium: 8/10 × 2 = 16 points out of 20
   - Low: 5/7 × 1 = 5 points out of 7
   - Total: 27 out of 36 = 75%

**Final Score:**
```
= (75.0 × 0.30) + (80.0 × 0.25) + (100.0 × 0.25) + (65.0 × 0.15) + (66.7 × 0.05)
= 22.5 + 20.0 + 25.0 + 9.75 + 3.33
= 80.58/100
```

**Rating: Good Performance** 🟢

---

## **Key Insights**

✅ **Fair for all roles**: Default scores prevent penalizing new employees

✅ **Multi-owner support**: Tasks shared between employees are weighted by ownership %

✅ **30-day rolling window**: Always uses last 30 days for current performance

✅ **Balanced scoring**: No single metric dominates (largest weight is 30%)

✅ **Quality over speed**: Efficiency rewards accuracy, not just fast completion

✅ **Manager validation**: Task progress can be adjusted by managers for accuracy

---

**Generated:** November 11, 2025  
**File:** server/scoringEngine.ts
