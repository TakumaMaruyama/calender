import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertTrainingSessionSchema, insertSwimmerSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Training Sessions Routes
  app.get("/api/training-sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllTrainingSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch training sessions" });
    }
  });

  app.get("/api/training-sessions/month/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }

      const sessions = await storage.getTrainingSessionsByMonth(year, month);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch training sessions" });
    }
  });

  app.get("/api/training-sessions/date/:date", async (req, res) => {
    try {
      const date = req.params.date;
      const sessions = await storage.getTrainingSessionsByDate(date);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch training sessions for date" });
    }
  });

  app.get("/api/training-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const session = await storage.getTrainingSession(id);
      if (!session) {
        return res.status(404).json({ message: "Training session not found" });
      }

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch training session" });
    }
  });

  app.post("/api/training-sessions", async (req, res) => {
    try {
      const validatedData = insertTrainingSessionSchema.parse(req.body);
      const session = await storage.createTrainingSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create training session" });
    }
  });

  app.put("/api/training-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const updateSchema = z.object({
        title: z.string().optional(),
        type: z.string().optional(),
        date: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        strokes: z.union([z.string(), z.array(z.string())]).optional(),
        distance: z.number().optional(),
        intensity: z.string().optional(),
        lanes: z.string().optional(),
        menuDetails: z.string().optional(),
        coachNotes: z.string().optional()
      }).partial();
      const parsedData = updateSchema.parse(req.body);
      // Ensure strokes is properly converted to array format for storage
      const validatedData = {
        ...parsedData,
        strokes: parsedData.strokes 
          ? (Array.isArray(parsedData.strokes) ? parsedData.strokes : [parsedData.strokes])
          : null
      } as Partial<InsertTrainingSession>;
      const session = await storage.updateTrainingSession(id, validatedData);
      
      if (!session) {
        return res.status(404).json({ message: "Training session not found" });
      }

      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update training session" });
    }
  });

  app.delete("/api/training-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const deleted = await storage.deleteTrainingSession(id);
      if (!deleted) {
        return res.status(404).json({ message: "Training session not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete training session" });
    }
  });

  app.delete("/api/training-sessions/:id/future", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }

      const deleted = await storage.deleteFutureTrainingSessions(id);
      if (!deleted) {
        return res.status(404).json({ message: "Training session not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete future training sessions" });
    }
  });

  // Swimmers Routes
  app.get("/api/swimmers", async (req, res) => {
    try {
      const swimmers = await storage.getAllSwimmers();
      res.json(swimmers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch swimmers" });
    }
  });

  app.post("/api/swimmers", async (req, res) => {
    try {
      console.log("Creating swimmer with data:", req.body);
      const validatedData = insertSwimmerSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const swimmer = await storage.createSwimmer(validatedData);
      console.log("Created swimmer:", swimmer);
      res.status(201).json(swimmer);
    } catch (error) {
      console.error("Error in swimmer creation route:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create swimmer", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.put("/api/swimmers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid swimmer ID" });
      }

      const updateSchema = insertSwimmerSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      const swimmer = await storage.updateSwimmer(id, validatedData);
      
      if (!swimmer) {
        return res.status(404).json({ message: "Swimmer not found" });
      }

      res.json(swimmer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update swimmer" });
    }
  });

  app.delete("/api/swimmers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid swimmer ID" });
      }

      const deleted = await storage.deleteSwimmer(id);
      if (!deleted) {
        return res.status(404).json({ message: "Swimmer not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete swimmer" });
    }
  });

  app.post("/api/swimmers/reorder", async (req, res) => {
    try {
      const { fromId, toId } = req.body;
      if (!fromId || !toId) {
        return res.status(400).json({ message: "fromId and toId are required" });
      }

      await storage.reorderSwimmers(fromId, toId);
      res.status(200).json({ message: "Swimmers reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder swimmers" });
    }
  });

  // Statistics Routes
  app.get("/api/statistics/month/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }

      const sessions = await storage.getTrainingSessionsByMonth(year, month);
      
      const totalSessions = sessions.length;
      const totalDistance = sessions.reduce((sum, session) => sum + (session.distance || 0), 0);
      const averageAttendance = 87; // Mock data for now
      
      res.json({
        totalSessions,
        totalDistance,
        averageAttendance
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Leader Schedule routes
  app.get("/api/leader/:date", async (req, res) => {
    try {
      const { date } = req.params;
      console.log(`リーダー情報取得リクエスト: ${date}`);
      const leader = await storage.getLeaderForDate(date);
      console.log(`リーダー情報結果:`, leader);
      res.json(leader);
    } catch (error) {
      console.error(`リーダー情報取得エラー:`, error);
      res.status(500).json({ message: "Failed to fetch leader" });
    }
  });

  app.get("/api/leaders", async (req, res) => {
    try {
      const schedules = await storage.getAllLeaderSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leader schedules" });
    }
  });

  // Add the missing /api/leader-schedules endpoint
  app.get("/api/leader-schedules", async (req, res) => {
    try {
      const schedules = await storage.getAllLeaderSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leader schedules" });
    }
  });

  app.post("/api/leaders", async (req, res) => {
    try {
      const schedule = await storage.createLeaderSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ error: "リーダースケジュール作成に失敗しました" });
    }
  });

  app.post("/api/leaders/generate", async (req, res) => {
    try {
      let { startDate } = req.body;
      
      // Validate and provide default startDate if not provided
      if (!startDate) {
        const today = new Date();
        startDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        console.log("No startDate provided, using today:", startDate);
      }
      
      // Validate startDate format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate)) {
        return res.status(400).json({ 
          error: "Invalid startDate format. Expected YYYY-MM-DD" 
        });
      }
      
      console.log("Generating leader schedule from:", startDate);
      const swimmers = await storage.getAllSwimmers();
      console.log("Found swimmers:", swimmers.length);
      
      if (swimmers.length === 0) {
        return res.status(400).json({ 
          error: "No swimmers found. Cannot generate leader schedule." 
        });
      }
      
      await storage.generateLeaderSchedule(startDate, swimmers);
      console.log("Leader schedule generated successfully");
      res.status(201).json({ 
        message: "リーダースケジュールを生成しました",
        startDate: startDate,
        swimmersCount: swimmers.length
      });
    } catch (error) {
      console.error("Error generating leader schedule:", error);
      res.status(500).json({ 
        error: "リーダースケジュール生成に失敗しました", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/leaders/set-for-date", async (req, res) => {
    try {
      const { date, swimmerId } = req.body;
      console.log("シンプルリーダー設定リクエスト:", { date, swimmerId });
      await storage.setLeaderForDate(date, swimmerId);
      res.status(200).json({ message: "指定された日付からリーダーローテーションを設定しました" });
    } catch (error) {
      console.error("リーダー設定エラー:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "リーダー設定に失敗しました" });
    }
  });

  app.post("/api/leaders/sync", async (req, res) => {
    try {
      const { leaders } = req.body;
      console.log("リーダー同期リクエスト:", leaders);
      // For now, sync functionality is not implemented in MemoryStorage
      res.status(200).json({ message: "リーダーリストを同期しました" });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "リーダー同期に失敗しました" });
    }
  });

  // Notification Preferences routes
  app.get("/api/notification-preferences/:swimmerId", async (req, res) => {
    try {
      const swimmerId = parseInt(req.params.swimmerId);
      const preferences = await storage.getNotificationPreferences(swimmerId);
      
      if (!preferences) {
        // Create default preferences if none exist
        const defaultPreferences = await storage.createNotificationPreferences({
          swimmerId,
          scheduleChanges: true,
          sessionReminders: true,
          leaderAssignments: true,
          emailNotifications: false,
          pushNotifications: true,
          reminderHours: 24,
          quietHoursStart: "22:00",
          quietHoursEnd: "07:00"
        });
        return res.json(defaultPreferences);
      }
      
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  app.post("/api/notification-preferences", async (req, res) => {
    try {
      const preferences = await storage.createNotificationPreferences(req.body);
      res.status(201).json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to create notification preferences" });
    }
  });

  app.put("/api/notification-preferences/:swimmerId", async (req, res) => {
    try {
      const swimmerId = parseInt(req.params.swimmerId);
      const preferences = await storage.updateNotificationPreferences(swimmerId, req.body);
      if (!preferences) {
        return res.status(404).json({ error: "Notification preferences not found" });
      }
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  app.get("/api/notification-preferences", async (req, res) => {
    try {
      const allPreferences = await storage.getAllNotificationPreferences();
      res.json(allPreferences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all notification preferences" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
