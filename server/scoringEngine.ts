import { db } from './db.js';
import { users, tasks, timeLogs, scores, taskOwners } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { SyncService } from './syncService.js';

/**
 * Excel-Based Performance Scoring System
 * All metrics derived from imported Excel data fields only
 */
export interface ScoreComponents {
  taskCompletion: number;      // % of tasks marked as completed (status field)
  timeliness: number;           // % completed before due date (due_date vs completed_at)
  efficiency: number;           // Actual vs estimated hours accuracy (work hours vs duration)
  progressQuality: number;      // Average progress % on active tasks (progress_percentage field)
  priorityFocus: number;        // Weighted completion by priority (priority field)
  weights: {
    taskCompletion: number;
    timeliness: number;
    efficiency: number;
    progressQuality: number;
    priorityFocus: number;
  };
}

export class ScoringEngine {
  /**
   * Calculate task completion score (supports multi-owner tasks)
   * Uses: status field from Excel ('Done', 'Completed', etc.)
   */
  static async calculateTaskCompletionScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const ownedTasks = await db
      .select({
        task: tasks,
        ownership: taskOwners,
      })
      .from(taskOwners)
      .innerJoin(tasks, eq(taskOwners.taskId, tasks.id))
      .where(
        and(
          eq(taskOwners.userId, userId),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    if (ownedTasks.length === 0) return 70;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const { task, ownership } of ownedTasks) {
      const shareWeight = (ownership.sharePercentage || 100) / 100;
      // Excel uses 'Done' or 'Completed' status
      const isCompleted = (task.status === 'completed' || task.status === 'Done') ? 1 : 0;
      
      totalWeightedScore += isCompleted * shareWeight;
      totalWeight += shareWeight;
    }

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 70;
  }

