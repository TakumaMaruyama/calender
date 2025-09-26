import { 
  swimmers, 
  trainingSessions, 
  attendance,
  leaderSchedule,
  notificationPreferences,
  type Swimmer, 
  type InsertSwimmer,
  type TrainingSession,
  type InsertTrainingSession,
  type Attendance,
  type InsertAttendance,
  type LeaderSchedule,
  type InsertLeaderSchedule,
  type NotificationPreferences,
  type InsertNotificationPreferences
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
  reorderSwimmers(fromId: number, toId: number): Promise<void>;

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

  // Notification Preferences
  getNotificationPreferences(swimmerId: number): Promise<NotificationPreferences | null>;
  createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences>;
  updateNotificationPreferences(swimmerId: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences | undefined>;
  getAllNotificationPreferences(): Promise<NotificationPreferences[]>;
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
      if (existingSwimmers.length >= 16) {
        return; // Leaders already initialized, skip initialization
      }

      // デフォルトのリーダーリストで初期化
      const defaultLeaders = [
        { id: 1, name: "ののか" },
        { id: 2, name: "有理" },
        { id: 3, name: "龍之介" },
        { id: 4, name: "彩音" },
        { id: 5, name: "勘太" },
        { id: 6, name: "悠喜" },
        { id: 7, name: "佳翔" },
        { id: 8, name: "春舞" },
        { id: 9, name: "滉介" },
        { id: 10, name: "元翔" },
        { id: 11, name: "百華" },
        { id: 12, name: "澪心" },
        { id: 13, name: "礼志" },
        { id: 14, name: "桔伊" },
        { id: 15, name: "虹日" },
        { id: 16, name: "弥広" }
      ];

      // リーダーを追加
      for (const leader of defaultLeaders) {
        await db
          .insert(swimmers)
          .values({
            id: leader.id,
            name: leader.name,
            level: "intermediate",
            email: null,
            lane: null
          })
          .onConflictDoNothing(); // 既存データがあれば無視
      }

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
    try {
      const [swimmer] = await db
        .insert(swimmers)
        .values({
          ...insertSwimmer,
          email: insertSwimmer.email || null,
          lane: insertSwimmer.lane || null
        })
        .returning();
      return swimmer;
    } catch (error) {
      console.error("Database error creating swimmer:", error);
      throw new Error(`Failed to create swimmer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    return (result.rowCount ?? 0) > 0;
  }

  async reorderSwimmers(fromId: number, toId: number): Promise<void> {
    // 2つのswimmerの名前を交換する（IDは変更しない）
    try {
      // 現在のswimmerデータを取得
      const fromSwimmer = await this.getSwimmer(fromId);
      const toSwimmer = await this.getSwimmer(toId);
      
      if (!fromSwimmer || !toSwimmer) {
        throw new Error('Swimmer not found');
      }

      // 名前を交換
      await db.update(swimmers)
        .set({ name: toSwimmer.name })
        .where(eq(swimmers.id, fromId));

      await db.update(swimmers)
        .set({ name: fromSwimmer.name })
        .where(eq(swimmers.id, toId));

      console.log(`Swapped names: ${fromSwimmer.name} (ID:${fromId}) <-> ${toSwimmer.name} (ID:${toId})`);

      // 名前交換後、全リーダースケジュールを再生成
      console.log('名前交換後のスケジュール再生成開始');
      const allSwimmers = await this.getAllSwimmers();
      const leaders = allSwimmers.filter(s => s.id >= 1 && s.id <= 18).sort((a, b) => a.id - b.id);
      
      if (leaders.length === 18) {
        // 既存のスケジュールを全削除
        await db.delete(leaderSchedule);
        
        // 8月1日からの正しいスケジュールを再生成
        await this.generateLeaderSchedule('2025-08-01', leaders);
        console.log('スケジュール再生成完了');
      } else {
        console.log(`リーダー数不足: ${leaders.length}/18`);
      }

    } catch (error) {
      console.error('Error reordering swimmers:', error);
      throw error;
    }
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

    switch (baseSession.recurringPattern) {
      case 'daily':
        await this.generateDailySessions(baseSession, startDate, endDate, maxOccurrences);
        break;
      case 'weekly':
        await this.generateWeeklySessions(baseSession, startDate, endDate, maxOccurrences);
        break;
      case 'biweekly':
        await this.generateBiweeklySessions(baseSession, startDate, endDate, maxOccurrences);
        break;
      case 'monthly':
        await this.generateMonthlySessions(baseSession, startDate, endDate, maxOccurrences);
        break;
      case 'weekly_by_weekdays':
        if (baseSession.weekdays) {
          await this.generateWeeklyByWeekdays(baseSession, startDate, endDate, maxOccurrences, originalSessionId);
        }
        break;
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

  private async generateDailySessions(
    baseSession: InsertTrainingSession,
    startDate: Date,
    endDate: Date | null,
    maxOccurrences: number
  ): Promise<void> {
    let count = 0;
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1); // 翌日から開始

    while (count < maxOccurrences) {
      if (endDate && currentDate > endDate) break;

      await db.insert(trainingSessions).values({
        ...baseSession,
        date: currentDate.toISOString().split('T')[0],
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
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  private async generateWeeklySessions(
    baseSession: InsertTrainingSession,
    startDate: Date,
    endDate: Date | null,
    maxOccurrences: number
  ): Promise<void> {
    let count = 0;
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 7); // 1週間後から開始

    while (count < maxOccurrences) {
      if (endDate && currentDate > endDate) break;

      await db.insert(trainingSessions).values({
        ...baseSession,
        date: currentDate.toISOString().split('T')[0],
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
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }

  private async generateBiweeklySessions(
    baseSession: InsertTrainingSession,
    startDate: Date,
    endDate: Date | null,
    maxOccurrences: number
  ): Promise<void> {
    let count = 0;
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 14); // 2週間後から開始

    while (count < maxOccurrences) {
      if (endDate && currentDate > endDate) break;

      await db.insert(trainingSessions).values({
        ...baseSession,
        date: currentDate.toISOString().split('T')[0],
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
      currentDate.setDate(currentDate.getDate() + 14);
    }
  }

  private async generateMonthlySessions(
    baseSession: InsertTrainingSession,
    startDate: Date,
    endDate: Date | null,
    maxOccurrences: number
  ): Promise<void> {
    let count = 0;
    let currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + 1); // 1ヶ月後から開始

    while (count < maxOccurrences) {
      if (endDate && currentDate > endDate) break;

      await db.insert(trainingSessions).values({
        ...baseSession,
        date: currentDate.toISOString().split('T')[0],
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
      currentDate.setMonth(currentDate.getMonth() + 1);
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
    return (result.rowCount ?? 0) > 0;
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
    
    return (result.rowCount ?? 0) > 0;
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
    // クライアント側から動的にリーダーリストを取得する代わりに、データベースから取得
    const swimmer = await this.getSwimmer(schedule.swimmerId);
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
    return (result.rowCount ?? 0) > 0;
  }

  async generateLeaderSchedule(startDate: string, swimmersList: Swimmer[]): Promise<void> {
    console.log("Starting generateLeaderSchedule with:", { startDate, swimmerCount: swimmersList.length });
    
    // 既存のスケジュールを削除
    const deleteResult = await db.delete(leaderSchedule)
      .where(gte(leaderSchedule.startDate, startDate));
    console.log("Deleted existing schedules:", deleteResult);

    // スイマーリストをID順にソート
    const sortedSwimmers = swimmersList.sort((a, b) => a.id - b.id);
    console.log("Sorted swimmers:", sortedSwimmers.map(s => ({ id: s.id, name: s.name })));
    
    // 開始日から6ヶ月先まで3日制ローテーションを生成
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + 6);
    console.log("Date range:", { start: start.toISOString(), end: endDate.toISOString() });

    let currentDate = new Date(start);
    let swimmerIndex = 0;
    let scheduleCount = 0;

    while (currentDate <= endDate) {
      const currentSwimmer = sortedSwimmers[swimmerIndex];
      console.log(`Creating schedule ${scheduleCount + 1}: swimmer ${currentSwimmer.name} (id: ${currentSwimmer.id}) from ${currentDate.toISOString().split('T')[0]}`);
      
      // 3日間のスケジュールを作成
      const scheduleEndDate = new Date(currentDate);
      scheduleEndDate.setDate(scheduleEndDate.getDate() + 2); // 3日間

      try {
        // 新しいスケジュールを作成
        const newSchedule = await this.createLeaderSchedule({
          swimmerId: currentSwimmer.id,
          startDate: currentDate.toISOString().split('T')[0],
          endDate: scheduleEndDate.toISOString().split('T')[0],
          isActive: true
        });
        console.log("Created schedule:", newSchedule);
        scheduleCount++;
      } catch (error) {
        console.error("Error creating schedule:", error);
        throw error;
      }

      // 次のスイマーに移動（循環）
      swimmerIndex = (swimmerIndex + 1) % sortedSwimmers.length;

      // 次の3日間に移動
      currentDate.setDate(currentDate.getDate() + 3);
    }
    
    console.log(`Generated ${scheduleCount} schedules successfully`);
  }

  async setLeaderForDate(date: string, leaderId: number): Promise<void> {
    console.log(`シンプルリーダー設定: ${date}, leaderId: ${leaderId}`);
    
    // 全リーダーをIDの順序で取得（すべてのスイマー）
    const allLeaders = await db.select().from(swimmers)
      .orderBy(swimmers.id);
    
    console.log('全リーダー:', allLeaders.map(l => `${l.id}:${l.name}`));
    
    if (allLeaders.length === 0) {
      throw new Error('リーダーが見つかりません');
    }
    
    // 選択されたリーダーのインデックス
    const selectedIndex = allLeaders.findIndex(l => l.id === leaderId);
    if (selectedIndex === -1) {
      throw new Error(`リーダーID ${leaderId} が見つかりません`);
    }
    
    console.log(`選択リーダーインデックス: ${selectedIndex} (${allLeaders[selectedIndex].name})`);
    
    // 指定日以降を全削除
    await db.delete(leaderSchedule).where(gte(leaderSchedule.startDate, date));
    
    // 3日ローテーションを指定日から開始
    let rotationDate = new Date(date);
    let currentSwimmerIndex = selectedIndex;
    
    // 6ヶ月先まで生成
    const scheduleEndDate = new Date(rotationDate);
    scheduleEndDate.setMonth(scheduleEndDate.getMonth() + 6);
    
    while (rotationDate <= scheduleEndDate) {
      const currentSwimmer = allLeaders[currentSwimmerIndex];
      
      // 3日間のスケジュールを作成
      const periodEndDate = new Date(rotationDate);
      periodEndDate.setDate(periodEndDate.getDate() + 2); // 3日間
      
      await this.createLeaderSchedule({
        swimmerId: currentSwimmer.id,
        startDate: rotationDate.toISOString().split('T')[0],
        endDate: periodEndDate.toISOString().split('T')[0],
        isActive: true
      });
      
      // 次のスイマーに移動（循環）
      currentSwimmerIndex = (currentSwimmerIndex + 1) % allLeaders.length;
      
      // 次の3日間に移動
      rotationDate.setDate(rotationDate.getDate() + 3);
    }
    
    console.log('ローテーション完了');
  }

  async syncLeaders(leaders: { id: number; name: string; order: number; }[]): Promise<void> {
    // すべての既存スイマーを取得
    const existingSwimmers = await this.getAllSwimmers();
    
    // リーダーリストの各項目を処理
    for (const leader of leaders) {
      try {
        // 名前でマッチするスイマーを探す
        const existingSwimmer = existingSwimmers.find(swimmer => swimmer.name === leader.name);
        
        if (!existingSwimmer) {
          // 新しいスイマーを作成
          await db
            .insert(swimmers)
            .values({
              id: leader.id,
              name: leader.name,
              level: "intermediate",
              email: null,
              lane: null
            })
            .onConflictDoUpdate({
              target: swimmers.id,
              set: { 
                name: leader.name,
                level: "intermediate"
              }
            });
        } else if (existingSwimmer.id !== leader.id) {
          // IDが異なる場合は、フロントエンドのIDに合わせる
          // まず古いIDのデータを削除してから新しいIDで作成
          await db.delete(swimmers).where(eq(swimmers.id, existingSwimmer.id));
          await db
            .insert(swimmers)
            .values({
              id: leader.id,
              name: leader.name,
              level: existingSwimmer.level || "intermediate",
              email: existingSwimmer.email,
              lane: existingSwimmer.lane
            })
            .onConflictDoUpdate({
              target: swimmers.id,
              set: { 
                name: leader.name,
                level: existingSwimmer.level || "intermediate"
              }
            });
        }
      } catch (error) {
        console.error(`リーダー同期エラー (${leader.name}):`, error);
        // 同期に失敗した個別のリーダーがあっても続行
      }
    }
  }

  // Notification Preferences
  async getNotificationPreferences(swimmerId: number): Promise<NotificationPreferences | null> {
    const [preferences] = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.swimmerId, swimmerId));
    return preferences || null;
  }

  async createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const [newPreferences] = await db
      .insert(notificationPreferences)
      .values(preferences)
      .returning();
    return newPreferences;
  }

  async updateNotificationPreferences(swimmerId: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences | undefined> {
    const [updatedPreferences] = await db
      .update(notificationPreferences)
      .set(preferences)
      .where(eq(notificationPreferences.swimmerId, swimmerId))
      .returning();
    return updatedPreferences || undefined;
  }

  async getAllNotificationPreferences(): Promise<NotificationPreferences[]> {
    return await db.select().from(notificationPreferences);
  }
}

// Temporary MemoryStorage implementation to resolve database connection issues
class MemoryStorage implements IStorage {
  private swimmers: Swimmer[] = [];
  private trainingSessions: TrainingSession[] = [];
  private attendance: Attendance[] = [];
  private leaderSchedules: LeaderSchedule[] = [];
  private notificationPrefs: NotificationPreferences[] = [];
  private nextId = 1;

  constructor() {
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Initialize with 100 sample swimmers to support full leader capacity
    const sampleSwimmers = [
      "田中太郎", "佐藤花子", "山田次郎", "鈴木美咲", "高橋健太", "伊藤里奈", "渡辺勇", "中村彩", 
      "小林大輔", "加藤美和", "吉田翔太", "山本愛", "松本健", "井上麻衣", "木村拓也", "斎藤優",
      "森下健司", "長谷川美穂", "福田大樹", "青木優花", "中島康平", "橋本沙織", "西田翔太", "岡田美里",
      "村上雄一", "近藤愛美", "石川智也", "上田麻衣", "原田勇気", "野口彩乃", "平田大地", "坂本由香",
      "池田俊介", "小川美咲", "松井健太", "谷口里奈", "清水翔", "宮崎愛", "柴田大輔", "堀川美和",
      "今井翔太", "大野愛梨", "内田健", "山下麻衣", "小島拓也", "土屋優", "新井彩", "片山勇",
      // 追加の52人（48+52=100人）
      "藤田健太", "酒井美穂", "田村大輔", "松田愛", "中川翔太", "竹内麻衣", "金子拓也", "林優花",
      "山口健司", "大塚美和", "森田翔", "永田愛美", "前田大地", "岩田彩乃", "水野俊介", "古川麻衣",
      "熊谷健太", "菊地里奈", "石田翔太", "三浦愛", "沢田大輔", "阿部美咲", "関根健", "米田麻衣",
      "後藤拓也", "桜井優", "野田彩", "豊田勇", "本田美穂", "増田健司", "島田愛美", "西村大地",
      "小野彩乃", "河野俊介", "山崎麻衣", "大橋健太", "高木里奈", "佐々木翔", "平野愛", "渋谷大輔",
      "横山美和", "宮本翔太", "安田愛梨", "服部健", "矢野麻衣", "秋山拓也", "岡本優", "北村彩",
      "上野勇", "須藤美穂", "栗原健司", "望月愛美", "堀大地", "島彩乃"
    ];

    this.swimmers = sampleSwimmers.map((name, index) => {
      const swimmer: Swimmer = {
        id: index + 1,
        name,
        email: `swimmer${index + 1}@example.com`,
        lane: (index % 8) + 1,
        level: index < 12 ? "beginner" : index < 24 ? "intermediate" : "advanced"
      };
      return swimmer;
    });

    this.nextId = this.swimmers.length + 1;
  }

  // Swimmers
  async getSwimmer(id: number): Promise<Swimmer | undefined> {
    return this.swimmers.find(s => s.id === id);
  }

  async getAllSwimmers(): Promise<Swimmer[]> {
    return [...this.swimmers];
  }

  async createSwimmer(swimmer: InsertSwimmer): Promise<Swimmer> {
    const newSwimmer: Swimmer = { 
      id: this.nextId++,
      name: swimmer.name,
      email: swimmer.email || null,
      lane: swimmer.lane || null,
      level: swimmer.level
    };
    this.swimmers.push(newSwimmer);
    return newSwimmer;
  }

  async updateSwimmer(id: number, swimmer: Partial<InsertSwimmer>): Promise<Swimmer | undefined> {
    const index = this.swimmers.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    this.swimmers[index] = { ...this.swimmers[index], ...swimmer };
    return this.swimmers[index];
  }

  async deleteSwimmer(id: number): Promise<boolean> {
    const index = this.swimmers.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.swimmers.splice(index, 1);
    return true;
  }

  async reorderSwimmers(fromId: number, toId: number): Promise<void> {
    // Simple reorder implementation
    const fromIndex = this.swimmers.findIndex(s => s.id === fromId);
    const toIndex = this.swimmers.findIndex(s => s.id === toId);
    if (fromIndex !== -1 && toIndex !== -1) {
      const [removed] = this.swimmers.splice(fromIndex, 1);
      this.swimmers.splice(toIndex, 0, removed);
    }
  }

  // Training Sessions
  async getTrainingSession(id: number): Promise<TrainingSession | undefined> {
    return this.trainingSessions.find(s => s.id === id);
  }

  async getAllTrainingSessions(): Promise<TrainingSession[]> {
    return [...this.trainingSessions];
  }

  async getTrainingSessionsByDate(date: string): Promise<TrainingSession[]> {
    return this.trainingSessions.filter(s => s.date === date);
  }

  async getTrainingSessionsByMonth(year: number, month: number): Promise<TrainingSession[]> {
    return this.trainingSessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate.getFullYear() === year && sessionDate.getMonth() + 1 === month;
    });
  }

  async createTrainingSession(session: InsertTrainingSession): Promise<TrainingSession> {
    const newSession: TrainingSession = { 
      ...session, 
      id: this.nextId++,
      type: session.type || null,
      title: session.title || null,
      endTime: session.endTime || null,
      strokes: session.strokes || null,
      distance: session.distance || null,
      intensity: session.intensity || null,
      lanes: session.lanes || null,
      menuDetails: session.menuDetails || null,
      coachNotes: session.coachNotes || null,
      isRecurring: session.isRecurring || false,
      recurringPattern: session.recurringPattern || null,
      recurringEndDate: session.recurringEndDate || null,
      weekdays: session.weekdays || null,
      maxOccurrences: session.maxOccurrences || null
    };
    this.trainingSessions.push(newSession);
    return newSession;
  }

  async updateTrainingSession(id: number, session: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined> {
    const index = this.trainingSessions.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    this.trainingSessions[index] = { ...this.trainingSessions[index], ...session };
    return this.trainingSessions[index];
  }

  async deleteTrainingSession(id: number): Promise<boolean> {
    const index = this.trainingSessions.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.trainingSessions.splice(index, 1);
    return true;
  }

  async deleteFutureTrainingSessions(id: number): Promise<boolean> {
    const session = this.trainingSessions.find(s => s.id === id);
    if (!session) return false;
    
    const sessionDate = new Date(session.date);
    this.trainingSessions = this.trainingSessions.filter(s => {
      const date = new Date(s.date);
      return date <= sessionDate || s.id === id;
    });
    return true;
  }

  // Attendance
  async getAttendance(sessionId: number): Promise<Attendance[]> {
    return this.attendance.filter(a => a.sessionId === sessionId);
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const newAttendance: Attendance = { 
      ...attendance, 
      id: this.nextId++,
      attended: attendance.attended !== undefined ? attendance.attended : false
    };
    this.attendance.push(newAttendance);
    return newAttendance;
  }

  async updateAttendance(id: number, attended: boolean): Promise<Attendance | undefined> {
    const index = this.attendance.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    this.attendance[index] = { ...this.attendance[index], attended };
    return this.attendance[index];
  }

  // Leader Schedule
  async getLeaderForDate(date: string): Promise<{ name: string } | null> {
    const schedule = this.leaderSchedules.find(ls => 
      ls.startDate <= date && ls.endDate >= date && ls.isActive
    );
    if (!schedule) return null;
    
    const swimmer = this.swimmers.find(s => s.id === schedule.swimmerId);
    return swimmer ? { name: swimmer.name } : null;
  }

  async getAllLeaderSchedules(): Promise<LeaderSchedule[]> {
    return [...this.leaderSchedules];
  }

  async createLeaderSchedule(schedule: InsertLeaderSchedule): Promise<LeaderSchedule> {
    const newSchedule: LeaderSchedule = { 
      ...schedule, 
      id: this.nextId++,
      isActive: schedule.isActive !== undefined ? schedule.isActive : true
    };
    this.leaderSchedules.push(newSchedule);
    return newSchedule;
  }

  async updateLeaderSchedule(id: number, schedule: Partial<InsertLeaderSchedule>): Promise<LeaderSchedule | undefined> {
    const index = this.leaderSchedules.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    this.leaderSchedules[index] = { ...this.leaderSchedules[index], ...schedule };
    return this.leaderSchedules[index];
  }

  async deleteLeaderSchedule(id: number): Promise<boolean> {
    const index = this.leaderSchedules.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.leaderSchedules.splice(index, 1);
    return true;
  }

  async generateLeaderSchedule(startDate: string, swimmers: Swimmer[]): Promise<void> {
    // Enhanced leader schedule generation - supports up to 100 leaders
    const leaders = swimmers.slice(0, Math.min(swimmers.length, 100));
    const start = new Date(startDate);
    
    leaders.forEach((leader, index) => {
      const scheduleStart = new Date(start);
      scheduleStart.setDate(start.getDate() + (index * 7));
      const scheduleEnd = new Date(scheduleStart);
      scheduleEnd.setDate(scheduleStart.getDate() + 6);
      
      this.leaderSchedules.push({
        id: this.nextId++,
        swimmerId: leader.id,
        startDate: scheduleStart.toISOString().split('T')[0],
        endDate: scheduleEnd.toISOString().split('T')[0],
        isActive: true
      });
    });
  }

  async setLeaderForDate(date: string, leaderId: number): Promise<void> {
    // Update or create leader schedule for specific date
    const existingIndex = this.leaderSchedules.findIndex(ls => 
      ls.startDate <= date && ls.endDate >= date
    );
    
    if (existingIndex !== -1) {
      this.leaderSchedules[existingIndex].swimmerId = leaderId;
    } else {
      this.leaderSchedules.push({
        id: this.nextId++,
        swimmerId: leaderId,
        startDate: date,
        endDate: date,
        isActive: true
      });
    }
  }

  // Notification Preferences
  async getNotificationPreferences(swimmerId: number): Promise<NotificationPreferences | null> {
    return this.notificationPrefs.find(p => p.swimmerId === swimmerId) || null;
  }

  async createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const now = new Date();
    const newPrefs: NotificationPreferences = { 
      ...preferences, 
      id: this.nextId++,
      scheduleChanges: preferences.scheduleChanges !== undefined ? preferences.scheduleChanges : true,
      sessionReminders: preferences.sessionReminders !== undefined ? preferences.sessionReminders : true,
      leaderAssignments: preferences.leaderAssignments !== undefined ? preferences.leaderAssignments : true,
      emailNotifications: preferences.emailNotifications !== undefined ? preferences.emailNotifications : false,
      pushNotifications: preferences.pushNotifications !== undefined ? preferences.pushNotifications : true,
      reminderHours: preferences.reminderHours !== undefined ? preferences.reminderHours : 24,
      quietHoursStart: preferences.quietHoursStart || "22:00",
      quietHoursEnd: preferences.quietHoursEnd || "07:00",
      createdAt: now,
      updatedAt: now
    };
    this.notificationPrefs.push(newPrefs);
    return newPrefs;
  }

  async updateNotificationPreferences(swimmerId: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences | undefined> {
    const index = this.notificationPrefs.findIndex(p => p.swimmerId === swimmerId);
    if (index === -1) return undefined;
    this.notificationPrefs[index] = { ...this.notificationPrefs[index], ...preferences };
    return this.notificationPrefs[index];
  }

  async getAllNotificationPreferences(): Promise<NotificationPreferences[]> {
    return [...this.notificationPrefs];
  }
}

// Use MemoryStorage temporarily until database connection is fixed
export const storage = new MemoryStorage();