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
  // Get user's attendance records
  app.get("/api/attendance/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { limit = '30' } = req.query;

      console.log('Fetching attendance for user:', userId);

      // Get attendance from attendance_log table
      const { data: attendanceRecords, error } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(parseInt(limit as string));

      if (error) {
        console.error('Error fetching attendance:', error);
        return res.status(500).json({ error: 'Failed to fetch attendance data' });
      }

      // Format the data to match expected structure
      const formattedAttendance = attendanceRecords?.map(record => ({
        id: record.id,
        user_id: record.user_id,
        date: record.date,
        attended: record.status === 'attended',
        status: record.status,
        session_duration: record.zoom_join_time && record.zoom_leave_time 
          ? Math.floor((new Date(record.zoom_leave_time).getTime() - new Date(record.zoom_join_time).getTime()) / (1000 * 60))
          : null,
        created_at: record.created_at,
        zoom_meeting_id: record.zoom_meeting_id
      })) || [];

      console.log('Found attendance records:', formattedAttendance.length);
      res.json(formattedAttendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ error: 'Failed to fetch attendance data' });
    }
  });

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

  // Submit skip request
  app.post("/api/prayer-slot/skip-request", async (req: Request, res: Response) => {
    try {
      const { userId, skipDays, reason } = req.body;

      if (!userId || !skipDays || !reason) {
        return res.status(400).json({ error: "User ID, skip days, and reason are required" });
      }

      // Get user email for the request
      const userEmail = await getUserEmail(userId);

      const { data: request, error } = await supabaseAdmin
        .from('skip_requests')
        .insert([{
          user_id: userId,
          user_email: userEmail || `user-${userId}@placeholder.local`,
          skip_days: parseInt(skipDays),
          reason: reason.trim(),
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating skip request:", error);
        return res.status(500).json({ error: "Failed to create skip request" });
      }

      res.json({ 
        success: true, 
        message: "Skip request submitted successfully. Awaiting admin approval.",
        request 
      });
    } catch (error) {
      console.error("Error creating skip request:", error);
      res.status(500).json({ error: "Failed to create skip request" });
    }
  });

  // Get user's skip requests
  app.get("/api/prayer-slot/skip-requests/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { data: requests, error } = await supabaseAdmin
        .from('skip_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching skip requests:", error);
        return res.status(500).json({ error: "Failed to fetch skip requests" });
      }

      res.json(requests || []);
    } catch (error) {
      console.error("Error fetching skip requests:", error);
      res.status(500).json({ error: "Failed to fetch skip requests" });
    }
  });

  // Admin: Get all skip requests
  app.get("/api/admin/skip-requests", async (req: Request, res: Response) => {
    try {
      const { data: requests, error } = await supabaseAdmin
        .from('skip_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching skip requests:", error);
        return res.status(500).json({ error: "Failed to fetch skip requests" });
      }

      res.json(requests || []);
    } catch (error) {
      console.error("Error fetching skip requests:", error);
      res.status(500).json({ error: "Failed to fetch skip requests" });
    }
  });

  // Admin: Approve/Reject skip request
  app.post("/api/admin/skip-requests/:requestId/action", async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { action, adminComment } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
      }

      // Get the skip request
      const { data: skipRequest, error: fetchError } = await supabaseAdmin
        .from('skip_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !skipRequest) {
        return res.status(404).json({ error: "Skip request not found" });
      }

      if (skipRequest.status !== 'pending') {
        return res.status(400).json({ error: "Skip request has already been processed" });
      }

      // Update the skip request status
      const { error: updateError } = await supabaseAdmin
        .from('skip_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_comment: adminComment || null,
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error("Error updating skip request:", updateError);
        return res.status(500).json({ error: "Failed to update skip request" });
      }

      // If approved, update the prayer slot
      if (action === 'approve') {
        const skipEndDate = new Date();
        skipEndDate.setDate(skipEndDate.getDate() + skipRequest.skip_days);

        const { error: slotError } = await supabaseAdmin
          .from('prayer_slots')
          .update({
            status: 'skipped',
            skip_start_date: new Date().toISOString(),
            skip_end_date: skipEndDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', skipRequest.user_id);

        if (slotError) {
          console.error("Error updating prayer slot:", slotError);
          return res.status(500).json({ error: "Failed to update prayer slot" });
        }
      }

      res.json({ 
        success: true, 
        message: `Skip request ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
      });
    } catch (error) {
      console.error("Error processing skip request:", error);
      res.status(500).json({ error: "Failed to process skip request" });
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

  // In-memory storage for admin updates (works immediately)
  const adminUpdates: any[] = [];

  // Enhanced admin updates endpoint for rich update posting
  app.post("/api/admin/updates", async (req: Request, res: Response) => {
    try {
      const {
        title,
        description,
        type = 'general',
        priority = 'normal',
        schedule = 'immediate',
        expiry = 'never',
        sendNotification = false,
        sendEmail = false,
        pinToTop = false
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: "Title and description are required" });
      }

      // Use the database function created by the SQL script
      const { data, error } = await supabaseAdmin.rpc('create_admin_update', {
        p_title: title.trim(),
        p_description: description.trim(),
        p_type: type,
        p_priority: priority,
        p_schedule: schedule,
        p_expiry: expiry,
        p_send_notification: sendNotification,
        p_send_email: sendEmail,
        p_pin_to_top: pinToTop
      });

      if (error) {
        console.error("Database function failed, trying direct insert:", error);

        // Fallback to direct insert with service role
        const { data: directData, error: directError } = await supabaseAdmin
          .from('updates')
          .insert([{
            title: title.trim(),
            description: description.trim(),
            type,
            priority,
            schedule,
            expiry,
            send_notification: sendNotification,
            send_email: sendEmail,
            pin_to_top: pinToTop,
            is_active: true,
            date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (directError) {
          console.error("Direct insert also failed:", directError);
          return res.status(500).json({ 
            error: "Failed to create update",
            details: "Please run the SQL script in Supabase first" 
          });
        }

        console.log(`Admin update posted: "${title}"`);
        return res.json({ 
          success: true, 
          message: "Update posted successfully and is live on user dashboards",
          data: directData
        });
      }

      // TODO: Implement notification sending if requested
      if (sendNotification) {
        console.log('Push notification would be sent for update:', title);
      }

      if (sendEmail) {
        console.log('Email notification would be sent for update:', title);
      }

      res.json({
        success: true,
        message: "Update posted successfully and is live on user dashboards",
        data: data
      });
    } catch (error) {
      console.error("Error in admin updates endpoint:", error);
      res.status(500).json({ 
        error: "Failed to create update",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get updates for user frontend (public endpoint)
  app.get("/api/updates", async (req: Request, res: Response) => {
    try {
      console.log('Fetching public updates for users...');

      const { data: updates, error } = await supabaseAdmin
        .from('updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching public updates:", error);
        return res.status(500).json({ error: "Failed to fetch updates" });
      }

      console.log('Raw updates from database:', updates?.length || 0);

      // Filter out expired updates and add date field
      const activeUpdates = updates?.filter(update => {
        if (update.expiry === 'never') return true;

        const createdAt = new Date(update.created_at);
        const now = new Date();
        const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        switch (update.expiry) {
          case '1day': return diffInDays <= 1;
          case '3days': return diffInDays <= 3;
          case '1week': return diffInDays <= 7;
          case '1month': return diffInDays <= 30;
          default: return true;
        }
      }).map(update => ({
        ...update,
        date: update.created_at, // Add date field for frontend compatibility
        created_at: update.created_at // Ensure this field is preserved
      })) || [];

      console.log('Active updates after filtering:', activeUpdates.length);

      // Sort by priority and pin status
      const sortedUpdates = activeUpdates.sort((a, b) => {
        // Pinned items first
        if (a.pin_to_top && !b.pin_to_top) return -1;
        if (!a.pin_to_top && b.pin_to_top) return 1;

        // Then by priority
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;

        if (aPriority !== bPriority) return bPriority - aPriority;

        // Finally by creation date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log('Final sorted updates being sent to users:', sortedUpdates.length);
      res.json(sortedUpdates);
    } catch (error) {
      console.error("Error fetching public updates:", error);
      res.status(500).json({ error: "Failed to fetch updates" });
    }
  });

  // Get fasting program details for admin management
  app.get("/api/admin/fasting-program", async (req: Request, res: Response) => {
    try {
      console.log('Fetching fasting program details for admin...');

      const { data, error } = await supabaseAdmin.rpc('get_active_fasting_program');

      if (error) {
        console.error("Error fetching fasting program details:", error);
        return res.status(500).json({ error: "Failed to fetch fasting program details" });
      }

      console.log('Fasting program details loaded for admin');
      res.json(data);
    } catch (error) {
      console.error("Error fetching fasting program details:", error);
      res.status(500).json({ error: "Failed to fetch fasting program details" });
    }
  });

  // Update fasting program details (Admin only)
  app.put("/api/admin/fasting-program", async (req: Request, res: Response) => {
    try {
      console.log('Updating fasting program details...');

      const {
        program_title,
        program_subtitle,
        program_description,
        start_date,
        end_date,
        registration_open_date,
        registration_close_date,
        max_participants,
        program_status,
        special_instructions,
        contact_email,
        location_details
      } = req.body;

      const { data, error } = await supabaseAdmin.rpc('update_fasting_program_details', {
        p_program_title: program_title,
        p_program_subtitle: program_subtitle,
        p_program_description: program_description,
        p_start_date: start_date,
        p_end_date: end_date,
        p_registration_open_date: registration_open_date,
        p_registration_close_date: registration_close_date,
        p_max_participants: max_participants,
        p_program_status: program_status,
        p_special_instructions: special_instructions,
        p_contact_email: contact_email,
        p_location_details: location_details
      });

      if (error) {
        console.error("Error updating fasting program details:", error);
        return res.status(500).json({ error: "Failed to update fasting program details" });
      }

      console.log('Fasting program details updated successfully');
      res.json(data);
    } catch (error) {
      console.error("Error updating fasting program details:", error);
      res.status(500).json({ error: "Failed to update fasting program details" });
    }
  });

  // Get prayer slots for admin management
  app.get("/api/admin/prayer-slots", async (req: Request, res: Response) => {
    try {
      const { data: slots, error } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching prayer slots:", error);
        return res.status(500).json({ error: "Failed to fetch prayer slots" });
      }

      res.json(slots || []);
    } catch (error) {
      console.error("Error fetching prayer slots:", error);
      res.status(500).json({ error: "Failed to fetch prayer slots" });
    }
  });

  // Enhanced Bible Chat with immediate responses
  app.post("/api/bible-chat", async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const cleanedMessage = cleanAIResponse(message);
      const lowerMessage = cleanedMessage.toLowerCase();

      // Provide immediate contextual biblical responses
      let fallbackResponse = {
        response: "📖 Welcome to the Bible Chat! How can I assist you spiritually today? ✨",
        scripture: {
          reference: "Psalm 119:105",
          text: "Your word is a lamp for my feet, a light on my path."
        },
        insights: ["Scripture illuminates our lives", "God's word guides us", "Find direction through the Bible"]
      };

      if (lowerMessage.includes('fear') || lowerMessage.includes('afraid')) {
        fallbackResponse.response = "📖 When fear troubles your heart, remember that God is always with you! ✨\n\nFear is a natural human emotion, but as believers, we have access to divine peace that surpasses understanding. God's presence in our lives means we never face challenges alone. 🙏";
        fallbackResponse.scripture = {
          reference: "Isaiah 41:10",
          text: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand."
        };
        fallbackResponse.insights = ["God's presence overcomes fear", "Divine strength is available", "Trust in God's protection"];
      } else if (lowerMessage.includes('prayer') || lowerMessage.includes('pray')) {
        fallbackResponse.response = "🙏 Prayer is our direct line to the Almighty! Let's seek His face together.\n\nThrough prayer, we align our hearts with God's will and experience His peace. It's both a privilege and a powerful tool for transformation. ✨";
        fallbackResponse.scripture = {
          reference: "1 Thessalonians 5:17",
          text: "Pray without ceasing."
        };
        fallbackResponse.insights = ["Constant communication with God", "Prayer transforms hearts", "Seek God's will through prayer"];
      } else if (lowerMessage.includes('wisdom') || lowerMessage.includes('wise')) {
        fallbackResponse.response = "✨ True wisdom comes from above! Seek God's understanding in all things.\n\nGodly wisdom differs from worldly knowledge - it encompasses understanding God's heart and applying His truth to our daily lives. 📖";
        fallbackResponse.scripture = {
          reference: "James 1:5",
          text: "If any of you lacks wisdom, let him ask God, who gives generously to all without reproach, and it will be given him."
        };
        fallbackResponse.insights = ["God gives wisdom freely", "Ask for divine understanding", "Wisdom guides right decisions"];
      }

      res.json(fallbackResponse);
    }
  });

  // Bible Verse Search Handler Function
  async function handleBibleVerseSearch(req: Request, res: Response, phrase: string, version: string, chapter?: string, verse?: string) {
    try {
      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        return res.status(500).json({ error: "DeepSeek API key not configured" });
      }

      let prompt = `I need you to provide a Bible verse search response for: "${phrase}"\n`;
      prompt += `Bible Version: ${version}\n`;

      if (chapter && verse) {
        prompt += `Specific Reference: ${chapter} ${verse}\n\n`;
        prompt += `Please provide the exact verse from ${chapter} ${verse} in ${version} format, along with explanation and prayer point.`;
      } else if (chapter) {
        prompt += `Chapter: ${chapter}\n\n`;
        prompt += `Please provide a relevant verse from ${chapter} related to "${phrase}" in ${version} format.`;
      } else {
        prompt += `\nPlease provide a relevant Bible verse from ${version} that relates to "${phrase}" with explanation and prayer point.`;
      }

      prompt += `\n\nFormat your response as JSON with these exact fields:
{
  "verse": "the complete Bible verse text in ${version}",
  "reference": "Book Chapter:Verse format",
  "version": "${version}",
  "explanation": "Clear, encouraging explanation with proper spacing and relevant emojis (📖🙏✨💝🌟)",
  "prayerPoint": "Practical prayer point based on this verse with emojis where appropriate"
}

Guidelines:
- Use encouraging language with appropriate emojis
- Include proper spacing and line breaks in explanations
- Make it user-friendly and spiritually uplifting
- Ensure the verse is accurate for the specified version`;

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from DeepSeek API');
      }

      try {
        const parsedResponse = JSON.parse(aiResponse);
        res.json({
          verse: parsedResponse.verse,
          reference: parsedResponse.reference,
          version: parsedResponse.version || version,
          explanation: parsedResponse.explanation,
          prayerPoint: parsedResponse.prayerPoint
        });
      } catch (parseError) {
        // Fallback response with proper formatting
        res.json({
          verse: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.",
          reference: "Isaiah 41:10",
          version: version,
          explanation: `📖 This beautiful verse reminds us of God's constant presence and support in our lives.\n\n✨ When we face uncertainty or challenges, we can trust that our Heavenly Father is right beside us, offering His strength and guidance.\n\n🙏 His righteous right hand represents His power and authority working on our behalf.`,
          prayerPoint: "🙏 Heavenly Father, help me to remember Your faithful presence in every situation. Grant me peace knowing that Your strength is my foundation and Your love is my security. Amen. ✨"
        });
      }
    } catch (error) {
      console.error('Bible verse search error:', error);
      res.status(500).json({ error: 'Failed to generate Bible response' });
    }
  }

  // Bible Verse Search Endpoint
  app.get("/api/bible-verse", async (req: Request, res: Response) => {
    try {
      const { phrase, version = 'NIV', chapter, verse } = req.query;

      if (!phrase) {
        return res.status(400).json({ error: "Phrase is required" });
      }

      // Call the handler function
      await handleBibleVerseSearch(req, res, phrase as string, version as string, chapter as string | undefined, verse as string | undefined);
    } catch (error) {
      console.error('Bible verse search route error:', error);
      res.status(500).json({ error: 'Failed to process Bible verse search' });
    }
  });

  // Prayer suggestions endpoint
  app.get("/api/prayer-suggestions", async (req: Request, res: Response) => {
    try {
      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        return res.status(500).json({ 
          error: "DeepSeek API key not configured"
        });
      }

      const systemPrompt = `Generate 4 diverse prayer plan suggestions for different spiritual needs. Include personal, family, community, and global prayer focuses. 

Respond in JSON format as an array:
[
  {
    "category": "personal",
    "title": "Title",
    "description": "Description",
    "prayerPoints": ["Point 1", "Point 2", "Point 3"],
    "scriptures": ["Reference 1", "Reference 2"],
    "duration": 15
  }
]`;

      const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: 'Generate 4 meaningful prayer plan suggestions covering personal growth, family blessing, community healing, and global peace.'
            }
          ],
          max_tokens: 1200,
          temperature: 0.9
        })
      });

      if (!deepSeekResponse.ok) {
        throw new Error('DeepSeek API request failed');
      }

      const data = await deepSeekResponse.json();
      const aiResponse = data.choices[0]?.message?.content || "";

      let suggestions;
      try {
        suggestions = JSON.parse(aiResponse);
      } catch (parseError) {
        // Fallback suggestions
        suggestions = [
          {
            category: "personal",
            title: "Morning Spiritual Strength",
            description: "Begin your day with God's presence and guidance",
            prayerPoints: ["Gratitude for a new day", "Seeking God's guidance", "Strength for challenges ahead"],
            scriptures: ["Psalm 143:8", "Isaiah 40:31"],
            duration: 15
          },
          {
            category: "family",
            title: "Family Unity and Blessing",
            description: "Pray for your family's spiritual growth and harmony",
            prayerPoints: ["Family protection", "Unity in love", "Spiritual growth"],
            scriptures: ["Joshua 24:15", "Ephesians 6:4"],
            duration: 20
          }
        ];
      }

      res.json(suggestions);
    } catch (error) {
      console.error("Prayer suggestions error:", error);
      res.status(500).json({ 
        error: "Failed to fetch prayer suggestions"
      });
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
            'Authorization':`Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
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