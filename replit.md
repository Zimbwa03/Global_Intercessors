# Global Intercessors Prayer Management Platform

## Overview

The Global Intercessors Prayer Management Platform is a comprehensive full-stack web application designed to unite believers worldwide in continuous prayer coverage. The platform provides 24/7 prayer slot management, spiritual growth tracking, AI-powered prayer assistance, and global event coordination for faith-based communities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **Styling**: Custom brand colors and responsive design system
- **Mobile Support**: Fully responsive with mobile-first approach using custom hooks

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Supabase Auth for user management
- **API Design**: RESTful API endpoints with JSON responses
- **Session Management**: Secure session handling with proper error boundaries

### Database Design
- **Primary Database**: PostgreSQL via Supabase
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Row Level Security**: Implemented for data protection and access control
- **Service Functions**: PostgreSQL functions for complex operations bypassing RLS when needed

## Key Components

### Authentication & Authorization
- **User Authentication**: Supabase-powered sign-up/sign-in system
- **Admin Management**: Role-based access control with admin dashboard
- **Session Security**: JWT tokens with automatic refresh and secure storage
- **User Profiles**: Extended user data storage with preferences and regional information

### Prayer Management System
- **Slot Assignment**: 48 half-hour prayer slots covering 24-hour global coverage
- **Attendance Tracking**: Real-time monitoring of prayer session participation
- **Slot Changes**: User-initiated slot transfer system with admin approval
- **Skip Requests**: Temporary absence management with approval workflow
- **Coverage Monitoring**: Real-time visualization of global prayer coverage

### AI-Powered Features
- **Prayer Assistant**: Intelligent prayer guidance and scripture integration
- **Bible Chat**: Interactive biblical study with AI-powered insights
- **Prayer Planner**: Structured prayer point generation and planning tools
- **Audio Bible**: Integrated Bible listening with progress tracking

### Admin Dashboard
- **User Management**: Comprehensive user oversight and administration
- **Global Updates**: Broadcast system for announcements and notifications
- **Analytics**: Prayer attendance statistics and coverage metrics
- **Event Management**: Fasting programs and special event coordination
- **System Monitoring**: Real-time application health and performance metrics

### Communication System
- **Global Updates**: Priority-based announcement system with expiry management
- **Notifications**: Push notification integration via Firebase Cloud Messaging
- **Email Notifications**: SMTP-based email alerts for important updates
- **Real-time Updates**: Live dashboard updates for all connected users

## Data Flow

### User Registration Flow
1. User submits registration form via React frontend
2. Supabase Auth creates authenticated user account
3. Backend creates corresponding user profile in PostgreSQL
4. User receives confirmation and is redirected to dashboard
5. Profile data is synchronized across all components

### Prayer Slot Management Flow
1. User requests prayer slot assignment through interface
2. System checks available slots and user eligibility
3. Slot assignment is created with proper user linkage
4. Real-time updates propagate to coverage monitoring
5. Attendance tracking begins for assigned time slots

### Admin Operations Flow
1. Admin authenticates through dedicated login system
2. Admin actions utilize service role privileges to bypass RLS
3. Database operations are executed with elevated permissions
4. Changes propagate to user interfaces in real-time
5. Audit logs maintain record of administrative actions

## External Dependencies

### Core Services
- **Supabase**: Primary backend-as-a-service for database and authentication
- **Firebase**: Cloud messaging for push notifications
- **Neon Database**: Backup PostgreSQL hosting option via Drizzle configuration

### Development Tools
- **Replit**: Primary development and deployment environment
- **TypeScript**: Type safety across entire application stack
- **ESLint/Prettier**: Code quality and formatting standards

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Modern icon system
- **Framer Motion**: Animation and micro-interactions
- **React Hook Form**: Form state management and validation

## Deployment Strategy

### Development Environment
- **Platform**: Replit with integrated development workflow
- **Hot Reload**: Vite HMR for rapid development iteration
- **Environment Variables**: Secure secret management through Replit

### Production Deployment
- **Build Process**: Automated build pipeline with TypeScript compilation
- **Static Assets**: Optimized bundling with Vite production build
- **Server Deployment**: Express server with production optimizations
- **Database Migration**: Automated schema updates via Drizzle

### Environment Configuration
- **Development**: Local Replit environment with development database
- **Production**: Autoscale deployment with production database and secrets
- **Monitoring**: Built-in error tracking and performance monitoring

## Changelog
- June 22, 2025. Initial setup
- June 22, 2025. Enhanced Bible Chat with DeepSeek AI integration
- June 22, 2025. Added comprehensive notification system with prayer slot reminders
- June 22, 2025. Implemented analytics dashboard with real-time charts and metrics
- June 22, 2025. Updated mobile navigation to include "Bible Chat" and analytics features
- June 27, 2025. Enhanced Bible verse search with comprehensive API.Bible integration
- June 27, 2025. Added Prayer Journey Visualizer with interactive timeline and spiritual growth tracking
- June 27, 2025. Completely revamped Prayer Planner as comprehensive intercession companion with:
  - AI-powered prayer point generation via DeepSeek Assistant
  - Daily prayer point organization and tracking with personal notes
  - Comprehensive Prayer Guide with frameworks, themes, scriptures, and principles
  - Prayer point completion tracking and management
  - Category-based organization (Personal, Family, Church, Nation, etc.)
  - Enhanced mobile and desktop interface with animations
