import { 
  swimmers, 
  trainingSessions, 
  attendance,
  type Swimmer, 
  type InsertSwimmer,
  type TrainingSession,
  type InsertTrainingSession,
  type Attendance,
  type InsertAttendance
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
}

export class MemStorage implements IStorage {
  private swimmers: Map<number, Swimmer>;
  private trainingSessions: Map<number, TrainingSession>;
  private attendance: Map<number, Attendance>;
  private currentSwimmerId: number;
  private currentSessionId: number;
  private currentAttendanceId: number;

  constructor() {
    this.swimmers = new Map();
    this.trainingSessions = new Map();
    this.attendance = new Map();
    this.currentSwimmerId = 1;
    this.currentSessionId = 1;
    this.currentAttendanceId = 1;

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
    return session;
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
}

export const storage = new MemStorage();
