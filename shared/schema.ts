import { pgTable, text, serial, integer, boolean, timestamp, uuid, numeric, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin users table for role-based access
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prayer slots table for managing user prayer assignments
export const prayerSlots = pgTable("prayer_slots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  slotTime: text("slot_time").notNull(), // e.g., "22:00–22:30"
  status: text("status").notNull().default("active"), // "active", "missed", "skipped", "released"
  missedCount: integer("missed_count").notNull().default(0),
  skipStartDate: timestamp("skip_start_date"),
  skipEndDate: timestamp("skip_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Available slots table for slot management
export const availableSlots = pgTable("available_slots", {
  id: serial("id").primaryKey(),
  slotTime: text("slot_time").notNull().unique(), // e.g., "00:00–00:30"
  isAvailable: boolean("is_available").notNull().default(true),
  timezone: text("timezone").notNull().default("UTC"),
});

// Prayer sessions table for tracking completed sessions
export const prayerSessions = pgTable("prayer_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slotTime: text("slot_time").notNull(),
  sessionDate: timestamp("session_date").notNull(),
  status: text("status").notNull(), // "completed", "missed", "skipped"
  duration: integer("duration"), // in minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Attendance log table for Zoom-based tracking
export const attendanceLog = pgTable("attendance_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slotId: integer("slot_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull(), // "attended", "missed"
  zoomJoinTime: timestamp("zoom_join_time"),
  zoomLeaveTime: timestamp("zoom_leave_time"),
  zoomMeetingId: text("zoom_meeting_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zoom meetings table for tracking prayer sessions
export const zoomMeetings = pgTable("zoom_meetings", {
  id: serial("id").primaryKey(),
  meetingId: text("meeting_id").notNull().unique(),
  meetingUuid: text("meeting_uuid").notNull().unique(),
  topic: text("topic").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  participantCount: integer("participant_count").default(0),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// WhatsApp bot users table for managing bot interactions
export const whatsAppBotUsers = pgTable("whatsapp_bot_users", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  whatsAppNumber: text("whatsapp_number").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  reminderPreferences: text("reminder_preferences"), // JSON string for custom preferences
  personalReminderTime: text("personal_reminder_time"), // e.g., "07:00"
  personalReminderDays: text("personal_reminder_days"), // e.g., "Mon,Wed,Fri" or "Everyday"
  timezone: text("timezone").default("UTC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WhatsApp bot messages table for tracking sent messages
export const whatsAppMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  recipientNumber: text("recipient_number").notNull(),
  messageType: text("message_type").notNull(), // "reminder", "devotional", "admin_update", "custom"
  messageContent: text("message_content").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "sent", "delivered", "failed"
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily devotionals table for storing AI-generated content
export const dailyDevotionals = pgTable("daily_devotionals", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  devotionText: text("devotion_text").notNull(),
  bibleVerse: text("bible_verse").notNull(),
  verseReference: text("verse_reference").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// Audio Bible progress table for tracking playback state
export const audioBibleProgress = pgTable("audio_bible_progress", {
  id: serial("id").primaryKey(),
  book: text("book").notNull(),
  chapter: integer("chapter").notNull(),
  verse: integer("verse").default(1),
  lastPlayed: timestamp("last_played").defaultNow().notNull(),
  totalBooks: integer("total_books").default(66),
  totalChapters: integer("total_chapters").notNull(),
  isActive: boolean("is_active").default(false),
  slotTime: text("slot_time"), // Which slot triggered this playback
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fasting registration table
export const fastingRegistrations = pgTable("fasting_registrations", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  region: text("region").notNull(),
  travelCost: text("travel_cost").default("0"),
  gpsLatitude: text("gps_latitude"),
  gpsLongitude: text("gps_longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Updates table for admin announcements
export const updates = pgTable("updates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("general"),
  priority: text("priority").notNull().default("normal"),
  schedule: text("schedule").notNull().default("immediate"),
  expiry: text("expiry").notNull().default("never"),
  sendNotification: boolean("send_notification").default(false),
  sendEmail: boolean("send_email").default(false),
  pinToTop: boolean("pin_to_top").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Skip requests table for managing prayer slot skip requests
export const skipRequests = pgTable("skip_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  skipDays: integer("skip_days").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// Prayer Journey data for personalized visualizations
export const prayerJourney = pgTable("prayer_journey", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  journeyType: text("journey_type").notNull(), // "milestone", "reflection", "insight", "breakthrough"
  title: text("title").notNull(),
  description: text("description"),
  emotionalState: text("emotional_state"), // "joyful", "peaceful", "grateful", "seeking", "troubled", "hopeful"
  prayerFocus: text("prayer_focus"), // "thanksgiving", "petition", "intercession", "praise", "confession"
  scriptureMeditation: text("scripture_meditation"),
  personalNotes: text("personal_notes"),
  isPrivate: boolean("is_private").default(true),
  tags: text("tags").array(), // ["family", "health", "ministry", "guidance", etc.]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prayer goals and spiritual milestones
export const prayerGoals = pgTable("prayer_goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  goalType: text("goal_type").notNull(), // "attendance", "consistency", "duration", "scripture_reading", "fasting"
  title: text("title").notNull(),
  description: text("description"),
  targetValue: integer("target_value"), // days, minutes, chapters, etc.
  currentValue: integer("current_value").default(0),
  targetDate: timestamp("target_date"),
  status: text("status").notNull().default("active"), // "active", "completed", "paused", "cancelled"
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Daily spiritual insights and growth tracking
export const spiritualInsights = pgTable("spiritual_insights", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  insightDate: timestamp("insight_date").notNull(),
  gratitudeNote: text("gratitude_note"),
  prayerRequest: text("prayer_request"),
  answeredPrayer: text("answered_prayer"),
  spiritualGrowthArea: text("spiritual_growth_area"), // "faith", "patience", "love", "wisdom", "forgiveness"
  bibleVerse: text("bible_verse"),
  personalReflection: text("personal_reflection"),
  moodRating: integer("mood_rating"), // 1-10 scale
  faithLevel: integer("faith_level"), // 1-10 scale
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrayerSlotSchema = createInsertSchema(prayerSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAvailableSlotSchema = createInsertSchema(availableSlots).omit({
  id: true,
});

export const insertPrayerSessionSchema = createInsertSchema(prayerSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceLogSchema = createInsertSchema(attendanceLog).omit({
  id: true,
  createdAt: true,
});

export const insertZoomMeetingSchema = createInsertSchema(zoomMeetings).omit({
  id: true,
  createdAt: true,
});

export const insertAudioBibleProgressSchema = createInsertSchema(audioBibleProgress).omit({
  id: true,
  createdAt: true,
});

export const insertFastingRegistrationSchema = createInsertSchema(fastingRegistrations).omit({
  id: true,
  createdAt: true,
});

export const insertUpdatesSchema = createInsertSchema(updates).omit({
  id: true,
  createdAt: true,
});

export const insertSkipRequestSchema = createInsertSchema(skipRequests).omit({
  id: true,
  createdAt: true,
});

export const insertPrayerJourneySchema = createInsertSchema(prayerJourney).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrayerGoalsSchema = createInsertSchema(prayerGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User profiles table for enhanced user information
export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(), // Supabase auth user ID
  email: text("email").notNull(),
  fullName: text("full_name"),
  profilePicture: text("profile_picture"), // URL to profile image
  gender: text("gender"), // "male", "female", "other"
  dateOfBirth: text("date_of_birth"), // YYYY-MM-DD format
  phoneNumber: text("phone_number"),
  country: text("country"),
  city: text("city"),
  timezone: text("timezone").default("UTC"),
  bio: text("bio"),
  spiritualGifts: text("spiritual_gifts").array(), // ["intercession", "prophecy", "healing", etc.]
  prayerPreferences: text("prayer_preferences"), // JSON string for flexible preferences
  isActive: boolean("is_active").default(true),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSpiritualInsightsSchema = createInsertSchema(spiritualInsights).omit({
  id: true,
  createdAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  joinedAt: true,
  updatedAt: true,
});

export const insertWhatsAppBotUserSchema = createInsertSchema(whatsAppBotUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsAppMessageSchema = createInsertSchema(whatsAppMessages).omit({
  id: true,
  createdAt: true,
});

export const insertDailyDevotionalSchema = createInsertSchema(dailyDevotionals).omit({
  id: true,
  generatedAt: true,
});

export type PrayerSlot = typeof prayerSlots.$inferSelect;
export type InsertPrayerSlot = z.infer<typeof insertPrayerSlotSchema>;
export type AvailableSlot = typeof availableSlots.$inferSelect;
export type InsertAvailableSlot = z.infer<typeof insertAvailableSlotSchema>;
export type PrayerSession = typeof prayerSessions.$inferSelect;
export type InsertPrayerSession = z.infer<typeof insertPrayerSessionSchema>;
export type AttendanceLog = typeof attendanceLog.$inferSelect;
export type InsertAttendanceLog = z.infer<typeof insertAttendanceLogSchema>;
export type ZoomMeeting = typeof zoomMeetings.$inferSelect;
export type InsertZoomMeeting = z.infer<typeof insertZoomMeetingSchema>;
export type AudioBibleProgress = typeof audioBibleProgress.$inferSelect;
export type InsertAudioBibleProgress = z.infer<typeof insertAudioBibleProgressSchema>;
export type FastingRegistration = typeof fastingRegistrations.$inferSelect;
export type InsertFastingRegistration = z.infer<typeof insertFastingRegistrationSchema>;
export type Updates = typeof updates.$inferSelect;
export type InsertUpdates = z.infer<typeof insertUpdatesSchema>;
export type SkipRequest = typeof skipRequests.$inferSelect;
export type InsertSkipRequest = z.infer<typeof insertSkipRequestSchema>;
export type PrayerJourney = typeof prayerJourney.$inferSelect;
export type InsertPrayerJourney = z.infer<typeof insertPrayerJourneySchema>;
export type PrayerGoals = typeof prayerGoals.$inferSelect;
export type InsertPrayerGoals = z.infer<typeof insertPrayerGoalsSchema>;
export type SpiritualInsights = typeof spiritualInsights.$inferSelect;
export type InsertSpiritualInsights = z.infer<typeof insertSpiritualInsightsSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type WhatsAppBotUser = typeof whatsAppBotUsers.$inferSelect;
export type InsertWhatsAppBotUser = z.infer<typeof insertWhatsAppBotUserSchema>;
export type WhatsAppMessage = typeof whatsAppMessages.$inferSelect;
export type InsertWhatsAppMessage = z.infer<typeof insertWhatsAppMessageSchema>;
export type DailyDevotional = typeof dailyDevotionals.$inferSelect;
export type InsertDailyDevotional = z.infer<typeof insertDailyDevotionalSchema>;
