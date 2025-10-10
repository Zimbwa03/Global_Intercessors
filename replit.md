# Global Intercessors Prayer Management Platform

## Overview
The Global Intercessors Prayer Management Platform is a full-stack web application designed to connect believers globally for continuous prayer coverage. It offers 24/7 prayer slot management, spiritual growth tracking, AI-powered prayer assistance, and global event coordination. The platform aims to foster a continuous prayer movement and spiritual development through technology.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

### AI Model Updates
- **Gemini API Migration**: Updated from deprecated `gemini-1.5-flash-latest` to latest `gemini-2.5-flash` model across all services (Bible chat, WhatsApp bot devotionals, quiz generation).
- **Model Enhancement**: Gemini 2.5 Flash includes thinking capabilities at no extra cost with better performance.

### PDF Generation Infrastructure  
- **Chromium Integration**: Configured Nix-installed Chromium for PDF generation in Replit environment.
- **Puppeteer Setup**: Set `PUPPETEER_EXECUTABLE_PATH` environment variable at module load time for html-pdf-node compatibility.
- **Security Flags**: Added required browser flags (`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`) for Replit environment.
- **Admin Reports**: PDF generation with AI-powered narratives now fully functional using DeepSeek AI for professional content.

### Zoom Attendance Tracking (October 10, 2025)
- **Meeting Configuration**: Updated to track official Global Intercessors Prayer Platform meeting (ID: 83923875995).
- **Meeting Link**: https://us06web.zoom.us/j/83923875995?pwd=QmVJcGpmRys1aWlvWCtZdzZKLzFRQT09
- **Passcode**: 01204
- **Live Participant Tracking**: System polls specific meeting ID every 2 minutes during active prayer slots to detect and record attendance in real-time.
- **Attendance Logic**: Matches Zoom participants by email to prayer slot database, automatically logs attendance and resets missed counts.
- **Zoom API Scopes (Server-to-Server OAuth)**: 
  - `meeting:read:participant:admin` - Live meeting participant tracking
  - `meeting:read:list_past_participants:admin` - Past participant history (primary fallback)
  - `meeting:read:past_meeting:admin` - Past meeting details
  - `meeting:read:meeting:admin` - Meeting configuration access
- **Smart Fallback System**: Automatically switches from instances endpoint to participants endpoint when scopes don't match, ensuring attendance tracking works with available permissions.
- **Configuration Files Updated**: 
  - `server/services/zoomAttendanceTracker.ts` - Core attendance tracking logic with automatic fallback
  - `client/src/components/dashboard/prayer-slot-management.tsx` - Frontend meeting link display
  - `server/services/whatsapp-bot-v2.ts` - WhatsApp bot Zoom link sharing
  - `server/routes.ts` - Admin API endpoints for Zoom link management

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with TypeScript, using Vite.
- **UI & Styling**: Tailwind CSS with shadcn/ui for components, featuring a responsive, mobile-first design with custom brand colors (Deep Forest Green, Warm Gold, White, Dark Gray).
- **Branding**: Official Global Intercessors logo and icon integrated throughout.
- **Mobile Optimization**: Comprehensive mobile optimization with feature parity, touch-friendly interactions, professional font sizes, and safe area support.

### Technical Implementations
- **Backend**: Node.js 20 with Express.js and TypeScript (ES modules).
- **Database ORM**: Drizzle ORM for type-safe operations.
- **Authentication**: Supabase Auth for user management, JWT tokens, and role-based access control.
- **API**: RESTful API endpoints with JSON responses.
- **AI Integration**: AI-powered prayer assistance, Bible chat, prayer planning, content generation (DeepSeek AI), and Bible Quiz question generation (Google Gemini AI).
- **Communication**: Global update system, Firebase Cloud Messaging push notifications, SMTP email alerts, and real-time dashboard updates.
- **Prayer Management**: System for 48 half-hour prayer slots, attendance tracking, slot transfers, skip requests, and real-time coverage monitoring. Includes real-time prayer slot updates using Supabase subscriptions.
- **Admin Dashboard**: User management, global updates, analytics, event management, and system monitoring, including PDF report generation with AI-powered narratives.
- **WhatsApp Bot**: Interactive bot with database integration, user authentication (requires web app login), personalized greetings, cross-table data retrieval, command handling, AI-powered devotional content ("Today's Word", "Daily Declarations"), comprehensive Bible Quiz Game (Daily Challenge, Smart Quiz, Topic Quiz) with Supabase persistence, AI-generated questions, progressive difficulty, real-time scoring, XP/level system, achievements, streak tracking, question history, daily challenges, multilingual support (English/Shona), and prayer slot reminders. New users must authenticate via web app.

### System Design Choices
- **Data Protection**: Row Level Security (RLS) for data protection; PostgreSQL functions used for complex operations bypassing RLS.
- **Scalability**: Designed for global 24/7 prayer coverage.
- **Deployment**: Developed on Replit with integrated workflow, supporting hot reloading and automated production builds.

## External Dependencies

- **Supabase**: PostgreSQL database, authentication, and real-time capabilities.
- **Firebase**: Cloud Messaging for push notifications.
- **Neon Database**: Backup PostgreSQL hosting.
- **DeepSeek AI**: AI for prayer assistance and content generation.
- **Google Gemini AI**: AI for Bible Quiz question generation.
- **API.Bible**: Comprehensive Bible verse search and content.
- **Meta WhatsApp Business API**: For the WhatsApp Prayer Reminder Bot.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon system.
- **Framer Motion**: Animations and micro-interactions.
- **React Hook Form**: Form state management and validation.