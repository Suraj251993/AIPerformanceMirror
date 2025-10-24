import cron from 'node-cron';
import { db } from './db.js';
import { users, zohoConnections, reportSubscriptions, reportDeliveryLog } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { createSyncService, SyncService } from './syncService.js';
import { ReportGenerator } from './reportGenerator.js';
import { emailService } from './emailService.js';

export class SyncScheduler {
  private tasks: Map<string, any> = new Map();
  private isRunning = false;
  private isJobRunning = false;
  private isDailyEmailRunning = false;
  private isWeeklyEmailRunning = false;

  async start() {
    if (this.isRunning) {
      console.log('Sync scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting sync scheduler...');

    try {
      // Sync scheduler
      const settings = await SyncService.getSyncSettings('sync_interval');
      const interval = settings?.minutes || 60;
      const cronExpression = `*/${interval} * * * *`;
      
      const task = cron.schedule(cronExpression, async () => {
        await this.runScheduledSync();
      });

      this.tasks.set('main_sync', task);
      console.log(`✅ Sync scheduler started (runs every ${interval} minutes)`);

      // Daily email scheduler with configurable time
      const dailyEmailSettings = await SyncService.getSyncSettings('daily_email_time');
      const dailyHour = dailyEmailSettings?.hour || 8;
      const dailyMinute = dailyEmailSettings?.minute || 0;
      const dailyEmailCron = `${dailyMinute} ${dailyHour} * * *`;
      
      const dailyEmailTask = cron.schedule(dailyEmailCron, async () => {
        await this.runDailyEmailReports();
      });
      this.tasks.set('daily_email', dailyEmailTask);
      console.log(`✅ Daily email scheduler started (runs at ${String(dailyHour).padStart(2, '0')}:${String(dailyMinute).padStart(2, '0')})`);

      // Weekly email scheduler with configurable day and time
      const weeklyEmailSettings = await SyncService.getSyncSettings('weekly_email_schedule');
      const weeklyHour = weeklyEmailSettings?.hour || 8;
      const weeklyMinute = weeklyEmailSettings?.minute || 0;
      const weeklyDay = weeklyEmailSettings?.day || 1; // 0 = Sunday, 1 = Monday, etc.
      const weeklyEmailCron = `${weeklyMinute} ${weeklyHour} * * ${weeklyDay}`;
      
      const weeklyEmailTask = cron.schedule(weeklyEmailCron, async () => {
        await this.runWeeklyEmailReports();
      });
      this.tasks.set('weekly_email', weeklyEmailTask);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      console.log(`✅ Weekly email scheduler started (runs at ${String(weeklyHour).padStart(2, '0')}:${String(weeklyMinute).padStart(2, '0')} every ${dayNames[weeklyDay]})`);
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

  async updateDailyEmailTime(hour: number, minute: number = 0) {
    try {
      this.stop();
      await SyncService.setSyncSettings('daily_email_time', { hour, minute });
      await this.start();
    } catch (error: any) {
      console.error('❌ Failed to update daily email time:', error.message);
      throw error;
    }
  }

  async updateWeeklyEmailSchedule(day: number, hour: number, minute: number = 0) {
    try {
      this.stop();
      await SyncService.setSyncSettings('weekly_email_schedule', { day, hour, minute });
      await this.start();
    } catch (error: any) {
      console.error('❌ Failed to update weekly email schedule:', error.message);
      throw error;
    }
  }

  async runDailyEmailReports() {
    if (this.isDailyEmailRunning) {
      console.log('⏭️ Skipping daily emails - previous run still in progress');
      return;
    }

    this.isDailyEmailRunning = true;
    console.log('📧 Running daily email reports...');

    try {
      const subscriptions = await db
        .select({
          id: reportSubscriptions.id,
          userId: reportSubscriptions.userId,
          userEmail: users.email,
        })
        .from(reportSubscriptions)
        .innerJoin(users, eq(reportSubscriptions.userId, users.id))
        .where(
          and(
            eq(reportSubscriptions.reportType, 'daily'),
            eq(reportSubscriptions.enabled, 1)
          )
        );

      console.log(`Found ${subscriptions.length} daily email subscriptions`);

      for (const sub of subscriptions) {
        try {
          const reportHtml = await ReportGenerator.generateDailyReport(sub.userId);
          const result = await emailService.sendPerformanceReport(
            sub.userEmail!,
            'daily',
            reportHtml
          );

          await db.insert(reportDeliveryLog).values({
            subscriptionId: sub.id,
            recipientEmail: sub.userEmail!,
            reportType: 'daily',
            status: result.success ? 'sent' : 'failed',
            messageId: result.messageId,
            errorMessage: result.error,
          });

          if (result.success) {
            await db
              .update(reportSubscriptions)
              .set({ lastSentAt: new Date() })
              .where(eq(reportSubscriptions.id, sub.id));
          }
        } catch (error: any) {
          console.error(`❌ Failed to send daily report to ${sub.userEmail}:`, error.message);
          
          await db.insert(reportDeliveryLog).values({
            subscriptionId: sub.id,
            recipientEmail: sub.userEmail!,
            reportType: 'daily',
            status: 'failed',
            errorMessage: error.message,
          });
        }
      }

      console.log('✅ Daily email reports completed');
    } catch (error: any) {
      console.error('❌ Daily email reports failed:', error.message);
    } finally {
      this.isDailyEmailRunning = false;
    }
  }

  async runWeeklyEmailReports() {
    if (this.isWeeklyEmailRunning) {
      console.log('⏭️ Skipping weekly emails - previous run still in progress');
      return;
    }

    this.isWeeklyEmailRunning = true;
    console.log('📧 Running weekly email reports...');

    try {
      const subscriptions = await db
        .select({
          id: reportSubscriptions.id,
          userId: reportSubscriptions.userId,
          userEmail: users.email,
        })
        .from(reportSubscriptions)
        .innerJoin(users, eq(reportSubscriptions.userId, users.id))
        .where(
          and(
            eq(reportSubscriptions.reportType, 'weekly'),
            eq(reportSubscriptions.enabled, 1)
          )
        );

      console.log(`Found ${subscriptions.length} weekly email subscriptions`);

      for (const sub of subscriptions) {
        try {
          const reportHtml = await ReportGenerator.generateWeeklyReport(sub.userId);
          const result = await emailService.sendPerformanceReport(
            sub.userEmail!,
            'weekly',
            reportHtml
          );

          await db.insert(reportDeliveryLog).values({
            subscriptionId: sub.id,
            recipientEmail: sub.userEmail!,
            reportType: 'weekly',
            status: result.success ? 'sent' : 'failed',
            messageId: result.messageId,
            errorMessage: result.error,
          });

          if (result.success) {
            await db
              .update(reportSubscriptions)
              .set({ lastSentAt: new Date() })
              .where(eq(reportSubscriptions.id, sub.id));
          }
        } catch (error: any) {
          console.error(`❌ Failed to send weekly report to ${sub.userEmail}:`, error.message);
          
          await db.insert(reportDeliveryLog).values({
            subscriptionId: sub.id,
            recipientEmail: sub.userEmail!,
            reportType: 'weekly',
            status: 'failed',
            errorMessage: error.message,
          });
        }
      }

      console.log('✅ Weekly email reports completed');
    } catch (error: any) {
      console.error('❌ Weekly email reports failed:', error.message);
    } finally {
      this.isWeeklyEmailRunning = false;
    }
  }
}

export const syncScheduler = new SyncScheduler();
