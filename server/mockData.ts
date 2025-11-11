import { db } from "./db";
import { users, projects, tasks, timeLogs, activityEvents, feedback, scores } from "@shared/schema";
import type { UserRole, ScoreComponents } from "@shared/schema";

const departments = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales'];
const taskStatuses = ['todo', 'in_progress', 'in_review', 'completed'];
const priorities = ['low', 'medium', 'high', 'urgent'];

// Generate mock users
export async function generateMockUsers() {
  const mockUsers: any[] = [];
  
  // 1 HR Admin
  mockUsers.push({
    id: 'hr-admin-1',
    email: 'hr@performancemirror.ai',
    firstName: 'Sarah',
    lastName: 'Chen',
    profileImageUrl: null,
    role: 'HR_ADMIN' as UserRole,
    department: 'HR',
    managerId: null,
  });

  // 5 Managers
  const managerIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const id = `manager-${i}`;
    managerIds.push(id);
    mockUsers.push({
      id,
      email: `manager${i}@performancemirror.ai`,
      firstName: ['Alex', 'Jordan', 'Morgan', 'Casey', 'Riley'][i - 1],
      lastName: ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'][i - 1],
      profileImageUrl: null,
      role: 'MANAGER' as UserRole,
      department: departments[i - 1],
      managerId: null,
    });
  }

  // 44 Employees (distributed across managers)
  for (let i = 1; i <= 44; i++) {
    const managerId = managerIds[i % 5];
    mockUsers.push({
      id: `employee-${i}`,
      email: `employee${i}@performancemirror.ai`,
      firstName: `Employee${i}`,
      lastName: `User${i}`,
      profileImageUrl: null,
      role: 'EMPLOYEE' as UserRole,
      department: departments[i % 5],
      managerId,
    });
  }

  await db.insert(users).values(mockUsers).onConflictDoNothing();
  console.log(`✅ Created ${mockUsers.length} users`);
  return mockUsers;
}

// Generate mock projects
export async function generateMockProjects() {
  const mockProjects: any[] = [];
  
  for (let i = 1; i <= 10; i++) {
    mockProjects.push({
      id: `project-${i}`,
      name: `Project ${String.fromCharCode(64 + i)}`,
      description: `Description for Project ${String.fromCharCode(64 + i)}`,
      status: i > 8 ? 'completed' : 'active',
    });
  }

  await db.insert(projects).values(mockProjects).onConflictDoNothing();
  console.log(`✅ Created ${mockProjects.length} projects`);
  return mockProjects;
}

// Generate mock tasks
export async function generateMockTasks(projectIds: string[], userIds: string[]) {
  const mockTasks: any[] = [];
  const now = new Date();
  
  for (let i = 1; i <= 150; i++) {
    const createdDaysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000);
    const status = taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
    const completedAt = status === 'completed' ? new Date(createdAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) : null;
    
    const dueDaysFromCreation = Math.floor(Math.random() * 10) + 3;
    const dueDate = new Date(createdAt.getTime() + dueDaysFromCreation * 24 * 60 * 60 * 1000);
    
    mockTasks.push({
      id: `task-${i}`,
      projectId: projectIds[i % projectIds.length],
      title: `Task ${i}: ${['Implement feature', 'Fix bug', 'Write tests', 'Update documentation', 'Code review'][i % 5]}`,
      description: `Detailed description for task ${i}`,
      assigneeId: userIds[Math.floor(Math.random() * userIds.length)],
      status,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      points: Math.floor(Math.random() * 8) + 1,
      estimatedHours: Math.floor(Math.random() * 16) + 2,
      dueDate,
      completedAt,
      createdAt,
      updatedAt: completedAt || createdAt,
    });
  }

  await db.insert(tasks).values(mockTasks).onConflictDoNothing();
  console.log(`✅ Created ${mockTasks.length} tasks`);
  return mockTasks;
}

// Generate mock time logs
export async function generateMockTimeLogs(taskList: any[], userIds: string[]) {
  const mockTimeLogs: any[] = [];
  
  for (const task of taskList) {
    if (task.status === 'completed' || task.status === 'in_review') {
      const logCount = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < logCount; i++) {
        const logDate = new Date(task.createdAt.getTime() + Math.random() * (task.completedAt ? task.completedAt.getTime() - task.createdAt.getTime() : 3 * 24 * 60 * 60 * 1000));
        mockTimeLogs.push({
          taskId: task.id,
          userId: task.assigneeId,
          minutes: Math.floor(Math.random() * 240) + 30,
          description: `Work session ${i + 1}`,
          loggedAt: logDate,
        });
      }
    }
  }

  if (mockTimeLogs.length > 0) {
    await db.insert(timeLogs).values(mockTimeLogs).onConflictDoNothing();
    console.log(`✅ Created ${mockTimeLogs.length} time logs`);
  }
  return mockTimeLogs;
}

// Generate mock activities
export async function generateMockActivities(taskList: any[]) {
  const mockActivities: any[] = [];
  
  for (const task of taskList) {
    mockActivities.push({
      userId: task.assigneeId,
      sourceType: 'task',
      sourceId: task.id,
      eventType: 'created',
      payload: { title: task.title, status: 'todo' },
      eventTime: task.createdAt,
    });

    if (task.status === 'completed') {
      mockActivities.push({
        userId: task.assigneeId,
        sourceType: 'task',
        sourceId: task.id,
        eventType: 'completed',
        payload: { title: task.title },
        eventTime: task.completedAt,
      });
    }
  }

  if (mockActivities.length > 0) {
    await db.insert(activityEvents).values(mockActivities).onConflictDoNothing();
    console.log(`✅ Created ${mockActivities.length} activities`);
  }
  return mockActivities;
}

