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

      const validatedData = insertTrainingSessionSchema.partial().parse(req.body);
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
      const validatedData = insertSwimmerSchema.parse(req.body);
      const swimmer = await storage.createSwimmer(validatedData);
      res.status(201).json(swimmer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create swimmer" });
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
      const leader = await storage.getLeaderForDate(date);
      res.json(leader);
    } catch (error) {
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
      const { startDate } = req.body;
      const swimmers = await storage.getAllSwimmers();
      await storage.generateLeaderSchedule(startDate, swimmers);
      res.status(201).json({ message: "リーダースケジュールを生成しました" });
    } catch (error) {
      res.status(500).json({ error: "リーダースケジュール生成に失敗しました" });
    }
  });

  app.post("/api/leaders/set-for-date", async (req, res) => {
    try {
      const { date, swimmerId, leaders } = req.body;
      await storage.setLeaderForDate(date, swimmerId, leaders); // leadersデータも渡す
      res.status(200).json({ message: "指定された日付からリーダーローテーションを設定しました" });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "リーダー設定に失敗しました" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
