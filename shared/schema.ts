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

export type InsertSwimmer = z.infer<typeof insertSwimmerSchema>;
export type Swimmer = typeof swimmers.$inferSelect;

export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;
export type TrainingSession = typeof trainingSessions.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;
