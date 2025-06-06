import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// In-memory storage for prayer slots (will be replaced with Supabase later)
const prayerSlots = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  // Prayer Slot Management API Routes
  
  // Get user's current prayer slot
  app.get("/api/prayer-slot/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Get from in-memory storage or create default
      let userSlot = prayerSlots.get(userId);
      if (!userSlot) {
        userSlot = {
          id: 1,
          userId: userId,
          userEmail: "user@example.com",
          slotTime: "22:00–22:30",
          status: "active",
          missedCount: 0,
          skipStartDate: null,
          skipEndDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        prayerSlots.set(userId, userSlot);
      }

      res.json(userSlot);
    } catch (error) {
      console.error("Error fetching prayer slot:", error);
      res.status(500).json({ error: "Failed to fetch prayer slot" });
    }
  });

  // Get available slots
  app.get("/api/available-slots", async (req: Request, res: Response) => {
    try {
      // Generate 48 time slots (30-minute intervals for 24 hours)
      const availableSlots = [];
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const endHour = minute === 30 ? hour + 1 : hour;
          const endMinute = minute === 30 ? 0 : 30;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
          
          availableSlots.push({
            id: hour * 2 + (minute / 30) + 1,
            slotTime: `${startTime}–${endTime}`,
            isAvailable: Math.random() > 0.3, // Random availability for demo
            timezone: "UTC"
          });
        }
      }

      res.json(availableSlots.filter(slot => slot.isAvailable));
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Failed to fetch available slots" });
    }
  });

  // Request to skip prayer slot
  app.post("/api/prayer-slot/skip", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      
      // Get existing slot or create default
      let userSlot = prayerSlots.get(userId);
      if (!userSlot) {
        userSlot = {
          id: 1,
          userId: userId,
          userEmail: "user@example.com",
          slotTime: "22:00–22:30",
          status: "active",
          missedCount: 0,
          skipStartDate: null,
          skipEndDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const skipStartDate = new Date();
      const skipEndDate = new Date();
      skipEndDate.setDate(skipEndDate.getDate() + 5);

      // Update the slot
      const updatedSlot = {
        ...userSlot,
        status: "skipped",
        skipStartDate: skipStartDate.toISOString(),
        skipEndDate: skipEndDate.toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store the updated slot
      prayerSlots.set(userId, updatedSlot);

      res.json(updatedSlot);
    } catch (error) {
      console.error("Error skipping prayer slot:", error);
      res.status(500).json({ error: "Failed to skip prayer slot" });
    }
  });

  // Change prayer slot
  app.post("/api/prayer-slot/change", async (req: Request, res: Response) => {
    try {
      const { userId, newSlotTime } = req.body;

      // Get existing slot or create default
      let userSlot = prayerSlots.get(userId);
      if (!userSlot) {
        userSlot = {
          id: 1,
          userId: userId,
          userEmail: "user@example.com",
          slotTime: "22:00–22:30",
          status: "active",
          missedCount: 0,
          skipStartDate: null,
          skipEndDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      // Update the slot
      const updatedSlot = {
        ...userSlot,
        slotTime: newSlotTime,
        status: "active",
        skipStartDate: null,
        skipEndDate: null,
        updatedAt: new Date().toISOString()
      };

      // Store the updated slot
      prayerSlots.set(userId, updatedSlot);

      res.json(updatedSlot);
    } catch (error) {
      console.error("Error changing prayer slot:", error);
      res.status(500).json({ error: "Failed to change prayer slot" });
    }
  });

  // Get prayer session history
  app.get("/api/prayer-sessions/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Mock session history
      const sessions = Array.from({ length: limit }, (_, i) => ({
        id: i + 1,
        userId: userId,
        slotTime: "22:00–22:30",
        sessionDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        status: Math.random() > 0.2 ? "completed" : "missed",
        duration: Math.random() > 0.2 ? 30 : null,
        createdAt: new Date().toISOString()
      }));

      res.json(sessions);
    } catch (error) {
      console.error("Error fetching prayer sessions:", error);
      res.status(500).json({ error: "Failed to fetch prayer sessions" });
    }
  });

  // Zoom attendance tracking endpoints
  app.get("/api/attendance/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { limit = 30 } = req.query;
      
      // Query attendance from Supabase
      const { data: attendance, error } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(Number(limit));

      if (error) throw error;
      
      res.json(attendance || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ error: 'Failed to fetch attendance data' });
    }
  });

  app.post("/api/attendance/manual-process", async (req: Request, res: Response) => {
    try {
      const { zoomAttendanceTracker } = await import('./services/zoomAttendanceTracker');
      await zoomAttendanceTracker.manualProcess();
      res.json({ message: 'Manual attendance processing triggered successfully' });
    } catch (error) {
      console.error('Error in manual attendance processing:', error);
      res.status(500).json({ error: 'Failed to process attendance manually' });
    }
  });

  app.get("/api/zoom-meetings", async (req: Request, res: Response) => {
    try {
      const { from, to, processed } = req.query;
      
      let query = supabaseAdmin.from('zoom_meetings').select('*');
      
      if (from) {
        query = query.gte('start_time', from);
      }
      if (to) {
        query = query.lte('start_time', to);
      }
      if (processed !== undefined) {
        query = query.eq('processed', processed === 'true');
      }
      
      const { data: meetings, error } = await query
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      res.json(meetings || []);
    } catch (error) {
      console.error('Error fetching Zoom meetings:', error);
      res.status(500).json({ error: 'Failed to fetch Zoom meetings' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
