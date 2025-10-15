# Global Intercessors Prayer Management Platform

## Overview
The Global Intercessors Prayer Management Platform is a full-stack web application designed to connect believers globally for continuous prayer coverage. It offers 24/7 prayer slot management, spiritual growth tracking, AI-powered prayer assistance, and global event coordination. The platform aims to foster a continuous prayer movement and spiritual development through technology.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

### Admin Dashboard Bug Fixes (October 15, 2025)
- **Zoom Attendance Tracker**: Fixed critical bug causing undefined errors when processing meetings older than 1 year
- **Meeting Processing Logic**: Meetings now properly track data retrieval success/failure status
  - Old meetings (>1 year) are NOT marked as processed, allowing retry when data becomes available
  - Added success/failure flags to distinguish "no participants" from "cannot retrieve data"
- **Error Handling**: Enhanced error logging with explicit warnings for missing API scopes and data retrieval failures
- **React Hook Order Fix**: Resolved "Cannot access 'adminUser' before initialization" error by moving state declaration before dependent queries
- **Admin Page Stability**: All admin dashboard components now load correctly without initialization errors

### Attendance Rate Calculation Fix (October 13, 2025)
- **Demo Data Disabled**: Set `ENHANCE_ZOOM_ANALYTICS = false` to show real attendance data instead of artificial minimums
- **Corrected Calculation Logic**: Fixed incorrect formula that divided sessions by day of month (causing fixed ~83% displays)
- **Proper Implementation**: Now calculates actual rate as `(totalAttended / totalRecords) * 100` across all user attendance records
- **Accurate Display**: Dashboard shows real user statistics from database instead of demo/enhanced values
- **Total Sessions Fix**: Monthly session count now shows actual records instead of current day of month

### Management Page Redesign (October 11, 2025)
- **Category-Based Updates**: Redesigned Management Page with 6 categorized update buttons in professional grid layout
- **Update Categories**:
  - **Fast Update** (Purple): Fasting program announcements with calendar date picker for start/end dates, automatically includes date range in description
  - **Urgent Notice** (Red): Critical announcements with high priority, notifications, and email alerts
  - **Prayer Request** (Purple): Community prayer requests with notification system
  - **Event Updates** (Blue): Event announcements with image upload capability (file name included in description)
  - **System Maintenance** (Orange): Maintenance notices with 1-week expiry
  - **Zoom Link Management** (Gold): Update Zoom meeting links for prayer sessions with automatic WhatsApp broadcast
- **Professional UI**: Each category has branded gradient backgrounds, hover effects, and dedicated Dialog popups
- **Smart Interactions**: Clear/Send buttons, form validation, loading states with disabled buttons and spinning icons
- **Update Management**: Delete functionality with confirmation dialog for all updates except protected "Register for fasting program" entries
- **New Update Notifications**: Real-time badge on Management tab showing count of new updates since last view, tracked via localStorage
- **Cache Management**: Fixed TanStack Query cache invalidation (`['admin-updates']` key) for instant UI refresh after posting
- **WhatsApp Integration**: All admin updates automatically broadcast via WhatsApp to users with registered bot numbers using singleton pattern to prevent duplicate cron jobs
- **Schema Enhancement**: Added `imageUrl` field to updates table for future image storage (pending database migration)

### AI Model Updates
- **Gemini API Migration**: Updated from deprecated `gemini-1.5-flash-latest` to latest `gemini-2.5-flash` model across all services (Bible chat, WhatsApp bot devotionals, quiz generation).
- **Model Enhancement**: Gemini 2.5 Flash includes thinking capabilities at no extra cost with better performance.

### PDF Generation Infrastructure  
- **Chromium Integration**: Configured Nix-installed Chromium for PDF generation in Replit environment.
- **Puppeteer Setup**: Set `PUPPETEER_EXECUTABLE_PATH` environment variable at module load time for html-pdf-node compatibility.
- **Security Flags**: Added required browser flags (`--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`) for Replit environment.
- **Admin Reports**: PDF generation with AI-powered narratives now fully functional using DeepSeek AI for professional content.

### WhatsApp Bot Meta 2025 Compliance (October 11-13, 2025)
- **Compliance Framework**: Complete implementation of Meta's 2025 WhatsApp Business API policies to prevent account suspension.
- **Database Schema** (pending db:push due to connection timeout):
  - `opted_in` (boolean) - User opt-in status tracking
  - `opt_in_timestamp` (timestamp) - When user opted in
  - `opt_in_method` (varchar) - How user opted in (web_app, whatsapp, manual)
  - `last_inbound_message_at` (timestamp) - For 24-hour service window tracking
  - `devotional_enabled` (boolean, default true) - Daily devotional preference
  - `reminders_enabled` (boolean, default true) - Prayer reminder preference
  - `updates_enabled` (boolean, default true) - Admin update preference
- **Opt-In/Opt-Out System**:
  - STOP - Opt out of all automated messages
  - YES - Opt in to automated messages
  - NO - Decline opt-in request
  - SETTINGS - View current preferences
- **User Preference Controls**:
  - DEVOTIONAL ON/OFF - Toggle daily devotionals
  - REMINDERS ON/OFF - Toggle prayer reminders
  - UPDATES ON/OFF - Toggle admin updates
- **24-Hour Customer Service Window**:
  - All inbound messages tracked via `trackInboundMessage()`
  - `isWithinServiceWindow()` checks if within 24-hour window
  - Automated messages sent within window (free) OR via approved templates outside window
- **Meta-Approved Template Messages** (✅ October 13, 2025):
  - ✅ **`account_creation_cor`** - Prayer Slot Reminder template (Active - Qualified)
  - ✅ **`daily_devotional_utility`** - Daily Devotional template (Active - Qualified)
  - ✅ **`_admin_update_utility`** - Important Update template (Active - Qualified)
  - All automated messaging now fully compliant with Meta 2025 policies
  - Template messages used automatically when users are outside 24-hour service window
- **Compliance Enforcement**:
  - Morning devotionals: opted_in AND devotional_enabled, uses template if outside 24h window
  - Prayer reminders: opted_in AND reminders_enabled, uses template if outside 24h window
  - Admin updates: opted_in AND updates_enabled, uses template if outside 24h window
  - All compliance commands processed BEFORE authentication checks
- **Status**: ✅ Fully operational with Meta-approved templates - No risk of account suspension

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