- July 3, 2025. Implemented Global Intercessors brand color scheme throughout the application:
  - Deep Forest Green (#104220) as primary color
  - Warm Gold (#D2AA68) as secondary/accent color
  - White (#FFFFFF) and Dark Gray (#231F20) as supporting colors
  - Updated all UI components, charts, and dashboard elements to reflect brand identity
  - Added comprehensive Weekly Report Analytics dashboard with GI-branded visualizations
  - Enhanced Chart.js configurations with brand-consistent color palettes
- July 3, 2025. Integrated official Global Intercessors logo and icon throughout the application:
  - Added official GI logo (GI_Logo_Main) to hero section and main branding areas
  - Replaced generic icons with official GI icon (GI_GOLD_Green_Icon) across all components
  - Updated landing page navigation, dashboard sidebar, admin portal, and footer
  - Maintained consistent brand identity across mobile and desktop interfaces
  - Professional logo placement with proper sizing and hover effects
  - Complete visual brand unification with authentic Global Intercessors assets
- July 5, 2025. Implemented comprehensive mobile optimization with feature parity:
  - Mobile dashboard includes ALL desktop features: Prayer Slots, Bible Chat, Prayer Planner, Bible Verse Search, Prayer Journey, Audio Bible, Notifications, Fasting Program, Analytics, Updates, Profile, and Settings
  - Enhanced mobile sidebar with professional styling, feature descriptions, and smooth animations
  - Used official GI Gold Green Icon specifically for mobile interface while maintaining main logo for desktop
  - Implemented mobile-first CSS utilities with professional font sizes (1rem base, 1.125rem headings, 1.25rem titles)
  - Added comprehensive touch-friendly interactions with 44px minimum touch targets
  - Created elegant mobile bottom navigation with emoji icons and smooth scaling animations
  - Enhanced mobile cards with rounded corners, better shadows, and improved spacing (1.25rem padding)
  - Professional mobile layout with safe area support for notched devices
  - Clean, smart mobile design maintaining feature-complete functionality across all screen sizes
- July 5, 2025. Enhanced mobile dashboard with Prayer Slot and Counter functionality:
  - Added advanced Prayer Timer with start/pause/reset functionality and large display
  - Integrated Prayer Slot countdown showing time until next prayer session
  - Enhanced Prayer Slot management with real-time status and direct access buttons
  - Added scrollable navigation in mobile sidebar for better menu accessibility
  - Created comprehensive Supabase SQL schema for user profiles with spiritual tracking
  - Mobile dashboard now matches desktop functionality with Prayer Timer and Slot Counter features
- August 11, 2025. Implemented interactive WhatsApp Prayer Reminder Bot:
  - Fixed database connection and column references for WhatsApp bot service
  - Created comprehensive command handling system (/start, /help, /remind, /devotional, /stop)
  - Added professional UI buttons and interactive elements for WhatsApp users
  - Implemented user registration and preference management with database tracking
  - Integrated AI-powered devotional content generation with graceful fallbacks
  - Added comprehensive interaction logging for analytics and support
  - Webhook verification working correctly with Meta WhatsApp Business API
  - Bot responds to commands with personalized messages and interactive menus
- August 11, 2025. Enhanced WhatsApp bot with professional personalization and DeepSeek AI:
  - Added getUserName function to fetch actual user names from user_profiles table
  - Implemented personalized greetings using first names throughout all bot interactions
  - Created professional welcome message highlighting bot capabilities for "start" or "Hi" commands
  - Removed automatic unsolicited devotional messages - users must explicitly request content
  - Enhanced both "Today's Devotional" and "Generate Fresh Messages" with DeepSeek AI integration
  - Added interactive buttons throughout the bot experience for better navigation
  - Improved DevotionalContent generation with structured prompts and better parsing
  - Professional UI with spiritual warfare themes and prophetic declarations
  - All devotional content now AI-generated with fallback system for reliability
- August 12, 2025. Complete WhatsApp Bot Database Integration and Prayer Slot Access:
  - Fixed critical Row Level Security policies blocking service role access to prayer_slots table
  - Created comprehensive SQL fix removing all blocking policies and granting full service role access
  - Successfully created all missing WhatsApp bot database tables (whatsapp_bot_users, whatsapp_messages, whatsapp_interactions, daily_devotionals)
  - Established proper RLS policies for all WhatsApp tables with service role full access
  - Confirmed 12 active prayer slots now accessible to WhatsApp bot for reminder functionality
  - WhatsApp bot now fully operational with complete database integration and user tracking
  - Interactive message delivery confirmed working with Meta WhatsApp Business API
  - Prayer slot reminder system now ready for automated notifications with real prayer data
- August 12, 2025. Professional WhatsApp Bot V2 Implementation Complete:
  - Completely rewrote WhatsApp bot with professional Supabase integration (whatsapp-bot-v2.ts)
  - Fixed all 95+ LSP diagnostics and TypeScript errors for production-ready code
  - Implemented proper Supabase client usage instead of problematic Drizzle ORM syntax
  - Added comprehensive interactive button support for enhanced user experience
  - Created professional command handling system (/start, /help, /remind, /devotional, /stop)
  - Implemented personalized user experience with getUserName function from user_profiles table
  - Added proper error handling, logging, and message tracking with Supabase
  - Professional rate limiting and duplicate message prevention
  - Enhanced prayer slot reminder system with 30-minute advance notifications
  - Complete webhook verification and Meta WhatsApp Business API integration
  - Bot now fully operational with 12 prayer slots detected and 1 active WhatsApp user registered

## User Preferences

Preferred communication style: Simple, everyday language.