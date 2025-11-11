import {
  users,
  projects,
  tasks,
  timeLogs,
  activityEvents,
  feedback,
  scores,
  auditLogs,
  sprints,
  sprintItems,
  reportSubscriptions,
  reportDeliveryLog,
  type User,
  type UpsertUser,
  type Project,
  type Task,
  type TimeLog,
  type ActivityEvent,
  type Feedback,
  type InsertFeedback,
  type Score,
  type AuditLog,
  type Sprint,
  type SprintItem,
  type ReportSubscription,
  type ReportDelivery,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByManager(managerId: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  
  // Project operations
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  upsertProject(project: { id: string; name: string; description: string; status: string }): Promise<Project>;
  
  // Task operations
  getTasksByAssignee(assigneeId: string): Promise<Task[]>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  upsertTask(task: { id: string; projectId: string; title: string; description: string; assigneeId: string; status: string; priority: string; dueDate?: Date; completedAt?: Date }): Promise<Task>;
  
  // Time log operations
  getTimeLogsByUser(userId: string): Promise<TimeLog[]>;
  getTimeLogsByTask(taskId: string): Promise<TimeLog[]>;
  
  // Activity operations
  getActivitiesByUser(userId: string, limit?: number): Promise<ActivityEvent[]>;
  
  // Feedback operations
  createFeedback(feedbackData: InsertFeedback): Promise<Feedback>;
  getFeedbackByRecipient(userId: string): Promise<Feedback[]>;
  
  // Score operations
  getLatestScoreByUser(userId: string): Promise<Score | undefined>;
  getScoresByUser(userId: string): Promise<Score[]>;
  
  // Audit log operations
  createAuditLog(log: { userId: string; action: string; target: string; details?: any }): Promise<AuditLog>;
  
  // Sprint operations
  getAllSprints(): Promise<Sprint[]>;
  getSprint(id: string): Promise<Sprint | undefined>;
  getSprintsByTeam(teamId: string): Promise<Sprint[]>;
  upsertSprint(sprint: { id: string; teamId: string; name: string; startDate: Date; endDate: Date; status: string; totalStoryPoints: number; completedStoryPoints: number; velocityTarget?: number }): Promise<Sprint>;
  
  // Sprint item operations
  getSprintItemsBySprint(sprintId: string): Promise<SprintItem[]>;
  getSprintItemsByAssignee(assigneeId: string): Promise<SprintItem[]>;
  upsertSprintItem(item: { id: string; sprintId?: string; projectId?: string; title: string; description: string; itemType: string; status: string; priority: string; storyPoints?: number; assigneeId?: string }): Promise<SprintItem>;
  
  // Email report operations
  getReportSubscription(userId: string): Promise<{ dailyEnabled: boolean; weeklyEnabled: boolean } | undefined>;
  upsertReportSubscription(userId: string, settings: { dailyEnabled: boolean; weeklyEnabled: boolean }): Promise<{ dailyEnabled: boolean; weeklyEnabled: boolean }>;
  getReportDeliveryLog(userId: string, limit?: number): Promise<ReportDelivery[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Exclude id from the update to avoid foreign key violations
    const { id, ...updateData } = userData;
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  async getUsersByManager(managerId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.managerId, managerId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Project operations
  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async upsertProject(projectData: { id: string; name: string; description: string; status: string }): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(projectData)
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          ...projectData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return project;
  }

  // Task operations
  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assigneeId, assigneeId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async upsertTask(taskData: { id: string; projectId: string; title: string; description: string; assigneeId: string; status: string; priority: string; dueDate?: Date; completedAt?: Date }): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(taskData)
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          ...taskData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return task;
  }

  // Time log operations
  async getTimeLogsByUser(userId: string): Promise<TimeLog[]> {
    return await db.select().from(timeLogs).where(eq(timeLogs.userId, userId)).orderBy(desc(timeLogs.loggedAt));
  }

  async getTimeLogsByTask(taskId: string): Promise<TimeLog[]> {
    return await db.select().from(timeLogs).where(eq(timeLogs.taskId, taskId));
  }

  // Activity operations
  async getActivitiesByUser(userId: string, limit: number = 20): Promise<ActivityEvent[]> {
    return await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.userId, userId))
      .orderBy(desc(activityEvents.eventTime))
      .limit(limit);
  }

  // Feedback operations
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  async getFeedbackByRecipient(userId: string): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.toUserId, userId))
      .orderBy(desc(feedback.createdAt));
  }

  // Score operations
  async getLatestScoreByUser(userId: string): Promise<Score | undefined> {
    const [score] = await db
      .select()
      .from(scores)
      .where(eq(scores.userId, userId))
      .orderBy(desc(scores.createdAt))
      .limit(1);
    return score;
  }

  async getScoresByUser(userId: string): Promise<Score[]> {
    return await db
      .select()
      .from(scores)
      .where(eq(scores.userId, userId))
      .orderBy(desc(scores.createdAt));
  }

  // Audit log operations
  async createAuditLog(logData: { userId: string; action: string; target: string; details?: any }): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }

  // Sprint operations
  async getAllSprints(): Promise<Sprint[]> {
    return await db.select().from(sprints);
  }

  async getSprint(id: string): Promise<Sprint | undefined> {
    const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id));
    return sprint;
  }

  async getSprintsByTeam(teamId: string): Promise<Sprint[]> {
    return await db.select().from(sprints).where(eq(sprints.teamId, teamId)).orderBy(desc(sprints.startDate));
  }

  async upsertSprint(sprintData: { id: string; teamId: string; name: string; startDate: Date; endDate: Date; status: string; totalStoryPoints: number; completedStoryPoints: number; velocityTarget?: number }): Promise<Sprint> {
    const [sprint] = await db
      .insert(sprints)
      .values(sprintData)
      .onConflictDoUpdate({
        target: sprints.id,
        set: {
          ...sprintData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return sprint;
  }

  // Sprint item operations
  async getSprintItemsBySprint(sprintId: string): Promise<SprintItem[]> {
    return await db.select().from(sprintItems).where(eq(sprintItems.sprintId, sprintId));
  }

  async getSprintItemsByAssignee(assigneeId: string): Promise<SprintItem[]> {
    return await db.select().from(sprintItems).where(eq(sprintItems.assigneeId, assigneeId)).orderBy(desc(sprintItems.createdAt));
  }

  async upsertSprintItem(itemData: { id: string; sprintId?: string; projectId?: string; title: string; description: string; itemType: string; status: string; priority: string; storyPoints?: number; assigneeId?: string }): Promise<SprintItem> {
    const [item] = await db
      .insert(sprintItems)
      .values(itemData)
      .onConflictDoUpdate({
        target: sprintItems.id,
        set: {
          ...itemData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return item;
  }

  // Email report operations
  async getReportSubscription(userId: string): Promise<{ dailyEnabled: boolean; weeklyEnabled: boolean } | undefined> {
    const subscriptions = await db
      .select()
      .from(reportSubscriptions)
      .where(eq(reportSubscriptions.userId, userId));

    if (subscriptions.length === 0) {
      return undefined;
    }

    const dailySub = subscriptions.find(s => s.reportType === 'daily');
    const weeklySub = subscriptions.find(s => s.reportType === 'weekly');

    return {
      dailyEnabled: dailySub?.enabled === 1,
      weeklyEnabled: weeklySub?.enabled === 1,
    };
  }

  async upsertReportSubscription(userId: string, settings: { dailyEnabled: boolean; weeklyEnabled: boolean }): Promise<{ dailyEnabled: boolean; weeklyEnabled: boolean }> {
    // Upsert daily subscription
    await db
      .insert(reportSubscriptions)
      .values({
        userId,
        reportType: 'daily',
        frequency: 'daily',
        enabled: settings.dailyEnabled ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [reportSubscriptions.userId, reportSubscriptions.reportType],
        set: {
          enabled: settings.dailyEnabled ? 1 : 0,
          updatedAt: new Date(),
        },
      });

    // Upsert weekly subscription
    await db
      .insert(reportSubscriptions)
      .values({
        userId,
        reportType: 'weekly',
        frequency: 'weekly',
        enabled: settings.weeklyEnabled ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [reportSubscriptions.userId, reportSubscriptions.reportType],
        set: {
          enabled: settings.weeklyEnabled ? 1 : 0,
          updatedAt: new Date(),
        },
      });

    return settings;
  }

  async getReportDeliveryLog(userId: string, limit: number = 50): Promise<ReportDelivery[]> {
    // First, get all subscriptions for this user
    const userSubscriptions = await db
      .select({ id: reportSubscriptions.id })
      .from(reportSubscriptions)
      .where(eq(reportSubscriptions.userId, userId));

    if (userSubscriptions.length === 0) {
      return [];
    }

    const subscriptionIds = userSubscriptions.map(s => s.id);

    // Get delivery logs for user's subscriptions
    const logs = await db
      .select()
      .from(reportDeliveryLog)
      .where(sql`${reportDeliveryLog.subscriptionId} = ANY(${subscriptionIds})`)
      .orderBy(desc(reportDeliveryLog.sentAt))
      .limit(limit);

    return logs;
  }
}

export const storage = new DatabaseStorage();
