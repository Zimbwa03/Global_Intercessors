import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabaseAdmin } from "./supabase";

// Helper function to get Bible book chapter counts
function getBibleBookChapters(bookName: string): number {
  const bibleBooks: { [key: string]: number } = {
    "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
    "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36,
    "Ezra": 10, "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150,
    "Proverbs": 31, "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66,
    "Jeremiah": 52, "Lamentations": 5, "Ezekiel": 48, "Daniel": 12,
    "Hosea": 14, "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4,
    "Micah": 7, "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2,
    "Zechariah": 14, "Malachi": 4, "Matthew": 28, "Mark": 16, "Luke": 24,
    "John": 21, "Acts": 28, "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13,
    "Galatians": 6, "Ephesians": 6, "Philippians": 4, "Colossians": 4,
    "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6, "2 Timothy": 4,
    "Titus": 3, "Philemon": 1, "Hebrews": 13, "James": 5, "1 Peter": 5,
    "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22
  };
  return bibleBooks[bookName] || 1;
}

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

  // Audio Bible progress endpoints
  app.get("/api/audio-bible/progress", async (req: Request, res: Response) => {
    try {
      const { data: progress, error } = await supabaseAdmin
        .from('audio_bible_progress')
        .select('*')
        .order('last_played', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Default to Genesis 1 if no progress found
      const defaultProgress = {
        book: 'Genesis',
        chapter: 1,
        verse: 1,
        lastPlayed: new Date().toISOString(),
        isActive: false
      };
      
      res.json(progress || defaultProgress);
    } catch (error) {
      console.error('Error fetching Bible progress:', error);
      res.status(500).json({ error: 'Failed to fetch Bible progress' });
    }
  });

  app.post("/api/audio-bible/progress", async (req: Request, res: Response) => {
    try {
      const { book, chapter, verse = 1, slotTime } = req.body;
      
      const progressData = {
        book,
        chapter,
        verse,
        lastPlayed: new Date().toISOString(),
        isActive: true,
        slotTime,
        totalChapters: getBibleBookChapters(book)
      };

      const { data, error } = await supabaseAdmin
        .from('audio_bible_progress')
        .insert(progressData)
        .select()
        .single();

      if (error) throw error;
      
      res.json(data);
    } catch (error) {
      console.error('Error updating Bible progress:', error);
      res.status(500).json({ error: 'Failed to update Bible progress' });
    }
  });

  app.get("/api/slot-coverage/check", async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Determine current slot time (30-minute slots)
      const slotMinute = currentMinute < 30 ? '00' : '30';
      const currentSlotTime = `${currentHour.toString().padStart(2, '0')}:${slotMinute}–${currentHour.toString().padStart(2, '0')}:${slotMinute === '00' ? '30' : '59'}`;
      
      // Check if slot is assigned and if user is present
      const { data: slot, error } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('slot_time', currentSlotTime)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      let needsCoverage = true;
      
      if (slot) {
        // Check if user attended within last 5 minutes
        const lastAttended = slot.last_attended ? new Date(slot.last_attended) : null;
        const timeDiff = lastAttended ? Math.abs(now.getTime() - lastAttended.getTime()) : Infinity;
        const fiveMinutes = 5 * 60 * 1000;
        
        needsCoverage = timeDiff > fiveMinutes;
      }
      
      res.json({
        needsCoverage,
        currentSlotTime,
        slot: slot || null,
        message: needsCoverage ? 'Audio Bible coverage needed' : 'Slot covered'
      });
    } catch (error) {
      console.error('Error checking slot coverage:', error);
      res.status(500).json({ error: 'Failed to check slot coverage' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
