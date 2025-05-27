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
  getLeaderForDate(date: string): Promise<Swimmer | null>;
  getAllLeaderSchedules(): Promise<LeaderSchedule[]>;
  createLeaderSchedule(schedule: InsertLeaderSchedule): Promise<LeaderSchedule>;
  updateLeaderSchedule(id: number, schedule: Partial<InsertLeaderSchedule>): Promise<LeaderSchedule | undefined>;
  deleteLeaderSchedule(id: number): Promise<boolean>;
  generateLeaderSchedule(startDate: string, swimmers: Swimmer[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private swimmers: Map<number, Swimmer>;
  private trainingSessions: Map<number, TrainingSession>;
  private attendance: Map<number, Attendance>;
  private leaderSchedules: Map<number, LeaderSchedule>;
  private currentSwimmerId: number;
  private currentSessionId: number;
  private currentAttendanceId: number;
  private currentLeaderScheduleId: number;

  constructor() {
    this.swimmers = new Map();
    this.trainingSessions = new Map();
    this.attendance = new Map();
    this.leaderSchedules = new Map();
    this.currentSwimmerId = 1;
    this.currentSessionId = 1;
    this.currentAttendanceId = 1;
    this.currentLeaderScheduleId = 1;

    // Initialize with some sample data
    this.initializeSampleData();
  }

  private async initializeSampleData() {
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

    // Add sample training sessions
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    await this.createTrainingSession({
      title: "有酸素トレーニング",
      type: "aerobic",
      date: todayStr,
      startTime: "06:00",
      endTime: "07:30",
      strokes: ["freestyle"],
      distance: 3000,
      intensity: "easy",
      lanes: "1-4",
      menuDetails: "ウォームアップ: 400m 自由形 Easy\nメイン: 20×100m 自由形 Moderate (Rest: 15秒)\nクールダウン: 200m 背泳ぎ Easy",
      coachNotes: "フォームに重点を置く",
      isRecurring: false,
      recurringPattern: null,
      recurringEndDate: null
    });

    await this.createTrainingSession({
      title: "スプリント練習",
      type: "sprint",
      date: todayStr,
      startTime: "19:00",
      endTime: "20:30",
      strokes: ["freestyle"],
      distance: 800,
      intensity: "race_pace",
      lanes: "5-8",
      menuDetails: "ウォームアップ: 400m 自由形 Easy\nメイン: 8×50m 自由形 Race Pace (Rest: 30秒)\nクールダウン: 200m 背泳ぎ Easy",
      coachNotes: "タイムを記録する",
      isRecurring: false,
      recurringPattern: null,
      recurringEndDate: null
    });
  }

  // Swimmers
  async getSwimmer(id: number): Promise<Swimmer | undefined> {
    return this.swimmers.get(id);
  }

  async getAllSwimmers(): Promise<Swimmer[]> {
    return Array.from(this.swimmers.values());
  }

  async createSwimmer(insertSwimmer: InsertSwimmer): Promise<Swimmer> {
    const id = this.currentSwimmerId++;
    const swimmer: Swimmer = { ...insertSwimmer, id };
    this.swimmers.set(id, swimmer);
    return swimmer;
  }

  async updateSwimmer(id: number, updateData: Partial<InsertSwimmer>): Promise<Swimmer | undefined> {
    const swimmer = this.swimmers.get(id);
    if (!swimmer) return undefined;
    
    const updatedSwimmer = { ...swimmer, ...updateData };
    this.swimmers.set(id, updatedSwimmer);
    return updatedSwimmer;
  }

  async deleteSwimmer(id: number): Promise<boolean> {
    return this.swimmers.delete(id);
  }

  // Training Sessions
  async getTrainingSession(id: number): Promise<TrainingSession | undefined> {
    return this.trainingSessions.get(id);
  }

  async getAllTrainingSessions(): Promise<TrainingSession[]> {
    return Array.from(this.trainingSessions.values());
  }

  async getTrainingSessionsByDate(date: string): Promise<TrainingSession[]> {
    return Array.from(this.trainingSessions.values()).filter(
      session => session.date === date
    );
  }

  async getTrainingSessionsByMonth(year: number, month: number): Promise<TrainingSession[]> {
    return Array.from(this.trainingSessions.values()).filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate.getFullYear() === year && sessionDate.getMonth() === month - 1;
    });
  }

  async createTrainingSession(insertSession: InsertTrainingSession): Promise<TrainingSession> {
    const id = this.currentSessionId++;
    const session: TrainingSession = { ...insertSession, id };
    this.trainingSessions.set(id, session);

    // 繰り返し設定がある場合は追加のセッションを生成
    if (insertSession.isRecurring && insertSession.recurringPattern) {
      this.generateRecurringSessions(insertSession);
    }

    return session;
  }

  private generateRecurringSessions(baseSession: InsertTrainingSession): void {
    if (!baseSession.recurringPattern) return;

    const startDate = new Date(baseSession.date);
    const endDate = baseSession.recurringEndDate ? new Date(baseSession.recurringEndDate) : null;
    const maxOccurrences = baseSession.maxOccurrences || 50; // デフォルト最大50回
    
    let currentDate = new Date(startDate);
    let count = 0;

    while (count < maxOccurrences) {
      // 次の日付を計算
      switch (baseSession.recurringPattern) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          if (baseSession.weekdays && baseSession.weekdays.length > 0) {
            // 指定された曜日のみ
            this.generateWeeklyByWeekdays(baseSession, startDate, endDate, maxOccurrences);
            return;
          } else {
            currentDate.setDate(currentDate.getDate() + 7);
          }
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          return;
      }

      // 終了日をチェック
      if (endDate && currentDate > endDate) {
        break;
      }

      // 新しいセッションを作成
      const newId = this.currentSessionId++;
      const newSession: TrainingSession = {
        ...baseSession,
        id: newId,
        date: currentDate.toISOString().split('T')[0],
        isRecurring: false, // 生成されたセッションは繰り返しマークを外す
        recurringPattern: null,
        recurringEndDate: null
      };
      
      this.trainingSessions.set(newId, newSession);
      count++;

      // 日付が未来すぎる場合は停止（1年後まで）
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (currentDate > oneYearFromNow) {
        break;
      }
    }
  }

  private generateWeeklyByWeekdays(baseSession: InsertTrainingSession, startDate: Date, endDate: Date | null, maxOccurrences: number): void {
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

        // 開始日より前はスキップ
        if (sessionDate <= startDate) continue;

        // 終了日をチェック
        if (endDate && sessionDate > endDate) return;

        // 新しいセッションを作成
        const newId = this.currentSessionId++;
        const newSession: TrainingSession = {
          ...baseSession,
          id: newId,
          date: sessionDate.toISOString().split('T')[0],
          type: baseSession.type || null,
          title: baseSession.title || null,
          endTime: baseSession.endTime || null,
          strokes: baseSession.strokes || null,
          distance: baseSession.distance || null,
          intensity: baseSession.intensity || null,
          lanes: baseSession.lanes || null,
          menuDetails: baseSession.menuDetails || null,
          coachNotes: baseSession.coachNotes || null,
          isRecurring: false,
          recurringPattern: null,
          recurringEndDate: null
        };
        
        this.trainingSessions.set(newId, newSession);
        count++;

        // 日付が未来すぎる場合は停止
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (sessionDate > oneYearFromNow) return;
      }
      
      // 次の週へ
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
  }

  async updateTrainingSession(id: number, updateData: Partial<InsertTrainingSession>): Promise<TrainingSession | undefined> {
    const session = this.trainingSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updateData };
    this.trainingSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteTrainingSession(id: number): Promise<boolean> {
    return this.trainingSessions.delete(id);
  }

  // Attendance
  async getAttendance(sessionId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(
      att => att.sessionId === sessionId
    );
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = this.currentAttendanceId++;
    const attendance: Attendance = { ...insertAttendance, id };
    this.attendance.set(id, attendance);
    return attendance;
  }

  async updateAttendance(id: number, attended: boolean): Promise<Attendance | undefined> {
    const attendance = this.attendance.get(id);
    if (!attendance) return undefined;
    
    const updatedAttendance = { ...attendance, attended };
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
  }

  // Leader Schedule methods
  async getLeaderForDate(date: string): Promise<Swimmer | null> {
    const targetDate = new Date(date);
    
    for (const schedule of this.leaderSchedules.values()) {
      if (!schedule.isActive) continue;
      
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      
      if (targetDate >= start && targetDate <= end) {
        return this.swimmers.get(schedule.swimmerId) || null;
      }
    }
    
    return null;
  }

  async getAllLeaderSchedules(): Promise<LeaderSchedule[]> {
    return Array.from(this.leaderSchedules.values());
  }

  async createLeaderSchedule(insertSchedule: InsertLeaderSchedule): Promise<LeaderSchedule> {
    const id = this.currentLeaderScheduleId++;
    const schedule: LeaderSchedule = { 
      ...insertSchedule, 
      id,
      isActive: insertSchedule.isActive ?? true
    };
    this.leaderSchedules.set(id, schedule);
    return schedule;
  }

  async updateLeaderSchedule(id: number, updateData: Partial<InsertLeaderSchedule>): Promise<LeaderSchedule | undefined> {
    const schedule = this.leaderSchedules.get(id);
    if (!schedule) return undefined;
    
    const updatedSchedule = { ...schedule, ...updateData };
    this.leaderSchedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteLeaderSchedule(id: number): Promise<boolean> {
    return this.leaderSchedules.delete(id);
  }

  async generateLeaderSchedule(startDate: string, swimmers: Swimmer[]): Promise<void> {
    if (swimmers.length === 0) return;

    const start = new Date(startDate);
    const today = new Date();
    
    // 開始日が過去の場合は今日から開始
    if (start < today) {
      start.setTime(today.getTime());
    }

    // 月曜日から開始するように調整
    const dayOfWeek = start.getDay();
    if (dayOfWeek !== 1) { // 月曜日でない場合
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      start.setDate(start.getDate() + daysUntilMonday);
    }

    // 既存のスケジュールを無効化
    for (const schedule of this.leaderSchedules.values()) {
      if (schedule.isActive) {
        schedule.isActive = false;
      }
    }

    // 新しいスケジュールを生成（1年分）
    let currentSwimmerIndex = 0;
    let currentDate = new Date(start);
    const endOfYear = new Date(start);
    endOfYear.setFullYear(endOfYear.getFullYear() + 1);

    while (currentDate < endOfYear) {
      const swimmer = swimmers[currentSwimmerIndex % swimmers.length];
      
      // 3日間のスケジュールを作成（月曜〜水曜、金曜〜日曜）
      const scheduleEndDate = new Date(currentDate);
      
      // 月曜日の場合は水曜日まで
      if (currentDate.getDay() === 1) {
        scheduleEndDate.setDate(scheduleEndDate.getDate() + 2); // 水曜日
      }
      // 金曜日の場合は日曜日まで
      else if (currentDate.getDay() === 5) {
        scheduleEndDate.setDate(scheduleEndDate.getDate() + 2); // 日曜日
      }

      await this.createLeaderSchedule({
        swimmerId: swimmer.id,
        startDate: currentDate.toISOString().split('T')[0],
        endDate: scheduleEndDate.toISOString().split('T')[0],
        isActive: true
      });

      // 次のリーダーへ
      currentSwimmerIndex++;

      // 次の更新日へ（月曜日または金曜日）
      if (currentDate.getDay() === 1) {
        // 月曜日の場合、次の金曜日へ
        currentDate.setDate(currentDate.getDate() + 4);
      } else {
        // 金曜日の場合、次の月曜日へ
        currentDate.setDate(currentDate.getDate() + 3);
      }
    }
  }
}

export const storage = new MemStorage();
