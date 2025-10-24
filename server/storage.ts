import {
  users,
  projects,
  tasks,
  timeLogs,
  activityEvents,
  feedback,
  scores,
  auditLogs,
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getUsersByManager(managerId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.managerId, managerId));
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
      .orderBy(desc(scores.date))
      .limit(1);
    return score;
  }

  async getScoresByUser(userId: string): Promise<Score[]> {
    return await db
      .select()
      .from(scores)
      .where(eq(scores.userId, userId))
      .orderBy(desc(scores.date));
  }

  // Audit log operations
  async createAuditLog(logData: { userId: string; action: string; target: string; details?: any }): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
