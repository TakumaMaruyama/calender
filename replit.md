# Swimming Training Calendar Application

## Overview

This is a full-stack web application for managing swimming training sessions and leader schedules. The application features a calendar interface for creating, viewing, and managing training sessions, along with a leader management system for scheduling training leaders.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom swimming-themed color palette
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **API Design**: RESTful endpoints with JSON responses
- **Session Management**: Express sessions with PostgreSQL store

### Development Environment
- **Platform**: Replit with autoscale deployment
- **Package Manager**: npm
- **Hot Reload**: Vite dev server with HMR
- **Build System**: ESBuild for server bundling

## Key Components

### Database Schema
The application uses four main tables:
- **swimmers**: User profiles with name, email, lane, and skill level
- **training_sessions**: Training sessions with date, time, type, and recurring patterns
- **attendance**: Tracking swimmer attendance at sessions
- **leader_schedule**: Managing which swimmers are assigned as leaders for specific date ranges

### API Endpoints
- **Training Sessions**: CRUD operations with monthly/daily filtering
- **Swimmers**: User management endpoints
- **Attendance**: Session attendance tracking
- **Leader Schedule**: Leader assignment and rotation management

### Frontend Pages
- **Calendar View**: Main interface showing monthly training schedule
- **Leader Management**: Interface for managing leader assignments and rotations

### UI Components
- **Calendar Grid**: Interactive monthly calendar with zoom controls
- **Training Modal**: Form for creating/editing training sessions with recurring options
- **Leader Modals**: Interfaces for setting leaders and managing leader rotations
- **Delete Modal**: Confirmation dialogs for training session deletion

## Data Flow

1. **Calendar Display**: Frontend fetches monthly training sessions from API
2. **Session Creation**: Form data validated with Zod, sent to backend, stored in database
3. **Leader Assignment**: Leader data managed in localStorage and synchronized with database
4. **Recurring Sessions**: Backend generates multiple sessions based on recurrence patterns
5. **Real-time Updates**: TanStack Query invalidates and refetches data after mutations

## External Dependencies

### Core Framework Dependencies
- React ecosystem (React, React DOM, React Hook Form)
- TanStack Query for data fetching
- Radix UI for accessible components
- Tailwind CSS for styling

### Backend Dependencies
- Express.js for server framework
- Drizzle ORM for database operations
- Neon serverless for PostgreSQL hosting
- date-fns for date manipulation

### Development Dependencies
- Vite for bundling and development
- TypeScript for type safety
- ESBuild for server compilation

## Deployment Strategy

### Development
- Runs on port 5000 with hot reload
- Vite dev server proxies API requests to Express backend
- PostgreSQL database provisioned automatically in Replit

### Production
- Frontend built to static assets served by Express
- Server bundled with ESBuild for Node.js runtime
- Deployed on Replit's autoscale infrastructure
- Environment variables manage database connections

### Build Process
1. Frontend: Vite builds React app to `dist/public`
2. Backend: ESBuild bundles server code to `dist/index.js`
3. Production: Single Node.js process serves both frontend and API

## Changelog

```
Changelog:
- June 23, 2025. Initial setup
- June 23, 2025. Updated tournament display format to 2-line format: tournament name + "※練習は無し"
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```