  /**
   * Calculate timeliness score (on-time task completion, supports multi-owner tasks)
   * Uses: due_date and completed_at fields from Excel (Completion Date vs Due Date)
   */
  static async calculateTimelinessScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const completedTasks = await db
      .select({
        task: tasks,
        ownership: taskOwners,
      })
      .from(taskOwners)
      .innerJoin(tasks, eq(taskOwners.taskId, tasks.id))
      .where(
        and(
          eq(taskOwners.userId, userId),
          sql`${tasks.status} IN ('completed', 'Done')`,
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    if (completedTasks.length === 0) return 70;

    let totalWeightedOnTime = 0;
    let totalWeight = 0;

    for (const { task, ownership } of completedTasks) {
      if (!task.completedAt || !task.dueDate) continue;
      
      const shareWeight = (ownership.sharePercentage || 100) / 100;
      const isOnTime = new Date(task.completedAt) <= new Date(task.dueDate) ? 1 : 0;
      
      totalWeightedOnTime += isOnTime * shareWeight;
      totalWeight += shareWeight;
    }

    return totalWeight > 0 ? (totalWeightedOnTime / totalWeight) * 100 : 70;
  }

  /**
   * Calculate efficiency score (actual vs estimated hours accuracy)
   * Uses: estimated_hours (Duration) and time_logs (Work hours) from Excel
   * Optimal score when actual hours closely match estimated (ratio near 1.0)
   */
  static async calculateEfficiencyScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const userTimeLogs = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.userId, userId),
          gte(timeLogs.loggedAt, startDate),
          lte(timeLogs.loggedAt, endDate)
        )
      );

    const userTasks = await db
      .select({
        task: tasks,
        ownership: taskOwners,
      })
      .from(taskOwners)
      .innerJoin(tasks, eq(taskOwners.taskId, tasks.id))
      .where(
        and(
          eq(taskOwners.userId, userId),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    if (userTasks.length === 0 || userTimeLogs.length === 0) return 70;

    // Calculate weighted estimated hours based on ownership share
    const totalEstimatedMinutes = userTasks.reduce(
      (sum, { task, ownership }) => {
        const shareWeight = (ownership.sharePercentage || 100) / 100;
        return sum + ((task.estimatedHours || 0) * 60 * shareWeight);
      },
      0
    );
    
    const totalLoggedMinutes = userTimeLogs.reduce((sum, tl) => sum + tl.minutes, 0);

    if (totalEstimatedMinutes === 0 || totalLoggedMinutes === 0) return 70;

    // Calculate ratio: closer to 1.0 is better (accurate estimation)
    const ratio = totalLoggedMinutes / totalEstimatedMinutes;
    
    // Score peaks at 100 when ratio is 1.0, decreases as it deviates
    // Range: 0.5-1.5 gives decent scores, beyond that penalties increase
    let efficiencyScore: number;
    if (ratio >= 0.8 && ratio <= 1.2) {
      efficiencyScore = 100; // Excellent: within 20% of estimate
    } else if (ratio >= 0.6 && ratio <= 1.5) {
      efficiencyScore = 85; // Good: within reasonable range
    } else if (ratio >= 0.4 && ratio <= 2.0) {
      efficiencyScore = 65; // Fair: some deviation
    } else {
      efficiencyScore = 40; // Poor: significant deviation
    }

    return efficiencyScore;
  }

  /**
   * Calculate progress quality score (how well users maintain task progress tracking)
   * Uses: progress_percentage field from Excel (% Completed)
   * Higher average progress on active tasks = better score
   */
  static async calculateProgressQualityScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const activeTasks = await db
      .select({
        task: tasks,
        ownership: taskOwners,
      })
      .from(taskOwners)
      .innerJoin(tasks, eq(taskOwners.taskId, tasks.id))
      .where(
        and(
          eq(taskOwners.userId, userId),
          sql`${tasks.status} NOT IN ('completed', 'Done')`, // Active tasks only
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    if (activeTasks.length === 0) {
      // No active tasks means either all completed (good) or no tasks (neutral)
      const anyTasks = await db
        .select({ count: sql<number>`count(*)` })
        .from(taskOwners)
        .where(eq(taskOwners.userId, userId));
      
      return anyTasks[0]?.count > 0 ? 90 : 70; // 90 if has completed tasks, 70 if new user
    }

    let totalWeightedProgress = 0;
    let totalWeight = 0;

    for (const { task, ownership } of activeTasks) {
      const shareWeight = (ownership.sharePercentage || 100) / 100;
      const progress = task.progressPercentage || 0;
      
      totalWeightedProgress += progress * shareWeight;
      totalWeight += shareWeight;
    }

    const avgProgress = totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
    
    // Convert average progress (0-100%) directly to score
    // Active tasks with high progress indicate good tracking
    return Math.min(100, Math.max(0, avgProgress));
  }

  /**
   * Calculate priority focus score (weighted completion by task priority)
   * Uses: priority field from Excel ('High', 'Medium', 'Low')
   * Completing high-priority tasks weighs more than low-priority
   */
  static async calculatePriorityFocusScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const ownedTasks = await db
      .select({
        task: tasks,
        ownership: taskOwners,
      })
      .from(taskOwners)
      .innerJoin(tasks, eq(taskOwners.taskId, tasks.id))
      .where(
        and(
          eq(taskOwners.userId, userId),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    if (ownedTasks.length === 0) return 70;

    // Priority weights: High = 3x, Medium = 2x, Low = 1x
    const getPriorityWeight = (priority: string | null): number => {
      if (!priority) return 1;
      const p = priority.toLowerCase();
      if (p === 'high') return 3;
      if (p === 'medium') return 2;
      return 1; // Low or unspecified
    };

    let totalWeightedScore = 0;
    let totalMaxPossible = 0;

    for (const { task, ownership } of ownedTasks) {
      const shareWeight = (ownership.sharePercentage || 100) / 100;
      const priorityWeight = getPriorityWeight(task.priority);
      const isCompleted = (task.status === 'completed' || task.status === 'Done') ? 1 : 0;
      
      totalWeightedScore += isCompleted * priorityWeight * shareWeight;
      totalMaxPossible += priorityWeight * shareWeight;
    }

    return totalMaxPossible > 0 
      ? (totalWeightedScore / totalMaxPossible) * 100 
      : 70;
  }


  /**
   * Calculate comprehensive performance score for a user
   * Uses only Excel-based metrics derived from imported data
   */
  static async calculateUserScore(userId: string, date: Date = new Date()): Promise<{
    scoreValue: number;
    components: ScoreComponents;
  }> {
    const endDate = new Date(date);
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 30);

    // New Excel-based weight distribution
    const weightSettings = await SyncService.getSyncSettings('scoring_weights');
    const weights = weightSettings || {
      taskCompletion: 30,     // Excel: Status field
      timeliness: 25,         // Excel: Completion Date vs Due Date
      efficiency: 25,         // Excel: Work hours vs Duration
      progressQuality: 15,    // Excel: % Completed on active tasks
      priorityFocus: 5,       // Excel: Priority field (High/Medium/Low)
    };

    const normalizedWeights = {
      taskCompletion: weights.taskCompletion / 100,
      timeliness: weights.timeliness / 100,
      efficiency: weights.efficiency / 100,
      progressQuality: weights.progressQuality / 100,
      priorityFocus: weights.priorityFocus / 100,
    };

    const [
      taskCompletion,
      timeliness,
      efficiency,
      progressQuality,
      priorityFocus,
    ] = await Promise.all([
      this.calculateTaskCompletionScore(userId, startDate, endDate),
      this.calculateTimelinessScore(userId, startDate, endDate),
      this.calculateEfficiencyScore(userId, startDate, endDate),
      this.calculateProgressQualityScore(userId, startDate, endDate),
      this.calculatePriorityFocusScore(userId, startDate, endDate),
    ]);

    const components: ScoreComponents = {
      taskCompletion,
      timeliness,
      efficiency,
      progressQuality,
      priorityFocus,
      weights: normalizedWeights,
    };

    const scoreValue =
      components.taskCompletion * normalizedWeights.taskCompletion +
      components.timeliness * normalizedWeights.timeliness +
      components.efficiency * normalizedWeights.efficiency +
      components.progressQuality * normalizedWeights.progressQuality +
      components.priorityFocus * normalizedWeights.priorityFocus;

    return {
      scoreValue: Math.min(100, Math.max(0, scoreValue)),
      components,
    };
  }

  /**
   * Generate and store scores for all employees
   */
  static async generateAllScores(): Promise<void> {
    const allEmployees = await db
      .select()
      .from(users)
      .where(eq(users.role, 'EMPLOYEE' as any));

    const today = new Date().toISOString().split('T')[0];

    for (const employee of allEmployees) {
      const { scoreValue, components } = await this.calculateUserScore(employee.id);

      await db
        .insert(scores)
        .values({
          userId: employee.id,
          date: today,
          scoreValue,
          components,
        })
        .onConflictDoNothing();
    }
  }
}