// Generate mock feedback
export async function generateMockFeedback(employeeIds: string[], managerIds: string[]) {
  const mockFeedback: any[] = [];
  const categories = ['communication', 'delivery', 'collaboration'] as const;
  
  for (const empId of employeeIds) {
    const feedbackCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < feedbackCount; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      mockFeedback.push({
        fromUserId: managerIds[Math.floor(Math.random() * managerIds.length)],
        toUserId: empId,
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 rating
        category: [categories[Math.floor(Math.random() * categories.length)]],
        comment: [
          'Great work on the recent project! Your attention to detail was excellent.',
          'Good communication skills. Keep up the collaborative approach.',
          'Delivered quality work on time. Very reliable team member.',
          'Shows strong initiative and problem-solving abilities.',
          'Excellent collaboration with the team. Always helpful.',
        ][Math.floor(Math.random() * 5)],
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      });
    }
  }

  if (mockFeedback.length > 0) {
    await db.insert(feedback).values(mockFeedback).onConflictDoNothing();
    console.log(`✅ Created ${mockFeedback.length} feedback entries`);
  }
  return mockFeedback;
}

// Calculate and generate scores
export async function generateScores(allUsers: any[], taskList: any[], timeLogList: any[], feedbackList: any[]) {
  const mockScores: any[] = [];
  const weights = {
    taskCompletion: 0.30,
    timeliness: 0.20,
    efficiency: 0.10,
    velocity: 0.15,
    collaboration: 0.05,
    feedback: 0.20,
  };

  // Generate scores for last 30 days for each employee
  const employeeUsers = allUsers.filter(u => u.role === 'EMPLOYEE');
  
  for (const user of employeeUsers) {
    const userTasks = taskList.filter(t => t.assigneeId === user.id);
    const userTimeLogs = timeLogList.filter(tl => tl.userId === user.id);
    const userFeedback = feedbackList.filter(f => f.toUserId === user.id);
    
    // Calculate latest score
    const totalTasks = userTasks.length || 1;
    const completedTasks = userTasks.filter(t => t.status === 'completed').length;
    const taskCompletionScore = (completedTasks / totalTasks) * 100;
    
    const onTimeTasks = userTasks.filter(t => 
      t.status === 'completed' && t.completedAt && t.dueDate && 
      new Date(t.completedAt) <= new Date(t.dueDate)
    ).length;
    const timelinessScore = totalTasks > 0 ? (onTimeTasks / totalTasks) * 100 : 75;
    
    const totalEstimated = userTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) * 60;
    const totalLogged = userTimeLogs.reduce((sum, tl) => sum + tl.minutes, 0);
    const efficiencyScore = totalEstimated > 0 ? Math.min(100, (totalEstimated / totalLogged) * 100) : 80;
    
    const velocityScore = Math.min(100, (completedTasks / 30) * 100 * 15); // Rough velocity
    const collaborationScore = Math.min(100, userTimeLogs.length * 5);
    
    const avgFeedbackRating = userFeedback.length > 0
      ? (userFeedback.reduce((sum, f) => sum + f.rating, 0) / userFeedback.length) * 20
      : 75;
    
    const components: ScoreComponents = {
      taskCompletion: taskCompletionScore,
      timeliness: timelinessScore,
      efficiency: efficiencyScore,
      velocity: velocityScore,
      collaboration: collaborationScore,
      feedback: avgFeedbackRating,
      weights,
    };
    
    const scoreValue = 
      components.taskCompletion * weights.taskCompletion +
      components.timeliness * weights.timeliness +
      components.efficiency * weights.efficiency +
      components.velocity * weights.velocity +
      components.collaboration * weights.collaboration +
      components.feedback * weights.feedback;
    
    mockScores.push({
      userId: user.id,
      date: new Date().toISOString().split('T')[0],
      scoreValue: Math.min(100, Math.max(0, scoreValue)),
      components,
    });
  }

  if (mockScores.length > 0) {
    await db.insert(scores).values(mockScores).onConflictDoNothing();
    console.log(`✅ Created ${mockScores.length} scores`);
  }
  return mockScores;
}

// Main seed function
export async function seedMockData() {
  console.log('🌱 Starting mock data generation...');
  
  const allUsers = await generateMockUsers();
  const allProjects = await generateMockProjects();
  
  const employeeIds = allUsers.filter(u => u.role === 'EMPLOYEE').map(u => u.id);
  const managerIds = allUsers.filter(u => u.role === 'MANAGER').map(u => u.id);
  
  const taskList = await generateMockTasks(allProjects.map(p => p.id), employeeIds);
  const timeLogList = await generateMockTimeLogs(taskList, employeeIds);
  const activityList = await generateMockActivities(taskList);
  const feedbackList = await generateMockFeedback(employeeIds, managerIds);
  await generateScores(allUsers, taskList, timeLogList, feedbackList);
  
  console.log('✅ Mock data generation complete!');
}
