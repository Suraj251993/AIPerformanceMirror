# AI Performance Mirror

## Overview

AI Performance Mirror is an enterprise employee performance analytics application that integrates with Zoho Projects and Zoho Sprints to provide real-time performance tracking and insights. The application serves three distinct user roles: HR Administrators (organization-wide visibility), Managers (team oversight), and Employees (personal performance views). The system computes AI-driven performance scores based on task completion, timeliness, collaboration, feedback, and other metrics, presenting them through data-rich dashboards with 3D visualizations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript using Vite as the build tool
- Single-page application (SPA) architecture with client-side routing via Wouter
- Component-based architecture using functional components with hooks

**UI Design System**
- Shadcn/ui component library (New York style variant) with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Dark/light theme support with system preference detection
- Custom color palette featuring dark blues (#0B1F3A, #123B6A, #1E6FB8) for a professional data analytics aesthetic
- 3D elements using Framer Motion for animations (subtle depth layering, glassmorphism, floating card effects)
- Typography: Inter font family with tabular numerics for data-dense displays

**State Management**
- TanStack Query (React Query) for server state management and caching
- Query-based data fetching with automatic refetching disabled (staleTime: Infinity)
- React Context for theme and sidebar state management
- Session-based authentication state through query invalidation

**Key Frontend Patterns**
- Role-based component rendering based on authenticated user's role (HR_ADMIN, MANAGER, EMPLOYEE)
- Protected routes requiring authentication via useAuth hook
- Optimistic UI updates with mutation callbacks
- Responsive design with mobile/desktop breakpoints

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- ESM (ECMAScript Modules) throughout the codebase
- Development server with Vite middleware for HMR
- Production builds using esbuild for server bundling

**Authentication & Session Management**
- OAuth2-based authentication using OpenID Connect with Replit's authentication service
- Passport.js strategy for OIDC flow
- Session storage in PostgreSQL using connect-pg-simple
- Cookie-based sessions with 1-week TTL
- Role-based authorization middleware (isAuthenticated)

**API Design**
- RESTful API structure under `/api` namespace
- Role-specific endpoints: `/api/dashboard/hr`, `/api/dashboard/manager`, `/api/dashboard/employee`
- JSON request/response format
- Request logging middleware for API endpoints

**Data Layer & ORM**
- Drizzle ORM for type-safe database operations
- Schema-first design with TypeScript types generated from Drizzle schemas
- Shared schema definitions between client and server (`@shared/schema`)
- Migrations managed through Drizzle Kit

**Performance Scoring System**
The application implements a multi-component scoring algorithm that evaluates:
- Task completion rates
- Timeliness (meeting deadlines)
- Efficiency (time spent vs. estimated)
- Sprint velocity (story points completed)
- Collaboration metrics (code reviews, comments, interactions)
- Peer feedback ratings

Scores are computed and stored in the `scores` table with breakdown components stored as JSONB for flexibility.

### Database Schema

**Core Tables**
- `users`: Employee records with role assignment (HR_ADMIN, MANAGER, EMPLOYEE), department, and manager hierarchy
- `sessions`: Session storage for authentication (required for Replit Auth)
- `projects`: Project information synced from Zoho Projects
- `tasks`: Individual tasks with status, priority, assignee, and time tracking
- `time_logs`: Detailed time entries for tasks
- `activity_events`: Event stream of all user activities (task updates, comments, completions)
- `feedback`: Peer and manager feedback with ratings and categories
- `scores`: Computed performance scores with timestamp and component breakdown
- `audit_logs`: System audit trail for compliance

**Schema Relationships**
- Self-referential manager-employee hierarchy in users table
- One-to-many: users → tasks, users → time_logs, users → activity_events
- One-to-many: projects → tasks
- Many-to-many feedback through from_user_id and to_user_id relationships

### External Dependencies

**Database**
- PostgreSQL via Neon serverless driver (`@neondatabase/serverless`)
- WebSocket support for serverless connections
- Connection pooling for production environments

**Third-Party Integrations (Planned)**
- Zoho Projects API: Task and project data ingestion
- Zoho Sprints API: Sprint and story point tracking
- OAuth2 flow for Zoho service authentication
- Webhook support for real-time updates when available

**Key Libraries**
- `@tanstack/react-query`: Server state management and caching
- `drizzle-orm`: Type-safe database operations
- `passport` + `openid-client`: OAuth2/OIDC authentication
- `date-fns`: Date manipulation and formatting
- `framer-motion`: Animation and 3D effects
- `recharts`: Data visualization for charts and graphs
- `react-hook-form` + `zod`: Form handling and validation
- `papaparse`: CSV parsing for data exports

**Development Tools**
- TypeScript for static typing across client and server
- ESLint and Prettier (implicit through Replit configuration)
- Vite plugins for development experience (@replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer)

**Hosting & Deployment**
- Replit for development and initial deployment
- Environment variables: DATABASE_URL, SESSION_SECRET, REPL_ID, ISSUER_URL
- Production build creates static assets in `dist/public` and bundled server in `dist/index.js`