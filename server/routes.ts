import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabaseAdmin } from "./supabase";

// Helper function to clean AI responses from markdown formatting
function cleanAIResponse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
    .replace(/_{2,}(.*?)_{2,}/g, '$1') // Remove underline markdown
    .replace(/#{1,6}\s+/g, '')       // Remove heading markdown
    .replace(/`(.*?)`/g, '$1')       // Remove code markdown
    .trim();
}

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
      
      // Get from Supabase database
      const { data: userSlot, error } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Failed to fetch prayer slot" });
      }

      // If no slot found, return null instead of creating default
      if (!userSlot) {
        return res.json(null);
      }

      // Format response to match expected structure
      const formattedSlot = {
        id: userSlot.id,
        userId: userSlot.user_id,
        userEmail: userSlot.user_email,
        slotTime: userSlot.slot_time,
        status: userSlot.status,
        missedCount: userSlot.missed_count,
        skipStartDate: userSlot.skip_start_date,
        skipEndDate: userSlot.skip_end_date,
        createdAt: userSlot.created_at,
        updatedAt: userSlot.updated_at
      };

      res.json(formattedSlot);
    } catch (error) {
      console.error("Error fetching prayer slot:", error);
      res.status(500).json({ error: "Failed to fetch prayer slot" });
    }
  });

  // Get available slots
  app.get("/api/available-slots", async (req: Request, res: Response) => {
    try {
      const { data: occupiedSlots, error } = await supabaseAdmin
        .from('prayer_slots')
        .select('slot_time')
        .eq('status', 'active');

      if (error) {
        console.error("Error fetching occupied slots:", error);
        return res.status(500).json({ error: "Failed to fetch occupied slots" });
      }

      const occupiedTimes = new Set(occupiedSlots.map(slot => slot.slot_time));

      // Generate 48 time slots (30-minute intervals for 24 hours)
      const availableSlots = [];
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const endHour = minute === 30 ? hour + 1 : hour;
          const endMinute = minute === 30 ? 0 : 30;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
          const slotTime = `${startTime}–${endTime}`;
          
          // Only include slots that are not occupied
          if (!occupiedTimes.has(slotTime)) {
            availableSlots.push({
              id: hour * 2 + (minute / 30) + 1,
              slotTime,
              timezone: "UTC"
            });
          }
        }
      }

      res.json(availableSlots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Failed to fetch available slots" });
    }
  });

  // Request to skip prayer slot
  app.post("/api/prayer-slot/skip", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const skipStartDate = new Date();
      const skipEndDate = new Date();
      skipEndDate.setDate(skipEndDate.getDate() + 5);

      // Update the slot in Supabase
      const { data: updatedSlot, error } = await supabaseAdmin
        .from('prayer_slots')
        .update({
          status: 'skipped',
          skip_start_date: skipStartDate.toISOString(),
          skip_end_date: skipEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single();

      if (error) {
        console.error("Database error skipping slot:", error);
        return res.status(500).json({ error: "Failed to skip prayer slot" });
      }

      if (!updatedSlot) {
        return res.status(404).json({ error: "No active prayer slot found" });
      }

      // Format response
      const formattedSlot = {
        id: updatedSlot.id,
        userId: updatedSlot.user_id,
        userEmail: updatedSlot.user_email,
        slotTime: updatedSlot.slot_time,
        status: updatedSlot.status,
        missedCount: updatedSlot.missed_count,
        skipStartDate: updatedSlot.skip_start_date,
        skipEndDate: updatedSlot.skip_end_date,
        createdAt: updatedSlot.created_at,
        updatedAt: updatedSlot.updated_at
      };

      res.json(formattedSlot);
    } catch (error) {
      console.error("Error skipping prayer slot:", error);
      res.status(500).json({ error: "Failed to skip prayer slot" });
    }
  });

  // Change prayer slot
  app.post("/api/prayer-slot/change", async (req: Request, res: Response) => {
    try {
      const { userId, newSlotTime, currentSlotTime } = req.body;

      if (!userId || !newSlotTime) {
        return res.status(400).json({ error: "User ID and new slot time are required" });
      }

      // Get user email from auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email || 'unknown@example.com';

      // Check if user already has a slot
      const { data: existingSlot } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .single();

      let updatedSlot;

      if (existingSlot) {
        // Update existing slot
        const { data, error } = await supabaseAdmin
          .from('prayer_slots')
          .update({
            slot_time: newSlotTime,
            status: 'active',
            skip_start_date: null,
            skip_end_date: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error("Database error updating slot:", error);
          return res.status(500).json({ error: "Failed to update prayer slot" });
        }
        updatedSlot = data;
      } else {
        // Create new slot
        const { data, error } = await supabaseAdmin
          .from('prayer_slots')
          .insert([{
            user_id: userId,
            user_email: userEmail,
            slot_time: newSlotTime,
            status: 'active',
            missed_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          console.error("Database error creating slot:", error);
          return res.status(500).json({ error: "Failed to create prayer slot" });
        }
        updatedSlot = data;
      }

      // Format response
      const formattedSlot = {
        id: updatedSlot.id,
        userId: updatedSlot.user_id,
        userEmail: updatedSlot.user_email,
        slotTime: updatedSlot.slot_time,
        status: updatedSlot.status,
        missedCount: updatedSlot.missed_count,
        skipStartDate: updatedSlot.skip_start_date,
        skipEndDate: updatedSlot.skip_end_date,
        createdAt: updatedSlot.created_at,
        updatedAt: updatedSlot.updated_at
      };

      res.json(formattedSlot);
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
      
      prompt += `\n\nReturn the response in JSON format with these fields. Use natural, conversational language without asterisks or special formatting:
      {
        "verse": "the actual Bible verse text",
        "reference": "book chapter:verse",
        "version": "${version}",
        "explanation": "clear, conversational explanation of the verse meaning in simple language",
        "prayerPoint": "one practical prayer point based on this verse in natural language"
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
        // Clean all text fields from markdown formatting
        const cleanedResponse = {
          verse: cleanAIResponse(parsedResponse.verse),
          reference: parsedResponse.reference,
          version: parsedResponse.version,
          explanation: cleanAIResponse(parsedResponse.explanation),
          prayerPoint: cleanAIResponse(parsedResponse.prayerPoint)
        };
        res.json(cleanedResponse);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        res.json({
          verse: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.",
          reference: "Isaiah 41:10",
          version: version,
          explanation: cleanAIResponse(aiResponse),
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

      Use natural, conversational language without asterisks, bold formatting, or markdown. Write in a warm, encouraging tone.

      Return the response in JSON format:
      {
        "category": "${categoryName}",
        "prayerPoints": [
          {
            "title": "prayer point title in natural language",
            "content": "detailed prayer content in conversational style",
            "bibleVerse": "actual verse text",
            "reference": "Book Chapter:Verse",
            "explanation": "how this verse supports the prayer in simple language"
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
        // Clean all text fields from markdown formatting
        const cleanedResponse = {
          category: parsedResponse.category,
          prayerPoints: parsedResponse.prayerPoints.map((point: any) => ({
            title: cleanAIResponse(point.title),
            content: cleanAIResponse(point.content),
            bibleVerse: cleanAIResponse(point.bibleVerse),
            reference: point.reference,
            explanation: cleanAIResponse(point.explanation)
          })),
          totalPoints: parsedResponse.totalPoints
        };
        res.json(cleanedResponse);
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
        .select('*');

      if (error) throw error;

      // Get user details from auth.users for each slot
      const slotsWithUsers = await Promise.all(slots?.map(async (slot) => {
        let userEmail = slot.user_email;
        let userName = null;
        
        if (slot.user_id) {
          const { data: user } = await supabaseAdmin.auth.admin.getUserById(slot.user_id);
          if (user?.user) {
            userEmail = user.user.email;
            userName = user.user.user_metadata?.full_name;
          }
        }

        return {
          id: slot.id,
          slotTime: slot.slot_time,
          status: slot.status,
          userId: slot.user_id,
          userEmail: userEmail,
          userName: userName
        };
      }) || []);

      res.json(slotsWithUsers);
    } catch (error) {
      console.error('Error fetching prayer slots:', error);
      res.status(500).json({ error: 'Failed to fetch prayer slots' });
    }
  });

  app.get("/api/admin/intercessors", async (req: Request, res: Response) => {
    try {
      // Get all prayer slots with user assignments
      const { data: slots, error } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .not('user_id', 'is', null);

      if (error) throw error;

      // Get unique users and their details from auth
      const uniqueUsers = new Map();
      
      for (const slot of slots || []) {
        if (slot.user_id && !uniqueUsers.has(slot.user_id)) {
          try {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(slot.user_id);
            if (user?.user) {
              uniqueUsers.set(slot.user_id, {
                id: slot.user_id,
                email: user.user.email,
                name: user.user.user_metadata?.full_name || 'Unknown',
                phone: user.user.user_metadata?.phone || '',
                region: user.user.user_metadata?.region || '',
                createdAt: user.user.created_at,
                prayerSlot: slot.slot_time,
                slotStatus: slot.status
              });
            }
          } catch (authError) {
            console.error(`Error fetching user ${slot.user_id}:`, authError);
          }
        }
      }

      const intercessors = Array.from(uniqueUsers.values());
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

  // User profile creation endpoint
  app.post("/api/users/create-profile", async (req: Request, res: Response) => {
    try {
      const { userId, email, fullName } = req.body;

      if (!userId || !email) {
        return res.status(400).json({ error: 'User ID and email are required' });
      }

      // Check if user profile already exists
      const { data: existingUser } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingUser) {
        return res.json({ message: 'User profile already exists', user: existingUser });
      }

      // Create new user profile
      const { data: newUser, error } = await supabaseAdmin
        .from('user_profiles')
        .insert([
          {
            id: userId,
            email,
            full_name: fullName || '',
            role: 'intercessor',
            is_active: true,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      res.json({ message: 'User profile created successfully', user: newUser });
    } catch (error) {
      console.error('Error creating user profile:', error);
      res.status(500).json({ error: 'Failed to create user profile' });
    }
  });

  // Admin user management endpoint
  app.post("/api/admin/create-admin", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if admin already exists
      const { data: existingAdmin } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingAdmin) {
        return res.status(409).json({ error: 'Admin user already exists' });
      }

      // Create new admin user
      const { data: newAdmin, error } = await supabaseAdmin
        .from('admin_users')
        .insert([
          {
            email,
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating admin:', error);
        throw error;
      }

      console.log('Admin user created successfully:', newAdmin);

      res.json({ 
        message: 'Admin user created successfully', 
        admin: newAdmin,
        instructions: {
          step1: 'Admin role created in database',
          step2: 'Now go to /admin/login and create a Supabase Auth account with this same email',
          step3: 'After creating the auth account, you can log in as admin'
        }
      });
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).json({ 
        error: 'Failed to create admin user',
        details: error instanceof Error ? error.message : 'Unknown error',
        tip: 'Make sure Supabase environment variables are configured'
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
