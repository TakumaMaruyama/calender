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
  getLeaderForDate(date: string): Promise<{ name: string } | null>;
  getAllLeaderSchedules(): Promise<LeaderSchedule[]>;
  createLeaderSchedule(schedule: InsertLeaderSchedule): Promise<LeaderSchedule>;
  updateLeaderSchedule(id: number, schedule: Partial<InsertLeaderSchedule>): Promise<LeaderSchedule | undefined>;
  deleteLeaderSchedule(id: number): Promise<boolean>;
  generateLeaderSchedule(startDate: string, swimmers: Swimmer[]): Promise<void>;
  setLeaderForDate(date: string, leaderId: number, leaders?: { id: number; name: string; order: number; }[]): Promise<void>;
  deleteFutureTrainingSessions(id: number): Promise<boolean>;
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

    // トレーニングセッションのサンプルデータは削除

    // リーダースケジュールを初期化（6月2日から元翔でスタート）
    await this.initializeLeaderSchedule();
  }

  private async initializeLeaderSchedule() {
    // 既存のスケジュールがある場合はスキップ
    if (this.leaderSchedules.size > 0) {
      return;
    }
    
    // 初回のみリーダースケジュールを作成
    this.currentLeaderScheduleId = 1;

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
      currentLeaderIndex = (currentLeaderIndex + 1) % leaders.length;

      // 次の3日間期間へ移動
      currentDate.setDate(currentDate.getDate() + 3);
    }
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

  async deleteFutureTrainingSessions(id: number): Promise<boolean> {
    // 削除対象のセッションを取得
    const targetSession = this.trainingSessions.get(id);
    if (!targetSession) {
      return false;
    }

    // この日以降の同じタイトル・タイプのセッションを削除
    const deletedIds: number[] = [];
    
    for (const [sessionId, session] of this.trainingSessions) {
      // 対象セッション以降の日付で、同じタイトル・タイプのセッションを削除
      if (session.date >= targetSession.date && 
          session.title === targetSession.title &&
          session.type === targetSession.type) {
        deletedIds.push(sessionId);
      }
    }

    // 削除実行
    deletedIds.forEach(sessionId => {
      this.trainingSessions.delete(sessionId);
    });

    return deletedIds.length > 0;
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
  async getLeaderForDate(date: string): Promise<{ name: string } | null> {
    const targetDate = new Date(date);
    console.log(`リーダー検索対象日: ${date}, スケジュール数: ${this.leaderSchedules.size}`);
    
    for (const schedule of Array.from(this.leaderSchedules.values())) {
      console.log(`スケジュール確認:`, { 
        id: schedule.id, 
        swimmerId: schedule.swimmerId, 
        startDate: schedule.startDate, 
        endDate: schedule.endDate, 
        isActive: schedule.isActive 
      });
      
      if (!schedule.isActive) continue;
      
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      
      if (targetDate >= start && targetDate <= end) {
        console.log(`該当スケジュール発見: ${schedule.startDate} - ${schedule.endDate}, swimmerId: ${schedule.swimmerId}`);
        
        // リーダーIDから名前を取得するため、フロントエンドと同じIDリストを使用
        const defaultLeaders = [
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
        
        const leader = defaultLeaders.find(l => l.id === schedule.swimmerId);
        console.log(`リーダー検索結果:`, leader);
        return leader ? { name: leader.name } : null;
      }
    }
    
    console.log(`該当するスケジュールが見つかりませんでした`);
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
    
    // 既存のスケジュールを無効化
    for (const schedule of Array.from(this.leaderSchedules.values())) {
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
      
      // 3日間のスケジュールを作成
      const scheduleEndDate = new Date(currentDate);
      scheduleEndDate.setDate(scheduleEndDate.getDate() + 2); // 3日間（開始日含む）

      await this.createLeaderSchedule({
        swimmerId: swimmer.id,
        startDate: currentDate.toISOString().split('T')[0],
        endDate: scheduleEndDate.toISOString().split('T')[0],
        isActive: true
      });

      // 次のリーダーへ（連続しないように順番に交代）
      currentSwimmerIndex = (currentSwimmerIndex + 1) % swimmers.length;

      // 次の3日間期間へ移動
      currentDate.setDate(currentDate.getDate() + 3);
    }
  }

  async setLeaderForDate(date: string, leaderId: number, leaders?: { id: number; name: string; order: number; }[]): Promise<void> {
    const targetDate = new Date(date);
    
    // フロントエンドからリーダーデータが渡されない場合のフォールバック
    const leadersList = leaders || [
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
    
    // 指定されたleaderIdが存在するかチェック
    console.log("リーダー検索:", { leaderId, leadersList: leadersList.map(l => ({ id: l.id, name: l.name })) });
    const selectedLeader = leadersList.find(l => l.id === leaderId);
    console.log("選択されたリーダー:", selectedLeader);
    if (!selectedLeader) {
      throw new Error('指定されたリーダーが見つかりません');
    }
    
    // 既存のスケジュールを無効化
    for (const schedule of Array.from(this.leaderSchedules.values())) {
      if (schedule.isActive) {
        schedule.isActive = false;
      }
    }

    // 指定された日付からローテーションを開始
    // リーダーリストから選択されたリーダーの順番を取得
    const sortedLeaders = [...leadersList].sort((a, b) => a.order - b.order);
    const startIndex = sortedLeaders.findIndex(l => l.id === leaderId);
    
    let currentLeaderIndex = startIndex;
    let currentDate = new Date(targetDate);
    const endOfYear = new Date(targetDate);
    endOfYear.setFullYear(endOfYear.getFullYear() + 1);

    while (currentDate < endOfYear) {
      const leader = sortedLeaders[currentLeaderIndex % sortedLeaders.length];
      
      // 3日間のスケジュールを作成
      const scheduleEndDate = new Date(currentDate);
      scheduleEndDate.setDate(scheduleEndDate.getDate() + 2); // 3日間（開始日含む）

      await this.createLeaderSchedule({
        swimmerId: leader.id, // リーダーIDをswimmerIdとして使用
        startDate: currentDate.toISOString().split('T')[0],
        endDate: scheduleEndDate.toISOString().split('T')[0],
        isActive: true
      });

      // 次のリーダーへ
      currentLeaderIndex = (currentLeaderIndex + 1) % sortedLeaders.length;

      // 次の3日間期間へ移動
      currentDate.setDate(currentDate.getDate() + 3);
    }
  }
}

export const storage = new MemStorage();
