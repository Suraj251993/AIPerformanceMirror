import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  date,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export type UserRole = 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

// Authentication source enum
export type AuthSource = 'demo' | 'zoho' | 'replit';

// Users table - Extended for Replit Auth + Performance Mirror + Zoho SSO
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).$type<UserRole | null>(),
  department: varchar("department"),
  managerId: varchar("manager_id"),
  
  // Authentication source tracking
  authSource: varchar("auth_source", { length: 20 }).$type<AuthSource>().default('demo'),
  
  // Zoho-specific fields
  zohoUserId: varchar("zoho_user_id", { length: 255 }),
  zohoEmail: varchar("zoho_email", { length: 255 }),
  zohoEmployeeId: varchar("zoho_employee_id", { length: 100 }),
  zohoRecordId: varchar("zoho_record_id", { length: 100 }),
  zohoProfilePicture: text("zoho_profile_picture"),
  
  // Sync tracking
  lastZohoSync: timestamp("last_zoho_sync"),
  zohoSyncStatus: varchar("zoho_sync_status", { length: 20 }).default('pending'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager_employee",
  }),
  employees: many(users, { relationName: "manager_employee" }),
  tasks: many(tasks),
  taskOwnerships: many(taskOwners),
  createdTasks: many(tasks, { relationName: "task_creator" }),
  timeLogs: many(timeLogs),
  activityEvents: many(activityEvents),
  feedbackGiven: many(feedback, { relationName: "feedback_from" }),
  feedbackReceived: many(feedback, { relationName: "feedback_to" }),
  scores: many(scores),
  auditLogs: many(auditLogs),
  zohoConnections: many(zohoConnections),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  teamName: varchar("team_name"),
  status: varchar("status").notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
}));

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  title: varchar("title").notNull(),
  description: text("description"),
  assigneeId: varchar("assignee_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default('todo'),
  priority: varchar("priority").notNull().default('medium'),
  points: integer("points").default(0),
  estimatedHours: real("estimated_hours"),
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedAt: timestamp("completed_at"),
  progressPercentage: integer("progress_percentage").default(0),
  managerValidatedPercentage: integer("manager_validated_percentage"),
  validatedBy: varchar("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  validationComment: text("validation_comment"),
  billingType: varchar("billing_type").default('none'),
  tags: text("tags").array(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "task_creator",
  }),
  validator: one(users, {
    fields: [tasks.validatedBy],
    references: [users.id],
    relationName: "task_validator",
  }),
  timeLogs: many(timeLogs),
  taskOwners: many(taskOwners),
  validationHistory: many(taskValidationHistory),
}));

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// Task Owners junction table (for multi-owner/group tasks)
export const taskOwners = pgTable("task_owners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharePercentage: integer("share_percentage").default(100), // For calculating individual contribution
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskOwnersRelations = relations(taskOwners, ({ one }) => ({
  task: one(tasks, {
    fields: [taskOwners.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskOwners.userId],
    references: [users.id],
  }),
}));

export type TaskOwner = typeof taskOwners.$inferSelect;
export type InsertTaskOwner = typeof taskOwners.$inferInsert;

// Task Validation History table (audit trail for manager validations)
export const taskValidationHistory = pgTable("task_validation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  oldPercentage: integer("old_percentage").notNull(),
  newPercentage: integer("new_percentage").notNull(),
  validatedBy: varchar("validated_by").notNull().references(() => users.id),
  validationComment: text("validation_comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskValidationHistoryRelations = relations(taskValidationHistory, ({ one }) => ({
  task: one(tasks, {
    fields: [taskValidationHistory.taskId],
    references: [tasks.id],
  }),
  validator: one(users, {
    fields: [taskValidationHistory.validatedBy],
    references: [users.id],
  }),
}));

export const insertTaskValidationHistorySchema = createInsertSchema(taskValidationHistory).omit({
  id: true,
  createdAt: true,
}).extend({
  oldPercentage: z.number().min(0).max(100),
  newPercentage: z.number().min(0).max(100),
  validationComment: z.string().min(10, "Comment must be at least 10 characters").max(1000),
});

export type TaskValidationHistory = typeof taskValidationHistory.$inferSelect;
export type InsertTaskValidationHistory = z.infer<typeof insertTaskValidationHistorySchema>;

// Time logs table
export const timeLogs = pgTable("time_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  minutes: integer("minutes").notNull(),
  description: text("description"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [timeLogs.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [timeLogs.userId],
    references: [users.id],
  }),
}));

export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = typeof timeLogs.$inferInsert;

// Activity events table
export const activityEvents = pgTable("activity_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sourceType: varchar("source_type").notNull(), // 'task', 'time_log', 'comment', 'sprint'
  sourceId: varchar("source_id").notNull(),
  eventType: varchar("event_type").notNull(), // 'created', 'updated', 'completed', 'commented'
  payload: jsonb("payload"),
  eventTime: timestamp("event_time").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  user: one(users, {
    fields: [activityEvents.userId],
    references: [users.id],
  }),
}));

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type InsertActivityEvent = typeof activityEvents.$inferInsert;

