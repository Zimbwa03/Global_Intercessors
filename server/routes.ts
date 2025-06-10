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

// Helper function to get user email
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // First try to get user from existing prayer slots
    const { data: existingSlot, error: slotError } = await supabaseAdmin
      .from('prayer_slots')
      .select('user_email')
      .eq('user_id', userId)
      .single();

    if (!slotError && existingSlot?.user_email) {
      console.log('Found user email from existing slot:', existingSlot.user_email);
      return existingSlot.user_email;
    }

    // If not found in slots, try to get from auth (this might fail due to permissions)
    try {
      const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error) {
        console.error('Auth API error (expected if service role not configured):', error.message);
        // This is expected if service role doesn't have auth permissions
        return null;
      }
      return (user?.user as any)?.email || null;
    } catch (authError) {
      console.error('Auth fetch failed (using fallback):', authError);
      return null;
    }
  } catch (error) {
    console.error('Error in getUserEmail:', error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get user's prayer slot
  app.get("/api/prayer-slot/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      console.log('Fetching prayer slot for user:', userId);

      // Use the same service function that successfully creates slots for retrieval
      const { data: slotData, error } = await supabaseAdmin
        .rpc('get_user_prayer_slot', { 
          p_user_id: userId
        });

      if (error) {
        console.error('Service function failed:', error);
        return res.status(500).json({ error: 'Failed to fetch prayer slot' });
      }

      const slotResult = slotData;

      console.log('Prayer slot data retrieved:', slotData);

      // The function returns a JSON object directly
      const formattedSlot = slotData ? {
        id: slotData.id,
        userId: slotData.user_id,
        userEmail: slotData.user_email,
        slotTime: slotData.slot_time,
        status: slotData.status,
        missedCount: slotData.missed_count || 0,
        skipStartDate: slotData.skip_start_date,
        skipEndDate: slotData.skip_end_date,
        createdAt: slotData.created_at,
        updatedAt: slotData.updated_at
      } : null;

      console.log('Formatted prayer slot response:', formattedSlot);
      res.json({ prayerSlot: formattedSlot });
    } catch (error) {
      console.error('Error fetching prayer slot:', error);
      res.status(500).json({ error: 'Failed to fetch prayer slot' });
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
      let slotId = 1;

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
              id: slotId++,
              slotTime,
              timezone: "UTC"
            });
          }
        }
      }

      res.json({ availableSlots });
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Failed to fetch available slots" });
    }
  });

  // Change prayer slot
  app.post("/api/prayer-slot/change", async (req: Request, res: Response) => {
    try {
      const { userId, newSlotTime, userEmail: providedEmail } = req.body;
      console.log('Handling slot change:', { userId, newSlotTime, providedEmail });

      if (!userId || !newSlotTime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Try to get user email, but use a fallback if not available
      let userEmail = await getUserEmail(userId);

      // If we can't get email from auth, use provided email or generate a temporary one
      if (!userEmail) {
        if (providedEmail) {
          userEmail = providedEmail;
        } else {
          // Generate a placeholder email - this should be replaced when user profile is properly set up
          userEmail = `user-${userId}@placeholder.local`;
        }
        console.log('Using fallback email:', userEmail);
      }

      console.log('Attempting to change/create prayer slot:', { userId, newSlotTime, userEmail });

      // Use the service function to create/update the prayer slot
      const { data, error } = await supabaseAdmin.rpc('create_prayer_slot_service', {
        p_user_id: userId,
        p_user_email: userEmail,
        p_slot_time: newSlotTime,
        p_status: 'active'
      });

      if (error) {
        console.error("Database error creating slot:", error);
        return res.status(500).json({ error: "Failed to create prayer slot" });
      }

      console.log('Prayer slot service response:', data);

      // Format the response to match frontend expectations
      const formattedSlot = {
        id: data.id,
        userId: data.user_id,
        userEmail: data.user_email,
        slotTime: data.slot_time,
        status: data.status,
        missedCount: data.missed_count || 0,
        skipStartDate: data.skip_start_date,
        skipEndDate: data.skip_end_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      console.log('Formatted slot response:', formattedSlot);

      res.json(formattedSlot);
    } catch (error) {
      console.error('Prayer slot change error:', error);
      res.status(500).json({ error: 'Failed to change prayer slot' });
    }
  });

  // Skip prayer slot
  app.post("/api/prayer-slot/skip", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      const { data: slot, error } = await supabaseAdmin
        .from('prayer_slots')
        .update({
          status: 'skipped',
          skip_start_date: new Date().toISOString(),
          skip_end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error("Error skipping prayer slot:", error);
        return res.status(500).json({ error: "Failed to skip prayer slot" });
      }

      res.json(slot);
    } catch (error) {
      console.error("Error skipping prayer slot:", error);
      res.status(500).json({ error: "Failed to skip prayer slot" });
    }
  });

  // Get prayer sessions
  app.get("/api/prayer-sessions/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { data: sessions, error } = await supabaseAdmin
        .from('prayer_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching prayer sessions:", error);
        return res.status(500).json({ error: "Failed to fetch prayer sessions" });
      }

      res.json(sessions || []);
    } catch (error) {
      console.error("Error fetching prayer sessions:", error);
      res.status(500).json({ error: "Failed to fetch prayer sessions" });
    }
  });

  // Admin endpoint for user activities with attendance tracking
  app.get("/api/admin/user-activities", async (req: Request, res: Response) => {
    try {
      // Get all prayer slots with user data
      const { data: prayerSlots, error: slotsError } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .order('created_at', { ascending: false });

      if (slotsError) {
        console.error("Error fetching prayer slots:", slotsError);
        return res.status(500).json({ error: "Failed to fetch prayer slots" });
      }

      // Get attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (attendanceError) {
        console.error("Error fetching attendance records:", attendanceError);
        return res.status(500).json({ error: "Failed to fetch attendance records" });
      }

      // Get prayer sessions
      const { data: prayerSessions, error: sessionsError } = await supabaseAdmin
        .from('prayer_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error("Error fetching session activities:", sessionsError);
        return res.status(500).json({ error: "Failed to fetch session activities" });
      }

      // Process user activities with attendance data
      const userActivityMap = new Map();

      // Process prayer slots to get user information
      prayerSlots.forEach(slot => {
        const userId = slot.user_id;
        if (!userActivityMap.has(userId)) {
          userActivityMap.set(userId, {
            user_id: userId,
            user_email: slot.user_email || '',
            user_name: slot.user_name || 'Anonymous',
            current_slot: slot.slot_time,
            total_sessions: 0,
            attended_sessions: 0,
            attendance_rate: 0,
            last_activity: slot.updated_at || slot.created_at,
            contact_info: slot.user_email || ''
          });
        }
      });

      // Process attendance records
      attendanceRecords.forEach(record => {
        const userId = record.user_id;
        if (userActivityMap.has(userId)) {
          const activity = userActivityMap.get(userId);
          activity.total_sessions += 1;
          if (record.attendance_status === 'attended') {
            activity.attended_sessions += 1;
          }
          // Update last activity if this record is more recent
          if (new Date(record.created_at) > new Date(activity.last_activity)) {
            activity.last_activity = record.created_at;
          }
        }
      });

      // Process prayer sessions
      prayerSessions.forEach(session => {
        const userId = session.user_id;
        if (userActivityMap.has(userId)) {
          const activity = userActivityMap.get(userId);
          activity.total_sessions += 1;
          activity.attended_sessions += 1; // Prayer sessions count as attended
          if (new Date(session.created_at) > new Date(activity.last_activity)) {
            activity.last_activity = session.created_at;
          }
        }
      });

      // Calculate attendance rates
      const userActivities = Array.from(userActivityMap.values()).map(activity => {
        activity.attendance_rate = activity.total_sessions > 0 
          ? activity.attended_sessions / activity.total_sessions 
          : 0;
        return activity;
      });

      res.json(userActivities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ error: "Failed to fetch user activities" });
    }
  });

  // Admin endpoint for attendance statistics
  app.get("/api/admin/attendance-stats", async (req: Request, res: Response) => {
    try {
      // Get attendance summary statistics
      const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
        .from('attendance_log')
        .select('*');

      if (attendanceError) {
        console.error("Error fetching attendance stats:", attendanceError);
        return res.status(500).json({ error: "Failed to fetch attendance statistics" });
      }

      const totalSessions = attendanceRecords.length;
      const attendedSessions = attendanceRecords.filter(record => record.attendance_status === 'attended').length;
      const overallAttendanceRate = totalSessions > 0 ? attendedSessions / totalSessions : 0;

      // Get unique users
      const uniqueUsers = new Set(attendanceRecords.map(record => record.user_id)).size;

      const stats = {
        total_sessions: totalSessions,
        attended_sessions: attendedSessions,
        missed_sessions: totalSessions - attendedSessions,
        overall_attendance_rate: overallAttendanceRate,
        active_users: uniqueUsers,
        last_updated: new Date().toISOString()
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching attendance statistics:", error);
      res.status(500).json({ error: "Failed to fetch attendance statistics" });
    }
  });

  // Admin endpoint for prayer sessions
  app.get("/api/admin/prayer-sessions", async (req: Request, res: Response) => {
    try {
      const { data: sessions, error } = await supabaseAdmin
        .from('prayer_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching prayer sessions:", error);
        return res.status(500).json({ error: "Failed to fetch prayer sessions" });
      }

      res.json(sessions || []);
    } catch (error) {
      console.error("Error fetching prayer sessions:", error);
      res.status(500).json({ error: "Failed to fetch prayer sessions" });
    }
  });

  // Admin endpoint for prayer sessions (deprecated - data now comes from Supabase)
  app.get("/api/admin/prayer-sessions", async (req: Request, res: Response) => {
    try {
      const { data: sessions, error } = await supabaseAdmin
        .from('prayer_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching prayer sessions:", error);
        return res.status(500).json({ error: "Failed to fetch prayer sessions" });
      }

      res.json(sessions || []);
    } catch (error) {
      console.error("Error fetching prayer sessions:", error);
      res.status(500).json({ error: "Failed to fetch prayer sessions" });
    }
  });

  // Simple in-memory cache for geocoding results
  const geocodingCache = new Map<string, string>();

  // Helper function to get city name from coordinates with caching and rate limiting
  async function getCityFromCoordinates(lat: string, lng: string): Promise<string> {
    const cacheKey = `${lat},${lng}`;

    // Check cache first
    if (geocodingCache.has(cacheKey)) {
      return geocodingCache.get(cacheKey)!;
    }

    try {
      // Add small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 100));

      // Using OpenStreetMap Nominatim API for reverse geocoding (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'GlobalIntercessors/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding API failed: ${response.status}`);
      }

      const data = await response.json();

      // Extract city name from the response
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.municipality || 
                   address.county || address.state || 'Unknown Location';

      const cityName = `${city}, ${address.country || 'Unknown Country'}`;

      // Cache the result
      geocodingCache.set(cacheKey, cityName);

      return cityName;
    } catch (error) {
      console.error('Error getting city from coordinates:', error);
      const fallbackName = `GPS: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
      geocodingCache.set(cacheKey, fallbackName);
      return fallbackName;
    }
  }

  // Admin endpoint for fasting registrations
  app.get("/api/admin/fasting-registrations", async (req: Request, res: Response) => {
    try {
      const { data: registrations, error } = await supabaseAdmin
        .from('fasting_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add city names for registrations with GPS coordinates
      const registrationsWithCities = await Promise.all(
        (registrations || []).map(async (registration) => {
          let cityName = 'No GPS data';

          if (registration.gps_latitude && registration.gps_longitude) {
            try {
              cityName = await getCityFromCoordinates(
                registration.gps_latitude, 
                registration.gps_longitude
              );
            } catch (error) {
              console.error('Error getting city for registration:', registration.id, error);
              cityName = `GPS: ${registration.gps_latitude}, ${registration.gps_longitude}`;
            }
          }

          return {
            ...registration,
            city_name: cityName
          };
        })
      );

      res.json(registrationsWithCities);
    } catch (error) {
      console.error('Error fetching fasting registrations:', error);
      res.status(500).json({ error: 'Failed to fetch fasting registrations' });
    }
  });

  const httpServer = createServer(app);
  // Test Zoom API connection
  app.get("/api/admin/test-zoom", async (req: Request, res: Response) => {
    try {
      const clientId = process.env.ZOOM_CLIENT_ID;
      const clientSecret = process.env.ZOOM_API_SECRET;
      const accountId = process.env.ZOOM_ACCOUNT_ID;

      console.log('Testing Zoom credentials:', {
        clientId: clientId ? `${clientId.substring(0, 8)}...` : 'missing',
        clientSecret: clientSecret ? `${clientSecret.substring(0, 8)}...` : 'missing',
        accountId: accountId ? `${accountId.substring(0, 8)}...` : 'missing'
      });

      if (!clientId || !clientSecret || !accountId) {
        return res.status(400).json({ 
          error: "Missing Zoom credentials",
          details: {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasAccountId: !!accountId
          }
        });
      }

      // Try to get access token
      const axios = require('axios');
      const response = await axios.post('https://zoom.us/oauth/token', 
        `grant_type=account_credentials&account_id=${accountId}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      res.json({ 
        success: true, 
        message: "Zoom API connection successful",
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in
      });
    } catch (error: any) {
      console.error('Zoom API test failed:', error.response?.data || error.message);
      res.status(500).json({ 
        error: "Zoom API connection failed",
        details: error.response?.data || error.message
      });
    }
  });

  return httpServer;
}