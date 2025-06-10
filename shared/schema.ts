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
