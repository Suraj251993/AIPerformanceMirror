import type { Express } from "express";
import { zohoAuthService } from "./zohoAuth.js";
import { isAuthenticated } from "./replitAuth.js";
import { createZohoApiClient } from "./zohoApi.js";
import { storage } from "./storage.js";
import crypto from "crypto";

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
      const total = Object.values(weights).reduce((sum: any, val: any) => sum + (Number(val) || 0), 0);
      
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
}