// Feedback table
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  category: text("category").array().notNull(), // Changed to array for multiple categories
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedbackRelations = relations(feedback, ({ one }) => ({
  fromUser: one(users, {
    fields: [feedback.fromUserId],
    references: [users.id],
    relationName: "feedback_from",
  }),
  toUser: one(users, {
    fields: [feedback.toUserId],
    references: [users.id],
    relationName: "feedback_to",
  }),
}));

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  fromUserId: true, // Omitted because it's populated server-side from session
}).extend({
  rating: z.number().min(1).max(5),
  category: z.array(z.enum(['communication', 'delivery', 'collaboration'])).min(1, "Select at least one category"),
  comment: z.string().min(10, "Comment must be at least 10 characters").max(500),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Scores table
export const scores = pgTable("scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  scoreValue: real("score_value").notNull(), // 0-100
  components: jsonb("components").notNull(), // breakdown of score components
  createdAt: timestamp("created_at").defaultNow(),
});

export const scoresRelations = relations(scores, ({ one }) => ({
  user: one(users, {
    fields: [scores.userId],
    references: [users.id],
  }),
}));

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;

// Score components interface
export interface ScoreComponents {
  taskCompletion: number;
  timeliness: number;
  efficiency: number;
  velocity: number;
  collaboration: number;
  weights: {
    taskCompletion: number;
    timeliness: number;
    efficiency: number;
    velocity: number;
    collaboration: number;
  };
}

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(),
  target: varchar("target").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export const zohoConnections = pgTable("zoho_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  scope: varchar("scope").notNull(),
  tokenType: varchar("token_type", { length: 50 }).default('Bearer'),
  zohoOrgId: varchar("zoho_org_id"),
  zohoDataCenter: varchar("zoho_data_center", { length: 10 }).default('com'),
  apiDomain: varchar("api_domain", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const zohoConnectionsRelations = relations(zohoConnections, ({ one }) => ({
  user: one(users, {
    fields: [zohoConnections.userId],
    references: [users.id],
  }),
}));

export type ZohoConnection = typeof zohoConnections.$inferSelect;
export type InsertZohoConnection = typeof zohoConnections.$inferInsert;

export const syncSettings = pgTable("sync_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SyncSetting = typeof syncSettings.$inferSelect;
export type InsertSyncSetting = typeof syncSettings.$inferInsert;

export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syncType: varchar("sync_type").notNull(),
  status: varchar("status").notNull(),
  itemsProcessed: integer("items_processed").default(0),
  errors: jsonb("errors"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

// Sprints table - Zoho Sprints integration
export const sprints = pgTable("sprints", {
  id: varchar("id").primaryKey(),
  teamId: varchar("team_id").notNull(),
  name: varchar("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status").notNull(), // 'planned', 'active', 'completed'
  totalStoryPoints: integer("total_story_points").default(0),
  completedStoryPoints: integer("completed_story_points").default(0),
  velocityTarget: integer("velocity_target"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Sprint = typeof sprints.$inferSelect;
export type InsertSprint = typeof sprints.$inferInsert;

// Sprint items (backlog items/stories/tasks with story points)
export const sprintItems = pgTable("sprint_items", {
  id: varchar("id").primaryKey(),
  sprintId: varchar("sprint_id").references(() => sprints.id),
  projectId: varchar("project_id").references(() => projects.id),
  title: varchar("title").notNull(),
  description: text("description"),
  itemType: varchar("item_type").notNull(), // 'story', 'task', 'bug', 'epic'
  status: varchar("status").notNull(), // 'new', 'in_progress', 'in_review', 'completed', 'blocked'
  priority: varchar("priority").default('medium'),
  storyPoints: integer("story_points"),
  assigneeId: varchar("assignee_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SprintItem = typeof sprintItems.$inferSelect;
export type InsertSprintItem = typeof sprintItems.$inferInsert;

// Report subscriptions table
export const reportSubscriptions = pgTable("report_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  reportType: varchar("report_type").notNull(), // 'daily' or 'weekly'
  frequency: varchar("frequency").notNull(), // 'daily' or 'weekly'
  enabled: integer("enabled").notNull().default(1), // 1 = enabled, 0 = disabled
  lastSentAt: timestamp("last_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ReportSubscription = typeof reportSubscriptions.$inferSelect;
export type InsertReportSubscription = typeof reportSubscriptions.$inferInsert;

// Report delivery log table
export const reportDeliveryLog = pgTable("report_delivery_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => reportSubscriptions.id),
  recipientEmail: varchar("recipient_email").notNull(),
  reportType: varchar("report_type").notNull(),
  status: varchar("status").notNull(), // 'sent', 'failed', 'pending'
  messageId: varchar("message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ReportDelivery = typeof reportDeliveryLog.$inferSelect;
export type InsertReportDelivery = typeof reportDeliveryLog.$inferInsert;

// Relations - defined after both tables
export const sprintsRelations = relations(sprints, ({ many }) => ({
  items: many(sprintItems),
}));

export const sprintItemsRelations = relations(sprintItems, ({ one }) => ({
  sprint: one(sprints, {
    fields: [sprintItems.sprintId],
    references: [sprints.id],
  }),
  project: one(projects, {
    fields: [sprintItems.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [sprintItems.assigneeId],
    references: [users.id],
  }),
}));
