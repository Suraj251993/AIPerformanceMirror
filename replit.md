# AI Performance Mirror

## Overview

AI Performance Mirror is an enterprise employee performance analytics application designed to integrate with Zoho Projects and Zoho Sprints. It provides real-time performance tracking and AI-driven insights for HR Administrators, Managers, and Employees. The system calculates performance scores based on task completion, timeliness, efficiency, and priority focus, visualized through data-rich dashboards with 3D elements. The application aims to enhance employee performance visibility and drive productivity within organizations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is a React TypeScript SPA using Vite, Wouter for routing, and a component-based structure. It leverages Shadcn/ui (New York style) with Radix UI, Tailwind CSS for styling, and supports dark/light themes. Custom color palettes and typography (Inter font) are used for a professional aesthetic. Framer Motion handles 3D animations and subtle visual effects. State management uses TanStack Query for server state and caching, with React Context for UI state. Key patterns include role-based rendering, protected routes, optimistic UI updates, and responsive design.

### Backend Architecture

The backend is built with Express.js and TypeScript on Node.js, utilizing ESM. Authentication is OAuth2-based using OpenID Connect with Replit's service and Passport.js, storing sessions in PostgreSQL. The API is RESTful, under `/api`, with role-specific endpoints and JSON format. Drizzle ORM provides type-safe database operations, with shared schemas between client and server. The core is a performance scoring system (`server/scoringEngine.ts`) calculating scores based on Task Completion, Timeliness, Efficiency, and Priority Focus, using configurable weights and storing historical scores.

### Database Schema

The database includes core tables for `users` (with role, department, manager hierarchy), `sessions`, `projects`, `tasks`, `time_logs`, `activity_events`, `feedback`, `scores` (with JSONB breakdown), `audit_logs`, `zoho_connections`, `sync_settings`, `sync_logs`, `sprints`, and `sprint_items`. Relationships include a self-referential manager-employee hierarchy, one-to-many relationships for users-to-tasks/logs/events, projects-to-tasks, and sprints-to-sprint items, and many-to-many for feedback.

## External Dependencies

**Database**
- PostgreSQL via Neon serverless driver (`@neondatabase/serverless`)

**Third-Party Integrations**
- **Zoho Projects API**: For task and project data ingestion, with OAuth2, pagination, rate limiting, and automated syncing.
- **Zoho Sprints API**: For sprint velocity and story point tracking, with OAuth2, full sprint metadata, and backlog item sync integrated into the scoring engine.
- **OAuth2 Flow**: Complete Zoho service authentication with token refresh and secure storage.
- **Sync Scheduler**: A production-ready polling system (`server/scheduler.ts`) for data synchronization with configurable intervals, concurrency protection, and error handling.
- **Email Reporting System**: Automated performance report delivery (`server/emailService.ts` using Nodemailer, `server/reportGenerator.ts`) with configurable schedules and HR admin UI.

## Recent Features (November 2025)

### Task Completion Validation System
A manager validation workflow allowing managers to review and adjust employee-reported task completion percentages with complete audit trails, integrated directly into the Manager Dashboard via expandable team member sections.

**Key Components:**
- **Database Schema**: Extended `tasks` table with `managerValidatedPercentage`, `validatedBy`, `validatedAt`, and `validationComment` columns. Created `task_validation_history` table to track all validation changes with old/new values, timestamps, and manager IDs.
- **Backend API**: 
  - POST `/api/tasks/:taskId/validate` - Validates tasks (role-restricted to MANAGER only) with PostgreSQL transactions and `FOR UPDATE` row-level locking. Includes debug logging for troubleshooting.
  - GET `/api/tasks/:taskId/validation-history` - Retrieves complete audit trail with validator names (concatenates firstName + lastName)
  - GET `/api/manager/team-members` - Lists all employees reporting to current manager
  - GET `/api/manager/team-members/:employeeId/tasks` - Gets tasks for specific employee with validation data
- **UI Navigation Flow**: 
  - Managers access via Manager Dashboard → "Task Validation" section
  - Click on team member collapsible to expand inline
  - Task table appears within expandable section with Validate buttons
  - Click "Validate" → Opens `TaskValidationDialog` for percentage adjustment
- **UI Components**: 
  - `TeamMemberTasksCollapsible`: Collapsible component showing employee info and expandable task table (used in Manager Dashboard)
  - `TeamMemberTasksSection`: Task table component with validation controls (query key: `["/api/manager/team-members", employeeId, "tasks"]`)
  - `TaskValidationDialog`: Reusable dialog with percentage slider (0-100%, 5% steps), required comment field (≥10 characters), and previous validation display. Uses `useEffect([task?.id, open])` to prevent stale state. Invalidates multiple query keys on save to ensure UI updates.
- **Validation Rules**: Managers must provide comment ≥10 characters; percentage must be 0-100; complete backend validation with Zod schemas.
- **Cache Invalidation Strategy**: On successful validation, invalidates `["/api/dashboard/manager"]`, `["/api/dashboard/hr"]`, `["/api/manager/team-tasks"]`, and `["/api/manager/team-members"]` (uses TanStack Query partial matching to refresh all nested employee task queries).

**Recent Updates (Nov 11, 2025):**
- **Bug Fixes:**
  - Fixed validation history API 500 error: Changed from querying non-existent `users.name` to concatenating `firstName` and `lastName`
  - Fixed UI not refreshing after validation: Added proper cache invalidation for team member task queries using partial query key matching
  - Fixed Activity Timeline showing "No recent activity": Seeded activity_events table with 63 real activity entries from tasks and time logs
- **Feature Addition:**
  - Added task validation to Score Details Modal (accessible from HR Dashboard and Employee View)
  - Managers can now validate tasks directly from employee performance modals (HR Admins can view but not validate)
  - Integrated existing TaskValidationDialog component with role-based access control (MANAGER only)
  - Updated `/api/users/:userId/tasks` endpoint to include validation fields
  - Added comprehensive cache invalidation for `/api/users` and `/api/scores` queries
  - Added task search functionality to Score Details Modal with multi-field filtering (title, description, project, status, priority)
  - Task search box is available for all roles (HR_ADMIN, MANAGER, EMPLOYEE)

**Known Limitations:**
- Auth reconciliation between OIDC subject IDs and seeded demo user IDs needs deeper integration across all routes for production OIDC use. Feature currently works fully with demo mode (hardcoded employee IDs).

**Key Libraries**
- `@tanstack/react-query`: Server state management
- `drizzle-orm`: Type-safe database operations
- `passport` + `openid-client`: OAuth2/OIDC authentication
- `date-fns`: Date manipulation
- `framer-motion`: Animation and 3D effects
- `recharts`: Data visualization
- `react-hook-form` + `zod`: Form handling and validation