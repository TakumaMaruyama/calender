import { 
  swimmers, 
  trainingSessions, 
  attendance,
  leaderSchedule,
  type Swimmer, 
  type InsertSwimmer,
  type TrainingSession,
  type InsertTrainingSession,
  type Attendance,
  type InsertAttendance,
  type LeaderSchedule,
  type InsertLeaderSchedule
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // Swimmers
  getSwimmer(id: number): Promise<Swimmer | undefined>;
  getAllSwimmers(): Promise<Swimmer[]>;
  createSwimmer(swimmer: InsertSwimmer): Promise<Swimmer>;
  updateSwimmer(id: number, swimmer: Partial<InsertSwimmer>): Promise<Swimmer | undefined>;
  deleteSwimmer(id: number): Promise<boolean>;

  // Training Sessions
  getTrainingSession(id: number): Promise<TrainingSession | undefined>;
  getAllTrainingSessions(): Promise<TrainingSession[]>;
  getTrainingSessionsByDate(date: string): Promise<TrainingSession[]>;
  getTrainingSessionsByMonth(year: number, month: number): Promise<TrainingSession[]>;
  createTrainingSession(session: InsertTrainingSession): Promise<TrainingSession>;
  updateTrainingSession(id: number, session: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined>;
  deleteTrainingSession(id: number): Promise<boolean>;

  // Attendance
  getAttendance(sessionId: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attended: boolean): Promise<Attendance | undefined>;

  // Leader Schedule
  getLeaderForDate(date: string): Promise<{ name: string } | null>;
  getAllLeaderSchedules(): Promise<LeaderSchedule[]>;
  createLeaderSchedule(schedule: InsertLeaderSchedule): Promise<LeaderSchedule>;
  updateLeaderSchedule(id: number, schedule: Partial<InsertLeaderSchedule>): Promise<LeaderSchedule | undefined>;
  deleteLeaderSchedule(id: number): Promise<boolean>;
  generateLeaderSchedule(startDate: string, swimmers: Swimmer[]): Promise<void>;
  setLeaderForDate(date: string, leaderId: number, leaders?: { id: number; name: string; order: number; }[]): Promise<void>;
  deleteFutureTrainingSessions(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with some sample data if database is empty
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    try {
      // Check if data already exists
      const existingSwimmers = await this.getAllSwimmers();
      if (existingSwimmers.length > 0) {
        return; // Data already exists, skip initialization
      }

      // Add sample swimmers
      await this.createSwimmer({
        name: "田中太郎",
        email: "tanaka@example.com",
        lane: 1,
        level: "intermediate"
      });

      await this.createSwimmer({
        name: "佐藤花子",
        email: "sato@example.com",
        lane: 2,
        level: "advanced"
      });

      // リーダースケジュールを初期化（6月2日から元翔でスタート）
      await this.initializeLeaderSchedule();
    } catch (error) {
      console.log("Sample data initialization skipped:", error);
    }
  }

  private async initializeLeaderSchedule() {
    // 既存のスケジュールがある場合はスキップ
    const existingSchedules = await this.getAllLeaderSchedules();
    if (existingSchedules.length > 0) {
      return;
    }

    // リーダーリスト（元翔をID:10に設定）
    const leaders = [
      { id: 1, name: "ののか", order: 1 },
      { id: 2, name: "有理", order: 2 },
      { id: 3, name: "龍之介", order: 3 },
      { id: 4, name: "彩音", order: 4 },
      { id: 5, name: "勘太", order: 5 },
      { id: 6, name: "悠喜", order: 6 },
      { id: 7, name: "佳翔", order: 7 },
      { id: 8, name: "春舞", order: 8 },
      { id: 9, name: "滉介", order: 9 },
      { id: 10, name: "元翔", order: 10 },
      { id: 11, name: "百華", order: 11 },
      { id: 12, name: "澪心", order: 12 },
      { id: 13, name: "礼志", order: 13 },
      { id: 14, name: "桔伊", order: 14 },
      { id: 15, name: "虹日", order: 15 },
      { id: 16, name: "弥広", order: 16 }
    ];

    // 6月2日（月曜日）から元翔（ID:10）でスタート
    const startDate = new Date('2025-06-02');
    let currentDate = new Date(startDate);
    const endOfYear = new Date(startDate);
    endOfYear.setFullYear(endOfYear.getFullYear() + 1);

    // 元翔から始めるためのインデックス設定
    const startLeaderIndex = leaders.findIndex(l => l.id === 10); // 元翔のインデックス
    let currentLeaderIndex = startLeaderIndex;

    while (currentDate < endOfYear) {
      const leader = leaders[currentLeaderIndex % leaders.length];
      
      // 3日間のスケジュールを作成
      const scheduleEndDate = new Date(currentDate);
      scheduleEndDate.setDate(scheduleEndDate.getDate() + 2); // 3日間（開始日含む）

      await this.createLeaderSchedule({
        swimmerId: leader.id,
        startDate: currentDate.toISOString().split('T')[0],
        endDate: scheduleEndDate.toISOString().split('T')[0],
        isActive: true
      });

      // 次のリーダーへ
      currentLeaderIndex++;
      // 次の期間（3日後）へ
      currentDate.setDate(currentDate.getDate() + 3);
    }
  }

  // Swimmers
  async getSwimmer(id: number): Promise<Swimmer | undefined> {
    const [swimmer] = await db.select().from(swimmers).where(eq(swimmers.id, id));
    return swimmer || undefined;
  }

  async getAllSwimmers(): Promise<Swimmer[]> {
    return await db.select().from(swimmers);
  }

  async createSwimmer(insertSwimmer: InsertSwimmer): Promise<Swimmer> {
    const [swimmer] = await db
      .insert(swimmers)
      .values({
        ...insertSwimmer,
        email: insertSwimmer.email || null,
        lane: insertSwimmer.lane || null
      })
      .returning();
    return swimmer;
  }

  async updateSwimmer(id: number, updateData: Partial<InsertSwimmer>): Promise<Swimmer | undefined> {
    const [swimmer] = await db
      .update(swimmers)
      .set({
        ...updateData,
        email: updateData.email || null,
        lane: updateData.lane || null
      })
      .where(eq(swimmers.id, id))
      .returning();
    return swimmer || undefined;
  }

  async deleteSwimmer(id: number): Promise<boolean> {
    const result = await db.delete(swimmers).where(eq(swimmers.id, id));
    return result.rowCount > 0;
  }

  // Training Sessions
  async getTrainingSession(id: number): Promise<TrainingSession | undefined> {
    const [session] = await db.select().from(trainingSessions).where(eq(trainingSessions.id, id));
    return session || undefined;
  }

  async getAllTrainingSessions(): Promise<TrainingSession[]> {
    return await db.select().from(trainingSessions);
  }

  async getTrainingSessionsByDate(date: string): Promise<TrainingSession[]> {
    return await db.select().from(trainingSessions).where(eq(trainingSessions.date, date));
  }

  async getTrainingSessionsByMonth(year: number, month: number): Promise<TrainingSession[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate()}`;
    
    return await db.select()
      .from(trainingSessions)
      .where(and(
        gte(trainingSessions.date, startDate),
        lte(trainingSessions.date, endDateStr)
      ));
  }

  async createTrainingSession(insertSession: InsertTrainingSession): Promise<TrainingSession> {
    const [session] = await db
      .insert(trainingSessions)
      .values({
        ...insertSession,
        title: insertSession.title || null,
        type: insertSession.type || null,
        endTime: insertSession.endTime || null,
        strokes: insertSession.strokes || null,
        distance: insertSession.distance || null,
        intensity: insertSession.intensity || null,
        lanes: insertSession.lanes || null,
        menuDetails: insertSession.menuDetails || null,
        coachNotes: insertSession.coachNotes || null,
        isRecurring: insertSession.isRecurring || false,
        recurringPattern: insertSession.recurringPattern || null,
        recurringEndDate: insertSession.recurringEndDate || null,
        weekdays: insertSession.weekdays || null,
        maxOccurrences: insertSession.maxOccurrences || null
      })
      .returning();
    
    // 繰り返しセッションの場合、追加のセッションを生成
    if (insertSession.isRecurring) {
      await this.generateRecurringSessions(insertSession, session.id);
    }
    
    return session;
  }

  private async generateRecurringSessions(baseSession: InsertTrainingSession, originalSessionId: number): Promise<void> {
    if (!baseSession.recurringPattern || !baseSession.isRecurring) return;

    const startDate = new Date(baseSession.date);
    const endDate = baseSession.recurringEndDate ? new Date(baseSession.recurringEndDate) : null;
    const maxOccurrences = baseSession.maxOccurrences || 50;

    if (baseSession.recurringPattern === 'weekly_by_weekdays' && baseSession.weekdays) {
      await this.generateWeeklyByWeekdays(baseSession, startDate, endDate, maxOccurrences, originalSessionId);
    }
  }

  private async generateWeeklyByWeekdays(
    baseSession: InsertTrainingSession, 
    startDate: Date, 
    endDate: Date | null, 
    maxOccurrences: number,
    originalSessionId: number
  ): Promise<void> {
    if (!baseSession.weekdays || baseSession.weekdays.length === 0) return;

    const weekdays = baseSession.weekdays.map(d => parseInt(d)); // 文字列を数値に変換
    let count = 0;
    let currentWeek = new Date(startDate);
    
    // 最初の週から開始
    currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()); // その週の日曜日に設定

    while (count < maxOccurrences) {
      for (const weekday of weekdays) {
        if (count >= maxOccurrences) break;

        const sessionDate = new Date(currentWeek);
        sessionDate.setDate(sessionDate.getDate() + weekday);

        // 開始日より前はスキップ（開始日は含める）
        if (sessionDate < startDate) continue;

        // 終了日をチェック
        if (endDate && sessionDate > endDate) return;

        // 新しいセッションを作成
        await db.insert(trainingSessions).values({
          ...baseSession,
          date: sessionDate.toISOString().split('T')[0],
          title: baseSession.title || null,
          type: baseSession.type || null,
          endTime: baseSession.endTime || null,
          strokes: baseSession.strokes || null,
          distance: baseSession.distance || null,
          intensity: baseSession.intensity || null,
          lanes: baseSession.lanes || null,
          menuDetails: baseSession.menuDetails || null,
          coachNotes: baseSession.coachNotes || null,
          isRecurring: false,
          recurringPattern: null,
          recurringEndDate: null,
          weekdays: null,
          maxOccurrences: null
        });

        count++;
      }
      
      // 次の週へ
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
  }

  async updateTrainingSession(id: number, updateData: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined> {
    const [session] = await db
      .update(trainingSessions)
      .set({
        ...updateData,
        title: updateData.title || null,
        type: updateData.type || null,
        endTime: updateData.endTime || null,
        strokes: updateData.strokes || null,
        distance: updateData.distance || null,
        intensity: updateData.intensity || null,
        lanes: updateData.lanes || null,
        menuDetails: updateData.menuDetails || null,
        coachNotes: updateData.coachNotes || null,
        recurringPattern: updateData.recurringPattern || null,
        recurringEndDate: updateData.recurringEndDate || null,
        weekdays: updateData.weekdays || null,
        maxOccurrences: updateData.maxOccurrences || null
      })
      .where(eq(trainingSessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteTrainingSession(id: number): Promise<boolean> {
    const result = await db.delete(trainingSessions).where(eq(trainingSessions.id, id));
    return result.rowCount > 0;
  }

  async deleteFutureTrainingSessions(id: number): Promise<boolean> {
    const session = await this.getTrainingSession(id);
    if (!session) return false;

    // この日付以降のセッションを削除
    const result = await db.delete(trainingSessions)
      .where(and(
        gte(trainingSessions.date, session.date),
        eq(trainingSessions.startTime, session.startTime)
      ));
    
    return result.rowCount > 0;
  }

  // Attendance
  async getAttendance(sessionId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.sessionId, sessionId));
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [attendanceRecord] = await db
      .insert(attendance)
      .values({
        ...insertAttendance,
        attended: insertAttendance.attended || null
      })
      .returning();
    return attendanceRecord;
  }

  async updateAttendance(id: number, attended: boolean): Promise<Attendance | undefined> {
    const [attendanceRecord] = await db
      .update(attendance)
      .set({ attended })
      .where(eq(attendance.id, id))
      .returning();
    return attendanceRecord || undefined;
  }

  // Leader Schedule
  async getLeaderForDate(date: string): Promise<{ name: string } | null> {
    const schedules = await db.select().from(leaderSchedule)
      .where(and(
        lte(leaderSchedule.startDate, date),
        gte(leaderSchedule.endDate, date),
        eq(leaderSchedule.isActive, true)
      ));

    if (schedules.length === 0) {
      return null;
    }

    const schedule = schedules[0];
    const swimmers = [
      { id: 1, name: "ののか", order: 1 },
      { id: 2, name: "有理", order: 2 },
      { id: 3, name: "龍之介", order: 3 },
      { id: 4, name: "彩音", order: 4 },
      { id: 5, name: "勘太", order: 5 },
      { id: 6, name: "悠喜", order: 6 },
      { id: 7, name: "佳翔", order: 7 },
      { id: 8, name: "春舞", order: 8 },
      { id: 9, name: "滉介", order: 9 },
      { id: 10, name: "元翔", order: 10 },
      { id: 11, name: "百華", order: 11 },
      { id: 12, name: "澪心", order: 12 },
      { id: 13, name: "礼志", order: 13 },
      { id: 14, name: "桔伊", order: 14 },
      { id: 15, name: "虹日", order: 15 },
      { id: 16, name: "弥広", order: 16 }
    ];

    const swimmer = swimmers.find(s => s.id === schedule.swimmerId);
    return swimmer ? { name: swimmer.name } : null;
  }

  async getAllLeaderSchedules(): Promise<LeaderSchedule[]> {
    return await db.select().from(leaderSchedule);
  }

  async createLeaderSchedule(insertSchedule: InsertLeaderSchedule): Promise<LeaderSchedule> {
    const [schedule] = await db
      .insert(leaderSchedule)
      .values(insertSchedule)
      .returning();
    return schedule;
  }

  async updateLeaderSchedule(id: number, updateData: Partial<InsertLeaderSchedule>): Promise<LeaderSchedule | undefined> {
    const [schedule] = await db
      .update(leaderSchedule)
      .set(updateData)
      .where(eq(leaderSchedule.id, id))
      .returning();
    return schedule || undefined;
  }

  async deleteLeaderSchedule(id: number): Promise<boolean> {
    const result = await db.delete(leaderSchedule).where(eq(leaderSchedule.id, id));
    return result.rowCount > 0;
  }

  async generateLeaderSchedule(startDate: string, swimmersList: Swimmer[]): Promise<void> {
    // Implementation for generating leader schedule
  }

  async setLeaderForDate(date: string, leaderId: number, leaders?: { id: number; name: string; order: number; }[]): Promise<void> {
    // 既存のスケジュールを無効化
    await db.update(leaderSchedule)
      .set({ isActive: false })
      .where(and(
        lte(leaderSchedule.startDate, date),
        gte(leaderSchedule.endDate, date)
      ));

    // 新しいスケジュールを作成
    await this.createLeaderSchedule({
      swimmerId: leaderId,
      startDate: date,
      endDate: date,
      isActive: true
    });
  }
}

export const storage = new DatabaseStorage();