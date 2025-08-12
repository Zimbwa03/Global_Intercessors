# Global Intercessors Prayer Management Platform

## Overview
The Global Intercessors Prayer Management Platform is a comprehensive full-stack web application designed to unite believers worldwide in continuous prayer coverage. It provides 24/7 prayer slot management, spiritual growth tracking, AI-powered prayer assistance, and global event coordination for faith-based communities. The platform aims to facilitate a continuous prayer movement, leveraging technology to connect intercessors globally and foster spiritual development.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
- **August 12, 2025**: 
  - **INTERCESSOR SCHEDULE SYSTEM COMPLETE**: Full prayer schedule management system implemented with database schema, API endpoints, and UI components
  - **COMPREHENSIVE SQL ACTIVATION SCRIPT**: Created activate-intercessor-schedule-system.sql for complete Supabase database setup
  - **PRAYER SCHEDULE API ENDPOINTS**: Added complete REST API for schedule management, attendance tracking, metrics calculation, and weekly reports
  - **UI COMPONENTS INTEGRATED**: Prayer schedule settings and weekly attendance tracking components fully integrated into user profile and dashboard
  - **MOBILE RESPONSIVE DESIGN**: Dynamic header/footer behavior with scroll direction detection for optimal mobile experience
  - **DATABASE FUNCTIONS**: Implemented PostgreSQL functions for streak calculation, metrics aggregation, and attendance management
  - **MAJOR FEATURE COMPLETE**: Implemented comprehensive Bible Quiz Game with full DeepSeek AI integration
  - **COMPLETE BACKEND API**: Added comprehensive Bible Quiz REST API endpoints in server/routes.ts for complete quiz management
  - Successfully deployed complete Bible Quiz database schema with 8 specialized tables (bible_questions, user_quiz_progress, quiz_sessions, user_question_history, quiz_achievements, user_achievements, daily_challenges, user_daily_challenges)
  - Implemented DeepSeek AI-powered question generation API endpoint with intelligent parsing and fallback systems
  - Added complete quiz session management APIs (start/submit/end) with database persistence and scoring calculations
  - Integrated comprehensive user progress tracking APIs including XP calculation, level progression, and streak management
  - Added daily challenge system with automatic challenge creation and completion tracking
  - Implemented progressive difficulty system (Easy, Medium, Hard) with adaptive AI question generation
  - Added three quiz modes: Daily Challenge (limited once per day), Smart Quiz (adaptive difficulty), and Topic-Based Quiz (Old Testament, New Testament, Life of Jesus)
  - Integrated comprehensive scoring system with points calculation based on difficulty, response time, and streak bonuses
  - Added real-time progress tracking including XP, levels, streaks, accuracy rates, and achievement system
  - Implemented AI-powered question generation with fallback questions ensuring uninterrupted gameplay
  - Added detailed answer feedback with Bible explanations and encouraging messages for both correct and incorrect answers
  - Integrated quiz session management with database persistence and real-time progress updates
  - Added comprehensive quiz completion summaries with performance analytics and encouraging Scripture verses
  - Enhanced WhatsApp bot with comprehensive interactive button system throughout entire user experience
  - **REAL-TIME UPDATES SYSTEM**: Implemented comprehensive real-time prayer slot updates using Supabase real-time subscriptions
  - Added automatic data refresh when prayer slots are changed, skipped, or updated without requiring page refresh
  - Integrated real-time subscriptions in Prayer Slot Management and Dashboard Overview components
  - Added visual indicators showing live update connection status to users
  - Implemented immediate query refetching and toast notifications for prayer slot changes
  - Enhanced user experience with 5-second polling intervals and background refresh capabilities
  - **CRITICAL DATABASE SYNC FIX**: Resolved WhatsApp bot phone number column mismatch (phone vs phone_number)
  - Fixed WhatsApp bot authentication to correctly display user names and prayer slots instead of generic "Beloved Intercessor"
  - Improved phone number lookup with multiple format handling (+263 prefix variations)
  - WhatsApp bot now successfully finds users and displays real prayer slot assignments
  - CRITICAL SECURITY FIX: Implemented phone number validation to prevent unauthorized access from unregistered numbers
  - Added strict phone number verification against user profile's registered WhatsApp number during authentication
  - Removed support button and enhanced help system with detailed Global Intercessors mission explanation
  - Fixed authentication linking issue with improved database upsert approach
  - Replaced all text commands with click-based button interactions for better mobile user experience
  - Added navigation buttons (Continue, Try Again, Help, Back) across all features including login flow, devotionals, bible quiz, reminders, updates, messages, and dashboard
  - Bot now restricts access to registered phone numbers only, preventing same credentials from working on multiple unregistered phones
  - Implemented comprehensive devotional menu with personalized user greetings and Bible verse
  - Added AI-powered "Today's Word" feature with DeepSeek AI generating spiritual topics, verses, explanations, and prayers
  - Added AI-powered "Daily Declarations" feature generating 10 faith declarations with supporting Bible verses
  - Included "Get Fresh Word" and "Generate Another" buttons for continuous AI content generation
  - Added fallback devotional content for seamless experience during AI service interruptions
  - RESOLVED: Fixed WhatsApp API character limit issues (1024 chars) with message truncation and shortened AI prompts
  - Confirmed working: AI-powered devotional content successfully delivered to WhatsApp with interactive buttons

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with TypeScript, using Vite for building.
- **UI & Styling**: Tailwind CSS with shadcn/ui for components, featuring a responsive, mobile-first design system with custom brand colors (Deep Forest Green, Warm Gold, White, Dark Gray).
- **Branding**: Integrated official Global Intercessors logo and icon across the application for visual brand unification.
- **Mobile Optimization**: Comprehensive mobile optimization with feature parity, touch-friendly interactions, professional font sizes, and safe area support. Includes advanced Prayer Timer and Slot Counter functionality on mobile.

