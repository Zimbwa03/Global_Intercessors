# Global Intercessors Prayer Management Platform

## Overview
The Global Intercessors Prayer Management Platform is a comprehensive full-stack web application designed to unite believers worldwide in continuous prayer coverage. It provides 24/7 prayer slot management, spiritual growth tracking, AI-powered prayer assistance, and global event coordination for faith-based communities. The platform aims to facilitate a continuous prayer movement, leveraging technology to connect intercessors globally and foster spiritual development.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
- **August 12, 2025**: 
  - Enhanced WhatsApp bot with comprehensive interactive button system throughout entire user experience
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
- **WhatsApp Bot**: An interactive WhatsApp Prayer Reminder Bot with comprehensive database integration, user authentication (requires Global Intercessors web app login credentials), personalized greetings using real user names, cross-table data retrieval, command handling, AI-powered devotional content generation (via DeepSeek AI), enhanced devotional menu with "Today's Word" and "Daily Declarations" features, and prayer slot reminders with actual slot information. New users must authenticate with email/password from web app before accessing bot features.

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