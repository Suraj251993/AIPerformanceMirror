import { db } from './db.js';
import { users, tasks, timeLogs, feedback, scores, sprints, sprintItems } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { SyncService } from './syncService.js';

export interface ScoreComponents {
  taskCompletion: number;
  timeliness: number;
  efficiency: number;
  velocity: number;
  collaboration: number;
  weights: {
    taskCompletion: number;
    timeliness: number;
    efficiency: number;
    velocity: number;
    collaboration: number;
  };
}

export class ScoringEngine {
  /**
   * Calculate sprint velocity score for a user based on real sprint data
   */
  static async calculateVelocityScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const userSprintItems = await db
      .select()
      .from(sprintItems)
      .innerJoin(sprints, eq(sprintItems.sprintId, sprints.id))
      .where(
        and(
          eq(sprintItems.assigneeId, userId),
          gte(sprints.startDate, startDateStr),
          lte(sprints.endDate, endDateStr),
          eq(sprintItems.status, 'completed')
        )
      );

    if (userSprintItems.length === 0) {
      return 75;
    }

    const totalStoryPoints = userSprintItems.reduce(
      (sum, item) => sum + (item.sprint_items.storyPoints || 0),
      0
    );

    const activeSprints = await db
      .select()
      .from(sprints)
      .where(
        and(
          gte(sprints.startDate, startDateStr),
          lte(sprints.endDate, endDateStr),
          eq(sprints.status, 'completed')
        )
      );

    const sprintsCount = activeSprints.length || 1;
    const averageVelocity = totalStoryPoints / sprintsCount;

    const velocityScore = Math.min(100, (averageVelocity / 20) * 100);

    return Math.max(0, velocityScore);
  }

  /**
   * Calculate task completion score
   */
  static async calculateTaskCompletionScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const userTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    if (userTasks.length === 0) return 75;

    const completedTasks = userTasks.filter(t => t.status === 'completed').length;
    return (completedTasks / userTasks.length) * 100;
  }

  /**
   * Calculate timeliness score (on-time task completion)
   */
  static async calculateTimelinessScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const completedTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          eq(tasks.status, 'completed'),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    if (completedTasks.length === 0) return 75;

    const onTimeTasks = completedTasks.filter(
      t => t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate)
    ).length;

    return (onTimeTasks / completedTasks.length) * 100;
  }

  /**
   * Calculate efficiency score (time logged vs estimated)
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
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate)
        )
      );

    if (userTasks.length === 0) return 80;

    const totalEstimated = userTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) * 60;
    const totalLogged = userTimeLogs.reduce((sum, tl) => sum + tl.minutes, 0);

    if (totalEstimated === 0 || totalLogged === 0) return 80;

    const efficiency = (totalEstimated / totalLogged) * 100;
    return Math.min(100, Math.max(0, efficiency));
  }

  /**
   * Calculate collaboration score based on activity
   */
  static async calculateCollaborationScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
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

    const collaborationScore = Math.min(100, userTimeLogs.length * 5);
    return Math.max(0, collaborationScore);
  }


  /**
   * Calculate comprehensive performance score for a user
   */
  static async calculateUserScore(userId: string, date: Date = new Date()): Promise<{
    scoreValue: number;
    components: ScoreComponents;
  }> {
    const endDate = new Date(date);
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 30);

    const weightSettings = await SyncService.getSyncSettings('scoring_weights');
    const weights = weightSettings || {
      taskCompletion: 35,
      timeliness: 25,
      efficiency: 15,
      velocity: 20,
      collaboration: 5,
    };

    const normalizedWeights = {
      taskCompletion: weights.taskCompletion / 100,
      timeliness: weights.timeliness / 100,
      efficiency: weights.efficiency / 100,
      velocity: weights.velocity / 100,
      collaboration: weights.collaboration / 100,
    };

    const [
      taskCompletion,
      timeliness,
      efficiency,
      velocity,
      collaboration,
    ] = await Promise.all([
      this.calculateTaskCompletionScore(userId, startDate, endDate),
      this.calculateTimelinessScore(userId, startDate, endDate),
      this.calculateEfficiencyScore(userId, startDate, endDate),
      this.calculateVelocityScore(userId, startDate, endDate),
      this.calculateCollaborationScore(userId, startDate, endDate),
    ]);

    const components: ScoreComponents = {
      taskCompletion,
      timeliness,
      efficiency,
      velocity,
      collaboration,
      weights: normalizedWeights,
    };

    const scoreValue =
      components.taskCompletion * normalizedWeights.taskCompletion +
      components.timeliness * normalizedWeights.timeliness +
      components.efficiency * normalizedWeights.efficiency +
      components.velocity * normalizedWeights.velocity +
      components.collaboration * normalizedWeights.collaboration;

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
