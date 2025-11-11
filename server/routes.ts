import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertFeedbackSchema } from "@shared/schema";
import { seedMockData } from "./mockData";
import { db } from "./db";
import { users, feedback as feedbackTable, tasks, projects } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { registerZohoRoutes } from "./zohoRoutes";

// Helper function to get current user (respecting demo mode)
async function getCurrentUser(req: any): Promise<any> {
  // Check if demo role is set in session (uses real employees)
  if (req.session.demoRole) {
    // Map demo role to real employee IDs
    // Meenakshi Dabral for HR_ADMIN and MANAGER
    // Jeeveetha P C K for EMPLOYEE
    const realEmployeeMap: Record<string, string> = {
      'HR_ADMIN': '7e85534a-5efe-4fba-aa13-4067b013692d',  // Meenakshi Dabral
      'MANAGER': '7e85534a-5efe-4fba-aa13-4067b013692d',   // Meenakshi Dabral
      'EMPLOYEE': '22157a20-f283-4e4b-8f1b-8b886f17fc55',  // Jeeveetha P C K
    };
    const employeeId = realEmployeeMap[req.session.demoRole];
    return await storage.getUser(employeeId);
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

  // Demo mode endpoints - set role in session (uses real employees)
  app.post('/api/demo/set-role', isAuthenticated, async (req: any, res) => {
    try {
      const { role } = req.body;
      
      if (!['HR_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      // Store demo role in session
      req.session.demoRole = role;
      
      // Map demo role to real employee IDs
      // Meenakshi Dabral for HR_ADMIN and MANAGER
      // Jeeveetha P C K for EMPLOYEE
      const realEmployeeMap: Record<string, string> = {
        'HR_ADMIN': '7e85534a-5efe-4fba-aa13-4067b013692d',  // Meenakshi Dabral
        'MANAGER': '7e85534a-5efe-4fba-aa13-4067b013692d',   // Meenakshi Dabral
        'EMPLOYEE': '22157a20-f283-4e4b-8f1b-8b886f17fc55',  // Jeeveetha P C K
      };

      const employeeId = realEmployeeMap[role];
      const employee = await storage.getUser(employeeId);

      if (!employee) {
        return res.status(500).json({ message: 'Employee not found' });
      }

      // Temporarily update the employee's role to match the selected demo role
      // This allows Meenakshi to act as both HR_ADMIN and MANAGER
      await db
        .update(users)
        .set({ role: role as any })
        .where(eq(users.id, employeeId));

      const updatedEmployee = await storage.getUser(employeeId);

      res.json({ success: true, role, user: updatedEmployee });
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
      // Filter out demo accounts to avoid duplicates
      const allUsers = await db.select().from(users).where(eq(users.department, 'HR Team'));
      const allEmployees = allUsers.filter(u => !u.id.startsWith('demo-'));
      
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

      // Show all HR Team employees (same as HR admin view)
      // Filter out demo accounts to avoid duplicates
      const allTeamMembers = await db.select().from(users).where(eq(users.department, 'HR Team'));
      const teamMembers = allTeamMembers.filter(u => !u.id.startsWith('demo-'));
      
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
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Validate request body
      const validatedData = insertFeedbackSchema.parse(req.body);
      
      // Create feedback with fromUserId
      const newFeedback = await storage.createFeedback({
        ...validatedData,
        fromUserId: user.id,
      });

      // Create audit log
      await storage.createAuditLog({
        userId: user.id,
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

  // Get tasks for a specific user
  app.get('/api/users/:userId/tasks', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      
      const userTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          startDate: tasks.startDate,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
          progressPercentage: tasks.progressPercentage,
          estimatedHours: tasks.estimatedHours,
          projectName: projects.name,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(eq(tasks.assigneeId, userId))
        .orderBy(desc(tasks.createdAt));

      res.json(userTasks);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ message: "Failed to fetch user tasks" });
    }
  });

  // Delete user endpoint (HR_ADMIN only)
  app.delete('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user.claims.sub;
      const user = await storage.getUser(currentUser);
      
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

  // Get team tasks for manager dashboard
  app.get('/api/manager/team-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      
      // Only managers and HR admins can access team tasks
      if (currentUser?.role !== 'MANAGER' && currentUser?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Forbidden - Only Managers can access team tasks' });
      }

      // Get all employees assigned to this manager or all employees if HR admin
      let teamMemberIds: string[];
      if (currentUser.role === 'HR_ADMIN') {
        // HR Admin sees all employees
        const allUsers = await db.select({ id: users.id }).from(users);
        teamMemberIds = allUsers.map(u => u.id);
      } else {
        // Manager sees their direct reports
        const teamMembers = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.managerId, currentUser.id));
        teamMemberIds = teamMembers.map(u => u.id);
      }

      if (teamMemberIds.length === 0) {
        return res.json([]);
      }

      // Get tasks for team members using inArray
      const { inArray } = await import("drizzle-orm");
      const teamTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          assigneeId: tasks.assigneeId,
          progressPercentage: tasks.progressPercentage,
          managerValidatedPercentage: tasks.managerValidatedPercentage,
          validatedBy: tasks.validatedBy,
          validatedAt: tasks.validatedAt,
          validationComment: tasks.validationComment,
          dueDate: tasks.dueDate,
          updatedAt: tasks.updatedAt,
          assigneeName: users.name,
          assigneeEmail: users.email,
          projectName: projects.name,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(inArray(tasks.assigneeId, teamMemberIds))
        .orderBy(desc(tasks.updatedAt));

      res.json(teamTasks);
    } catch (error: any) {
      console.error("Error fetching team tasks:", error);
      res.status(500).json({ message: "Failed to fetch team tasks" });
    }
  });

  // Task validation routes (Manager only)
  app.post('/api/tasks/:taskId/validate', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getCurrentUser(req);
      
      // Only managers can validate task completion
      if (currentUser?.role !== 'MANAGER' && currentUser?.role !== 'HR_ADMIN') {
        return res.status(403).json({ message: 'Forbidden - Only Managers can validate task completion' });
      }

      const taskId = req.params.taskId;
      const { newPercentage, validationComment } = req.body;

      // Validate input
      if (typeof newPercentage !== 'number' || newPercentage < 0 || newPercentage > 100) {
        return res.status(400).json({ message: 'Invalid percentage value' });
      }
      if (!validationComment || validationComment.trim().length < 10) {
        return res.status(400).json({ message: 'Comment must be at least 10 characters' });
      }

      // Use transaction to ensure atomicity and prevent race conditions
      const { taskValidationHistory } = await import("@shared/schema");
      
      // Transaction ensures both task update and history insert succeed together
      const result = await db.transaction(async (tx) => {
        // Lock the row and get current values atomically using FOR UPDATE
        const [task] = await tx
          .select({
            id: tasks.id,
            progressPercentage: tasks.progressPercentage,
            managerValidatedPercentage: tasks.managerValidatedPercentage,
          })
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .for('update')
          .limit(1);

        if (!task) {
          throw new Error('Task not found');
        }

        // Capture the old percentage before update
        const oldPercentage = task.managerValidatedPercentage ?? task.progressPercentage;

        // Update task with validation
        await tx
          .update(tasks)
          .set({
            managerValidatedPercentage: newPercentage,
            validatedBy: currentUser.id,
            validatedAt: new Date(),
            validationComment: validationComment.trim(),
          })
          .where(eq(tasks.id, taskId));

        // Create audit trail entry within same transaction
        await tx.insert(taskValidationHistory).values({
          taskId: taskId,
          oldPercentage: oldPercentage,
          newPercentage: newPercentage,
          validatedBy: currentUser.id,
          validationComment: validationComment.trim(),
        });

        return { oldPercentage, newPercentage };
      });

      res.json({ 
        message: 'Task validation saved successfully',
        oldPercentage: result.oldPercentage,
        newPercentage: result.newPercentage,
      });
    } catch (error: any) {
      console.error("Error validating task:", error);
      if (error.message === 'Task not found') {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.status(500).json({ message: "Failed to validate task" });
    }
  });

  // Get task validation history (audit trail)
  app.get('/api/tasks/:taskId/validation-history', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.taskId;

      const { taskValidationHistory } = await import("@shared/schema");
      const historyRecords = await db
        .select({
          id: taskValidationHistory.id,
          oldPercentage: taskValidationHistory.oldPercentage,
          newPercentage: taskValidationHistory.newPercentage,
          validationComment: taskValidationHistory.validationComment,
          createdAt: taskValidationHistory.createdAt,
          validatedBy: taskValidationHistory.validatedBy,
        })
        .from(taskValidationHistory)
        .where(eq(taskValidationHistory.taskId, taskId))
        .orderBy(desc(taskValidationHistory.createdAt));

      // Enrich with validator user details
      const history = await Promise.all(
        historyRecords.map(async (record) => {
          const validator = await db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, record.validatedBy))
            .limit(1);
          
          return {
            ...record,
            validatorName: validator[0]?.name || 'Unknown',
            validatorEmail: validator[0]?.email || '',
          };
        })
      );

      res.json(history);
    } catch (error: any) {
      console.error("Error fetching validation history:", error);
      res.status(500).json({ message: "Failed to fetch validation history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

