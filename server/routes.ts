import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertFeedbackSchema } from "@shared/schema";
import { seedMockData } from "./mockData";
import { db } from "./db";
import { users, feedback as feedbackTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { registerZohoRoutes } from "./zohoRoutes";

// Helper function to get current user (respecting demo mode)
async function getCurrentUser(req: any): Promise<any> {
  // Check if demo role is set in session
  if (req.session.demoRole) {
    const demoUserMap: Record<string, string> = {
      'HR_ADMIN': 'demo-hr-admin',
      'MANAGER': 'demo-manager',
      'EMPLOYEE': 'demo-employee',
    };
    const demoUserId = demoUserMap[req.session.demoRole];
    return await storage.getUser(demoUserId);
  }

  // Otherwise return authenticated user
  const userId = req.user.claims.sub;
  return await storage.getUser(userId);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Register Zoho integration routes
  registerZohoRoutes(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Setup routes - for first-time HR admin setup
  app.get('/api/setup/check', isAuthenticated, async (req: any, res) => {
    try {
      const hrAdmins = await storage.getUsersByRole('HR_ADMIN');
      res.json({ hasAdmin: hrAdmins.length > 0 });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  app.post('/api/setup/claim-admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if any HR admin already exists
      const hrAdmins = await storage.getUsersByRole('HR_ADMIN');
      if (hrAdmins.length > 0) {
        return res.status(400).json({ message: "An HR Administrator already exists" });
      }

      // Update current user to HR_ADMIN
      await db
        .update(users)
        .set({ role: 'HR_ADMIN' })
        .where(eq(users.id, userId));

      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error claiming admin role:", error);
      res.status(500).json({ message: "Failed to claim admin role" });
    }
  });

  // Demo mode endpoints - set role in session
  app.post('/api/demo/set-role', isAuthenticated, async (req: any, res) => {
    try {
      const { role } = req.body;
      
      if (!['HR_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Store demo role in session
      req.session.demoRole = role;
      
      // Map demo role to corresponding demo user ID
      const demoUserMap: Record<string, string> = {
        'HR_ADMIN': 'demo-hr-admin',
        'MANAGER': 'demo-manager',
        'EMPLOYEE': 'demo-employee',
      };

      const demoUserId = demoUserMap[role];
      const demoUser = await storage.getUser(demoUserId);

      if (!demoUser) {
        return res.status(500).json({ message: 'Demo user not found' });
      }

      res.json({ success: true, role, user: demoUser });
    } catch (error) {
      console.error("Error setting demo role:", error);
      res.status(500).json({ message: "Failed to set demo role" });
    }
  });

  // User Management endpoints (HR Admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const targetUserId = req.params.id;
      const { role } = req.body;

      if (!['HR_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      await db
        .update(users)
        .set({ role: role as any })
        .where(eq(users.id, targetUserId));

      const updatedUser = await storage.getUser(targetUserId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Seed mock data endpoint (for development)
  app.post('/api/seed', async (req, res) => {
    try {
      await seedMockData();
      res.json({ message: 'Mock data seeded successfully' });
    } catch (error: any) {
      console.error("Error seeding data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // HR Dashboard endpoint
  app.get('/api/dashboard/hr', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Get HR Team users only (all roles: EMPLOYEE, MANAGER, HR_ADMIN)
      const allUsers = await db.select().from(users).where(eq(users.department, 'HR Team'));
      const allEmployees = allUsers;
      
      // Get latest scores for all employees
      const employeesWithScores = await Promise.all(
        allEmployees.map(async (emp) => {
          const latestScore = await storage.getLatestScoreByUser(emp.id);
          return { ...emp, latestScore };
        })
      );

      // Calculate KPIs
      const scoresWithValues = employeesWithScores.filter(e => e.latestScore);
      const avgScore = scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, e) => sum + (e.latestScore?.scoreValue || 0), 0) / scoresWithValues.length
        : 0;
      
      const topPerformers = scoresWithValues.filter(e => (e.latestScore?.scoreValue || 0) >= 90).length;
      const needsAttention = scoresWithValues.filter(e => (e.latestScore?.scoreValue || 0) < 60).length;

      // Calculate department stats
      const departments = Array.from(new Set(allEmployees.map(e => e.department).filter(Boolean)));
      const departmentStats = departments.map(dept => {
        const deptEmployees = employeesWithScores.filter(e => e.department === dept);
        const deptScores = deptEmployees.filter(e => e.latestScore);
        const avgDeptScore = deptScores.length > 0
          ? deptScores.reduce((sum, e) => sum + (e.latestScore?.scoreValue || 0), 0) / deptScores.length
          : 0;
        
        return {
          department: dept as string,
          avgScore: avgDeptScore,
          count: deptEmployees.length,
        };
      });

      res.json({
        kpis: {
          totalEmployees: allEmployees.length,
          avgScore,
          topPerformers,
          needsAttention,
        },
        employees: employeesWithScores,
        departmentStats,
      });
    } catch (error) {
      console.error("Error fetching HR dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Manager Dashboard endpoint
  app.get('/api/dashboard/manager', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      
      if (user?.role !== 'MANAGER') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Get team members (using demo user ID if in demo mode)
      const teamMembers = await storage.getUsersByManager(user!.id);
      
      // Get latest scores for team members
      const teamWithScores = await Promise.all(
        teamMembers.map(async (member) => {
          const latestScore = await storage.getLatestScoreByUser(member.id);
          return { ...member, latestScore };
        })
      );

      // Calculate team KPIs
      const scoresWithValues = teamWithScores.filter(m => m.latestScore);
      const teamAvgScore = scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, m) => sum + (m.latestScore?.scoreValue || 0), 0) / scoresWithValues.length
        : 0;
      
      const topPerformers = scoresWithValues.filter(m => (m.latestScore?.scoreValue || 0) >= 90).length;
      const needsAttention = scoresWithValues.filter(m => (m.latestScore?.scoreValue || 0) < 60).length;

      // Generate alerts
      const alerts = teamWithScores
        .filter(m => m.latestScore && m.latestScore.scoreValue < 70)
        .map(m => ({
          userId: m.id,
          userName: `${m.firstName} ${m.lastName}`,
          message: `Performance score dropped to ${m.latestScore?.scoreValue.toFixed(1)}`,
          severity: m.latestScore!.scoreValue < 60 ? 'warning' as const : 'info' as const,
        }));

      res.json({
        kpis: {
          teamSize: teamMembers.length,
          teamAvgScore,
          topPerformers,
          needsAttention,
        },
        teamMembers: teamWithScores,
        alerts,
      });
    } catch (error) {
      console.error("Error fetching manager dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Employee Dashboard endpoint
  app.get('/api/dashboard/employee', isAuthenticated, async (req: any, res) => {
    try {
      const user = await getCurrentUser(req);
      
      // Get latest score (using demo user ID if in demo mode)
      const latestScore = await storage.getLatestScoreByUser(user!.id);
      
      // Get recent activities
      const activities = await storage.getActivitiesByUser(user!.id, 10);
      
      // Get feedback received with sender info
      const feedbackReceived = await db
        .select({
          id: feedbackTable.id,
          fromUserId: feedbackTable.fromUserId,
          toUserId: feedbackTable.toUserId,
          rating: feedbackTable.rating,
          category: feedbackTable.category,
          comment: feedbackTable.comment,
          createdAt: feedbackTable.createdAt,
          fromUser: {
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(feedbackTable)
        .innerJoin(users, eq(feedbackTable.fromUserId, users.id))
        .where(eq(feedbackTable.toUserId, user!.id))
        .limit(5);

      // Generate improvement suggestions based on Excel-derived score components
      const suggestions: string[] = [];
      if (latestScore) {
        const components = latestScore.components as any;
        if (components.taskCompletion < 70) {
          suggestions.push('Focus on completing more tasks to improve your task completion rate');
        }
        if (components.timeliness < 70) {
          suggestions.push('Work on meeting deadlines consistently to improve timeliness');
        }
        if (components.efficiency < 70) {
          suggestions.push('Improve estimation accuracy - aim for actual work hours to closely match estimated hours');
        }
        if (components.progressQuality < 70) {
          suggestions.push('Keep task progress updated regularly - maintain accurate progress percentages on active tasks');
        }
        if (components.priorityFocus < 70) {
          suggestions.push('Prioritize high-priority tasks - completing them has greater impact on your score');
        }
      }

      res.json({
        latestScore,
        activities,
        feedbackReceived,
        suggestions,
      });
    } catch (error) {
      console.error("Error fetching employee dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Get user endpoint
  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get score details endpoint
  app.get('/api/scores/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const latestScore = await storage.getLatestScoreByUser(req.params.userId);
      const history = await storage.getScoresByUser(req.params.userId);

      res.json({
        user,
        latestScore,
        history,
      });
    } catch (error) {
      console.error("Error fetching scores:", error);
      res.status(500).json({ message: "Failed to fetch scores" });
    }
  });

  // Create feedback endpoint
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validatedData = insertFeedbackSchema.parse(req.body);
      
      // Create feedback with fromUserId
      const newFeedback = await storage.createFeedback({
        ...validatedData,
        fromUserId: userId,
      });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'create_feedback',
        target: validatedData.toUserId,
        details: { rating: validatedData.rating, category: validatedData.category },
      });

      res.json(newFeedback);
    } catch (error: any) {
      console.error("Error creating feedback:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid feedback data', errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  // Get feedback for user endpoint
  app.get('/api/feedback/to/:userId', isAuthenticated, async (req, res) => {
    try {
      const feedbackList = await storage.getFeedbackByRecipient(req.params.userId);
      res.json(feedbackList);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Delete user endpoint (HR_ADMIN only)
  app.delete('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user.claims.sub;
      const user = await db.select().from(users).where(eq(users.id, currentUser)).limit(1).then(r => r[0]);
      
      // Only HR_ADMIN can delete users
      if (user?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Forbidden - Only HR Admins can delete users' });
      }

      const userIdToDelete = req.params.userId;

      // Prevent users from deleting themselves
      if (userIdToDelete === currentUser) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      // Delete the user (cascading deletes will remove related data)
      await db.delete(users).where(eq(users.id, userIdToDelete));

      // Create audit log
      await storage.createAuditLog({
        userId: currentUser,
        action: 'delete_user',
        target: userIdToDelete,
        details: { deletedBy: currentUser },
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