### Technical Implementations
- **Backend**: Node.js 20 with Express.js and TypeScript, utilizing ES modules.
- **Database ORM**: Drizzle ORM for type-safe operations.
- **Authentication**: Supabase Auth for user management, including JWT tokens and role-based access control.
- **API**: RESTful API endpoints with JSON responses.
- **AI Integration**: AI-powered prayer assistance, Bible chat, and prayer planning tools, including integration with DeepSeek AI for content generation.
- **Communication**: Global update system, push notifications via Firebase Cloud Messaging, SMTP-based email alerts, and real-time dashboard updates.
- **Prayer Management**: System for 48 half-hour prayer slots, attendance tracking, slot transfers, skip requests, and real-time coverage monitoring.
- **Admin Dashboard**: Comprehensive user management, global updates, analytics, event management, and system monitoring.
- **WhatsApp Bot**: An interactive WhatsApp Prayer Reminder Bot with comprehensive database integration, user authentication (requires Global Intercessors web app login credentials), personalized greetings using real user names, cross-table data retrieval, command handling, AI-powered devotional content generation (via DeepSeek AI), enhanced devotional menu with "Today's Word" and "Daily Declarations" features, comprehensive Bible Quiz Game with three quiz modes (Daily Challenge, Smart Quiz, Topic Quiz), AI-generated questions with progressive difficulty, real-time scoring and progress tracking, achievement system, and prayer slot reminders with actual slot information. New users must authenticate with email/password from web app before accessing bot features.

### System Design Choices
- **Data Protection**: Row Level Security (RLS) implemented for data protection, with PostgreSQL functions for complex operations bypassing RLS when needed.
- **Scalability**: Designed for global reach with 24/7 prayer coverage.
- **Deployment**: Developed on Replit with an integrated workflow, supporting hot reloading and automated production builds.

## External Dependencies

- **Supabase**: Primary Backend-as-a-Service for PostgreSQL database, authentication, and real-time capabilities.
- **Firebase**: For Cloud Messaging (push notifications).
- **Neon Database**: A backup PostgreSQL hosting option.
- **DeepSeek AI**: Integrated for AI-powered prayer assistance and content generation.
- **API.Bible**: For comprehensive Bible verse search and content.
- **Meta WhatsApp Business API**: For the interactive WhatsApp Prayer Reminder Bot.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Modern icon system.
- **Framer Motion**: For animations and micro-interactions.
- **React Hook Form**: For form state management and validation.