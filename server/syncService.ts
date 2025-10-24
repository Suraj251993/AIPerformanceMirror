import { db } from './db.js';
import { createZohoApiClient } from './zohoApi.js';
import { storage } from './storage.js';
import { syncLogs, syncSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  errors: Array<{ message: string; details?: any }>;
  duration: number;
}

export class SyncService {
  private userId: string;
  private portalId: string;

  constructor(userId: string, portalId: string) {
    this.userId = userId;
    this.portalId = portalId;
  }

  async syncProjects(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: Array<{ message: string; details?: any }> = [];
    let itemsProcessed = 0;

    const [logEntry] = await db
      .insert(syncLogs)
      .values({
        syncType: 'projects',
        status: 'running',
        itemsProcessed: 0,
      })
      .returning();

    try {
      const zohoClient = createZohoApiClient(this.userId);
      const projects = await zohoClient.getProjects(this.portalId);

      for (const project of projects) {
        try {
          await storage.upsertProject({
            id: project.id,
            name: project.name,
            description: project.description || '',
            status: project.status.toLowerCase(),
          });
          itemsProcessed++;
        } catch (error: any) {
          errors.push({
            message: `Failed to sync project ${project.id}`,
            details: error.message,
          });
        }
      }

      await db
        .update(syncLogs)
        .set({
          status: errors.length > 0 ? 'partial_success' : 'success',
          itemsProcessed,
          errors: errors.length > 0 ? errors : null,
          completedAt: new Date(),
        })
        .where(eq(syncLogs.id, logEntry.id));

      return {
        success: errors.length === 0,
        itemsProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      errors.push({ message: 'Failed to fetch projects from Zoho', details: error.message });

      await db
        .update(syncLogs)
        .set({
          status: 'failed',
          itemsProcessed,
          errors,
          completedAt: new Date(),
        })
        .where(eq(syncLogs.id, logEntry.id));

      return {
        success: false,
        itemsProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  async syncTasks(projectId: string): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: Array<{ message: string; details?: any }> = [];
    let itemsProcessed = 0;

    const [logEntry] = await db
      .insert(syncLogs)
      .values({
        syncType: `tasks_${projectId}`,
        status: 'running',
        itemsProcessed: 0,
      })
      .returning();

    try {
      const zohoClient = createZohoApiClient(this.userId);
      const tasks = await zohoClient.getTasks(this.portalId, projectId);

      for (const task of tasks) {
        try {
          const ownerId = task.details.owners[0]?.id;
          if (!ownerId) {
            errors.push({
              message: `Task ${task.id} has no owner`,
              details: task.name,
            });
            continue;
          }

          await storage.upsertTask({
            id: task.id,
            projectId: task.project.id,
            title: task.name,
            description: task.description || '',
            assigneeId: ownerId,
            status: task.details.status.type.toLowerCase(),
            priority: task.details.priority?.toLowerCase() || 'medium',
            dueDate: task.details.end_date ? new Date(task.details.end_date) : undefined,
            completedAt: task.details.completed_date ? new Date(task.details.completed_date) : undefined,
          });
          itemsProcessed++;
        } catch (error: any) {
          errors.push({
            message: `Failed to sync task ${task.id}`,
            details: error.message,
          });
        }
      }

      await db
        .update(syncLogs)
        .set({
          status: errors.length > 0 ? 'partial_success' : 'success',
          itemsProcessed,
          errors: errors.length > 0 ? errors : null,
          completedAt: new Date(),
        })
        .where(eq(syncLogs.id, logEntry.id));

      return {
        success: errors.length === 0,
        itemsProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      errors.push({ message: 'Failed to fetch tasks from Zoho', details: error.message });

      await db
        .update(syncLogs)
        .set({
          status: 'failed',
          itemsProcessed,
          errors,
          completedAt: new Date(),
        })
        .where(eq(syncLogs.id, logEntry.id));

      return {
        success: false,
        itemsProcessed,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  async syncAll(): Promise<{ projects: SyncResult; tasks: SyncResult[] }> {
    const projectsResult = await this.syncProjects();
    
    const allProjects = await storage.getAllProjects();
    const tasksResults: SyncResult[] = [];

    for (const project of allProjects) {
      const taskResult = await this.syncTasks(project.id);
      tasksResults.push(taskResult);
    }

    return {
      projects: projectsResult,
      tasks: tasksResults,
    };
  }

  static async getSyncSettings(key: string): Promise<any> {
    const [setting] = await db
      .select()
      .from(syncSettings)
      .where(eq(syncSettings.key, key))
      .limit(1);

    return setting?.value;
  }

  static async setSyncSettings(key: string, value: any): Promise<void> {
    await db
      .insert(syncSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: syncSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  static async getRecentSyncLogs(limit: number = 20) {
    return await db
      .select()
      .from(syncLogs)
      .orderBy(syncLogs.createdAt)
      .limit(limit);
  }
}

export function createSyncService(userId: string, portalId: string): SyncService {
  return new SyncService(userId, portalId);
}
