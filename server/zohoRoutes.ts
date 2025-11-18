import type { Express } from "express";
import { zohoAuth } from "./services/zohoAuth";
import { storage } from "./storage";
import crypto from "crypto";
import { zohoAuthService } from "./zohoAuth";
import { isAuthenticated } from "./replitAuth";
import { createZohoApiClient } from "./zohoApi";

const pendingAuths = new Map<string, { userId: string; timestamp: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [state, data] of Array.from(pendingAuths.entries())) {
    if (now - data.timestamp > 600000) {
      pendingAuths.delete(state);
    }
  }
}, 60000);

export function registerZohoRoutes(app: Express) {
  console.log('🚀🚀🚀 REGISTERING ZOHO ROUTES 🚀🚀🚀');
  console.error('🚀🚀🚀 REGISTERING ZOHO ROUTES (ERROR LOG) 🚀🚀🚀');
  
  app.get('/api/zoho/auth-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can connect Zoho' });
      }

      const state = crypto.randomBytes(32).toString('hex');
      pendingAuths.set(state, { userId, timestamp: Date.now() });

      const authUrl = zohoAuthService.getAuthorizationUrl(state);
      res.json({ authUrl });
    } catch (error: any) {
      console.error('Error generating Zoho auth URL:', error);
      res.status(500).json({ message: 'Failed to generate auth URL' });
    }
  });

  app.get('/api/zoho/callback', async (req, res) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).send('Missing code or state');
      }

      const authData = pendingAuths.get(state as string);
      if (!authData) {
        return res.status(400).send('Invalid or expired state');
      }

      pendingAuths.delete(state as string);

      const tokenResponse = await zohoAuthService.exchangeCodeForTokens(code as string);
      
      await zohoAuthService.saveConnection(authData.userId, tokenResponse);

      res.send(`
        <html>
          <body>
            <h1>Zoho Connected Successfully!</h1>
            <p>You can close this window and return to the application.</p>
            <script>
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Error in Zoho callback:', error);
      res.status(500).send('Failed to complete Zoho authorization');
    }
  });

  app.get('/api/zoho/connection-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasConnection = await zohoAuthService.hasValidConnection(userId);
      res.json({ connected: hasConnection });
    } catch (error: any) {
      console.error('Error checking Zoho connection:', error);
      res.status(500).json({ message: 'Failed to check connection status' });
    }
  });

  app.delete('/api/zoho/connection', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can disconnect Zoho' });
      }

      await zohoAuthService.deleteConnection(userId);
      res.json({ message: 'Zoho connection removed successfully' });
    } catch (error: any) {
      console.error('Error removing Zoho connection:', error);
      res.status(500).json({ message: 'Failed to remove connection' });
    }
  });

  app.get('/api/zoho/portals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const zohoClient = createZohoApiClient(userId);
      const portals = await zohoClient.getPortals();
      res.json(portals);
    } catch (error: any) {
      console.error('Error fetching Zoho portals:', error);
      res.status(500).json({ message: 'Failed to fetch portals' });
    }
  });

  app.post('/api/zoho/sync/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can trigger sync' });
      }

      const { portalId } = req.body;
      if (!portalId) {
        return res.status(400).json({ message: 'Portal ID required' });
      }

      const zohoClient = createZohoApiClient(userId);
      const projects = await zohoClient.getProjects(portalId);

      let synced = 0;
      for (const project of projects) {
        await storage.upsertProject({
          id: project.id,
          name: project.name,
          description: project.description || '',
          status: project.status.toLowerCase(),
        });
        synced++;
      }

      res.json({ message: `Synced ${synced} projects successfully` });
    } catch (error: any) {
      console.error('Error syncing projects:', error);
      res.status(500).json({ message: 'Failed to sync projects' });
    }
  });

  app.post('/api/zoho/sync/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can trigger sync' });
      }

      const { portalId, projectId } = req.body;
      if (!portalId || !projectId) {
        return res.status(400).json({ message: 'Portal ID and Project ID required' });
      }

      const zohoClient = createZohoApiClient(userId);
      const tasks = await zohoClient.getTasks(portalId, projectId);

      let synced = 0;
      for (const task of tasks) {
        const ownerId = task.details.owners[0]?.id;
        if (!ownerId) continue;

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
        synced++;
      }

      res.json({ message: `Synced ${synced} tasks successfully` });
    } catch (error: any) {
      console.error('Error syncing tasks:', error);
      res.status(500).json({ message: 'Failed to sync tasks' });
    }
  });

  app.get('/api/zoho/sync/logs', isAuthenticated, async (req: any, res) => {
    try {
      const { SyncService } = await import('./syncService.js');
      const logs = await SyncService.getRecentSyncLogs(50);
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching sync logs:', error);
      res.status(500).json({ message: 'Failed to fetch sync logs' });
    }
  });

  app.get('/api/settings/all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can access settings' });
      }

      const { SyncService } = await import('./syncService.js');
      
      const scoringWeights = await SyncService.getSyncSettings('scoring_weights') || {
        taskCompletion: 30,
        timeliness: 20,
        efficiency: 10,
        velocity: 15,
        collaboration: 5,
        feedback: 20
      };

      const syncInterval = await SyncService.getSyncSettings('sync_interval') || { minutes: 60 };
      const dataRetention = await SyncService.getSyncSettings('data_retention') || { days: 365 };

      res.json({
        scoringWeights,
        syncInterval,
        dataRetention
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  app.put('/api/settings/scoring-weights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can update settings' });
      }

      const weights = req.body;
      const total: number = Object.values(weights).reduce((sum, val) => Number(sum) + (Number(val) || 0), 0) as number;
      
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ message: 'Weights must sum to 100%' });
      }

      const { SyncService } = await import('./syncService.js');
      await SyncService.setSyncSettings('scoring_weights', weights);

      res.json({ message: 'Scoring weights updated successfully', weights });
    } catch (error: any) {
      console.error('Error updating scoring weights:', error);
      res.status(500).json({ message: 'Failed to update scoring weights' });
    }
  });

  app.put('/api/settings/sync-interval', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can update settings' });
      }

      const { minutes } = req.body;
      
      if (!minutes || minutes < 1 || minutes > 1440) {
        return res.status(400).json({ message: 'Sync interval must be between 1 and 1440 minutes' });
      }

      const { SyncService } = await import('./syncService.js');
      await SyncService.setSyncSettings('sync_interval', { minutes });

      const { syncScheduler } = await import('./scheduler.js');
      await syncScheduler.updateInterval(minutes);

      res.json({ message: 'Sync interval updated successfully', minutes });
    } catch (error: any) {
      console.error('Error updating sync interval:', error);
      res.status(500).json({ message: 'Failed to update sync interval' });
    }
  });

  app.put('/api/settings/data-retention', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can update settings' });
      }

      const { days } = req.body;
      
      if (!days || days < 30 || days > 3650) {
        return res.status(400).json({ message: 'Data retention must be between 30 and 3650 days' });
      }

      const { SyncService } = await import('./syncService.js');
      await SyncService.setSyncSettings('data_retention', { days });

      res.json({ message: 'Data retention policy updated successfully', days });
    } catch (error: any) {
      console.error('Error updating data retention:', error);
      res.status(500).json({ message: 'Failed to update data retention policy' });
    }
  });

  // Email report endpoints (HR Admin only)
  app.get('/api/email-reports/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can manage email reports' });
      }

      const subscription = await storage.getReportSubscription(userId);
      res.json(subscription || { dailyEnabled: false, weeklyEnabled: false });
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ message: 'Failed to fetch subscription' });
    }
  });

  app.put('/api/email-reports/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can manage email reports' });
      }

      const { dailyEnabled, weeklyEnabled } = req.body;
      
      const subscription = await storage.upsertReportSubscription(userId, {
        dailyEnabled: dailyEnabled || false,
        weeklyEnabled: weeklyEnabled || false,
      });

      res.json({ message: 'Subscription updated successfully', subscription });
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      res.status(500).json({ message: 'Failed to update subscription' });
    }
  });

  app.post('/api/email-reports/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can send test emails' });
      }

      if (!user?.email) {
        return res.status(400).json({ message: 'No email address found for user' });
      }

      const { reportType } = req.body;
      const { ReportGenerator } = await import('./reportGenerator.js');
      const { emailService } = await import('./emailService.js');
      
      let html: string;
      let subject: string;

      if (reportType === 'daily') {
        html = await ReportGenerator.generateDailyReport(userId);
        subject = `[TEST] Daily Performance Report - ${new Date().toLocaleDateString()}`;
      } else if (reportType === 'weekly') {
        html = await ReportGenerator.generateWeeklyReport(userId);
        subject = `[TEST] Weekly Performance Report - Week of ${new Date().toLocaleDateString()}`;
      } else {
        return res.status(400).json({ message: 'Invalid report type' });
      }

      await emailService.sendEmail({
        to: user.email,
        subject,
        html,
      });

      res.json({ message: `Test ${reportType} report sent to ${user.email}` });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: 'Failed to send test email' });
    }
  });

  app.get('/api/email-reports/delivery-log', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can view delivery logs' });
      }

      const logs = await storage.getReportDeliveryLog(userId);
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching delivery log:', error);
      res.status(500).json({ message: 'Failed to fetch delivery log' });
    }
  });

  app.get('/api/email-reports/schedule', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can view schedule settings' });
      }

      const { SyncService } = await import('./syncService.js');
      const dailySettings = await SyncService.getSyncSettings('daily_email_time');
      const weeklySettings = await SyncService.getSyncSettings('weekly_email_schedule');

      res.json({
        daily: {
          hour: dailySettings?.hour || 8,
          minute: dailySettings?.minute || 0,
        },
        weekly: {
          day: weeklySettings?.day || 1,
          hour: weeklySettings?.hour || 8,
          minute: weeklySettings?.minute || 0,
        },
      });
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      res.status(500).json({ message: 'Failed to fetch schedule' });
    }
  });

  app.put('/api/email-reports/daily-schedule', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can update schedule' });
      }

      const { hour, minute } = req.body;
      
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return res.status(400).json({ message: 'Invalid time format' });
      }

      const { syncScheduler } = await import('./scheduler.js');
      await syncScheduler.updateDailyEmailTime(hour, minute);

      res.json({ message: 'Daily email schedule updated successfully', hour, minute });
    } catch (error: any) {
      console.error('Error updating daily schedule:', error);
      res.status(500).json({ message: 'Failed to update daily schedule' });
    }
  });

  app.put('/api/email-reports/weekly-schedule', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can update schedule' });
      }

      const { day, hour, minute } = req.body;
      
      if (day < 0 || day > 6 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return res.status(400).json({ message: 'Invalid schedule format' });
      }

      const { syncScheduler } = await import('./scheduler.js');
      await syncScheduler.updateWeeklyEmailSchedule(day, hour, minute);

      res.json({ message: 'Weekly email schedule updated successfully', day, hour, minute });
    } catch (error: any) {
      console.error('Error updating weekly schedule:', error);
      res.status(500).json({ message: 'Failed to update weekly schedule' });
    }
  });

  app.get('/auth/zoho/login', async (req: any, res) => {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      
      req.session.oauthState = state;
      
      const { zohoAuth } = await import('./services/zohoAuth.js');
      const authUrl = zohoAuth.getAuthorizationUrl(state);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('Error initiating Zoho SSO login:', error);
      res.status(500).send('Failed to initiate Zoho login');
    }
  });

  app.get('/auth/zoho/callback', async (req: any, res) => {
    // CRITICAL: Write to file IMMEDIATELY to prove route is hit
    const fs = require('fs');
    const timestamp = new Date().toISOString();
    const logEntry = `\n[${timestamp}] CALLBACK HIT - Query: ${JSON.stringify(req.query)}\n`;
    try {
      fs.appendFileSync('/tmp/zoho-debug.txt', logEntry);
    } catch (e) { /* ignore */ }
    
    console.log('🎯🎯🎯 === ZOHO CALLBACK HIT === 🎯🎯🎯');
    console.log('Query:', req.query);
    console.log('Session:', req.session);
    
    try {
      const { code, state, error: oauthError } = req.query;

      if (oauthError) {
        console.error('❌ OAuth error from Zoho:', oauthError);
        return res.redirect('/?error=oauth_failed');
      }

      const stateParam = Array.isArray(state) ? state[0] : state;
      const codeParam = Array.isArray(code) ? code[0] : code;

      console.log('State param:', stateParam);
      console.log('Code param:', codeParam ? 'exists' : 'missing');

      if (!codeParam || !stateParam) {
        console.error('❌ Missing code or state parameter');
        return res.redirect('/?error=missing_parameters');
      }

      if (!req.session || stateParam !== req.session.oauthState) {
        console.error('❌ OAuth state mismatch or missing session');
        console.error('Expected:', req.session?.oauthState);
        console.error('Received:', stateParam);
        return res.redirect('/?error=invalid_state');
      }

      delete req.session.oauthState;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const { zohoAuth } = await import('./services/zohoAuth.js');
      const { zohoSync } = await import('./services/zohoSync.js');

      console.log('🔄 Exchanging code for tokens...');
      const tokens = await zohoAuth.exchangeCodeForTokens(codeParam);
      
      console.log('🔄 Fetching user info...');
      const userInfo = await zohoAuth.getUserInfo(tokens.access_token);

      console.log('🔄 Looking up user:', userInfo.sub);
      let user = await storage.getUserByZohoId(userInfo.sub);

      if (!user) {
        console.log('✨ Creating new user...');
        const tempUserId = crypto.randomBytes(16).toString('hex');
        
        await zohoAuth.storeTokens(tempUserId, tokens, tokens.scope || 'openid,profile,email');
        
        user = await zohoSync.syncUserFromZoho(
          tempUserId,
          userInfo.sub,
          userInfo.email,
          userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`
        );

        await zohoAuth.storeTokens(user.id, tokens, tokens.scope || 'openid,profile,email');
        console.log('✅ User created:', user.id);
      } else {
        console.log('✅ User found:', user.id);
        await zohoAuth.storeTokens(user.id, tokens, tokens.scope || 'openid,profile,email');
      }

      req.session.userId = user.id;
      req.session.authSource = 'zoho';
      
      console.log('🎉 === LOGIN SUCCESSFUL ===');
      
      res.redirect('/');
    } catch (error: any) {
      console.error('❌❌❌ ERROR:', error.message);
      console.error('Stack:', error.stack);
      res.redirect('/?error=auth_failed');
    }
  });

  app.post('/api/zoho/sync-employees', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Only HR admins can sync employees' });
      }

      const { zohoSync } = await import('./services/zohoSync.js');
      const result = await zohoSync.syncAllEmployeesFromZoho(userId);

      res.json(result);
    } catch (error: any) {
      console.error('Error syncing employees:', error);
      res.status(500).json({ 
        message: 'Failed to sync employees', 
        error: error.message 
      });
    }
  });

  app.get('/api/zoho/sync-status', isAuthenticated, async (req: any, res) => {
    try {
      const logs = await storage.getSyncLogs(10);
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching sync logs:', error);
      res.status(500).json({ message: 'Failed to fetch sync logs' });
    }
  });
}
