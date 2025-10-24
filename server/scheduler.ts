import cron from 'node-cron';
import { db } from './db.js';
import { users, zohoConnections } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createSyncService, SyncService } from './syncService.js';

export class SyncScheduler {
  private tasks: Map<string, any> = new Map();
  private isRunning = false;
  private isJobRunning = false;

  async start() {
    if (this.isRunning) {
      console.log('Sync scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting sync scheduler...');

    try {
      const settings = await SyncService.getSyncSettings('sync_interval');
      const interval = settings?.minutes || 60;

      const cronExpression = `*/${interval} * * * *`;
      
      const task = cron.schedule(cronExpression, async () => {
        await this.runScheduledSync();
      });

      this.tasks.set('main_sync', task);
      console.log(`✅ Sync scheduler started (runs every ${interval} minutes)`);
    } catch (error: any) {
      console.error('❌ Failed to start sync scheduler:', error.message);
      this.isRunning = false;
      throw error;
    }
  }

  async runScheduledSync() {
    if (this.isJobRunning) {
      console.log('⏭️ Skipping sync - previous sync still running');
      return;
    }

    this.isJobRunning = true;
    console.log('🔄 Running scheduled sync...');
    
    try {
      const hrAdmins = await db
        .select()
        .from(users)
        .where(eq(users.role, 'HR_ADMIN' as any))
        .limit(1);

      if (hrAdmins.length === 0) {
        console.log('No HR admin found, skipping sync');
        return;
      }

      const hrAdmin = hrAdmins[0];

      const connections = await db
        .select()
        .from(zohoConnections)
        .where(eq(zohoConnections.userId, hrAdmin.id))
        .limit(1);

      if (connections.length === 0) {
        console.log('No Zoho connection found, skipping sync');
        return;
      }

      const portalSettings = await SyncService.getSyncSettings('zoho_portal_id');
      if (!portalSettings) {
        console.log('No Zoho portal configured, skipping sync');
        return;
      }

      const syncService = createSyncService(hrAdmin.id, portalSettings);
      const result = await syncService.syncAll();

      console.log(`✅ Sync completed: ${result.projects.itemsProcessed} projects, ${result.tasks.reduce((sum, t) => sum + t.itemsProcessed, 0)} tasks`);
    } catch (error: any) {
      console.error('❌ Scheduled sync failed:', error.message);
    } finally {
      this.isJobRunning = false;
    }
  }

  stop() {
    for (const [name, task] of Array.from(this.tasks.entries())) {
      task.stop();
      this.tasks.delete(name);
    }
    this.isRunning = false;
    console.log('⏹️ Sync scheduler stopped');
  }

  async updateInterval(minutes: number) {
    try {
      this.stop();
      await SyncService.setSyncSettings('sync_interval', { minutes });
      await this.start();
    } catch (error: any) {
      console.error('❌ Failed to update sync interval:', error.message);
      throw error;
    }
  }
}

export const syncScheduler = new SyncScheduler();
