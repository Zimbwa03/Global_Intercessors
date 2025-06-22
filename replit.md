# Global Intercessors Prayer Management Platform

## Overview

The Global Intercessors Prayer Management Platform is a comprehensive web application designed to facilitate global prayer coordination, spiritual growth tracking, and community engagement for faith-based organizations. The platform enables continuous 24-hour prayer coverage through coordinated time slots, AI-powered prayer assistance, and administrative management tools.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom brand theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful API endpoints
- **Session Management**: Express sessions with PostgreSQL storage
- **File Structure**: Modular route organization with service layer separation

### Database Architecture
- **Primary Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Supabase Auth for user management
- **Schema**: Comprehensive prayer management schema with user profiles, prayer slots, attendance tracking, and administrative features

## Key Components

### Authentication System
- Supabase-based authentication with email/password
- Role-based access control (admin vs. intercessor roles)
- Protected routes and session management
- Admin user creation workflow

### Prayer Slot Management
- 48 half-hour time slots covering 24-hour periods
- User assignment to specific prayer slots
- Slot availability tracking and management
- Skip request system for temporary absences
- Automatic slot release and reassignment logic

### AI-Powered Features
- **Bible Chat Assistant**: Interactive Scripture exploration and Q&A
- **Prayer Planner**: Structured prayer point generation
- **Prayer Assistant**: Personalized prayer guidance and support
- **Audio Bible Player**: Integrated Scripture listening experience

### Administrative Dashboard
- Real-time statistics and monitoring
- User management and slot oversight  
- Global update broadcasting system
- Fasting program management
- Attendance tracking and reporting

### Notification System
- Firebase Cloud Messaging integration
- Prayer reminder notifications
- Global announcement broadcasting
- Email notification support

## Data Flow

### User Registration Flow
1. User signs up through Supabase Auth
2. User profile created in `user_profiles` table
3. Prayer slot assignment through admin interface
4. Notification preferences configured

### Prayer Session Flow
1. User receives reminder notifications
2. Prayer slot status tracked in real-time
3. Attendance logged via Zoom integration
4. Statistics updated for reporting dashboard

### Administrative Operations
1. Admins manage user assignments through protected endpoints
2. Global updates broadcast through RLS-enabled tables
3. Real-time monitoring of slot coverage
4. Automated attendance tracking via Zoom API

## External Dependencies

### Core Services
- **Supabase**: Primary database, authentication, and real-time subscriptions
- **Firebase**: Push notification delivery via FCM
- **Zoom API**: Attendance tracking and meeting management

### Development Tools
- **Replit**: Development environment and deployment platform
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type safety across frontend and backend

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **Framer Motion**: Animation library for enhanced UX

## Deployment Strategy

### Platform Configuration
- **Environment**: Replit autoscale deployment
- **Build Process**: Vite frontend build + esbuild backend compilation
- **Port Configuration**: Frontend served on port 5000, external port 80
- **Database**: Supabase managed PostgreSQL instance

### Environment Variables
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side database access
- `ZOOM_CLIENT_ID`, `ZOOM_API_SECRET`, `ZOOM_ACCOUNT_ID`: Zoom integration
- `DATABASE_URL`: PostgreSQL connection string for Drizzle

### Security Considerations
- Row Level Security (RLS) policies for data protection
- Service role authentication for server-side operations
- Protected admin routes with role validation
- CORS configuration for cross-origin requests

## Changelog

- June 22, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.