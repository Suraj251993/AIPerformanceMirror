# AI Performance Mirror

An enterprise employee performance tracking application with multi-role authentication and AI-driven analytics.

## Features

- **Multi-Role Authentication**: HR Admin, Manager, and Employee roles with different access levels
- **Zoho Integration**: Real-time data sync from Zoho Projects and Zoho Sprints
- **AI Performance Scoring**: Automated scoring based on task completion, timeliness, efficiency, velocity, collaboration, and feedback
- **3D Visualizations**: Glassmorphism UI with animated backgrounds, floating cards, and celebration effects
- **Automated Email Reports**: Daily and weekly performance reports delivered via email
- **User Management**: HR admins can assign and manage user roles
- **Real-time Dashboards**: Role-specific views with live performance metrics

## Demo Accounts

Three pre-configured accounts are available for testing:

### 🔴 HR Administrator
- **Email**: `hr.demo@company.com`
- **Name**: Sarah Admin
- **Access**: Full system access, user management, settings configuration

### 🟡 Manager
- **Email**: `manager.demo@company.com`
- **Name**: Michael Manager
- **Access**: Team oversight, employee performance monitoring

### 🟢 Employee
- **Email**: `employee.demo@company.com`
- **Name**: Emma Developer
- **Access**: Personal performance dashboard

## How to Use Demo Accounts

1. Click "Sign In to Continue" on the landing page
2. Use Replit Auth (Google, GitHub, or Email) with one of the demo email addresses
3. The system automatically loads your pre-assigned role
4. Explore features based on your role level

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion
- **Backend**: Node.js, Express, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Authentication**: Replit Auth (OpenID Connect)
- **Email**: Nodemailer with SMTP
- **External APIs**: Zoho Projects, Zoho Sprints

## Getting Started

1. Install dependencies: `npm install`
2. Set up environment variables (DATABASE_URL, SESSION_SECRET)
3. Run database migrations: `npm run db:push`
4. Start the dev server: `npm run dev`
5. Visit the application and sign in with a demo account

## User Roles

- **HR_ADMIN**: Organization-wide visibility, user management, system configuration
- **MANAGER**: Team oversight, employee performance tracking
- **EMPLOYEE**: Personal performance view, task tracking

## Setup Process

For new deployments:
1. First user to log in can claim the HR Administrator role
2. HR Admin can then assign roles to other users via Settings → User Management
3. All new users start without a role until assigned

## Configuration

### Email Reports
Set these environment variables for automated email delivery:
- `SMTP_HOST`: Your SMTP server
- `SMTP_USER`: SMTP username
- `SMTP_PASSWORD`: SMTP password

### Zoho Integration
Configure OAuth2 credentials through Settings → Integration tab

## Architecture

- **Single-page application** with client-side routing
- **RESTful API** for data operations
- **Role-based access control** on all endpoints
- **Real-time data sync** with external services
- **Production-grade scoring engine** with configurable weights

## License

MIT
