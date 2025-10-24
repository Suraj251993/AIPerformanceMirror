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

// Users table - Extended for Replit Auth + Performance Mirror
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default('EMPLOYEE').$type<UserRole>(),
  department: varchar("department"),
  managerId: varchar("manager_id"),
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
  timeLogs: many(timeLogs),
  activityEvents: many(activityEvents),
  feedbackGiven: many(feedback, { relationName: "feedback_from" }),
  feedbackReceived: many(feedback, { relationName: "feedback_to" }),
  scores: many(scores),
  auditLogs: many(auditLogs),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
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
  completedAt: timestamp("completed_at"),
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
  timeLogs: many(timeLogs),
}));

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

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
  category: varchar("category").notNull(), // 'communication', 'delivery', 'collaboration'
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
}).extend({
  rating: z.number().min(1).max(5),
  category: z.enum(['communication', 'delivery', 'collaboration']),
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
  feedback: number;
  weights: {
    taskCompletion: number;
    timeliness: number;
    efficiency: number;
    velocity: number;
    collaboration: number;
    feedback: number;
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
