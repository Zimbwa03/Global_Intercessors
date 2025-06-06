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

  // Get prayer session history - fallback to mock data if table doesn't exist
  app.get("/api/prayer-sessions/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Generate mock session history for now
      const mockSessions = Array.from({ length: Math.min(limit, 7) }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          id: `session_${i}`,
          intercessor_id: userId,
          session_date: date.toISOString().split('T')[0],
          attended: Math.random() > 0.3,
          status: Math.random() > 0.3 ? 'attended' : (Math.random() > 0.5 ? 'missed' : 'skipped'),
          duration: Math.floor(Math.random() * 30) + 15,
          created_at: date.toISOString()
        };
      });

      res.json(mockSessions);
    } catch (error) {
      console.error("Error fetching prayer sessions:", error);
      res.status(500).json({ error: "Failed to fetch prayer sessions" });
    }
  });

  // Zoom attendance tracking endpoints - fallback to mock data
  app.get("/api/attendance/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { limit = 30 } = req.query;
      
      // Generate mock attendance data for now
      const mockAttendance = Array.from({ length: Math.min(Number(limit), 30) }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          id: `attendance_${i}`,
          user_id: userId,
          date: date.toISOString().split('T')[0],
          attended: Math.random() > 0.2,
          session_duration: Math.floor(Math.random() * 30) + 15,
          created_at: date.toISOString()
        };
      });
      
      res.json(mockAttendance);
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

  // Audio Bible progress endpoints - with fallback
  app.get("/api/audio-bible/progress", async (req: Request, res: Response) => {
    try {
      // Default to Genesis 1 for now (can be replaced with Supabase later)
      const defaultProgress = {
        book: 'Genesis',
        chapter: 1,
        verse: 1,
        lastPlayed: new Date().toISOString(),
        isActive: false,
        totalChapters: 50
      };
      
      res.json(defaultProgress);
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
      
      // For now, just return the data (can be stored in Supabase later)
      res.json(progressData);
    } catch (error) {
      console.error('Error updating Bible progress:', error);
      res.status(500).json({ error: 'Failed to update Bible progress' });
    }
  });

  // AI Bible Chatbook endpoint
  app.post("/api/bible-chat", async (req: Request, res: Response) => {
    try {
      const { phrase, version = "KJV", chapter, verse } = req.body;
      
      let prompt = `User has typed: "${phrase}"\nVersion selected: ${version}\n`;
      
      if (chapter && verse) {
        prompt += `Chapter: ${chapter}\nVerse: ${verse}\n\nGive the full verse in ${version}, a clear explanation of its meaning, and provide one practical prayer point based on it.`;
      } else {
        prompt += `\nProvide a relevant Bible verse from ${version} related to "${phrase}" with a clear explanation and one practical prayer point.`;
      }
      
      prompt += `\n\nReturn the response in JSON format with these fields:
      {
        "verse": "the actual Bible verse text",
        "reference": "book chapter:verse",
        "version": "${version}",
        "explanation": "clear explanation of the verse meaning",
        "prayerPoint": "one practical prayer point based on this verse"
      }`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      try {
        const parsedResponse = JSON.parse(aiResponse);
        res.json(parsedResponse);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        res.json({
          verse: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.",
          reference: "Isaiah 41:10",
          version: version,
          explanation: aiResponse,
          prayerPoint: "Lord, help me to trust in Your presence and strength in every situation I face."
        });
      }
    } catch (error) {
      console.error('Bible chat error:', error);
      res.status(500).json({ error: 'Failed to generate Bible response' });
    }
  });

  // AI Prayer Planner endpoint
  app.post("/api/prayer-planner", async (req: Request, res: Response) => {
    try {
      const { category } = req.body;
      
      const categoryMap: { [key: string]: string } = {
        nation: "Nation & Government",
        healing: "Healing & Health", 
        deliverance: "Deliverance & Freedom",
        revival: "Revival & Awakening",
        family: "Family & Relationships",
        finance: "Financial Breakthrough",
        protection: "Protection & Safety",
        wisdom: "Wisdom & Guidance",
        church: "Church & Ministry",
        missions: "Missions & Evangelism"
      };

      const categoryName = categoryMap[category] || category;
      
      const prompt = `Generate 5 structured and powerful Christian prayer points under the theme "${categoryName}". Each point should include:
      1. A clear title
      2. A detailed prayer content
      3. One supporting Bible verse (from KJV, NIV, or ESV)
      4. The Bible reference
      5. A brief explanation of how the verse relates to the prayer

      Return the response in JSON format:
      {
        "category": "${categoryName}",
        "prayerPoints": [
          {
            "title": "prayer point title",
            "content": "detailed prayer content",
            "bibleVerse": "actual verse text",
            "reference": "Book Chapter:Verse",
            "explanation": "how this verse supports the prayer"
          }
        ],
        "totalPoints": 5
      }`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      try {
        const parsedResponse = JSON.parse(aiResponse);
        res.json(parsedResponse);
      } catch (parseError) {
        // Fallback response
        res.json({
          category: categoryName,
          prayerPoints: [
            {
              title: "Divine Intervention",
              content: "Lord, we ask for Your divine intervention in this area. Move mightily according to Your will and purpose.",
              bibleVerse: "The effectual fervent prayer of a righteous man availeth much.",
              reference: "James 5:16",
              explanation: "This verse reminds us that passionate, heartfelt prayer from those who are right with God has tremendous power and produces wonderful results."
            }
          ],
          totalPoints: 1
        });
      }
    } catch (error) {
      console.error('Prayer planner error:', error);
      res.status(500).json({ error: 'Failed to generate prayer plan' });
    }
  });

  app.get("/api/slot-coverage/check", async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Determine current slot time (30-minute slots) - use simple time format
      const slotMinute = currentMinute < 30 ? '00' : '30';
      const currentSlotTime = `${currentHour.toString().padStart(2, '0')}:${slotMinute}`;
      
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

  // Admin API Routes
  app.get("/api/admin/prayer-slots", async (req: Request, res: Response) => {
    try {
      const { data: slots, error } = await supabaseAdmin
        .from('prayer_slots')
        .select(`
          id,
          slot_time,
          status,
          user_id,
          users (
            email,
            user_metadata
          )
        `);

      if (error) throw error;

      const slotsWithUsers = slots?.map(slot => ({
        id: slot.id,
        slotTime: slot.slot_time,
        status: slot.status,
        userId: slot.user_id,
        userEmail: slot.users?.email,
        userName: slot.users?.user_metadata?.full_name
      })) || [];

      res.json(slotsWithUsers);
    } catch (error) {
      console.error('Error fetching prayer slots:', error);
      res.status(500).json({ error: 'Failed to fetch prayer slots' });
    }
  });

  app.get("/api/admin/intercessors", async (req: Request, res: Response) => {
    try {
      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          email,
          user_metadata,
          created_at,
          prayer_slots (
            slot_time,
            status
          )
        `)
        .eq('role', 'intercessor');

      if (error) throw error;

      const intercessors = users?.map(user => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || 'Unknown',
        createdAt: user.created_at,
        prayerSlot: user.prayer_slots?.[0]?.slot_time,
        slotStatus: user.prayer_slots?.[0]?.status
      })) || [];

      res.json(intercessors);
    } catch (error) {
      console.error('Error fetching intercessors:', error);
      res.status(500).json({ error: 'Failed to fetch intercessors' });
    }
  });

  app.get("/api/admin/fasting-registrations", async (req: Request, res: Response) => {
    try {
      const { data: registrations, error } = await supabaseAdmin
        .from('fasting_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json(registrations || []);
    } catch (error) {
      console.error('Error fetching fasting registrations:', error);
      res.status(500).json({ error: 'Failed to fetch fasting registrations' });
    }
  });

  app.post("/api/admin/updates", async (req: Request, res: Response) => {
    try {
      const { title, description } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      const { data: newUpdate, error } = await supabaseAdmin
        .from('updates')
        .insert([
          {
            title,
            description,
            date: new Date().toISOString(),
            type: 'general'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      res.json(newUpdate);
    } catch (error) {
      console.error('Error creating update:', error);
      res.status(500).json({ error: 'Failed to create update' });
    }
  });

  app.post("/api/admin/zoom-link", async (req: Request, res: Response) => {
    try {
      const { link } = req.body;

      if (!link) {
        return res.status(400).json({ error: 'Zoom link is required' });
      }

      const { data: zoomSession, error } = await supabaseAdmin
        .from('zoom_meetings')
        .insert([
          {
            meeting_url: link,
            created_at: new Date().toISOString(),
            is_active: true
          }
        ])
        .select()
        .single();

      if (error) throw error;

      res.json({ message: 'Zoom link saved successfully', session: zoomSession });
    } catch (error) {
      console.error('Error saving zoom link:', error);
      res.status(500).json({ error: 'Failed to save zoom link' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
