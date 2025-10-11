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

// Intercessor schedules table for flexible prayer scheduling
export const intercessorSchedules = pgTable("intercessor_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  activeDays: text("active_days").array().notNull().default([]), // ['monday', 'wednesday', 'friday']
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prayer attendance table for tracking daily attendance
export const prayerAttendance = pgTable("prayer_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  prayerDate: text("prayer_date").notNull(), // YYYY-MM-DD format
  isAttended: boolean("is_attended").notNull(),
  scheduledDayOfWeek: integer("scheduled_day_of_week").notNull(), // 0=Sunday, 6=Saturday
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// WhatsApp interactions table for tracking user commands and responses
export const whatsAppInteractions = pgTable("whatsapp_interactions", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  interactionType: text("interaction_type").notNull(), // "command", "button_click", "list_selection", "feature_use"
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Bible Quiz Game Tables
export const bibleQuestions = pgTable("bible_questions", {
  id: serial("id").primaryKey(),
  questionId: text("question_id").notNull().unique(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // "MCQ", "True/False", "Fill-in-the-Blank"
  correctAnswer: text("correct_answer").notNull(),
  options: text("options").array(), // For MCQ options
  explanationText: text("explanation_text").notNull(),
  scriptureReference: text("scripture_reference").notNull(),
  difficultyLevel: text("difficulty_level").notNull(), // "Easy", "Medium", "Hard"
  majorCategory: text("major_category").notNull(), // "Old Testament", "New Testament", "Biblical Themes"
  subcategory: text("subcategory").notNull(),
  book: text("book").notNull(),
  chapter: text("chapter"),
  keywords: text("keywords").array(),
  creationDate: timestamp("creation_date").defaultNow().notNull(),
  lastModifiedDate: timestamp("last_modified_date").defaultNow().notNull(),
  author: text("author").notNull().default("AI Generated"),
  validationStatus: text("validation_status").notNull().default("Approved"),
  correctAnswerRate: real("correct_answer_rate").default(0),
  averageTimeToAnswer: real("average_time_to_answer").default(0),
  usageCount: integer("usage_count").default(0),
});

export const userQuizProgress = pgTable("user_quiz_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  totalScore: integer("total_score").default(0),
  totalXP: integer("total_xp").default(0),
  currentLevel: integer("current_level").default(1),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalQuestionsAnswered: integer("total_questions_answered").default(0),
  totalCorrectAnswers: integer("total_correct_answers").default(0),
  dailyQuestionsToday: integer("daily_questions_today").default(0),
  lastPlayedDate: text("last_played_date"),
  achievements: text("achievements").array().default([]),
  knowledgeGaps: text("knowledge_gaps").array().default([]),
  preferredTopics: text("preferred_topics").array().default([]),
  adaptiveDifficulty: text("adaptive_difficulty").default("Medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quizSessions = pgTable("quiz_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull().unique(),
  sessionType: text("session_type").notNull(), // "daily_quiz", "topic_specific", "challenge", "adaptive"
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  questionsAnswered: integer("questions_answered").default(0),
  correctAnswers: integer("correct_answers").default(0),
  totalScore: integer("total_score").default(0),
  xpEarned: integer("xp_earned").default(0),
  averageResponseTime: real("average_response_time").default(0),
  difficulty: text("difficulty").notNull(),
  topic: text("topic"),
  status: text("status").default("active"), // "active", "completed", "abandoned"
});

export const userQuestionHistory = pgTable("user_question_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  questionId: text("question_id").notNull(),
  sessionId: text("session_id").notNull(),
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  responseTime: real("response_time"), // in seconds
  pointsEarned: integer("points_earned").default(0),
  xpEarned: integer("xp_earned").default(0),
  difficultyAtTime: text("difficulty_at_time").notNull(),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

export const quizAchievements = pgTable("quiz_achievements", {
  id: serial("id").primaryKey(),
  achievementId: text("achievement_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "streak", "mastery", "milestone", "special"
  badgeIcon: text("badge_icon").notNull(),
  requirements: text("requirements").notNull(), // JSON string of requirements
  pointsReward: integer("points_reward").default(0),
  xpReward: integer("xp_reward").default(0),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  achievementId: text("achievement_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  progress: real("progress").default(1.0), // 0.0 to 1.0 for partial achievements
});

export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  challengeDate: text("challenge_date").notNull().unique(), // YYYY-MM-DD
  challengeType: text("challenge_type").notNull(), // "daily_quiz", "themed_challenge", "streak_challenge"
  theme: text("theme"),
  description: text("description").notNull(),
  requiredQuestions: integer("required_questions").default(10),
  difficulty: text("difficulty").default("Mixed"),
  bonusXP: integer("bonus_xp").default(50),
  bonusPoints: integer("bonus_points").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userDailyChallenges = pgTable("user_daily_challenges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id").notNull(),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  pointsEarned: integer("points_earned").default(0),
  xpEarned: integer("xp_earned").default(0),
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

// Insert schemas for new tables
export const insertIntercessorScheduleSchema = createInsertSchema(intercessorSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrayerAttendanceSchema = createInsertSchema(prayerAttendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertWhatsAppInteractionSchema = createInsertSchema(whatsAppInteractions).omit({
  id: true,
  timestamp: true,
});

// Prayer Planner tables
export const prayerPlans = pgTable("prayer_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  planDate: text("plan_date").notNull(), // Date in YYYY-MM-DD format
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prayerPoints = pgTable("prayer_points", {
  id: serial("id").primaryKey(),
  prayerPlanId: text("prayer_plan_id").notNull().references(() => prayerPlans.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("personal"),
  isCompleted: boolean("is_completed").notNull().default(false),
  orderPosition: integer("order_position").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPrayerPlanSchema = createInsertSchema(prayerPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrayerPointSchema = createInsertSchema(prayerPoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type IntercessorSchedule = typeof intercessorSchedules.$inferSelect;
export type InsertIntercessorSchedule = z.infer<typeof insertIntercessorScheduleSchema>;
export type PrayerAttendance = typeof prayerAttendance.$inferSelect;
export type InsertPrayerAttendance = z.infer<typeof insertPrayerAttendanceSchema>;
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

export type PrayerGoals = typeof prayerGoals.$inferSelect;
export type InsertPrayerGoals = z.infer<typeof insertPrayerGoalsSchema>;
export type SpiritualInsights = typeof spiritualInsights.$inferSelect;
export type InsertSpiritualInsights = z.infer<typeof insertSpiritualInsightsSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type WhatsAppBotUser = typeof whatsAppBotUsers.$inferSelect;
export type InsertWhatsAppBotUser = z.infer<typeof insertWhatsAppBotUserSchema>;
export type WhatsAppMessage = typeof whatsAppMessages.$inferSelect;
export type WhatsAppInteraction = typeof whatsAppInteractions.$inferSelect;
export type InsertWhatsAppMessage = z.infer<typeof insertWhatsAppMessageSchema>;
export type InsertWhatsAppInteraction = z.infer<typeof insertWhatsAppInteractionSchema>;
export type DailyDevotional = typeof dailyDevotionals.$inferSelect;
export type InsertDailyDevotional = z.infer<typeof insertDailyDevotionalSchema>;
export type PrayerPlan = typeof prayerPlans.$inferSelect;
export type InsertPrayerPlan = z.infer<typeof insertPrayerPlanSchema>;
export type PrayerPoint = typeof prayerPoints.$inferSelect;
export type InsertPrayerPoint = z.infer<typeof insertPrayerPointSchema>;

// Bible Chat History with 7-day retention
export const bibleChatHistory = pgTable("bible_chat_history", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  user_email: text("user_email").notNull(),
  message_type: text("message_type").notNull(), // "user" or "ai"
  message_content: text("message_content").notNull(),
  
  // AI Response specific fields
  scripture_reference: text("scripture_reference"),
  scripture_text: text("scripture_text"),
  scripture_version: text("scripture_version").default("KJV"),
  ai_explanation: text("ai_explanation"),
  prayer_point: text("prayer_point"),
  
  // Session and timing
  session_id: text("session_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

export const insertBibleChatHistorySchema = createInsertSchema(bibleChatHistory);
export type BibleChatHistory = typeof bibleChatHistory.$inferSelect;
export type InsertBibleChatHistory = z.infer<typeof insertBibleChatHistorySchema>;