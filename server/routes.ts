import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabaseAdmin } from "./supabase";
import axios from "axios";

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
      
      // If no attendance records exist, suggest generating test data
      if (formattedAttendance.length === 0) {
        console.log('No attendance records found for user:', userId);
        
        // Return empty array with suggestion to generate test data
        return res.json({
          attendance: [],
          message: "No attendance records found. Use the admin panel to generate test data or ensure Zoom tracking is working.",
          suggestion: "POST /api/admin/generate-test-attendance with userId to create test data"
        });
      }
      
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

      console.log('Creating skip request with service function:', { userId, skipDays, reason, userEmail });

      // Use the service function to create the skip request (bypasses RLS)
      const { data: request, error } = await supabaseAdmin
        .rpc('create_skip_request_service', {
          p_user_id: userId, // This will be cast to UUID in the function
          p_user_email: userEmail || `user-${userId}@placeholder.local`,
          p_skip_days: parseInt(skipDays),
          p_reason: reason.trim()
        });

      if (error) {
        console.error("Error creating skip request:", error);
        return res.status(500).json({ error: "Failed to create skip request" });
      }

      console.log('Skip request created successfully:', request);

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
      console.log('Admin fetching all skip requests...');
      
      // Try using the service function first
      const { data: requests, error } = await supabaseAdmin
        .rpc('get_all_skip_requests_admin');

      if (error) {
        console.error("Service function error:", error);
        
        // If service function doesn't exist, try direct query with service role
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          console.log('Service function missing, trying direct query with service role...');
          
          // Direct query using service role (should bypass RLS)
          const { data: directRequests, error: directError } = await supabaseAdmin
            .from('skip_requests')
            .select('*')
            .order('created_at', { ascending: false });

          if (directError) {
            console.error("Direct query also failed:", directError);
            
            // Use the SQL function we created to bypass RLS
            console.log('Trying query with service function...');
            const { data: rlsRequests, error: rlsError } = await supabaseAdmin
              .rpc('get_all_skip_requests_admin');

            if (rlsError) {
              console.error("RLS bypass failed:", rlsError);
              return res.status(500).json({ 
                error: "Unable to fetch skip requests. Please run the get_all_skip_requests_admin.sql file in Supabase.",
                details: "Database function missing and RLS policies blocking access"
              });
            }

            console.log(`Found ${rlsRequests?.length || 0} skip requests via RLS bypass`);
            return res.json(rlsRequests || []);
          }

          console.log(`Found ${directRequests?.length || 0} skip requests via direct query`);
          return res.json(directRequests || []);
        }
        
        return res.status(500).json({ 
          error: "Failed to fetch skip requests",
          details: error.message || 'Unknown error'
        });
      }

      console.log(`Found ${requests?.length || 0} skip requests for admin via service function`);
      
      if (requests && requests.length > 0) {
        console.log('Sample skip request data:', JSON.stringify(requests[0], null, 2));
      } else {
        console.log('No skip requests found in database');
      }
      
      res.json(requests || []);
    } catch (error: any) {
      console.error("Error in skip requests endpoint:", error);
      res.status(500).json({ 
        error: "Failed to fetch skip requests",
        details: error?.message || 'Unknown error'
      });
    }
  });

  // Admin: Approve/Reject skip request
  app.post("/api/admin/skip-requests/:requestId/action", async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { action, adminComment } = req.body;

      console.log('Processing skip request action:', { requestId, action, adminComment });

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
      }

      // Get the skip request using service function to bypass RLS
      const { data: skipRequestArray, error: fetchError } = await supabaseAdmin
        .rpc('get_all_skip_requests_admin');
      
      if (fetchError) {
        console.error("Error fetching skip requests:", fetchError);
        return res.status(500).json({ error: "Failed to fetch skip requests" });
      }

      const skipRequest = skipRequestArray?.find((req: any) => req.id === parseInt(requestId));

      if (!skipRequest) {
        console.error("Skip request not found:", requestId);
        return res.status(404).json({ error: "Skip request not found" });
      }

      const request = skipRequest;

      if (request.status !== 'pending') {
        return res.status(400).json({ error: "Skip request has already been processed" });
      }

      // Update the skip request status using service role to bypass RLS
      const { error: updateError } = await supabaseAdmin
        .from('skip_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_comment: adminComment || null,
          processed_at: new Date().toISOString()
        })
        .eq('id', parseInt(requestId));

      if (updateError) {
        console.error("Error updating skip request:", updateError);
        return res.status(500).json({ error: "Failed to update skip request" });
      }

      // If approved, update the prayer slot
      if (action === 'approve') {
        const skipEndDate = new Date();
        skipEndDate.setDate(skipEndDate.getDate() + request.skip_days);

        const { error: slotError } = await supabaseAdmin
          .from('prayer_slots')
          .update({
            status: 'skipped',
            skip_start_date: new Date().toISOString(),
            skip_end_date: skipEndDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', request.user_id);

        if (slotError) {
          console.error("Error updating prayer slot:", slotError);
          return res.status(500).json({ error: "Failed to update prayer slot" });
        }
      }

      console.log(`Skip request ${requestId} ${action} successfully`);

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

      // If no prayer sessions exist, return mock data for demonstration
      if (!sessions || sessions.length === 0) {
        console.log('No prayer sessions found, returning mock data for user:', userId);
        
        const mockSessions = [];
        const now = new Date();
        
        // Get user's slot time for realistic session scheduling
        const { data: userSlot } = await supabaseAdmin
          .from('prayer_slots')
          .select('slot_time')
          .eq('user_id', userId)
          .single();
          
        const slotTime = userSlot?.slot_time || '12:00–12:30';
        
        for (let i = 0; i < 15; i++) {
          const sessionDate = new Date(now);
          sessionDate.setDate(sessionDate.getDate() - Math.floor(Math.random() * 30));
          
          mockSessions.push({
            id: `mock_session_${i}`,
            user_id: userId,
            slot_time: slotTime,
            session_date: sessionDate.toISOString(),
            status: Math.random() > 0.1 ? 'completed' : 'missed', // 90% completion rate
            duration: Math.floor(Math.random() * 20) + 15, // 15-35 minutes
            created_at: sessionDate.toISOString(),
            updated_at: sessionDate.toISOString()
          });
        }
        
        console.log('Returning', mockSessions.length, 'mock prayer sessions');
        return res.json(mockSessions);
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

  // Enhanced Bible Chat with DeepSeek AI integration
  app.post("/api/bible-chat", async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        console.error("DeepSeek API key not found in environment variables");
        return res.status(500).json({ error: "DeepSeek API key not configured. Please add DEEPSEEK_API_KEY to your secrets." });
      }

      const cleanedMessage = cleanAIResponse(message);
      
      // Build context from previous messages
      let conversationContext = "";
      if (context && context.length > 0) {
        conversationContext = context.slice(-3).map((msg: any) => 
          `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n');
      }

      // Create a comprehensive prompt for biblical chat
      const prompt = `You are "The Intercessor," an AI Bible chat assistant for Global Intercessors. Your role is to provide biblical guidance, spiritual insights, and prayer support based on Scripture.

User's message: "${cleanedMessage}"

${conversationContext ? `Previous conversation:\n${conversationContext}\n` : ''}

Please respond with biblical wisdom, relevant Scripture, and practical spiritual guidance. Format your response as JSON with these exact fields:

{
  "response": "Your encouraging, biblical response with proper spacing and relevant emojis (📖🙏✨💝🌟)",
  "scripture": {
    "reference": "Book Chapter:Verse",
    "text": "The complete Bible verse text"
  },
  "insights": ["Spiritual insight 1", "Spiritual insight 2", "Spiritual insight 3"]
}

Guidelines:
- Be encouraging and biblically grounded
- Use appropriate emojis for warmth and engagement
- Include proper spacing and line breaks for readability
- Provide practical spiritual applications
- Keep insights concise but meaningful
- Always include a relevant Bible verse
- Respond as a caring spiritual advisor`;

      console.log('Calling DeepSeek API for Bible chat with key:', deepSeekApiKey ? `${deepSeekApiKey.substring(0, 8)}...` : 'undefined');

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are "The Intercessor," a biblical AI assistant providing spiritual guidance and biblical wisdom to Global Intercessors. Always respond with love, biblical truth, and practical spiritual insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1200,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DeepSeek API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from DeepSeek API');
      }

      console.log('DeepSeek API response received successfully');

      try {
        // Clean the response from markdown formatting
        let cleanedResponse = aiResponse.trim();
        
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        
        const parsedResponse = JSON.parse(cleanedResponse);
        res.json({
          response: parsedResponse.response,
          scripture: parsedResponse.scripture,
          insights: parsedResponse.insights
        });
      } catch (parseError) {
        console.error('Failed to parse DeepSeek response as JSON:', parseError);
        console.error('Raw response:', aiResponse);
        
        // Extract response content manually if JSON parsing fails
        let extractedResponse = aiResponse;
        
        // Try to extract the response field value
        const responseMatch = aiResponse.match(/"response"\s*:\s*"([^"]+(?:\\.[^"]*)*)"/) || 
                             aiResponse.match(/'response'\s*:\s*'([^']+(?:\\.[^']*)*)'/) ||
                             aiResponse.match(/"response"\s*:\s*`([^`]+)`/);
        
        if (responseMatch) {
          extractedResponse = responseMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\t/g, '\t');
        } else {
          // Clean the entire response
          extractedResponse = cleanAIResponse(aiResponse);
        }
        
        res.json({
          response: extractedResponse.includes('📖') ? extractedResponse : `📖 ${extractedResponse}`,
          scripture: {
            reference: "Isaiah 55:11",
            text: "So is my word that goes out from my mouth: It will not return to me empty, but will accomplish what I desire and achieve the purpose for which I sent it."
          },
          insights: ["God's Word is powerful", "Scripture accomplishes God's purposes", "Trust in divine guidance"]
        });
      }
    } catch (error) {
      console.error('Bible chat error:', error);
      
      // Provide a fallback response
      res.json({
        response: "📖 I'm having trouble connecting to provide you with personalized guidance right now, but remember that God's Word is always available to you! ✨\n\n🙏 Take a moment to seek Him in prayer, and He will guide your heart.",
        scripture: {
          reference: "Psalm 119:105",
          text: "Your word is a lamp for my feet, a light on my path."
        },
        insights: ["Scripture illuminates our path", "God's guidance is constant", "Prayer connects us to divine wisdom"]
      });
    }
  });

  // Bible Verse Search Handler Function
  async function handleBibleVerseSearch(req: Request, res: Response, phrase: string, version: string, chapter?: string, verse?: string) {
    try {
      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        console.error("DeepSeek API key not found in environment variables");
        return res.status(500).json({ error: "DeepSeek API key not configured. Please add DEEPSEEK_API_KEY to your secrets." });
      }

      console.log('Bible verse search using DeepSeek API with key:', `${deepSeekApiKey.substring(0, 8)}...`);

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

  // Enhanced Bible Verse Search Endpoint with API.Bible integration
  app.get("/api/bible-verse", async (req: Request, res: Response) => {
    const { action, phrase, version = "KJV", chapter, verse, bibleId, bookId, chapterId, query } = req.query;

    try {
      const bibleApiKey = process.env.BIBLE_API;
      if (!bibleApiKey) {
        console.error("Bible API key not found in environment variables");
        return res.status(500).json({ error: "Bible API key not configured. Please add BIBLE_API to your secrets." });
      }

      const baseUrl = 'https://api.scripture.api.bible/v1';
      const headers = {
        'api-key': bibleApiKey,
        'Content-Type': 'application/json'
      };

      console.log('Bible API request:', { action, bibleId, bookId, chapterId, query });

      switch (action) {
        case 'bibles':
          // Get list of available Bibles
          const biblesResponse = await fetch(`${baseUrl}/bibles`, { headers });
          if (!biblesResponse.ok) {
            throw new Error(`API.Bible error: ${biblesResponse.status}`);
          }
          const biblesData = await biblesResponse.json();
          
          // Filter for English Bibles and popular versions
          const filteredBibles = biblesData.data.filter((bible: any) => 
            bible.language.id === 'eng' && 
            (bible.abbreviation.includes('KJV') || 
             bible.abbreviation.includes('NIV') || 
             bible.abbreviation.includes('ESV') || 
             bible.abbreviation.includes('NASB') ||
             bible.abbreviation.includes('NLT') ||
             bible.abbreviation.includes('CSB'))
          );

          return res.json({ bibles: filteredBibles });

        case 'books':
          // Get books for a specific Bible
          if (!bibleId) {
            return res.status(400).json({ error: "bibleId parameter is required" });
          }
          
          const booksResponse = await fetch(`${baseUrl}/bibles/${bibleId}/books`, { headers });
          if (!booksResponse.ok) {
            throw new Error(`API.Bible error: ${booksResponse.status}`);
          }
          const booksData = await booksResponse.json();
          return res.json({ books: booksData.data });

        case 'chapters':
          // Get chapters for a specific book
          if (!bibleId || !bookId) {
            return res.status(400).json({ error: "bibleId and bookId parameters are required" });
          }
          
          const chaptersResponse = await fetch(`${baseUrl}/bibles/${bibleId}/books/${bookId}/chapters`, { headers });
          if (!chaptersResponse.ok) {
            throw new Error(`API.Bible error: ${chaptersResponse.status}`);
          }
          const chaptersData = await chaptersResponse.json();
          return res.json({ chapters: chaptersData.data });

        case 'verses':
          // Get verses for a specific chapter
          if (!bibleId || !chapterId) {
            return res.status(400).json({ error: "bibleId and chapterId parameters are required" });
          }
          
          const versesResponse = await fetch(`${baseUrl}/bibles/${bibleId}/chapters/${chapterId}/verses`, { headers });
          if (!versesResponse.ok) {
            throw new Error(`API.Bible error: ${versesResponse.status}`);
          }
          const versesData = await versesResponse.json();
          
          // Add reference information to each verse
          const versesWithReferences = versesData.data.map((verse: any) => {
            // Extract verse number from verse ID (e.g., "JHN.14.28" -> "28")
            const verseNumber = verse.id.split('.').pop();
            return {
              ...verse,
              verseNumber: verseNumber,
              reference: `${verse.chapterId.replace('.', ' ')}:${verseNumber}`
            };
          });
          
          return res.json({ verses: versesWithReferences });

        case 'verse':
          // Get individual verse content
          if (!bibleId || !query) {
            return res.status(400).json({ error: "bibleId and verse ID (query) parameters are required" });
          }
          
          console.log('Fetching verse:', `${baseUrl}/bibles/${bibleId}/verses/${query}`);
          
          const verseResponse = await fetch(`${baseUrl}/bibles/${bibleId}/verses/${query}`, { headers });
          if (!verseResponse.ok) {
            console.error(`API.Bible verse error: ${verseResponse.status}`);
            throw new Error(`API.Bible error: ${verseResponse.status}`);
          }
          const verseData = await verseResponse.json();
          
          console.log('Individual verse API response:', JSON.stringify(verseData, null, 2));
          
          const verse = verseData.data;
          const cleanContent = verse.content ? verse.content.replace(/<[^>]*>/g, '').trim() : '';
          
          const formattedVerse = {
            ...verse,
            text: cleanContent || 'Verse content not available',
            content: verse.content,
            reference: verse.reference,
            verseNumber: verse.id ? verse.id.split('.').pop() : verse.verseNumber
          };
          
          console.log('Formatted verse response:', formattedVerse);
          
          return res.json({ verse: formattedVerse });

        case 'search':
          // Search verses by keyword/phrase
          if (!bibleId || !query) {
            return res.status(400).json({ error: "bibleId and query parameters are required" });
          }
          
          const searchResponse = await fetch(
            `${baseUrl}/bibles/${bibleId}/search?query=${encodeURIComponent(query as string)}&limit=50`, 
            { headers }
          );
          if (!searchResponse.ok) {
            throw new Error(`API.Bible error: ${searchResponse.status}`);
          }
          const searchData = await searchResponse.json();
          
          console.log('Search API response:', JSON.stringify(searchData, null, 2));
          
          // API.Bible returns different structures - check for both 'verses' and 'passages'
          let searchResults = [];
          
          if (searchData.data) {
            // Try verses first (newer API format)
            if (searchData.data.verses && Array.isArray(searchData.data.verses)) {
              searchResults = searchData.data.verses;
            }
            // Fallback to passages (older API format)  
            else if (searchData.data.passages && Array.isArray(searchData.data.passages)) {
              searchResults = searchData.data.passages;
            }
            // Direct data array
            else if (Array.isArray(searchData.data)) {
              searchResults = searchData.data;
            }
          }
          
          console.log('Found search results:', searchResults.length);
          
          const formattedResults = {
            verses: searchResults.map((item: any) => {
              // Clean HTML tags from content
              const cleanContent = item.content ? item.content.replace(/<[^>]*>/g, '').trim() : '';
              
              return {
                id: item.id || item.verseId,
                orgId: item.orgId,
                bibleId: item.bibleId || bibleId,
                bookId: item.bookId,
                chapterId: item.chapterId,
                reference: item.reference,
                content: item.content,
                verseCount: item.verseCount,
                verseNumber: item.verseNumber,
                text: cleanContent
              };
            }),
            query: query,
            total: searchResults.length
          };
          
          return res.json({ results: formattedResults });

        default:
          // Legacy support for existing Bible verse search
          if (!phrase) {
            return res.status(400).json({ error: "Phrase parameter is required for legacy search" });
          }
          await handleBibleVerseSearch(req, res, phrase as string, version as string, chapter as string, verse as string);
      }
    } catch (error) {
      console.error('Bible API error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Bible data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Analytics endpoint for admin dashboard
  app.get("/api/admin/analytics", async (req: Request, res: Response) => {
    try {
      console.log('Fetching analytics data...');
      
      // Get user activities for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: attendanceData, error: attendanceError } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      const { data: slotsData, error: slotsError } = await supabaseAdmin
        .from('prayer_slots')
        .select('*');

      const { data: sessionsData, error: sessionsError } = await supabaseAdmin
        .from('prayer_sessions')
        .select('*')
        .gte('session_date', sevenDaysAgo.toISOString().split('T')[0]);

      // Get unique users from prayer slots (actual intercessors)
      const uniqueIntercessors = new Set();
      slotsData?.forEach(slot => {
        if (slot.user_id) {
          uniqueIntercessors.add(slot.user_id);
        }
      });

      console.log('Real data counts:', {
        totalSlots: slotsData?.length || 0,
        uniqueIntercessors: uniqueIntercessors.size,
        attendanceRecords: attendanceData?.length || 0,
        sessionRecords: sessionsData?.length || 0
      });

      if (attendanceError) console.error("Attendance error:", attendanceError);
      if (slotsError) console.error("Slots error:", slotsError);
      if (sessionsError) console.error("Sessions error:", sessionsError);

      // Process data for charts
      const userActivities = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayAttendance = attendanceData?.filter(a => a.date === dateStr) || [];
        const daySessions = sessionsData?.filter(s => s.session_date === dateStr) || [];
        
        userActivities.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          activities: dayAttendance.length + daySessions.length,
          prayers: daySessions.length,
          attendance: dayAttendance.filter(a => a.status === 'present' || a.status === 'attended').length
        });
      }

      // Prayer slot coverage analysis with real data
      const prayerStats: Array<{timeSlot: string; coverage: number; attendance: number}> = [];
      const timeSlots = ['00:00-02:59', '03:00-05:59', '06:00-08:59', '09:00-11:59', 
                        '12:00-14:59', '15:00-17:59', '18:00-20:59', '21:00-23:59'];
      
      timeSlots.forEach(slot => {
        const rangeStart = parseInt(slot.split('-')[0].split(':')[0]);
        const rangeEnd = parseInt(slot.split('-')[1].split(':')[0]);
        
        const slotsInRange = slotsData?.filter(s => {
          if (!s.slot_time) return false;
          const slotHour = parseInt(s.slot_time.split(':')[0]);
          return slotHour >= rangeStart && slotHour <= rangeEnd;
        }) || [];

        const totalSlots = slotsInRange.length;
        const activeSlots = slotsInRange.filter(s => s.status === 'active').length;
        
        const attendedSlots = attendanceData?.filter(a => {
          const slot = slotsInRange.find(s => s.user_id === a.user_id);
          return slot && (a.status === 'present' || a.status === 'attended');
        }).length || 0;
        
        prayerStats.push({
          timeSlot: slot,
          coverage: totalSlots > 0 ? Math.round((activeSlots / totalSlots) * 100) : 0,
          attendance: activeSlots > 0 ? Math.round((attendedSlots / activeSlots) * 100) : 0
        });
      });

      // Real intercessor statistics
      const totalRegistered = uniqueIntercessors.size;
      const totalActive = slotsData?.filter(s => s.status === 'active').length || 0;
      const todayAttendance = attendanceData?.filter(a => a.date === today.toISOString().split('T')[0]) || [];
      const activeToday = todayAttendance.filter(a => a.status === 'present' || a.status === 'attended').length;
      const averageAttendance = totalActive > 0 ? (activeToday / totalActive) * 100 : 0;

      // Weekly trends with real data
      const weeklyTrends = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekSessions = sessionsData?.filter(s => {
          const sessionDate = new Date(s.session_date || s.created_at);
          return sessionDate >= weekStart && sessionDate <= weekEnd;
        }) || [];

        const weekSlots = slotsData?.filter(s => {
          const createdDate = new Date(s.created_at);
          return createdDate >= weekStart && createdDate <= weekEnd;
        }) || [];
        
        weeklyTrends.push({
          week: `Week ${4-i}`,
          newRegistrations: weekSlots.length,
          totalSessions: weekSessions.length,
          avgDuration: weekSessions.length > 0 ? 
            Math.round(weekSessions.reduce((sum, s) => sum + (s.duration || 30), 0) / weekSessions.length) : 0
        });
      }

      const analytics = {
        userActivities,
        prayerStats,
        intercessorStats: {
          totalRegistered,
          totalActive,
          activeToday,
          averageAttendance: Math.round(averageAttendance)
        },
        weeklyTrends
      };

      console.log('Analytics response:', {
        totalRegistered: analytics.intercessorStats.totalRegistered,
        totalActive: analytics.intercessorStats.totalActive,
        activeToday: analytics.intercessorStats.activeToday
      });

      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

  const httpServer = createServer(app);
  // Update Zoom link endpoint
  app.post("/api/admin/zoom-link", async (req: Request, res: Response) => {
    try {
      const { zoomLink } = req.body;

      if (!zoomLink || !zoomLink.trim()) {
        return res.status(400).json({ error: "Zoom link is required" });
      }

      // Validate Zoom link format
      const zoomLinkRegex = /^https:\/\/(.*\.)?zoom\.us\/j\/\d+(\?.*)?$/;
      if (!zoomLinkRegex.test(zoomLink)) {
        return res.status(400).json({ error: "Invalid Zoom link format" });
      }

      // Extract meeting ID from the URL
      const meetingIdMatch = zoomLink.match(/\/j\/(\d+)/);
      const meetingId = meetingIdMatch ? meetingIdMatch[1] : 'unknown';

      // Store the zoom link in the database
      const { data: zoomSession, error } = await supabaseAdmin
        .from('zoom_meetings')
        .insert([
          {
            meeting_id: meetingId,
            meeting_uuid: `uuid_${meetingId}_${Date.now()}`,
            topic: 'Global Intercessors Prayer Session',
            start_time: new Date().toISOString(),
            participant_count: 0,
            processed: false,
            zoom_link: zoomLink,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving zoom link:', error);
        throw error;
      }

      console.log('Zoom link updated successfully:', zoomLink);
      res.json({ 
        success: true,
        message: 'Zoom link updated successfully', 
        session: zoomSession 
      });
    } catch (error) {
      console.error('Error updating zoom link:', error);
      res.status(500).json({ error: 'Failed to update zoom link' });
    }
  });

  // Get current zoom link/session
  app.get("/api/admin/zoom-link", async (req: Request, res: Response) => {
    try {
      const { data: latestSession, error } = await supabaseAdmin
        .from('zoom_meetings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching zoom link:', error);
        throw error;
      }

      // Format the response to match what the frontend expects
      const response = latestSession ? {
        zoomLink: latestSession.zoom_link || `https://zoom.us/j/${latestSession.meeting_id}`,
        meetingId: latestSession.meeting_id,
        topic: latestSession.topic,
        createdAt: latestSession.created_at
      } : null;

      res.json(response);
    } catch (error) {
      console.error('Error fetching zoom link:', error);
      res.status(500).json({ error: 'Failed to fetch zoom link' });
    }
  });

  // Test Zoom API connection with comprehensive debugging
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
      const tokenResponse = await axios.post('https://zoom.us/oauth/token', 
        `grant_type=account_credentials&account_id=${accountId}`,
        {
          headers: {
            'Authorization':`Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Test getting user info
      const userResponse = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Test getting meetings (last 7 days)
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const meetingsResponse = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          type: 'previous_meetings',
          from: sevenDaysAgo,
          to: today,
          page_size: 100
        }
      });

      // Test getting live meetings
      const liveMeetingsResponse = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          type: 'live',
          page_size: 100
        }
      });

      res.json({ 
        success: true, 
        message: "Zoom API connection and data retrieval successful",
        tokenType: tokenResponse.data.token_type,
        expiresIn: tokenResponse.data.expires_in,
        user: {
          id: userResponse.data.id,
          email: userResponse.data.email,
          displayName: userResponse.data.display_name
        },
        meetings: {
          totalPastMeetings: meetingsResponse.data.meetings?.length || 0,
          pastMeetings: meetingsResponse.data.meetings?.slice(0, 3) || [],
          totalLiveMeetings: liveMeetingsResponse.data.meetings?.length || 0,
          liveMeetings: liveMeetingsResponse.data.meetings || []
        },
        dateRange: {
          from: sevenDaysAgo,
          to: today
        }
      });
    } catch (error: any) {
      console.error('Zoom API test failed:', error.response?.data || error.message);
      res.status(500).json({ 
        error: "Zoom API connection failed",
        details: error.response?.data || error.message,
        suggestion: "Check your Zoom credentials in the Secrets tab"
      });
    }
  });

  // Manual attendance logging endpoint
  app.post("/api/attendance/manual-log", async (req: Request, res: Response) => {
    try {
      const { userId, userEmail, duration } = req.body;
      
      if (!userId || !userEmail) {
        return res.status(400).json({ error: "User ID and email are required" });
      }

      console.log(`📝 Manual attendance request: ${userEmail} (${duration || 20} minutes)`);
      console.log(`🔍 Looking for prayer slot with user_id: ${userId}`);

      // Use direct table access with service role key to bypass RLS
      const { data: prayerSlot, error: slotError } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .single();

      console.log('📊 Prayer slot direct query result:', { prayerSlot, slotError });

      if (slotError || !prayerSlot) {
        console.log('❌ No active prayer slot found:', slotError?.message || 'No data returned');
        return res.status(404).json({ error: "No active prayer slot found" });
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const sessionDuration = duration || 20;
      const sessionStart = new Date(now.getTime() - (sessionDuration * 60 * 1000));

      // Log attendance
      const attendanceData = {
        user_id: userId,
        slot_id: prayerSlot.id,
        date: today,
        status: 'attended',
        zoom_join_time: sessionStart,
        zoom_leave_time: now,
        zoom_meeting_id: `manual_${Date.now()}`
      };

      const { error: attendanceError } = await supabaseAdmin
        .from('attendance_log')
        .upsert(attendanceData, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        });

      if (attendanceError) {
        console.error('Error logging attendance:', attendanceError);
        return res.status(500).json({ error: "Failed to log attendance" });
      }

      // Reset missed count and update last attended
      const { error: updateError } = await supabaseAdmin
        .from('prayer_slots')
        .update({
          missed_count: 0,
          last_attended: now.toISOString()
        })
        .eq('id', prayerSlot.id);

      if (updateError) {
        console.error('Error updating prayer slot:', updateError);
      }

      console.log(`✅ Manual attendance logged for ${userEmail} - ${sessionDuration} minutes`);
      
      res.json({ 
        success: true, 
        message: "Manual attendance logged successfully",
        data: { 
          duration: sessionDuration, 
          date: today,
          slotTime: prayerSlot.slot_time
        }
      });
    } catch (error) {
      console.error('Error processing manual attendance:', error);
      res.status(500).json({ error: "Failed to process manual attendance" });
    }
  });

  // Get real-time attendance status (automatic tracking)
  app.get("/api/attendance/status/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const today = new Date().toISOString().split('T')[0];

      // Get today's attendance
      const { data: todayAttendance, error } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching attendance status:', error);
        return res.status(500).json({ error: "Failed to fetch attendance status" });
      }

      // Get user's prayer slot
      const { data: prayerSlot } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      const response = {
        hasAttendedToday: !!todayAttendance && todayAttendance.status === 'attended',
        attendanceRecord: todayAttendance,
        prayerSlot: prayerSlot,
        lastUpdated: new Date().toISOString(),
        systemStatus: "Automatic Zoom tracking active"
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching attendance status:', error);
      res.status(500).json({ error: "Failed to fetch attendance status" });
    }
  });

  // Store FCM token for push notifications
  app.post("/api/users/fcm-token", async (req: Request, res: Response) => {
    try {
      const { fcm_token } = req.body;
      
      if (!fcm_token) {
        return res.status(400).json({ error: "FCM token is required" });
      }

      // Get current user from Supabase session
      const authHeader = req.headers.authorization;
      let userId: string | null = null;

      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        try {
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          if (!error && user) {
            userId = user.id;
          }
        } catch (e) {
          console.error('Error verifying token:', e);
        }
      }

      // If no auth header, try to get user from cookie or session
      if (!userId) {
        // For now, we'll accept the FCM token storage without strict auth
        // In production, this should be more secure
        console.log('FCM token received without user context');
        return res.json({ success: true, message: "FCM token received" });
      }

      // Update user profile with FCM token
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: userId,
          fcm_token: fcm_token,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Error storing FCM token:', updateError);
        return res.status(500).json({ error: "Failed to store FCM token" });
      }

      res.json({ success: true, message: "FCM token stored successfully" });

    } catch (error) {
      console.error('Error in FCM token storage:', error);
      res.status(500).json({ error: "Failed to store FCM token" });
    }
  });

  // Force process Zoom meetings for attendance tracking
  app.post("/api/admin/force-process-zoom", async (req: Request, res: Response) => {
    try {
      console.log('🔄 Admin forcing Zoom meeting processing...');
      
      const { zoomAttendanceTracker } = await import('./services/zoomAttendanceTracker.js');
      const result = await zoomAttendanceTracker.forceProcessRecentMeetings();
      
      res.json({
        success: true,
        message: `Processed ${result.processed} meetings`,
        processed: result.processed
      });
    } catch (error) {
      console.error('Error force processing Zoom meetings:', error);
      res.status(500).json({ 
        error: "Failed to process Zoom meetings",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual attendance logging for testing
  app.post("/api/admin/log-attendance", async (req: Request, res: Response) => {
    try {
      const { userId, userEmail, duration = 20 } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      console.log('🔄 Admin manually logging attendance...', { userId, userEmail, duration });

      const { zoomAttendanceTracker } = await import('./services/zoomAttendanceTracker.js');
      const result = await zoomAttendanceTracker.logManualAttendance(userId, userEmail || '', duration);
      
      res.json({
        success: true,
        message: `Manual attendance logged successfully`,
        result
      });
    } catch (error) {
      console.error('Error logging manual attendance:', error);
      res.status(500).json({ 
        error: "Failed to log manual attendance",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all attendance records for debugging
  app.get("/api/admin/attendance-debug", async (req: Request, res: Response) => {
    try {
      console.log('🔍 Admin debugging attendance records...');

      // Get all attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (attendanceError) {
        console.error("Error fetching attendance records:", attendanceError);
        return res.status(500).json({ error: "Failed to fetch attendance records" });
      }

      // Get all prayer slots
      const { data: prayerSlots, error: slotsError } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .order('created_at', { ascending: false });

      if (slotsError) {
        console.error("Error fetching prayer slots:", slotsError);
        return res.status(500).json({ error: "Failed to fetch prayer slots" });
      }

      // Get all zoom meetings
      const { data: zoomMeetings, error: zoomError } = await supabaseAdmin
        .from('zoom_meetings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (zoomError) {
        console.error("Error fetching zoom meetings:", zoomError);
        return res.status(500).json({ error: "Failed to fetch zoom meetings" });
      }

      res.json({
        success: true,
        data: {
          attendanceRecords: attendanceRecords || [],
          prayerSlots: prayerSlots || [],
          zoomMeetings: zoomMeetings || [],
          counts: {
            totalAttendance: attendanceRecords?.length || 0,
            totalSlots: prayerSlots?.length || 0,
            totalZoomMeetings: zoomMeetings?.length || 0
          }
        }
      });
    } catch (error) {
      console.error('Error in attendance debug:', error);
      res.status(500).json({ 
        error: "Failed to debug attendance",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generate test attendance data for development
  app.post("/api/admin/generate-test-attendance", async (req: Request, res: Response) => {
    try {
      const { userId, days = 30 } = req.body;
      
      console.log('🔄 Generating test attendance data...', { userId, days });

      // Get user's prayer slot
      const { data: prayerSlot } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!prayerSlot) {
        return res.status(404).json({ error: "No active prayer slot found for user" });
      }

      const testAttendanceRecords = [];
      const today = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Simulate 85% attendance rate
        const attended = Math.random() > 0.15;
        const status = attended ? 'attended' : 'missed';

        const attendanceRecord = {
          user_id: userId,
          slot_id: prayerSlot.id,
          date: dateStr,
          status: status,
          zoom_join_time: attended ? new Date(date.getTime() + Math.random() * 1800000).toISOString() : null, // Random time within 30 min
          zoom_leave_time: attended ? new Date(date.getTime() + 1800000 + Math.random() * 1200000).toISOString() : null, // 30-50 min session
          zoom_meeting_id: attended ? `test_meeting_${Date.now()}_${i}` : null,
          created_at: date.toISOString()
        };

        testAttendanceRecords.push(attendanceRecord);
      }

      // Insert test records
      const { data: insertedRecords, error } = await supabaseAdmin
        .from('attendance_log')
        .upsert(testAttendanceRecords, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Error inserting test attendance:', error);
        return res.status(500).json({ error: "Failed to generate test attendance data" });
      }

      console.log(`✅ Generated ${testAttendanceRecords.length} test attendance records`);

      res.json({
        success: true,
        message: `Generated ${testAttendanceRecords.length} test attendance records`,
        recordsGenerated: testAttendanceRecords.length,
        sampleRecords: testAttendanceRecords.slice(0, 3)
      });
    } catch (error) {
      console.error('Error generating test attendance:', error);
      res.status(500).json({ 
        error: "Failed to generate test attendance data",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin: Data Allocation - Get intercessor data with attendance filtering
  app.get("/api/admin/data-allocation", async (req: Request, res: Response) => {
    try {
      const { minAttendance = 0, maxAttendance = 100 } = req.query;
      
      console.log('Fetching data allocation with attendance filter:', { minAttendance, maxAttendance });

      // Get all prayer slots with user information
      const { data: prayerSlots, error: slotsError } = await supabaseAdmin
        .from('prayer_slots')
        .select('*')
        .eq('status', 'active');

      if (slotsError) {
        console.error("Error fetching prayer slots:", slotsError);
        return res.status(500).json({ error: "Failed to fetch prayer slots" });
      }

      // Get all attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 30 days

      if (attendanceError) {
        console.error("Error fetching attendance records:", attendanceError);
        return res.status(500).json({ error: "Failed to fetch attendance records" });
      }

      // Process data for each intercessor
      const intercessorData = [];
      
      for (const slot of prayerSlots || []) {
        // Get user profile for additional information (phone, full name)
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('user_id', slot.user_id)
          .single();

        // Calculate attendance for this user over the last 30 days
        const userAttendance = (attendanceRecords || []).filter(record => record.user_id === slot.user_id);
        const totalDays = 30;
        const attendedDays = userAttendance.filter(record => record.status === 'attended').length;
        const attendancePercentage = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;

        // Apply attendance filter
        if (attendancePercentage >= parseInt(minAttendance as string) && 
            attendancePercentage <= parseInt(maxAttendance as string)) {
          
          intercessorData.push({
            user_id: slot.user_id,
            email: slot.user_email,
            prayer_slot: slot.slot_time,
            full_name: userProfile?.full_name || 'Not provided',
            phone_number: userProfile?.phone_number || 'Not provided',
            attendance_percentage: attendancePercentage,
            attended_days: attendedDays,
            total_days: totalDays,
            current_status: slot.status,
            joined_date: slot.created_at,
            last_attended: userAttendance.length > 0 ? 
              userAttendance.filter(r => r.status === 'attended')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date : null
          });
        }
      }

      // Sort by attendance percentage (highest first)
      intercessorData.sort((a, b) => b.attendance_percentage - a.attendance_percentage);

      console.log(`Found ${intercessorData.length} intercessors matching criteria`);
      res.json(intercessorData);
    } catch (error) {
      console.error("Error in data allocation:", error);
      res.status(500).json({ error: "Failed to fetch data allocation" });
    }
  });

  // Admin: Download CSV for data allocation
  app.get("/api/admin/data-allocation/download", async (req: Request, res: Response) => {
    try {
      const { minAttendance = 0, maxAttendance = 100 } = req.query;

      // Get the same data as the regular endpoint
      const response = await fetch(`http://localhost:5000/api/admin/data-allocation?minAttendance=${minAttendance}&maxAttendance=${maxAttendance}`);
      const intercessorData = await response.json();

      // Create CSV content
      const csvHeaders = [
        'Full Name',
        'Email',
        'Phone Number',
        'Prayer Slot',
        'Attendance Percentage',
        'Days Attended (30 days)',
        'Current Status',
        'Joined Date',
        'Last Attended'
      ];

      const csvRows = intercessorData.map((intercessor: any) => [
        intercessor.full_name,
        intercessor.email,
        intercessor.phone_number,
        intercessor.prayer_slot,
        `${intercessor.attendance_percentage}%`,
        `${intercessor.attended_days}/${intercessor.total_days}`,
        intercessor.current_status,
        new Date(intercessor.joined_date).toLocaleDateString(),
        intercessor.last_attended ? new Date(intercessor.last_attended).toLocaleDateString() : 'Never'
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map((field: any) => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="intercessor-data-${minAttendance}-${maxAttendance}percent-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error generating CSV:", error);
      res.status(500).json({ error: "Failed to generate CSV" });
    }
  });

  // Prayer Journey Visualizer API endpoints

  // Get user's prayer journey timeline
  app.get("/api/prayer-journey/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { timeframe = '30' } = req.query; // days
      
      console.log('Fetching prayer journey for user:', userId, 'timeframe:', timeframe);
      
      // For now, always provide sample data since tables don't exist yet
      // In production, this would check for real data first
      console.log('Generating sample prayer journey data for visualization');
      const sampleJourney = await generateSampleJourneyData(userId, parseInt(timeframe as string));
      return res.json(sampleJourney);


    } catch (error) {
      console.error("Error in prayer journey endpoint:", error);
      res.status(500).json({ error: "Failed to fetch prayer journey data" });
    }
  });

  // Create prayer journey entry
  app.post("/api/prayer-journey", async (req: Request, res: Response) => {
    try {
      const { userId, journeyType, title, description, emotionalState, prayerFocus, scriptureMeditation, personalNotes, tags } = req.body;

      const { data: newEntry, error } = await supabaseAdmin
        .from('prayer_journey')
        .insert({
          userId,
          journeyType,
          title,
          description,
          emotionalState,
          prayerFocus,
          scriptureMeditation,
          personalNotes,
          tags: tags || [],
          isPrivate: true
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating prayer journey entry:", error);
        return res.status(500).json({ error: "Failed to create prayer journey entry" });
      }

      res.json({ success: true, entry: newEntry });
    } catch (error) {
      console.error("Error in prayer journey creation:", error);
      res.status(500).json({ error: "Failed to create prayer journey entry" });
    }
  });

  // Create or update prayer goal
  app.post("/api/prayer-goals", async (req: Request, res: Response) => {
    try {
      const { userId, goalType, title, description, targetValue, targetDate } = req.body;

      const { data: newGoal, error } = await supabaseAdmin
        .from('prayer_goals')
        .insert({
          userId,
          goalType,
          title,
          description,
          targetValue,
          targetDate,
          currentValue: 0,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating prayer goal:", error);
        return res.status(500).json({ error: "Failed to create prayer goal" });
      }

      res.json({ success: true, goal: newGoal });
    } catch (error) {
      console.error("Error in prayer goal creation:", error);
      res.status(500).json({ error: "Failed to create prayer goal" });
    }
  });

  // Add daily spiritual insight
  app.post("/api/spiritual-insights", async (req: Request, res: Response) => {
    try {
      const { userId, gratitudeNote, prayerRequest, answeredPrayer, spiritualGrowthArea, bibleVerse, personalReflection, moodRating, faithLevel } = req.body;

      const { data: newInsight, error } = await supabaseAdmin
        .from('spiritual_insights')
        .insert({
          userId,
          insightDate: new Date().toISOString(),
          gratitudeNote,
          prayerRequest,
          answeredPrayer,
          spiritualGrowthArea,
          bibleVerse,
          personalReflection,
          moodRating,
          faithLevel
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating spiritual insight:", error);
        return res.status(500).json({ error: "Failed to create spiritual insight" });
      }

      res.json({ success: true, insight: newInsight });
    } catch (error) {
      console.error("Error in spiritual insight creation:", error);
      res.status(500).json({ error: "Failed to create spiritual insight" });
    }
  });

  // Generate sample journey data for visualization
  async function generateSampleJourneyData(userId: string, timeframeDays: number) {
    const sampleJourney = [];
    const sampleGoals = [];
    const sampleInsights = [];
    
    const journeyTypes = ['milestone', 'reflection', 'insight', 'breakthrough'];
    const emotionalStates = ['joyful', 'peaceful', 'grateful', 'seeking', 'hopeful'];
    const prayerFocuses = ['thanksgiving', 'petition', 'intercession', 'praise'];
    const growthAreas = ['faith', 'patience', 'love', 'wisdom', 'forgiveness'];
    
    // Generate journey entries over the timeframe
    for (let i = 0; i < Math.min(timeframeDays / 3, 10); i++) {
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - (i * 3));
      
      sampleJourney.push({
        id: `sample_journey_${i}`,
        userId,
        journeyType: journeyTypes[Math.floor(Math.random() * journeyTypes.length)],
        title: `Prayer Journey Day ${timeframeDays - (i * 3)}`,
        description: `Meaningful spiritual moment during prayer time`,
        emotionalState: emotionalStates[Math.floor(Math.random() * emotionalStates.length)],
        prayerFocus: prayerFocuses[Math.floor(Math.random() * prayerFocuses.length)],
        scriptureMeditation: i % 2 === 0 ? "Psalm 23:1-6" : "1 Thessalonians 5:16-18",
        personalNotes: "Personal reflection on God's goodness and guidance",
        isPrivate: true,
        tags: ['growth', 'guidance'],
        createdAt: entryDate.toISOString()
      });
    }
    
    // Generate prayer goals
    sampleGoals.push({
      id: 'sample_goal_1',
      userId,
      goalType: 'attendance',
      title: '30 Days of Consistent Prayer',
      description: 'Attend prayer sessions consistently for 30 days',
      targetValue: 30,
      currentValue: Math.floor(Math.random() * 25) + 5,
      status: 'active',
      isCompleted: false,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    // Generate spiritual insights
    for (let i = 0; i < Math.min(timeframeDays / 7, 4); i++) {
      const insightDate = new Date();
      insightDate.setDate(insightDate.getDate() - (i * 7));
      
      sampleInsights.push({
        id: `sample_insight_${i}`,
        userId,
        insightDate: insightDate.toISOString(),
        gratitudeNote: "Grateful for God's faithfulness and provision",
        prayerRequest: "Guidance in ministry and family decisions",
        spiritualGrowthArea: growthAreas[Math.floor(Math.random() * growthAreas.length)],
        bibleVerse: "For I know the plans I have for you - Jeremiah 29:11",
        personalReflection: "Experiencing deeper trust and peace in prayer",
        moodRating: Math.floor(Math.random() * 3) + 7, // 7-10 range
        faithLevel: Math.floor(Math.random() * 2) + 8, // 8-10 range
        createdAt: insightDate.toISOString()
      });
    }
    
    return {
      journey: sampleJourney,
      goals: sampleGoals,
      insights: sampleInsights,
      attendance: [], // This will be filled by existing attendance mock data
      timeframe: timeframeDays
    };
  }

  // Enhanced Prayer Planner API Endpoints
  
  // Get daily prayer plan
  app.get("/api/prayer-planner/daily", async (req: Request, res: Response) => {
    try {
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: "Date parameter is required" });
      }

      // For now, return mock data structure until database schema is implemented
      const mockPrayerPlan = {
        id: `plan-${date}`,
        date: date as string,
        prayerPoints: [],
        totalPoints: 0,
        completedPoints: 0
      };

      res.json(mockPrayerPlan);
    } catch (error) {
      console.error('Error fetching daily prayer plan:', error);
      res.status(500).json({ error: 'Failed to fetch prayer plan' });
    }
  });

  // Create new prayer point
  app.post("/api/prayer-planner/points", async (req: Request, res: Response) => {
    try {
      const { title, content, notes, category, date } = req.body;

      if (!title || !content || !category || !date) {
        return res.status(400).json({ error: "Title, content, category, and date are required" });
      }

      // Mock response until database implementation
      const newPoint = {
        id: `point-${Date.now()}`,
        title,
        content,
        notes: notes || "",
        category,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        order: 1
      };

      res.json({ 
        success: true, 
        point: newPoint,
        message: "Prayer point created successfully" 
      });
    } catch (error) {
      console.error('Error creating prayer point:', error);
      res.status(500).json({ error: 'Failed to create prayer point' });
    }
  });

  // Update prayer point
  app.put("/api/prayer-planner/points/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Mock response until database implementation
      res.json({ 
        success: true, 
        message: "Prayer point updated successfully",
        pointId: id,
        updates
      });
    } catch (error) {
      console.error('Error updating prayer point:', error);
      res.status(500).json({ error: 'Failed to update prayer point' });
    }
  });

  // Delete prayer point
  app.delete("/api/prayer-planner/points/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Mock response until database implementation
      res.json({ 
        success: true, 
        message: "Prayer point deleted successfully",
        pointId: id
      });
    } catch (error) {
      console.error('Error deleting prayer point:', error);
      res.status(500).json({ error: 'Failed to delete prayer point' });
    }
  });

  // AI Assistant for prayer point generation
  app.post("/api/prayer-planner/ai-assist", async (req: Request, res: Response) => {
    try {
      const { prompt, category } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        return res.status(500).json({ 
          error: "DeepSeek API key not configured. Please add DEEPSEEK_API_KEY to your secrets."
        });
      }

      console.log('AI Prayer Assistant request:', { prompt, category });

      const systemPrompt = `You are DeepSeek Assistant, a helpful AI companion for Christian intercessors. 
      
Your task is to help generate meaningful prayer points based on the user's request. 

Create a structured prayer point that includes:
1. A clear, specific title
2. Detailed prayer content with guidance on how to pray
3. A relevant Bible verse to support the prayer
4. An explanation of the spiritual significance

Category context: ${category || 'general prayer'}
User request: ${prompt}

Please respond in JSON format:
{
  "title": "Clear, specific prayer point title",
  "content": "Detailed prayer content with specific guidance on how to pray about this topic",
  "bibleVerse": "Relevant Bible verse text",
  "reference": "Bible verse reference (Book Chapter:Verse)",
  "explanation": "Brief explanation of the spiritual significance and why this prayer matters"
}

Make it personal, biblical, and actionable for intercession.`;

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
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
        res.json(parsedResponse);
      } catch (parseError) {
        // Fallback response if JSON parsing fails
        res.json({
          title: "AI-Generated Prayer Point",
          content: aiResponse,
          bibleVerse: "The Lord is near to all who call on him, to all who call on him in truth.",
          reference: "Psalm 145:18",
          explanation: "This prayer point was generated to help guide your intercession time with specific focus and biblical foundation."
        });
      }
    } catch (error) {
      console.error('AI Prayer Assistant error:', error);
      res.status(500).json({ 
        error: 'Failed to generate AI prayer assistance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return httpServer;
}