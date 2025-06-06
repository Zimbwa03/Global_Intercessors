import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PrayerSlot = typeof prayerSlots.$inferSelect;
export type InsertPrayerSlot = z.infer<typeof insertPrayerSlotSchema>;
export type AvailableSlot = typeof availableSlots.$inferSelect;
export type InsertAvailableSlot = z.infer<typeof insertAvailableSlotSchema>;
export type PrayerSession = typeof prayerSessions.$inferSelect;
export type InsertPrayerSession = z.infer<typeof insertPrayerSessionSchema>;
