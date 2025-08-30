import { pgTable, text, serial, integer, boolean, timestamp, date, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const swimmers = pgTable("swimmers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  lane: integer("lane"),
  level: text("level").notNull(), // beginner, intermediate, advanced
});

export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  title: text("title"), // オプショナル
  type: text("type"), // オプショナル
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  strokes: text("strokes").array(), // freestyle, backstroke, breaststroke, butterfly
  distance: integer("distance"), // in meters
  intensity: text("intensity"), // easy, moderate, hard, race_pace
  lanes: text("lanes"), // e.g., "1-4"
  menuDetails: text("menu_details"),
  coachNotes: text("coach_notes"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"), // daily, weekly, monthly
  recurringEndDate: date("recurring_end_date"),
  weekdays: text("weekdays").array(), // 曜日の配列
  maxOccurrences: integer("max_occurrences"), // 最大繰り返し回数
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  swimmerId: integer("swimmer_id").notNull(),
  sessionId: integer("session_id").notNull(),
  attended: boolean("attended").default(false),
});

export const leaderSchedule = pgTable("leader_schedule", {
  id: serial("id").primaryKey(),
  swimmerId: integer("swimmer_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(true),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  swimmerId: integer("swimmer_id").notNull(),
  scheduleChanges: boolean("schedule_changes").default(true),
  sessionReminders: boolean("session_reminders").default(true),
  leaderAssignments: boolean("leader_assignments").default(true),
  emailNotifications: boolean("email_notifications").default(false),
  pushNotifications: boolean("push_notifications").default(true),
  reminderHours: integer("reminder_hours").default(24), // hours before session
  quietHoursStart: time("quiet_hours_start").default("22:00"),
  quietHoursEnd: time("quiet_hours_end").default("07:00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSwimmerSchema = createInsertSchema(swimmers).omit({
  id: true,
});

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).omit({
  id: true,
}).extend({
  title: z.string().optional(),
  type: z.string().optional(),
}).refine((data) => data.title || data.type, {
  message: "トレーニング名またはトレーニング種類のどちらかを選択してください",
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
});

export const insertLeaderScheduleSchema = createInsertSchema(leaderSchedule).omit({
  id: true,
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSwimmer = z.infer<typeof insertSwimmerSchema>;
export type Swimmer = typeof swimmers.$inferSelect;

export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;
export type TrainingSession = typeof trainingSessions.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export type InsertLeaderSchedule = z.infer<typeof insertLeaderScheduleSchema>;
export type LeaderSchedule = typeof leaderSchedule.$inferSelect;

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
