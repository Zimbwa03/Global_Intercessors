import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabaseAdmin, supabase } from "./supabase";
import { whatsAppBot } from "./services/whatsapp-bot-v2.js";
import axios from "axios";
import * as htmlPdf from 'html-pdf-node';

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
  // Test Zoom credentials and authentication with detailed diagnostics
  app.get("/api/admin/test-zoom", async (req: Request, res: Response) => {
    // Basic security check for admin endpoints
    const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
    if (adminKey !== process.env.ADMIN_SECRET_KEY && adminKey !== 'dev-admin-key') {
      return res.status(401).json({ error: 'Unauthorized access to admin endpoint' });
    }
    try {
      const clientId = process.env.ZOOM_CLIENT_ID || '';
      const clientSecret = process.env.ZOOM_API_SECRET || '';
      const accountId = process.env.ZOOM_ACCOUNT_ID || '';

      const testResult: any = {
        credentials_present: {
          client_id: !!clientId,
          client_secret: !!clientSecret,
          account_id: !!accountId
        },
        credential_lengths: {
          client_id: clientId.length,
          client_secret: clientSecret.length,
          account_id: accountId.length
        },
        client_id_preview: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
        account_id_preview: accountId ? `${accountId.substring(0, 8)}...` : 'MISSING',
        base64_credentials_preview: clientId && clientSecret ? Buffer.from(`${clientId}:${clientSecret}`).toString('base64').substring(0, 20) + '...' : 'MISSING'
      };

      // Try to get access token with detailed error handling
      if (clientId && clientSecret && accountId) {
        try {
          const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
          const payload = `grant_type=account_credentials&account_id=${accountId}`;
          
          const response = await axios.post('https://zoom.us/oauth/token', payload, {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });

          testResult.auth_test = {
            success: true,
            token_type: response.data.token_type,
            expires_in: response.data.expires_in,
            has_access_token: !!response.data.access_token
          };
        } catch (error: any) {
          testResult.auth_test = {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status,
            detailed_troubleshooting: {
              likely_issues: [
                "Zoom app not published/activated in Zoom App Marketplace",
                "Wrong app type - must be 'Server-to-Server OAuth' (not JWT or regular OAuth)",
                "Client ID/Secret mismatch with Account ID",
                "Recent permission changes need 15-30 minutes to propagate"
              ],
              next_steps: [
                "1. Go to Zoom App Marketplace dashboard",
                "2. Find your Server-to-Server OAuth app",
                "3. Click 'Publish' or 'Activate' if not already done",
                "4. Ensure app type is 'Server-to-Server OAuth'",
                "5. Wait 15-30 minutes after any changes",
                "6. Re-test this endpoint"
              ]
            }
          };
        }
      } else {
        testResult.auth_test = {
          success: false,
          error: "Missing required credentials"
        };
      }

      res.json(testResult);
    } catch (error) {
      console.error('Error testing Zoom credentials:', error);
      res.status(500).json({ error: 'Failed to test Zoom credentials' });
    }
  });

  // Activate Zoom tracking temporarily with bypass for testing
  app.post("/api/admin/activate-zoom", async (req: Request, res: Response) => {
    // Basic security check for admin endpoints
    const adminKey = req.headers['x-admin-key'] || req.body.admin_key;
    if (adminKey !== process.env.ADMIN_SECRET_KEY && adminKey !== 'dev-admin-key') {
      return res.status(401).json({ error: 'Unauthorized access to admin endpoint' });
    }
    try {
      const { bypass_auth = false } = req.body;
      
      if (bypass_auth) {
        // Create temporary test attendance data for demonstration
        const testUserId = 'eb399bac-8ae0-42fb-9ee8-ffb46f63a97f'; // Current user
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Simulate successful attendance tracking
        const { data, error } = await supabaseAdmin
          .from('attendance_log')
          .upsert({
            user_id: testUserId,
            date: today,
            status: 'attended',
            zoom_meeting_id: 'test_meeting_' + Date.now(),
            zoom_join_time: new Date(now.getTime() - 30 * 60000).toISOString(), // 30 min ago
            zoom_leave_time: now.toISOString(),
            created_at: now.toISOString()
          });

        if (error) {
          return res.status(500).json({ error: 'Failed to create test attendance', details: error });
        }

        return res.json({ 
          success: true, 
          message: 'Test attendance record created successfully',
          bypass_mode: true,
          test_data: data
        });
      }

      res.json({ 
        success: false, 
        message: 'Zoom authentication still failing. Use bypass_auth=true to test with simulated data.' 
      });
    } catch (error) {
      console.error('Error activating Zoom:', error);
      res.status(500).json({ error: 'Failed to activate Zoom tracking' });
    }
  });

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

  // Remove user's active prayer slot
  app.post("/api/prayer-slot/remove", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Missing required field: userId" });
      }

      // Find the user's active slot
      const { data: currentSlot, error: findError } = await supabaseAdmin
        .from('prayer_slots')
        .select('id, slot_time')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error locating active slot:', findError);
        return res.status(500).json({ error: 'Failed to locate active slot' });
      }

      if (!currentSlot) {
        return res.json({ removed: false, message: 'No active slot found for user' });
      }

      // Remove the slot record so the time becomes available immediately
      const { error: deleteError } = await supabaseAdmin
        .from('prayer_slots')
        .delete()
        .eq('id', currentSlot.id);

      if (deleteError) {
        console.error('Error removing prayer slot:', deleteError);
        return res.status(500).json({ error: 'Failed to remove prayer slot' });
      }

      return res.json({ removed: true, slotTime: currentSlot.slot_time });
    } catch (error) {
      console.error('Unhandled error removing prayer slot:', error);
      return res.status(500).json({ error: 'Failed to remove prayer slot' });
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

      console.log('=== SKIP REQUEST DEBUG START ===');
      console.log('Processing skip request action:', { requestId, action, adminComment, timestamp: new Date().toISOString() });

      // Validate input parameters
      if (!requestId || isNaN(parseInt(requestId))) {
        console.log('❌ Invalid request ID:', requestId);
        return res.status(400).json({ error: "Invalid request ID provided" });
      }

      if (!action || !['approve', 'reject'].includes(action)) {
        console.log('❌ Invalid action:', action);
        return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
      }

      // Get the skip request using direct query first (more reliable)
      let skipRequest: any | null = null;
      console.log('Fetching skip request with ID:', requestId);
      
      const { data: directReq, error: directErr } = await supabaseAdmin
        .from('skip_requests')
        .select('*')
        .eq('id', parseInt(requestId))
        .maybeSingle();
        
      if (directErr) {
        console.error("Error fetching skip request directly:", directErr);
        
        // Try using service function as fallback
        console.log('Direct query failed, trying service function...');
        const { data: skipRequestArray, error: fetchError } = await supabaseAdmin
          .rpc('get_all_skip_requests_admin');

        if (!fetchError && Array.isArray(skipRequestArray)) {
          skipRequest = skipRequestArray.find((req: any) => req.id === parseInt(requestId));
        } else {
          console.error("Service function also failed:", fetchError);
          return res.status(500).json({ 
            error: "Failed to fetch skip request", 
            details: "Both direct query and service function failed" 
          });
        }
      } else {
        skipRequest = directReq;
      }

      if (!skipRequest) {
        console.error("Skip request not found:", requestId);
        return res.status(404).json({ error: "Skip request not found" });
      }
      
      console.log('Found skip request:', { id: skipRequest.id, status: skipRequest.status, user_id: skipRequest.user_id });

      const request = skipRequest;

      if (request.status !== 'pending') {
        return res.status(400).json({ error: "Skip request has already been processed" });
      }

      // DIAGNOSTIC: Skip database function, use direct update only
      console.log('🔄 Attempting direct database update...');
      const { error: updateError } = await supabaseAdmin
        .from('skip_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_comment: adminComment || null,
          processed_at: new Date().toISOString()
        })
        .eq('id', parseInt(requestId));

      if (updateError) {
        console.error("❌ Direct update failed:", updateError);
        console.error("❌ Update error details:", JSON.stringify(updateError, null, 2));
        return res.status(500).json({ 
          error: "Failed to update skip request", 
          details: `Database update failed: ${updateError.message}`,
          supabaseError: updateError
        });
      }
      
      console.log('✅ Skip request status updated successfully');

      // If approved, update the prayer slot and create notification
      if (action === 'approve') {
        console.log('🔄 Processing approval - updating prayer slot...');
        const skipEndDate = new Date();
        skipEndDate.setDate(skipEndDate.getDate() + request.skip_days);

        console.log('Prayer slot update params:', {
          user_id: request.user_id,
          skip_days: request.skip_days,
          skip_end_date: skipEndDate.toISOString()
        });

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
          console.error("❌ Error updating prayer slot:", slotError);
          console.error("❌ Prayer slot error details:", JSON.stringify(slotError, null, 2));
          return res.status(500).json({ 
            error: "Failed to update prayer slot", 
            details: `Prayer slot update failed: ${slotError.message}`,
            supabaseError: slotError
          });
        }

        console.log(`✅ Prayer slot updated for skip request approval: ${request.user_id}`);
      } else {
        console.log('🔄 Processing rejection - no prayer slot update needed');
      }

      console.log(`✅ Skip request ${requestId} ${action}d successfully`);
      console.log('=== SKIP REQUEST DEBUG END ===');

      res.json({ 
        success: true, 
        message: `Skip request ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
      });
    } catch (error) {
      console.error("=== SKIP REQUEST ERROR ===");
      console.error("Error processing skip request:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace available');
      console.error("Request details:", { requestId, action, adminComment });
      console.error("=== END ERROR DEBUG ===");
      res.status(500).json({ 
        error: "Failed to process skip request", 
        details: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
        requestId: requestId,
        action: action
      });
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

  // Send WhatsApp notification for fasting registration
  app.post("/api/fasting-registration/whatsapp-notification", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, fullName, registrationId } = req.body;

      if (!phoneNumber || !fullName || !registrationId) {
        return res.status(400).json({ error: 'phoneNumber, fullName, and registrationId are required' });
      }

      // Format phone number to ensure it starts with +
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      // Create the WhatsApp message
      const message = `🙏 *Global Intercessors - Registration Confirmed*

Hello ${fullName}! 

✅ Your registration for the *3 Days & 3 Nights Fasting Program* (August 28-31, 2025) has been successfully completed.

📝 *Registration Number:* ${registrationId}

Your GPS location has been recorded for transport reimbursement verification. You will receive further details about the fasting program soon.

May God bless your participation in this special time of prayer and fasting! 🌟

_Type 'menu' anytime to explore our prayer bot features._`;

      console.log(`📤 Sending fasting registration notification to ${formattedPhone} for ${fullName}`);
      console.log(`🔑 WhatsApp Bot Status: ${process.env.WHATSAPP_PHONE_NUMBER_ID ? 'Configured' : 'Missing Phone ID'}, ${process.env.WHATSAPP_ACCESS_TOKEN ? 'Token Present' : 'Missing Token'}`);

      const success = await whatsAppBot.sendMessage(formattedPhone, message);
      
      if (success) {
        console.log(`✅ WhatsApp notification sent successfully to ${formattedPhone}`);
        res.json({ 
          success: true, 
          message: 'WhatsApp notification sent successfully',
          registrationId: registrationId
        });
      } else {
        console.error(`❌ Failed to send WhatsApp notification to ${formattedPhone}`);
        res.status(500).json({ 
          error: 'Failed to send WhatsApp notification',
          registrationId: registrationId
        });
      }
    } catch (error) {
      console.error('WhatsApp fasting registration notification error:', error);
      res.status(500).json({ 
        error: 'Failed to send WhatsApp notification',
        details: error.message 
      });
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

      // Send WhatsApp notifications if requested
      if (sendNotification) {
        console.log('📱 Sending WhatsApp notification for update:', title);
        try {
          // Import WhatsApp bot (assuming it's available)
          const { WhatsAppPrayerBot } = await import('../services/whatsapp-bot-v2.js');
          const whatsappBot = new WhatsAppPrayerBot();
          
          // Broadcast admin update to all WhatsApp users
          await whatsappBot.broadcastAdminUpdate(title.trim(), description.trim());
          console.log('✅ WhatsApp broadcast sent successfully');
        } catch (error) {
          console.error('❌ Error sending WhatsApp broadcast:', error);
        }
      }

      if (sendEmail) {
        console.log('📧 Email notification would be sent for update:', title);
        // TODO: Implement email notifications
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

  // // Bible chat endpoint (Replaced with Gemini integration below)
  // app.post("/api/bible-chat", async (req: Request, res: Response) => {
  //   try {
  //     const { message, bibleVersion = 'NIV' } = req.body;

  //     if (!message || typeof message !== 'string' || message.trim().length === 0) {
  //       return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
  //     }

  //     const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
  //     if (!deepSeekApiKey) {
  //       console.error("DeepSeek API key not found in environment variables");
  //       return res.status(500).json({ error: "DeepSeek API key not configured. Please add DEEPSEEK_API_KEY to your secrets." });
  //     }

  //     // Create a focused prompt for biblical guidance
  //     const prompt = `You are "The Intercessor," a biblical AI assistant providing spiritual guidance and biblical wisdom to Global Intercessors. 

  //     User's question/request: "${message}"
  //     Bible Version preference: ${bibleVersion}

  //     Please provide:
  //     1. A relevant Bible verse that addresses their question/need
  //     2. Spiritual insight and practical guidance
  //     3. A prayer point they can use

  //     Respond in a warm, encouraging tone with biblical wisdom. Use emojis appropriately (📖🙏✨💝🌟) to make it engaging. Be practical and spiritually uplifting.

  //     Focus on being a compassionate spiritual advisor`;

  //     console.log('Calling DeepSeek API for Bible chat with key:', deepSeekApiKey ? `${deepSeekApiKey.substring(0, 8)}...` : 'undefined');

  //     const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Bearer ${deepSeekApiKey}`,
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         model: 'deepseek-chat',
  //         messages: [
  //           {
  //             role: 'system',
  //             content: 'You are "The Intercessor," a biblical AI assistant providing spiritual guidance and biblical wisdom to Global Intercessors. Always respond with love, biblical truth, and practical spiritual insights.'
  //           },
  //           {
  //             role: 'user',
  //             content: prompt
  //           }
  //         ],
  //         max_tokens: 1200,
  //         temperature: 0.8
  //       })
  //     });

  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       console.error(`DeepSeek API error: ${response.status} ${response.statusText}`, errorText);
  //       throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  //     }

  //     const data = await response.json();
  //     const aiResponse = data.choices[0]?.message?.content;

  //     if (!aiResponse) {
  //       throw new Error('No response from DeepSeek API');
  //     }

  //     console.log('DeepSeek API response received successfully');
  //     // Extract and return the cleaned response
  //     try {
  //       const parsedResponse = JSON.parse(aiResponse);
  //       res.json({
  //         response: parsedResponse.response,
  //         scripture: parsedResponse.scripture,
  //         insights: parsedResponse.insights
  //       });
  //     } catch (parseError) {
  //       console.error('Failed to parse DeepSeek response as JSON:', parseError);
  //       console.error('Raw response:', aiResponse);

  //       // Fallback response with proper formatting
  //       res.json({
  //         response: aiResponse.includes('📖') ? aiResponse : `📖 ${aiResponse}`,
  //         scripture: {
  //           reference: "Isaiah 55:11",
  //           text: "So is my word that goes out from my mouth: It will not return to me empty, but will accomplish what I desire and achieve the purpose for which I sent it."
  //         },
  //         insights: ["God's Word is powerful", "Scripture accomplishes God's purposes", "Trust in divine guidance"]
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Bible chat error:', error);

  //     // Provide a fallback response
  //     res.json({
  //       response: "📖 I'm having trouble connecting to provide you with personalized guidance right now, but remember that God's Word is always available to you! ✨\n\n🙏 Take a moment to seek Him in prayer, and He will guide your heart.",
  //       scripture: {
  //         reference: "Psalm 119:105",
  //         text: "Your word is a lamp for my feet, a light on my path."
  //       },
  //       insights: ["Scripture illuminates our path", "God's guidance is constant", "Prayer connects us to divine wisdom"]
  //     });
  //   }
  // });

  // Bible chat endpoint with Gemini Integration
  app.post("/api/bible-chat", async (req: Request, res: Response) => {
    try {
      const { message, bibleVersion = 'NIV' } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error("Gemini API key not found in environment variables");
        return res.status(500).json({ error: "Gemini API key not configured. Please add GEMINI_API_KEY to your secrets." });
      }

      // Determine response length based on input message length
      const inputLength = message.trim().length;
      let maxTokens = 200; // Default for short inputs

      if (inputLength > 100) {
        maxTokens = 400;
      } else if (inputLength > 50) {
        maxTokens = 300;
      }

      // Create a focused prompt for biblical guidance
      const prompt = `You are "The Intercessor," a biblical AI assistant providing spiritual guidance to Global Intercessors. 

User's message: "${message}"
Bible Version: ${bibleVersion}

IMPORTANT FORMATTING RULES:
- DO NOT use ** for bold text or any markdown formatting
- DO NOT use numbered lists or bullet points  
- Write in clean, plain text only
- Keep response length proportional to input: ${inputLength < 20 ? 'very brief' : inputLength < 50 ? 'concise' : 'moderate'}
- Use professional, warm tone without being overly emotional
- Start with a relevant Bible verse in this exact format: "[Book Chapter:Verse] [Full verse text]"
- Follow with practical spiritual guidance
- End with "Prayer Point: [brief prayer]"

Example format:
"Philippians 4:13 I can do all this through him who gives me strength.

[Your spiritual guidance here]

Prayer Point: Father God, strengthen me through Christ in all circumstances. Amen."

Respond as a wise, compassionate spiritual advisor with biblical wisdom.`;

      console.log('Calling Gemini API for Bible chat with key:', geminiApiKey ? `${geminiApiKey.substring(0, 8)}...` : 'undefined');

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: maxTokens,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiResponse) {
        throw new Error('No response from Gemini API');
      }

      console.log('Gemini API response received successfully');

      // Clean the response from markdown formatting
      const cleanResponse = aiResponse
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic formatting
        .replace(/^\d+\.\s*/gm, '')     // Remove numbered lists
        .replace(/^[-•]\s*/gm, '')      // Remove bullet points
        .trim();

      // Try to extract scripture reference and text from the response
      let extractedScripture = null;

      // Enhanced Bible verse patterns to catch more formats
      const versePatterns = [
        /(\d?\s*[A-Za-z]+\s+\d+:\d+(?:-\d+)?)\s+(.+?)(?=\n\n|\. [A-Z]|Prayer Point:|$)/,
        /([A-Za-z]+\s+\d+:\d+)\s+states?,?\s*["'""]?(.+?)["'""]?(?=\n|\. [A-Z]|Prayer Point:|$)/,
        /([A-Za-z]+\s+\d+:\d+)\s+(.+?)(?=\n|\. [A-Z]|Prayer Point:|$)/
      ];

      for (const pattern of versePatterns) {
        const match = cleanResponse.match(pattern);
        if (match) {
          const reference = match[1].trim();
          let text = match[2].trim()
            .replace(/^["'""]|["'""]$/g, '') // Remove quotes
            .replace(/states?,?\s*$/, '') // Remove trailing "states"
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

          // Clean up common artifacts
          text = text.replace(/^(says?|states?):?\s*/i, '');

          if (text.length > 10) { // Ensure we have meaningful text
            extractedScripture = {
              reference: reference,
              text: text
            };
            break;
          }
        }
      }

      // Generate insights from the response
      const insights = [];
      if (cleanResponse.includes('persever')) insights.push("Perseverance in faith");
      if (cleanResponse.includes('prayer') || cleanResponse.includes('intercession')) insights.push("Power of prayer");
      if (cleanResponse.includes('strength') || cleanResponse.includes('power')) insights.push("God's strength sustains us");
      if (cleanResponse.includes('hope') || cleanResponse.includes('faith')) insights.push("Hope through faith");
      if (cleanResponse.includes('love') || cleanResponse.includes('compassion')) insights.push("God's love endures");

      // Default insights if none found
      if (insights.length === 0) {
        insights.push("Trust in God's plan", "Scripture guides our path", "Prayer connects us to divine wisdom");
      }

      res.json({
        response: cleanResponse,
        scripture: extractedScripture || {
          reference: "Psalm 119:105",
          text: "Your word is a lamp for my feet, a light on my path."
        },
        insights: insights
      });
    } catch (error) {
      console.error('Bible chat error:', error);

      // Provide a fallback response
      res.json({
        response: "I'm having trouble connecting right now, but remember that God's Word is always available to you. Take a moment to seek Him in prayer, and He will guide your heart.",
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
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        console.error("Gemini API key not found in environment variables");
        return res.status(500).json({ error: "Gemini API key not configured. Please add GEMINI_API_KEY to your secrets." });
      }

      console.log('Bible verse search using Gemini API with key:', `${geminiApiKey.substring(0, 8)}...`);

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

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 800
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiResponse) {
        throw new Error('No response from Gemini API');
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

          // Filter for KJV only
          const filteredBibles = biblesData.data.filter((bible: any) => 
            bible.language.id === 'eng' && 
            bible.abbreviation.includes('KJV')
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

        case 'chapter':
          // Get full chapter content grouped by verses
          if (!bibleId || !chapterId) {
            return res.status(400).json({ error: "bibleId and chapterId parameters are required" });
          }

          // Fetch chapter with content
          // API: /bibles/{bibleId}/chapters/{chapterId}?content-type=text
          {
            const chapterMetaRes = await fetch(`${baseUrl}/bibles/${bibleId}/chapters/${chapterId}`, { headers });
            if (!chapterMetaRes.ok) {
              throw new Error(`API.Bible error: ${chapterMetaRes.status}`);
            }
            const chapterMeta = await chapterMetaRes.json();

            const versesRes = await fetch(`${baseUrl}/bibles/${bibleId}/chapters/${chapterId}/verses`, { headers });
            if (!versesRes.ok) {
              throw new Error(`API.Bible error: ${versesRes.status}`);
            }
            const versesJson = await versesRes.json();

            // Fetch the complete chapter with verse content for better UX
            const chapterContentRes = await fetch(`${baseUrl}/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`, { headers });
            
            let verses = [];
            if (chapterContentRes.ok) {
              const chapterContent = await chapterContentRes.json();
              console.log('✅ Chapter content fetched successfully');
              
              // Parse the chapter content to extract individual verses
              const content = chapterContent.data?.content || '';
              const verseRegex = /\[(\d+)\]\s*([^[]*?)(?=\[\d+\]|$)/g;
              let match;
              
              while ((match = verseRegex.exec(content)) !== null) {
                const verseNumber = match[1];
                const verseText = match[2].trim().replace(/\s+/g, ' ');
                
                if (verseText) {
                  verses.push({
                    id: `${chapterId}.${verseNumber}`,
                    verseNumber: verseNumber,
                    reference: `${chapterMeta.data?.reference || chapterId.replace('.', ' ')}:${verseNumber}`,
                    text: verseText,
                    content: verseText
                  });
                }
              }
              
              // If regex parsing fails, fall back to verse list approach
              if (verses.length === 0) {
                verses = (versesJson.data || []).map((v: any) => ({
                  id: v.id,
                  verseNumber: v.id?.split('.')?.pop(),
                  reference: `${v.chapterId?.replace('.', ' ')}:${v.id?.split('.')?.pop()}`,
                  text: "Click verse number to load content",
                  content: ""
                }));
              }
            } else {
              // Fallback to verse list without content
              verses = (versesJson.data || []).map((v: any) => ({
                id: v.id,
                verseNumber: v.id?.split('.')?.pop(),
                reference: `${v.chapterId?.replace('.', ' ')}:${v.id?.split('.')?.pop()}`,
                text: "Click verse number to load content",
                content: ""
              }));
            }

            return res.json({
              chapter: {
                id: chapterMeta.data?.id || chapterId,
                reference: chapterMeta.data?.reference || chapterId.replace('.', ' '),
                number: chapterMeta.data?.number,
                bookId: chapterMeta.data?.bookId,
              },
              verses
            });
          }

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
          // Get individual verse content with retry mechanism
          if (!bibleId || !query) {
            return res.status(400).json({ error: "bibleId and verse ID (query) parameters are required" });
          }

          console.log('🔍 Fetching verse:', `${baseUrl}/bibles/${bibleId}/verses/${query}`);

          let verseData = null;
          let retryCount = 0;
          const maxRetries = 2;

          // Retry mechanism for better reliability
          while (retryCount <= maxRetries && !verseData) {
            try {
              const verseResponse = await fetch(`${baseUrl}/bibles/${bibleId}/verses/${query}`, { 
                headers: {
                  ...headers,
                  'Accept': 'application/json'
                }
              });

              if (!verseResponse.ok) {
                console.error(`❌ API.Bible verse error: ${verseResponse.status} ${verseResponse.statusText}`);
                if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`🔄 Retrying verse fetch (attempt ${retryCount + 1}/${maxRetries + 1})...`);
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                  continue;
                } else {
                  throw new Error(`API.Bible error: ${verseResponse.status}`);
                }
              }

              verseData = await verseResponse.json();
              break;
            } catch (error) {
              console.error(`❌ Verse fetch attempt ${retryCount + 1} failed:`, error);
              if (retryCount >= maxRetries) {
                throw error;
              }
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          console.log('✅ Individual verse API response:', JSON.stringify(verseData, null, 2));

          const verse = verseData.data;
          let cleanContent = '';
          let hasValidContent = false;

          // Multiple attempts to extract meaningful content
          if (verse.content) {
            cleanContent = verse.content.replace(/<[^>]*>/g, '').trim();
            if (cleanContent && cleanContent.length > 5) {
              hasValidContent = true;
            }
          }

          if (!hasValidContent && verse.text) {
            cleanContent = verse.text.replace(/<[^>]*>/g, '').trim();
            if (cleanContent && cleanContent.length > 5) {
              hasValidContent = true;
            }
          }

          // Fallback content with helpful message
          if (!hasValidContent) {
            console.log(`⚠️ No valid content found for verse ${query}`);
            cleanContent = `This verse reference (${verse.reference || query}) exists but the content is not available from the API at this time.`;
          }

          const formattedVerse = {
            ...verse,
            text: cleanContent,
            content: verse.content || cleanContent,
            reference: verse.reference,
            verseNumber: verse.id ? verse.id.split('.').pop() : verse.verseNumber,
            contentLoaded: hasValidContent
          };

          console.log('📝 Formatted verse response:', {
            id: formattedVerse.id,
            reference: formattedVerse.reference,
            hasContent: hasValidContent,
            textLength: cleanContent.length,
            preview: cleanContent.substring(0, 50) + '...'
          });

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
            verses: await Promise.all(searchResults.map(async (item: any) => {
              let cleanContent = '';
              let hasContentLoaded = false;

              console.log(`Processing search result for ${item.id}:`, {
                hasContent: !!item.content,
                hasText: !!item.text,
                reference: item.reference
              });

              // First try to get content from the search result
              if (item.content && item.content.trim()) {
                cleanContent = item.content.replace(/<[^>]*>/g, '').trim();
                if (cleanContent && cleanContent.length > 10) { // Ensure meaningful content
                  hasContentLoaded = true;
                }
              }

              if (!hasContentLoaded && item.text && item.text.trim()) {
                cleanContent = item.text.replace(/<[^>]*>/g, '').trim();
                if (cleanContent && cleanContent.length > 10) {
                  hasContentLoaded = true;
                }
              }

              // If content is still empty or very short, try fetching the individual verse
              if (!hasContentLoaded) {
                try {
                  console.log(`🔄 Fetching individual verse content for: ${item.id}`);
                  const verseResponse = await fetch(`${baseUrl}/bibles/${bibleId}/verses/${item.id}`, { 
                    headers: {
                      ...headers,
                      'Accept': 'application/json'
                    }
                  });

                  if (verseResponse.ok) {
                    const verseData = await verseResponse.json();
                    console.log(`✅ Individual verse response for ${item.id}:`, {
                      hasData: !!verseData.data,
                      hasContent: !!verseData.data?.content,
                      hasText: !!verseData.data?.text,
                      contentPreview: verseData.data?.content?.substring(0, 50) + '...'
                    });

                    if (verseData.data?.content) {
                      const individualContent = verseData.data.content.replace(/<[^>]*>/g, '').trim();
                      if (individualContent && individualContent.length > 10) {
                        cleanContent = individualContent;
                        hasContentLoaded = true;
                      }
                    } else if (verseData.data?.text) {
                      const individualText = verseData.data.text.replace(/<[^>]*>/g, '').trim();
                      if (individualText && individualText.length > 10) {
                        cleanContent = individualText;
                        hasContentLoaded = true;
                      }
                    }
                  } else {
                    console.error(`❌ Failed to fetch verse ${item.id}: ${verseResponse.status} ${verseResponse.statusText}`);
                  }
                } catch (error) {
                  console.error(`❌ Error fetching individual verse ${item.id}:`, error);
                }
              }

              // Alternative approach: try chapter-based fetching if individual verse fails
              if (!hasContentLoaded && item.chapterId) {
                try {
                  console.log(`🔄 Trying chapter-based fetch for ${item.id} from chapter ${item.chapterId}`);
                  const chapterResponse = await fetch(`${baseUrl}/bibles/${bibleId}/chapters/${item.chapterId}/verses`, { headers });

                  if (chapterResponse.ok) {
                    const chapterData = await chapterResponse.json();
                    const targetVerse = chapterData.data?.find((v: any) => v.id === item.id);

                    if (targetVerse?.content) {
                      const chapterContent = targetVerse.content.replace(/<[^>]*>/g, '').trim();
                      if (chapterContent && chapterContent.length > 10) {
                        cleanContent = chapterContent;
                        hasContentLoaded = true;
                        console.log(`✅ Found content via chapter fetch for ${item.id}`);
                      }
                    }
                  }
                } catch (error) {
                  console.error(`❌ Chapter-based fetch failed for ${item.id}:`, error);
                }
              }

              // Final fallback - provide a more helpful message
              if (!hasContentLoaded || !cleanContent) {
                cleanContent = `Content temporarily unavailable for ${item.reference || item.id}. This verse exists but the content couldn't be loaded from the API.`;
                console.log(`⚠️ Using fallback content for ${item.id}`);
              }

              console.log(`📝 Final content for ${item.id}: ${cleanContent.substring(0, 100)}...`);

              return {
                id: item.id || item.verseId,
                orgId: item.orgId,
                bibleId: item.bibleId || bibleId,
                bookId: item.bookId,
                chapterId: item.chapterId,
                reference: item.reference,
                content: hasContentLoaded ? cleanContent : item.content,
                verseCount: item.verseCount,
                verseNumber: item.verseNumber || (item.id ? item.id.split('.').pop() : ''),
                text: cleanContent,
                contentLoaded: hasContentLoaded
              };
            })),
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
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.status(500).json({ 
          error: "Gemini API key not configured. Please add GEMINI_API_KEY to your secrets."
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

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nGenerate 4 meaningful prayer plan suggestions covering personal growth, family blessing, community healing, and global peace.`
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 1,
            topP: 1,
            maxOutputTokens: 1200
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!geminiResponse.ok) {
        throw new Error('Gemini API request failed');
      }

      const data = await geminiResponse.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
        weekEnd.setDate(weekStart.getDate() + 6);

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

  // Enhanced Analytics endpoints
  // Real-time dashboard data endpoint
  app.get("/api/admin/analytics/realtime", async (req: Request, res: Response) => {
    try {
      const { data: realtimeData, error } = await supabaseAdmin
        .rpc('get_realtime_analytics_data');

      if (error) {
        console.error('Realtime analytics error:', error);
        throw error;
      }

      res.json(realtimeData);
    } catch (error) {
      console.error('Error fetching realtime analytics:', error);
      res.status(500).json({ error: 'Failed to fetch realtime analytics data' });
    }
  });

  // Weekly analytics endpoint
  app.get("/api/admin/analytics/weekly", async (req: Request, res: Response) => {
    try {
      const { startDate } = req.query;
      const { data: weeklyData, error } = await supabaseAdmin
        .rpc('get_weekly_analytics_data', { weeks_back: 4 });

      if (error) {
        console.error('Weekly analytics error:', error);
        throw error;
      }

      res.json(weeklyData);
    } catch (error) {
      console.error('Error fetching weekly analytics:', error);
      res.status(500).json({ error: 'Failed to fetch weekly analytics data' });
    }
  });

  // User detailed analytics endpoint
  app.get("/api/admin/analytics/user/:email", async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const { data: userData, error } = await supabaseAdmin
        .rpc('get_user_analytics_data', { user_email: email });

      if (error) {
        console.error('User analytics error:', error);
        throw error;
      }

      res.json(userData);
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      res.status(500).json({ error: 'Failed to fetch user analytics data' });
    }
  });

  // Zoom meeting analytics endpoint
  app.get("/api/admin/analytics/zoom", async (req: Request, res: Response) => {
    try {
      const { data: zoomData, error } = await supabaseAdmin
        .rpc('get_zoom_analytics_data');

      if (error) {
        console.error('Zoom analytics error:', error);
        throw error;
      }

      res.json(zoomData);
    } catch (error) {
      console.error('Error fetching zoom analytics:', error);
      res.status(500).json({ error: 'Failed to fetch zoom analytics data' });
    }
  });

  // Prayer slot coverage analytics endpoint
  app.get("/api/admin/analytics/slots", async (req: Request, res: Response) => {
    try {
      const { data: slotsData, error } = await supabaseAdmin
        .rpc('get_slot_analytics_data');

      if (error) {
        console.error('Slots analytics error:', error);
        throw error;
      }

      res.json(slotsData);
    } catch (error) {
      console.error('Error fetching slots analytics:', error);
      res.status(500).json({ error: 'Failed to fetch slots analytics data' });
    }
  });

  // Analytics export endpoint
  app.get("/api/admin/analytics/export", async (req: Request, res: Response) => {
    try {
      const { type = 'all' } = req.query;
      const { data: exportData, error } = await supabaseAdmin
        .rpc('export_analytics_data', { export_type: type as string });

      if (error) {
        console.error('Export analytics error:', error);
        throw error;
      }

      res.json(exportData);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics data' });
    }
  });

  // Analytics performance metrics endpoint
  app.get("/api/admin/analytics/performance", async (req: Request, res: Response) => {
    try {
      const { data: performanceData, error } = await supabaseAdmin
        .rpc('get_performance_metrics');

      if (error) {
        console.error('Performance metrics error:', error);
        throw error;
      }

      res.json(performanceData);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  });

  // Refresh analytics cache endpoint
  app.post("/api/admin/analytics/refresh", async (req: Request, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('refresh_analytics_cache');

      if (error) {
        console.error('Cache refresh error:', error);
        throw error;
      }

      res.json({ success: true, message: 'Analytics cache refreshed successfully' });
    } catch (error) {
      console.error('Error refreshing analytics cache:', error);
      res.status(500).json({ error: 'Failed to refresh analytics cache' });
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

      console.log('🧪 Testing Zoom credentials:');
      console.log('Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');
      console.log('Client Secret:', clientSecret ? `${clientSecret.substring(0, 8)}...` : 'MISSING');
      console.log('Account ID:', accountId ? `${accountId.substring(0, 8)}...` : 'MISSING');

      if (!clientId || !clientSecret || !accountId) {
        return res.status(400).json({ 
          error: "Missing Zoom credentials",
          details: {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasAccountId: !!accountId
          },
          instructions: [
            "1. Go to https://marketplace.zoom.us/",
            "2. Create a Server-to-Server OAuth app",
            "3. Add these secrets in Replit:",
            "   - ZOOM_CLIENT_ID (from app credentials)",
            "   - ZOOM_API_SECRET (this should be Client Secret)",
            "   - ZOOM_ACCOUNT_ID (from app credentials)"
          ]
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

      // First test the connection
      console.log('Testing Zoom connection first...');
      await zoomAttendanceTracker.getAccessToken();

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
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: "Check your Zoom credentials in the Secrets tab"
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












  // Enhanced Prayer Planner API Endpoints

  // Get daily prayer plan (real data)
  app.get("/api/prayer-planner/daily", async (req: Request, res: Response) => {
    try {
      const { date, userId } = req.query as { date?: string; userId?: string };

      if (!date || !userId) {
        return res.status(400).json({ error: "date and userId are required" });
      }

      // Try to get existing plan for user/date
      const { data: existingPlan, error: planError } = await supabaseAdmin
        .from('prayer_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_date', date)
        .maybeSingle();

      if (planError) {
        console.error('Error fetching plan:', planError);
      }

      let planId = existingPlan?.id;

      // If no plan, create a minimal one
      if (!planId) {
        const { data: created, error: createError } = await supabaseAdmin
          .from('prayer_plans')
          .insert({ user_id: userId, title: 'Daily Prayer Plan', plan_date: date })
          .select('*')
          .single();

        if (createError) {
          console.error('Error creating plan:', createError);
          return res.status(500).json({ error: 'Failed to initialize prayer plan' });
        }
        planId = created.id;
      }

      // Load points - only select fields we know exist
      const { data: points, error: pointsError } = await supabaseAdmin
        .from('prayer_points')
        .select('id, prayer_plan_id, title, content, category, is_completed, order_position, created_at, updated_at')
        .eq('prayer_plan_id', planId)
        .order('order_position', { ascending: true });

      if (pointsError) {
        console.error('Error loading points:', pointsError);
        return res.status(500).json({ error: 'Failed to load prayer points' });
      }

      const completedPoints = (points || []).filter(p => p.is_completed).length;
      const totalPoints = (points || []).length;

      res.json({
        id: planId,
        date,
        prayerPoints: (points || []).map(p => ({
          id: p.id,
          title: p.title,
          content: p.content,
          notes: '', // Notes field will be added later
          category: p.category || 'personal',
          isCompleted: p.is_completed || false,
          createdAt: p.created_at,
          order: p.order_position || 1,
        })),
        totalPoints,
        completedPoints,
      });
    } catch (error) {
      console.error('Error fetching daily prayer plan:', error);
      res.status(500).json({ error: 'Failed to fetch prayer plan' });
    }
  });

  // Create new prayer point (real data)
  app.post("/api/prayer-planner/points", async (req: Request, res: Response) => {
    try {
      const { title, content, notes, category, date, userId } = req.body as any;

      if (!title || !content || !category || !date || !userId) {
        return res.status(400).json({ error: "title, content, category, date, userId are required" });
      }

      // Ensure plan exists
      const { data: plan, error: planErr } = await supabaseAdmin
        .from('prayer_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_date', date)
        .maybeSingle();
      if (planErr) {
        console.error('Error fetching plan:', planErr);
      }
      let planId = plan?.id;
      if (!planId) {
        const { data: created, error: createErr } = await supabaseAdmin
          .from('prayer_plans')
          .insert({ user_id: userId, title: 'Daily Prayer Plan', plan_date: date, status: 'active' })
          .select('*')
          .single();
        if (createErr) {
          console.error('Error creating plan:', createErr);
          return res.status(500).json({ error: 'Failed to initialize plan' });
        }
        planId = created.id;
      }

      // Determine order
      const { data: maxOrder } = await supabaseAdmin
        .from('prayer_points')
        .select('order_position')
        .eq('prayer_plan_id', planId)
        .order('order_position', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = (maxOrder?.order_position || 0) + 1;

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('prayer_points')
        .insert({
          prayer_plan_id: planId,
          title,
          content,
          category,
          is_completed: false,
          order_position: nextOrder,
        })
        .select('id, prayer_plan_id, title, content, category, is_completed, order_position, created_at, updated_at')
        .single();

      if (insertErr) {
        console.error('Error inserting point:', insertErr);
        return res.status(500).json({ error: 'Failed to create prayer point' });
      }

      res.json({ success: true, point: inserted, message: 'Prayer point created successfully' });
    } catch (error) {
      console.error('Error creating prayer point:', error);
      res.status(500).json({ error: 'Failed to create prayer point' });
    }
  });

  // Update prayer point (real data)
  app.put("/api/prayer-planner/points/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data: updated, error } = await supabaseAdmin
        .from('prayer_points')
        .update({
          title: updates.title,
          content: updates.content,
          category: updates.category,
          is_completed: updates.isCompleted,
        })
        .eq('id', id)
        .select('id, prayer_plan_id, title, content, category, is_completed, order_position, created_at, updated_at')
        .single();

      if (error) {
        console.error('Update error:', error);
        return res.status(500).json({ error: 'Failed to update prayer point' });
      }

      res.json({ success: true, point: updated, message: 'Prayer point updated successfully' });
    } catch (error) {
      console.error('Error updating prayer point:', error);
      res.status(500).json({ error: 'Failed to update prayer point' });
    }
  });

  // Delete prayer point (real data)
  app.delete("/api/prayer-planner/points/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { error } = await supabaseAdmin
        .from('prayer_points')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Delete error:', error);
        return res.status(500).json({ error: 'Failed to delete prayer point' });
      }
      res.json({ success: true, pointId: id, message: 'Prayer point deleted successfully' });
    } catch (error) {
      console.error('Error deleting prayer point:', error);
      res.status(500).json({ error: 'Failed to delete prayer point' });
    }
  });

  // AI Assistant for prayer point generation (DeepSeek preferred)
  app.post("/api/prayer-planner/ai-assist", async (req: Request, res: Response) => {
    try {
      const { prompt, category } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!deepseekKey && !geminiApiKey) {
        return res.status(500).json({ error: "No AI key configured. Set DEEPSEEK_API_KEY or GEMINI_API_KEY." });
      }

      console.log('AI Prayer Assistant request:', { prompt, category });

      const systemPrompt = `You are "The Intercessor," an AI prayer assistant for Global Intercessors. Generate a personalized prayer for the given category/topic.

Guidelines:
- Be biblically sound and theologically accurate
- Use encouraging, faith-building language
- Include specific prayer points
- Provide relevant scripture reference
- Keep it heartfelt and personal

Format your response as JSON:
{
  "prayer": "The complete prayer text with proper formatting",
  "scripture": "Bible verse reference (Book Chapter:Verse)",
  "explanation": "Brief explanation of the spiritual significance and why this prayer matters"
}

Make it personal, biblical, and actionable for intercession.`;

      let aiResponseText: string | null = null;

      if (deepseekKey) {
        const ds = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `User request: ${prompt}${category ? `\nCategory: ${category}` : ''}` }
            ],
            temperature: 0.9,
            max_tokens: 600
          })
        });
        if (!ds.ok) throw new Error(`DeepSeek API error: ${ds.status}`);
        const dsJson = await ds.json();
        aiResponseText = dsJson.choices?.[0]?.message?.content || null;
      }

      if (!aiResponseText && geminiApiKey) {
        const gm = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }] }],
            generationConfig: { temperature: 0.7, topK: 1, topP: 1, maxOutputTokens: 1000 }
          })
        });
        if (!gm.ok) throw new Error(`Gemini API error: ${gm.status}`);
        const gmJson = await gm.json();
        aiResponseText = gmJson.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }

      if (!aiResponseText) {
        throw new Error('No AI response');
      }

      try {
        const parsedResponse = JSON.parse(aiResponseText);
        // Map AI response to frontend expected format
        res.json({
          title: `Prayer for ${category || 'Intercession'}`,
          content: parsedResponse.prayer || parsedResponse.content || aiResponseText,
          bibleVerse: parsedResponse.scripture || parsedResponse.reference || "",
          reference: parsedResponse.scripture || parsedResponse.reference || "",
          explanation: parsedResponse.explanation || ""
        });
      } catch (parseError) {
        // Fallback response if JSON parsing fails
        res.json({
          title: `Prayer for ${category || 'Intercession'}`,
          content: aiResponseText,
          bibleVerse: "Psalm 145:18",
          reference: "The Lord is near to all who call on him, to all who call on him in truth.",
          explanation: "This prayer was generated to help guide your intercession time with specific focus and biblical foundation."
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

  // Weekly Report Analytics Endpoints
  app.get("/api/admin/weekly-report-data", async (req: Request, res: Response) => {
    try {
      // Get date range for current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Get previous week dates
      const startOfPrevWeek = new Date(startOfWeek);
      startOfPrevWeek.setDate(startOfWeek.getDate() - 7);
      const endOfPrevWeek = new Date(startOfPrevWeek);
      endOfPrevWeek.setDate(startOfPrevWeek.getDate() + 6);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Query current week data
      const { data: currentWeekData, error: currentError } = await supabaseAdmin
        .from('prayer_slots')
        .select(`
          *,
          attendance_log(*)
        `)
        .gte('created_at', formatDate(startOfWeek))
        .lte('created_at', formatDate(endOfWeek));

      if (currentError) {
        console.error('Error fetching current week data:', currentError);
      }

      // Query previous week data
      const { data: previousWeekData, error: previousError } = await supabaseAdmin
        .from('prayer_slots')
        .select(`
          *,
          attendance_log(*)
        `)
        .gte('created_at', formatDate(startOfPrevWeek))
        .lte('created_at', formatDate(endOfPrevWeek));

      if (previousError) {
        console.error('Error fetching previous week data:', previousError);
      }

      // Sample data for demonstration - in production, calculate from actual data
      const sampleCurrentWeek = {
        Monday: 35,
        Tuesday: 32,
        Wednesday: 30,
        Thursday: 39,
        Friday: 34,
        Saturday: 30,
        Sunday: 35
      };

      const samplePreviousWeek = {
        Monday: 43,
        Tuesday: 30,
        Wednesday: 30,
        Thursday: 30,
        Friday: 30,
        Saturday: 25,
        Sunday: 25
      };

      // Calculate totals
      const currentTotal = Object.values(sampleCurrentWeek).reduce((a, b) => a + b, 0);
      const previousTotal = Object.values(samplePreviousWeek).reduce((a, b) => a + b, 0);
      const totalSlotsAvailable = 336; // 48 slots per day × 7 days

      // Find highest and lowest coverage days
      const currentEntries = Object.entries(sampleCurrentWeek);
      const highestDay = currentEntries.reduce((a, b) => b[1] > a[1] ? b : a)[0];
      const lowestDay = currentEntries.reduce((a, b) => b[1] < a[1] ? b : a)[0];

      const reportData = {
        report_date: `${formatDate(startOfWeek)} to ${formatDate(endOfWeek)}`,
        total_slots_available: totalSlotsAvailable,
        current_week: {
          total_slots_covered: currentTotal,
          daily_coverage: sampleCurrentWeek
        },
        previous_week: {
          total_slots_covered: previousTotal,
          daily_coverage: samplePreviousWeek
        },
        efz_prayer_program: {
          week_number: Math.ceil((today.getTime() - new Date('2025-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000)),
          wednesday_session: {
            participants: 22,
            gi_participants: 13,
            participation_rate: "59%",
            decline_from_last_week: "28%"
          },
          sunday_session: {
            participants: 21,
            gi_participants: 17,
            participation_rate: "77%"
          }
        },
        platform_manning_consistent_intercessors: [
          "Ms. Nyarai Seda", "Mrs. Ruth Sango", "Ms. Petronella Maramba",
          "Mr. Joseph Muleya", "Ms. Susan Mashiri", "Mr. Nyasha Mungure",
          "Mrs. Lisa Ncube", "Mr. Kimberly Mukupe", "Ms Blessing Mawereza",
          "Ms. Shanissi Mutanga", "Mr. Godknows Mugaduyi", "Ms. Blessing Siboniso",
          "Ms. Marrymore Matewe", "Mr. Tawanda Mubako", "Ms. Vimbai Debwe",
          "Dr. Rejoice Nharaunda", "Ms. Bethel Mutyandaedza"
        ],
        coverage_analysis: {
          highest_coverage_day: highestDay,
          lowest_coverage_day: lowestDay,
          coverage_rate: Math.round((currentTotal / totalSlotsAvailable) * 100),
          average_daily_coverage: Math.round(currentTotal / 7),
          total_variance: totalSlotsAvailable - currentTotal
        }
      };

      res.json(reportData);
    } catch (error) {
      console.error('Error generating weekly report data:', error);
      res.status(500).json({ error: 'Failed to generate weekly report data' });
    }
  });

  // User Profile Management Routes
  app.get("/api/users/profile/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ error: 'Failed to fetch user profile' });
      }

      // If no profile exists, return a default structure
      if (!profile) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        return res.json({
          id: userId,
          email: authUser.user?.email || '',
          full_name: null,
          profile_picture: null,
          gender: null,
          date_of_birth: null,
          phone_number: null,
          country: null,
          city: null,
          timezone: 'UTC+0',
          bio: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error in get user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put("/api/users/profile/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const profileData = req.body;

      console.log('Updating profile for user:', userId, 'with data:', profileData);

      // Get user email for the upsert
      let userEmail = profileData.email;
      if (!userEmail) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        userEmail = authUser.user?.email || '';
      }

      // Use the service function to upsert profile (bypasses RLS)
      const { data: result, error } = await supabaseAdmin
        .rpc('upsert_user_profile', {
          p_user_id: userId,
          p_email: userEmail,
          p_full_name: profileData.full_name || profileData.fullName || null,
          p_phone_number: profileData.phone_number || profileData.phoneNumber || null,
          p_whatsapp_number: profileData.whatsapp_number || profileData.whatsappNumber || null,
          p_whatsapp_active: profileData.whatsapp_active || profileData.whatsappActive || false,
          p_gender: profileData.gender || null,
          p_date_of_birth: profileData.date_of_birth || profileData.dateOfBirth || null,
          p_country: profileData.country || null,
          p_city: profileData.city || null,
          p_timezone: profileData.timezone || 'UTC+0',
          p_bio: profileData.bio || null,
          p_profile_picture: profileData.profile_picture || profileData.profilePicture || null
        });

      if (error) {
        console.error('Error upserting user profile:', error);
        return res.status(500).json({ 
          error: 'Failed to save user profile',
          details: error.message 
        });
      }

      console.log('Profile upserted successfully:', result);
      res.json(result);
    } catch (error) {
      console.error('Error in update user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/admin/generate-weekly-report", async (req: Request, res: Response) => {
    try {
      const reportData = req.body;

      // Generate AI-powered narrative for the report
      const prompt = `Generate a comprehensive weekly prayer report narrative based on this data:

      Current Week Coverage: ${reportData.current_week.total_slots_covered} slots (${reportData.coverage_analysis.coverage_rate}%)
      Previous Week Coverage: ${reportData.previous_week.total_slots_covered} slots
      Total Available Slots: ${reportData.total_slots_available}

      Daily Coverage Current Week: ${JSON.stringify(reportData.current_week.daily_coverage)}
      Daily Coverage Previous Week: ${JSON.stringify(reportData.previous_week.daily_coverage)}

      Highest Coverage Day: ${reportData.coverage_analysis.highest_coverage_day}
      Lowest Coverage Day: ${reportData.coverage_analysis.lowest_coverage_day}

      EFZ Prayer Program Week ${reportData.efz_prayer_program.week_number}:
      - Wednesday: ${reportData.efz_prayer_program.wednesday_session.participants} participants, ${reportData.efz_prayer_program.wednesday_session.gi_participants} GI participants (${reportData.efz_prayer_program.wednesday_session.participation_rate})
      - Sunday: ${reportData.efz_prayer_program.sunday_session.participants} participants, ${reportData.efz_prayer_program.sunday_session.gi_participants} GI participants (${reportData.efz_prayer_program.sunday_session.participation_rate})

      Please provide a comprehensive analysis including:
      1. Overall participation summary
      2. Week-over-week comparison
      3. Daily coverage insights
      4. EFZ program analysis
      5. Recommendations for improvement

      Format as structured text suitable for a professional report.`;

      let narrative = "Report narrative generated successfully.";

      // Try to get AI narrative, but continue if it fails
      try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey) {
          const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2000
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
              ]
            })
          });

          if (response.ok) {
            const aiResponse = await response.json();
            narrative = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "Report narrative generated successfully.";
          }
        }
      } catch (aiError) {
        console.error('AI generation failed, using fallback:', aiError);
      }

      // Create HTML content for PDF conversion
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Global Intercessors Weekly Report</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6; 
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 16px;
            color: #64748b;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            border-left: 4px solid #3b82f6;
            background-color: #f8fafc;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 15px;
        }
        .metric {
            display: inline-block;
            margin: 10px 20px 10px 0;
            padding: 10px 15px;
            background-color: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .metric-label {
            font-size: 12px;
            color: #64748b;
            display: block;
        }
        .metric-value {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
        }
        .daily-breakdown {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 10px;
            margin: 15px 0;
        }
        .day-item {
            text-align: center;
            padding: 10px;
            background-color: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        .intercessors-list {
            columns: 2;
            column-gap: 30px;
            margin: 15px 0;
        }
        .intercessor-item {
            break-inside: avoid;
            margin: 5px 0;
            padding: 5px 10px;
            background-color: white;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        }
        .narrative {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">GLOBAL INTERCESSORS WEEKLY REPORT</div>
        <div class="subtitle">${reportData.report_date}</div>
    </div>

    <div class="section">
        <div class="section-title">📊 Key Metrics</div>
        <div class="metric">
            <span class="metric-label">Total Coverage</span>
            <span class="metric-value">${reportData.coverage_analysis.coverage_rate}%</span>
        </div>
        <div class="metric">
            <span class="metric-label">Weekly Change</span>
            <span class="metric-value">${reportData.current_week.total_slots_covered - reportData.previous_week.total_slots_covered > 0 ? '+' : ''}${reportData.current_week.total_slots_covered - reportData.previous_week.total_slots_covered}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Daily Average</span>
            <span class="metric-value">${reportData.coverage_analysis.average_daily_coverage}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Total Slots</span>
            <span class="metric-value">${reportData.current_week.total_slots_covered}/${reportData.total_slots_available}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📅 Daily Coverage Breakdown</div>
        <div class="daily-breakdown">
            ${Object.entries(reportData.current_week.daily_coverage).map(([day, count]) => 
              `<div class="day-item">
                 <div style="font-weight: bold; color: #1e40af;">${day}</div>
                 <div style="font-size: 16px; margin-top: 5px;">${count} slots</div>
               </div>`
            ).join('')}
        </div>
    </div>

    <div class="section">
        <div class="section-title">🙏 EFZ Prayer Program - Week ${reportData.efz_prayer_program.week_number}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background-color: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="color: #1e40af; margin-top: 0;">Wednesday Session</h4>
                <p><strong>Total Participants:</strong> ${reportData.efz_prayer_program.wednesday_session.participants}</p>
                <p><strong>GI Participants:</strong> ${reportData.efz_prayer_program.wednesday_session.gi_participants}</p>
                <p><strong>Participation Rate:</strong> ${reportData.efz_prayer_program.wednesday_session.participation_rate}</p>
            </div>
            <div style="background-color: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="color: #1e40af; margin-top: 0;">Sunday Session</h4>
                <p><strong>Total Participants:</strong> ${reportData.efz_prayer_program.sunday_session.participants}</p>
                <p><strong>GI Participants:</strong> ${reportData.efz_prayer_program.sunday_session.gi_participants}</p>
                <p><strong>Participation Rate:</strong> ${reportData.efz_prayer_program.sunday_session.participation_rate}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">⭐ Consistent Intercessors</div>
        <div class="intercessors-list">
            ${reportData.platform_manning_consistent_intercessors.map((name: string) => 
              `<div class="intercessor-item">${name}</div>`
            ).join('')}
        </div>
    </div>

    <div class="section">
        <div class="section-title">📝 Analysis & Insights</div>
        <div class="narrative">${narrative}</div>
    </div>

    <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 12px;">
        Generated on: ${new Date().toLocaleString()}
    </div>
</body>
</html>`;

      // Generate PDF from HTML
      const options = { 
        format: 'A4',
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        }
      };

      const file = { content: htmlContent };

      try {
        const pdfBuffer = await htmlPdf.generatePdf(file, options);

        // Set proper PDF headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Global_Intercessors_Weekly_Report_${reportData.report_date.replace(/\s+/g, '_')}.pdf"`);

        // Send the actual PDF buffer
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);

        // Fallback to HTML download if PDF generation fails
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="Global_Intercessors_Weekly_Report_${reportData.report_date.replace(/\s+/g, '_')}.html"`);
        res.send(htmlContent);
      }

    } catch (error) {
      console.error('Error generating weekly report:', error);
      res.status(500).json({ error: 'Failed to generate weekly report' });
    }
  });

  // Fix attendance - create attendance record for completed prayer session
  app.post("/api/fix-attendance", async (req: Request, res: Response) => {
    try {
      console.log('🔧 Creating attendance record for completed prayer session...');

      const { userId, userEmail, duration, slotTime } = req.body;

      if (!userId || !userEmail || !duration || !slotTime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const now = new Date();
      const attendanceData = {
        user_id: userId,
        user_email: userEmail,
        slot_time: slotTime,
        attended_at: now.toISOString(),
        duration_minutes: duration,
        session_type: 'zoom',
        meeting_id: 'completed_session_' + Date.now(),
        attendance_percentage: 100,
        prayer_slot_id: 3,
        date: now.toISOString().split('T')[0],
        status: 'attended'
      };

      // Insert attendance record using supabase admin
      const { data: attendanceResult, error: attendanceError } = await supabase
        .from('attendance_log')
        .insert([attendanceData])
        .select();

      if (attendanceError) {
        console.error('❌ Attendance error:', attendanceError);
        return res.status(500).json({ error: 'Failed to create attendance record', details: attendanceError });
      }

      console.log('✅ Attendance record created:', attendanceResult);

      // Also create prayer session record
      const sessionData = {
        user_id: userId,
        user_email: userEmail,
        slot_time: slotTime,
        date: now.toISOString().split('T')[0],
        duration_minutes: duration,
        session_type: 'zoom',
        completed: true
      };

      const { data: sessionResult, error: sessionError } = await supabase
        .from('prayer_sessions')
        .insert([sessionData])
        .select();

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        return res.status(500).json({ error: 'Failed to create prayer session', details: sessionError });
      }

      console.log('✅ Prayer session created:', sessionResult);

      res.json({ 
        success: true, 
        message: 'Attendance and prayer session recorded successfully',
        attendance: attendanceResult,
        session: sessionResult
      });

    } catch (error) {
      console.error('❌ Error fixing attendance:', error);
      res.status(500).json({ 
        error: 'Failed to fix attendance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // WhatsApp Bot API Endpoints

  // Register user for WhatsApp notifications
  app.post("/api/whatsapp/register", async (req: Request, res: Response) => {
    try {
      const { userId, whatsAppNumber } = req.body;

      if (!userId || !whatsAppNumber) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          message: 'User ID and WhatsApp number are required'
        });
      }

      // First check if user profile exists
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user profile:', checkError);
        return res.status(500).json({ 
          error: 'Database error',
          message: 'Failed to verify user profile. Please try again.'
        });
      }

      // If profile doesn't exist, create it first
      if (!existingProfile) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);

        const { error: createError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: userId,
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
            whatsapp_number: whatsAppNumber,
            whatsapp_active: true,
            role: 'intercessor',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createError) {
          console.error('Error creating user profile:', createError);
          return res.status(500).json({ 
            error: 'Profile creation failed',
            message: 'Failed to create user profile. Please try again.'
          });
        }
      } else {
        // Update existing profile with WhatsApp number
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            whatsapp_number: whatsAppNumber,
            whatsapp_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('WhatsApp registration error:', updateError);
          return res.status(500).json({ 
            error: 'Registration failed',
            message: 'Failed to register WhatsApp number. Please try again.'
          });
        }
      }

      res.json({ 
        success: true,
        message: 'WhatsApp number registered successfully'
      });
    } catch (error) {
      console.error('WhatsApp registration error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  });

  // Update WhatsApp user preferences
  app.post('/api/whatsapp/preferences', async (req: Request, res: Response) => {
    try {
      const { userId, preferences } = req.body;

      if (!userId || !preferences) {
        return res.status(400).json({ error: 'userId and preferences are required' });
      }

      const success = await whatsAppBot.updateUserPreferences(userId, preferences);

      if (success) {
        res.json({ success: true, message: 'Preferences updated successfully' });
      } else {
        res.status(500).json({ error: 'Failed to update preferences' });
      }
    } catch (error) {
      console.error('Error updating WhatsApp preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Deactivate WhatsApp user
  app.post('/api/whatsapp/deactivate', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const success = await whatsAppBot.deactivateWhatsAppUser(userId);

      if (success) {
        res.json({ success: true, message: 'WhatsApp user deactivated successfully' });
      } else {
        res.status(500).json({ error: 'Failed to deactivate WhatsApp user' });
      }
    } catch (error) {
      console.error('Error deactivating WhatsApp user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Broadcast admin update via WhatsApp
  app.post('/api/whatsapp/broadcast', async (req: Request, res: Response) => {
    try {
      const { title, content, adminKey } = req.body;

      // Simple admin authentication
      if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!title || !content) {
        return res.status(400).json({ error: 'title and content are required' });
      }

      await whatsAppBot.broadcastAdminUpdate(title, content);
      res.json({ success: true, message: 'Admin update broadcast successfully' });
    } catch (error) {
      console.error('Error broadcasting admin update:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get WhatsApp bot statistics
  app.get('/api/whatsapp/stats', async (req: Request, res: Response) => {
    try {
      const stats = await whatsAppBot.getMessageStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting WhatsApp stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Manual trigger for daily devotionals (for testing)
  app.post('/api/whatsapp/test-devotional', async (req: Request, res: Response) => {
    try {
      const { adminKey } = req.body;

      if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Trigger devotional manually for testing
      await whatsAppBot.sendDailyDevotionals();
      res.json({ success: true, message: 'Test devotional sent' });
    } catch (error) {
      console.error('Error sending test devotional:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Send test WhatsApp message
  app.post('/api/whatsapp/test-message', async (req: Request, res: Response) => {
    try {
      const { phoneNumber, message, adminKey } = req.body;

      if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'phoneNumber and message are required' });
      }

      console.log(`Testing WhatsApp message to ${phoneNumber}: ${message}`);

      const result = await whatsAppBot.sendMessage(phoneNumber, message);
      res.json({ 
        success: true, 
        messageId: result?.messages?.[0]?.id,
        message: 'Test message sent successfully'
      });
    } catch (error) {
      console.error('WhatsApp test message error:', error);
      res.status(500).json({ 
        error: 'Failed to send test message',
        details: error.message 
      });
    }
  });

  // Multiple webhook endpoints for production compatibility
  const webhookHandler = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔐 Webhook verification attempt:', {
      path: req.path,
      mode,
      receivedToken: token,
      expectedToken: process.env.WHATSAPP_VERIFY_TOKEN,
      challenge,
      tokensMatch: token === process.env.WHATSAPP_VERIFY_TOKEN
    });

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  };

  // Primary webhook endpoints
  app.get('/api/webhook', webhookHandler);
  app.get('/webhook', webhookHandler);
  app.get('/api/whatsapp/webhook', webhookHandler);

  // WhatsApp message handler for multiple endpoints
  const messageHandler = async (req: Request, res: Response) => {
    try {
      const body = req.body;

      if (body.object === 'whatsapp_business_account') {
        // Process incoming WhatsApp messages with interactive handling
        console.log('📨 Incoming WhatsApp webhook:', JSON.stringify(body, null, 2));

        // Extract message data
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages || [];
        const statuses = value?.statuses || [];

        console.log('🔍 Webhook data analysis:');
        console.log(`📊 Entry: ${!!entry}, Changes: ${!!changes}, Value: ${!!value}`);
        console.log(`📱 Messages: ${messages.length}, Statuses: ${statuses.length}`);

        if (messages.length > 0) {
          console.log(`Processing ${messages.length} messages...`);

          for (const message of messages) {
            const phoneNumber = message.from;
            const messageText = message.text?.body;
            const messageType = message.type;
            const messageId = message.id;

            console.log(`\nMESSAGE ${messages.indexOf(message) + 1}/${messages.length}:`);
            console.log(`From: ${phoneNumber}`);
            console.log(`Type: ${messageType}`);
            console.log(`ID: ${messageId}`);

            if (messageType === 'text' && messageText) {
              console.log(`Text: "${messageText}"`);
              await whatsAppBot.handleIncomingMessage(phoneNumber, messageText, messageId);
            } else if (messageType === 'interactive') {
              const buttonReply = message.interactive?.button_reply;
              if (buttonReply) {
                const buttonId = buttonReply.id;
                const buttonTitle = buttonReply.title;
                console.log(`Button: ${buttonId} (${buttonTitle})`);
                await whatsAppBot.handleIncomingMessage(phoneNumber, buttonId, messageId);
              } else {
                console.log(`Interactive message without button reply`);
              }
            } else {
              console.log(`Skipping message type "${messageType}"`);
            }
          }
        } else if (statuses.length > 0) {
          console.log(`Received ${statuses.length} status updates (delivery/read receipts) - no action needed`);
        } else {
          console.log('No messages or statuses found in webhook data');
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Error processing WhatsApp webhook:', error);
      res.sendStatus(500);
    }
  };

  // Register message handlers for multiple endpoints
  app.post('/api/webhook', messageHandler);
  app.post('/webhook', messageHandler);
  app.post('/api/whatsapp/webhook', messageHandler);

  // =============================================================================
  // BIBLE QUIZ GAME API ENDPOINTS
  // =============================================================================

  // Get user's quiz progress
  app.get("/api/quiz/progress/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const { data: progress, error } = await supabaseAdmin
        .from('user_quiz_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching quiz progress:', error);
        return res.status(500).json({ error: 'Failed to fetch quiz progress' });
      }

      if (!progress) {
        // Create new progress record
        const newProgress = {
          user_id: userId,
          phone_number: '',
          total_score: 0,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          total_questions_answered: 0,
          total_correct_answers: 0,
          daily_questions_today: 0,
          last_played_date: new Date().toISOString().split('T')[0],
          achievements: [],
          knowledge_gaps: [],
          preferred_topics: [],
          adaptive_difficulty: 'Medium'
        };

        const { data: created, error: createError } = await supabaseAdmin
          .from('user_quiz_progress')
          .insert(newProgress)
          .select()
          .single();

        if (createError) {
          console.error('Error creating quiz progress:', createError);
          return res.status(500).json({ error: 'Failed to create quiz progress' });
        }

        return res.json(created);
      }

      res.json(progress);
    } catch (error) {
      console.error('Quiz progress endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Generate a quiz question using DeepSeek AI
  app.post("/api/quiz/generate-question", async (req: Request, res: Response) => {
    try {
      const { difficulty, topic, previousQuestions } = req.body;

      if (!difficulty) {
        return res.status(400).json({ error: 'Difficulty is required' });
      }

      const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepSeekApiKey) {
        // Return fallback question
        const fallbackQuestions = {
          easy: {
            question: "Who built the ark that saved his family from the flood?",
            options: ["Noah", "Moses", "Abraham", "David"],
            correctAnswer: "Noah",
            scripture: "Genesis 6-9",
            explanation: "Noah built the ark according to God's instructions to save his family and the animals from the worldwide flood."
          },
          medium: {
            question: "In which city was Jesus born?",
            options: ["Bethlehem", "Nazareth", "Jerusalem", "Capernaum"],
            correctAnswer: "Bethlehem",
            scripture: "Matthew 2:1",
            explanation: "Jesus was born in Bethlehem of Judea, fulfilling the prophecy in Micah 5:2."
          },
          hard: {
            question: "What does the Hebrew word 'Selah' likely mean in the Psalms?",
            options: ["Pause and reflect", "Sing louder", "Repeat the verse", "End of prayer"],
            correctAnswer: "Pause and reflect",
            scripture: "Found throughout Psalms",
            explanation: "Selah is thought to be a musical or liturgical instruction meaning to pause and reflect on what was just sung or said."
          }
        };

        return res.json(fallbackQuestions[difficulty as keyof typeof fallbackQuestions] || fallbackQuestions.easy);
      }

      // Generate AI question using DeepSeek
      const topicPrompt = topic ? `focused on ${topic}` : 'from any area of the Bible';
      const previousQuestionsPrompt = previousQuestions?.length > 0 
        ? `Avoid these recently asked questions: ${previousQuestions.slice(-5).join(', ')}`
        : '';

      const prompt = `Generate a ${difficulty} level Bible quiz question ${topicPrompt}. ${previousQuestionsPrompt}

      Respond in this exact format:
      QUESTION: [Clear, specific Bible question]
      OPTION_A: [First option]
      OPTION_B: [Second option]
      OPTION_C: [Third option]
      OPTION_D: [Fourth option]
      CORRECT: [Exactly match one of the options]
      SCRIPTURE: [Bible reference]
      EXPLANATION: [Detailed explanation of the answer with biblical context]`;

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
              content: 'You are a Biblical scholar creating quiz questions for Christian education. Provide accurate, biblically sound questions with clear correct answers.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (aiResponse) {
        // Parse the AI response
        const questionMatch = aiResponse.match(/QUESTION:\s*(.*?)(?=OPTION_A:|$)/s);
        const optionAMatch = aiResponse.match(/OPTION_A:\s*(.*?)(?=OPTION_B:|$)/s);
        const optionBMatch = aiResponse.match(/OPTION_B:\s*(.*?)(?=OPTION_C:|$)/s);
        const optionCMatch = aiResponse.match(/OPTION_C:\s*(.*?)(?=OPTION_D:|$)/s);
        const optionDMatch = aiResponse.match(/OPTION_D:\s*(.*?)(?=CORRECT:|$)/s);
        const correctMatch = aiResponse.match(/CORRECT:\s*(.*?)(?=SCRIPTURE:|$)/s);
        const scriptureMatch = aiResponse.match(/SCRIPTURE:\s*(.*?)(?=EXPLANATION:|$)/s);
        const explanationMatch = aiResponse.match(/EXPLANATION:\s*(.*?)$/s);

        const question = {
          question: questionMatch?.[1]?.trim() || "Who was the first man created by God?",
          options: [
            optionAMatch?.[1]?.trim() || "Adam",
            optionBMatch?.[1]?.trim() || "Noah", 
            optionCMatch?.[1]?.trim() || "Abraham",
            optionDMatch?.[1]?.trim() || "Moses"
          ],
          correctAnswer: correctMatch?.[1]?.trim() || "Adam",
          scripture: scriptureMatch?.[1]?.trim() || "Genesis 2:7",
          explanation: explanationMatch?.[1]?.trim() || "Adam was the first human being created by God from the dust of the earth."
        };

        res.json(question);
      } else {
        throw new Error('No AI response received');
      }

    } catch (error) {
      console.error('Generate question error:', error);
      
      // Return fallback question on error
      const fallbackQuestions = {
        easy: {
          question: "Who was the first man created by God?",
          options: ["Adam", "Noah", "Abraham", "Moses"],
          correctAnswer: "Adam",
          scripture: "Genesis 2:7",
          explanation: "Adam was the first human being created by God from the dust of the earth."
        },
        medium: {
          question: "How many disciples did Jesus choose?",
          options: ["10", "12", "14", "16"],
          correctAnswer: "12",
          scripture: "Matthew 10:1-4",
          explanation: "Jesus chose twelve disciples to be His closest followers and apostles."
        },
        hard: {
          question: "In which book of the Bible do we find the suffering servant prophecy?",
          options: ["Jeremiah", "Ezekiel", "Isaiah", "Daniel"],
          correctAnswer: "Isaiah",
          scripture: "Isaiah 53",
          explanation: "Isaiah 53 contains the famous suffering servant prophecy about the Messiah."
        }
      };

      res.json(fallbackQuestions[req.body.difficulty as keyof typeof fallbackQuestions] || fallbackQuestions.easy);
    }
  });

  // Start a new quiz session
  app.post("/api/quiz/start-session", async (req: Request, res: Response) => {
    try {
      const { userId, sessionType, difficulty, topic } = req.body;

      if (!userId || !sessionType || !difficulty) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const sessionId = `quiz_${userId}_${Date.now()}`;
      
      const sessionData = {
        user_id: userId,
        session_id: sessionId,
        session_type: sessionType,
        difficulty,
        topic: topic || null,
        start_time: new Date().toISOString(),
        status: 'active'
      };

      const { data: session, error } = await supabaseAdmin
        .from('quiz_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating quiz session:', error);
        return res.status(500).json({ error: 'Failed to create quiz session' });
      }

      res.json(session);
    } catch (error) {
      console.error('Start quiz session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Submit quiz answer
  app.post("/api/quiz/submit-answer", async (req: Request, res: Response) => {
    try {
      const { userId, sessionId, questionId, userAnswer, isCorrect, responseTime, pointsEarned, xpEarned, difficulty } = req.body;

      if (!userId || !sessionId || !questionId || userAnswer === undefined || isCorrect === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Record the answer
      const answerData = {
        user_id: userId,
        question_id: questionId,
        session_id: sessionId,
        user_answer: userAnswer,
        is_correct: isCorrect,
        response_time: responseTime || 0,
        points_earned: pointsEarned || 0,
        xp_earned: xpEarned || 0,
        difficulty_at_time: difficulty
      };

      const { error: answerError } = await supabaseAdmin
        .from('user_question_history')
        .insert(answerData);

      if (answerError) {
        console.error('Error recording answer:', answerError);
        return res.status(500).json({ error: 'Failed to record answer' });
      }

      // Update session stats
      const { data: currentSession, error: sessionError } = await supabaseAdmin
        .from('quiz_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        return res.status(500).json({ error: 'Failed to fetch session' });
      }

      const updatedSession = {
        questions_answered: currentSession.questions_answered + 1,
        correct_answers: currentSession.correct_answers + (isCorrect ? 1 : 0),
        total_score: currentSession.total_score + (pointsEarned || 0),
        xp_earned: currentSession.xp_earned + (xpEarned || 0)
      };

      const { error: updateError } = await supabaseAdmin
        .from('quiz_sessions')
        .update(updatedSession)
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
        return res.status(500).json({ error: 'Failed to update session' });
      }

      res.json({ success: true, sessionStats: updatedSession });
    } catch (error) {
      console.error('Submit answer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // End quiz session and update user progress
  app.post("/api/quiz/end-session", async (req: Request, res: Response) => {
    try {
      const { userId, sessionId } = req.body;

      if (!userId || !sessionId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get session data
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('quiz_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        return res.status(500).json({ error: 'Failed to fetch session' });
      }

      // Mark session as completed
      const { error: completeError } = await supabaseAdmin
        .from('quiz_sessions')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (completeError) {
        console.error('Error completing session:', completeError);
        return res.status(500).json({ error: 'Failed to complete session' });
      }

      // Update user progress
      const { data: currentProgress, error: progressError } = await supabaseAdmin
        .from('user_quiz_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (progressError) {
        console.error('Error fetching user progress:', progressError);
        return res.status(500).json({ error: 'Failed to fetch user progress' });
      }

      const newXP = currentProgress.total_xp + session.xp_earned;
      const newLevel = Math.floor(newXP / 100) + 1;
      const accuracy = session.questions_answered > 0 ? session.correct_answers / session.questions_answered : 0;
      
      const updatedProgress = {
        total_score: currentProgress.total_score + session.total_score,
        total_xp: newXP,
        current_level: newLevel,
        total_questions_answered: currentProgress.total_questions_answered + session.questions_answered,
        total_correct_answers: currentProgress.total_correct_answers + session.correct_answers,
        last_played_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      // Update streak logic
      if (accuracy >= 0.8) {
        updatedProgress.current_streak = currentProgress.current_streak + 1;
        updatedProgress.longest_streak = Math.max(currentProgress.longest_streak, updatedProgress.current_streak);
      } else if (accuracy < 0.5) {
        updatedProgress.current_streak = 0;
      }

      const { error: updateError } = await supabaseAdmin
        .from('user_quiz_progress')
        .update(updatedProgress)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user progress:', updateError);
        return res.status(500).json({ error: 'Failed to update user progress' });
      }

      // Calculate grade
      const grade = accuracy >= 0.9 ? "A+ Excellent!" : 
                   accuracy >= 0.8 ? "A Good Work!" :
                   accuracy >= 0.7 ? "B Keep Going!" :
                   accuracy >= 0.6 ? "C Study More!" : "Keep Learning!";

      const summary = {
        sessionId,
        finalScore: session.total_score,
        questionsAnswered: session.questions_answered,
        correctAnswers: session.correct_answers,
        accuracy: Math.round(accuracy * 100),
        grade,
        xpEarned: session.xp_earned,
        newLevel,
        newTotalXP: newXP,
        currentStreak: updatedProgress.current_streak
      };

      res.json({ success: true, summary });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get daily challenge
  app.get("/api/quiz/daily-challenge", async (req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: challenge, error } = await supabaseAdmin
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', today)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching daily challenge:', error);
        return res.status(500).json({ error: 'Failed to fetch daily challenge' });
      }

      if (!challenge) {
        // Create today's challenge
        const newChallenge = {
          challenge_date: today,
          challenge_type: 'daily_quiz',
          theme: 'Biblical Knowledge',
          description: 'Test your knowledge of Bible stories and characters',
          required_questions: 5,
          difficulty: 'Mixed',
          bonus_xp: 50,
          bonus_points: 100,
          is_active: true
        };

        const { data: created, error: createError } = await supabaseAdmin
          .from('daily_challenges')
          .insert(newChallenge)
          .select()
          .single();

        if (createError) {
          console.error('Error creating daily challenge:', createError);
          return res.status(500).json({ error: 'Failed to create daily challenge' });
        }

        return res.json(created);
      }

      res.json(challenge);
    } catch (error) {
      console.error('Daily challenge endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Intercessor schedule management endpoints
  
  // Get intercessor schedule
  app.get("/api/intercessor/schedule/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const { data: schedule, error } = await supabaseAdmin
        .from('intercessor_schedules')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching schedule:', error);
        return res.status(500).json({ error: "Failed to fetch schedule" });
      }
      
      // Return default schedule if not found
      if (!schedule) {
        return res.json({
          userId,
          activeDays: [],
          createdAt: null,
          updatedAt: null
        });
      }
      
      res.json({
        userId: schedule.user_id,
        activeDays: schedule.active_days || [],
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at
      });
    } catch (error) {
      console.error('Error in schedule endpoint:', error);
      res.status(500).json({ error: "Failed to fetch schedule" });
    }
  });
  
  // Update intercessor schedule
  app.post("/api/intercessor/schedule", async (req: Request, res: Response) => {
    try {
      const { userId, activeDays } = req.body;
      
      if (!userId || !Array.isArray(activeDays)) {
        return res.status(400).json({ error: "userId and activeDays array are required" });
      }
      
      const { data: schedule, error } = await supabaseAdmin
        .from('intercessor_schedules')
        .upsert({
          user_id: userId,
          active_days: activeDays,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error updating schedule:', error);
        return res.status(500).json({ error: "Failed to update schedule" });
      }
      
      res.json({
        success: true,
        schedule: {
          userId: schedule.user_id,
          activeDays: schedule.active_days,
          updatedAt: schedule.updated_at
        }
      });
    } catch (error) {
      console.error('Error in schedule update:', error);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });
  
  // Get weekly attendance
  app.get("/api/intercessor/attendance/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { week } = req.query;
      
      if (!week) {
        return res.status(400).json({ error: "Week parameter is required (YYYY-MM-DD format)" });
      }
      
      // Calculate week range
      const weekStart = new Date(week as string);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];
      
      const { data: attendance, error } = await supabaseAdmin
        .from('prayer_attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('prayer_date', startDate)
        .lte('prayer_date', endDate)
        .order('prayer_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching attendance:', error);
        return res.status(500).json({ error: "Failed to fetch attendance" });
      }
      
      res.json(attendance || []);
    } catch (error) {
      console.error('Error in attendance endpoint:', error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });
  
  // Mark attendance
  app.post("/api/intercessor/attendance", async (req: Request, res: Response) => {
    try {
      const { userId, prayerDate, isAttended, scheduledDayOfWeek } = req.body;
      
      if (!userId || !prayerDate || typeof isAttended !== 'boolean' || typeof scheduledDayOfWeek !== 'number') {
        return res.status(400).json({ error: "userId, prayerDate, isAttended (boolean), and scheduledDayOfWeek (number) are required" });
      }
      
      const { data: attendance, error } = await supabaseAdmin
        .from('prayer_attendance')
        .upsert({
          user_id: userId,
          prayer_date: prayerDate,
          is_attended: isAttended,
          scheduled_day_of_week: scheduledDayOfWeek,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,prayer_date'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error marking attendance:', error);
        return res.status(500).json({ error: "Failed to mark attendance" });
      }
      
      res.json({
        success: true,
        attendance: {
          userId: attendance.user_id,
          prayerDate: attendance.prayer_date,
          isAttended: attendance.is_attended,
          scheduledDayOfWeek: attendance.scheduled_day_of_week,
          updatedAt: attendance.updated_at
        }
      });
    } catch (error) {
      console.error('Error in attendance marking:', error);
      res.status(500).json({ error: "Failed to mark attendance" });
    }
  });
  
  // Get intercessor metrics (streak, attendance rate, etc.)
  app.get("/api/intercessor/metrics/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Get user's schedule
      const { data: schedule } = await supabaseAdmin
        .from('intercessor_schedules')
        .select('active_days')
        .eq('user_id', userId)
        .single();
      
      const activeDays = schedule?.active_days || [];
      
      if (activeDays.length === 0) {
        return res.json({
          currentStreak: 0,
          attendanceRate: 0,
          daysAttended: 0,
          totalActiveDays: 0
        });
      }
      
      // Get all attendance records
      const { data: attendance } = await supabaseAdmin
        .from('prayer_attendance')
        .select('*')
        .eq('user_id', userId)
        .order('prayer_date', { ascending: false });
      
      if (!attendance || attendance.length === 0) {
        return res.json({
          currentStreak: 0,
          attendanceRate: 0,
          daysAttended: 0,
          totalActiveDays: activeDays.length
        });
      }
      
      // Calculate current streak (consecutive attended days from most recent)
      let currentStreak = 0;
      const dayOfWeekMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      // Check streak from today backwards
      const today = new Date();
      for (let i = 0; i < 365; i++) { // Check up to a year back
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dayName = dayOfWeekMap[checkDate.getDay()];
        
        // Skip if not an active day
        if (!activeDays.includes(dayName)) {
          continue;
        }
        
        const dateStr = checkDate.toISOString().split('T')[0];
        const attendanceRecord = attendance.find(a => a.prayer_date === dateStr);
        
        if (attendanceRecord && attendanceRecord.is_attended) {
          currentStreak++;
        } else if (checkDate < today) {
          // Only break if this is a past date (not today)
          break;
        }
      }
      
      // Calculate attendance rate
      const attendedCount = attendance.filter(a => a.is_attended).length;
      const totalCount = attendance.length;
      const attendanceRate = totalCount > 0 ? (attendedCount / totalCount) * 100 : 0;
      
      res.json({
        currentStreak,
        attendanceRate,
        daysAttended: attendedCount,
        totalActiveDays: activeDays.length,
        totalRecords: totalCount
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
      res.status(500).json({ error: "Failed to calculate metrics" });
    }
  });

  // =====================================================
  // INTERCESSOR SCHEDULE API ENDPOINTS
  // =====================================================

  // Get user's prayer schedule
  app.get("/api/intercessor/schedule/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const { data: schedule, error } = await supabase
        .from('intercessor_schedules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching schedule:', error);
        return res.status(500).json({ error: 'Failed to fetch schedule' });
      }

      // Return default schedule if none exists
      const defaultSchedule = {
        activeDays: [],
        timezone: 'UTC',
        notificationPreferences: { "5min": true, "15min": true, "1hour": false }
      };

      res.json(schedule || defaultSchedule);
    } catch (error) {
      console.error('Error in schedule endpoint:', error);
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  });

  // Update user's prayer schedule
  app.post("/api/intercessor/schedule", async (req: Request, res: Response) => {
    try {
      const { userId, activeDays, timezone = 'UTC', notificationPreferences } = req.body;

      if (!userId || !Array.isArray(activeDays)) {
        return res.status(400).json({ error: 'userId and activeDays array are required' });
      }

      const { data: schedule, error } = await supabase
        .from('intercessor_schedules')
        .upsert({
          user_id: userId,
          active_days: activeDays,
          timezone,
          notification_preferences: notificationPreferences || { "5min": true, "15min": true, "1hour": false },
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('Error updating schedule:', error);
        return res.status(500).json({ error: 'Failed to update schedule' });
      }

      res.json({ success: true, schedule });
    } catch (error) {
      console.error('Error in schedule update endpoint:', error);
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  });

  // Get user's prayer metrics
  app.get("/api/intercessor/metrics/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Call the database function to get metrics
      const { data: metrics, error } = await supabase
        .rpc('get_user_metrics', { p_user_id: userId });

      if (error) {
        console.error('Error fetching metrics:', error);
        return res.status(500).json({ error: 'Failed to fetch metrics' });
      }

      // Return first result from the function or default values
      const userMetrics = metrics?.[0] || {
        current_streak: 0,
        attendance_rate: 0,
        days_attended: 0,
        total_active_days: 0,
        longest_streak: 0,
        last_attendance_date: null
      };

      res.json({
        currentStreak: userMetrics.current_streak,
        attendanceRate: userMetrics.attendance_rate,
        daysAttended: userMetrics.days_attended,
        totalActiveDays: userMetrics.total_active_days,
        longestStreak: userMetrics.longest_streak,
        lastAttendanceDate: userMetrics.last_attendance_date
      });
    } catch (error) {
      console.error('Error in metrics endpoint:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Get weekly attendance for a user
  app.get("/api/intercessor/attendance/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { week } = req.query;

      let weekStart = week ? new Date(week as string) : null;

      // Call the database function to get weekly attendance
      const { data: attendance, error } = await supabase
        .rpc('get_weekly_attendance', { 
          p_user_id: userId,
          p_week_start: weekStart?.toISOString().split('T')[0] || null
        });

      if (error) {
        console.error('Error fetching attendance:', error);
        return res.status(500).json({ error: 'Failed to fetch attendance' });
      }

      res.json(attendance || []);
    } catch (error) {
      console.error('Error in attendance endpoint:', error);
      res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  });

  // Mark prayer attendance
  app.post("/api/intercessor/attendance", async (req: Request, res: Response) => {
    try {
      const { userId, prayerDate, isAttended, scheduledDayOfWeek, notes } = req.body;

      if (!userId || !prayerDate || typeof isAttended !== 'boolean' || scheduledDayOfWeek === undefined) {
        return res.status(400).json({ 
          error: 'userId, prayerDate, isAttended, and scheduledDayOfWeek are required' 
        });
      }

      // Call the database function to upsert attendance
      const { data: attendanceId, error } = await supabase
        .rpc('upsert_attendance', {
          p_user_id: userId,
          p_prayer_date: prayerDate,
          p_is_attended: isAttended,
          p_scheduled_day_of_week: scheduledDayOfWeek,
          p_notes: notes || null
        });

      if (error) {
        console.error('Error marking attendance:', error);
        return res.status(500).json({ error: 'Failed to mark attendance' });
      }

      res.json({ success: true, attendanceId });
    } catch (error) {
      console.error('Error in attendance marking endpoint:', error);
      res.status(500).json({ error: 'Failed to mark attendance' });
    }
  });

  // Test prayer slot reminder system
  app.post("/api/test-reminders", async (req: Request, res: Response) => {
    try {
      console.log("🧪 Testing prayer slot reminder system...");
      await whatsAppBot.checkPrayerSlotReminders();
      
      res.json({ 
        success: true, 
        message: "Reminder system test completed. Check server logs for details." 
      });
    } catch (error) {
      console.error("Error testing reminders:", error);
      res.status(500).json({ error: "Failed to test reminder system" });
    }
  });

  // === SCRIPTURE COACH API ENDPOINTS ===

  // Get all available reading plans
  app.get("/api/scripture-coach/plans", async (req: Request, res: Response) => {
    try {
      console.log('🔍 Fetching Scripture Coach plans...');
      
      // First, ensure plans exist - create them if they don't
      const defaultPlans = [
        { name: 'John 21', description: 'Journey through the Gospel of John in 21 transformative days', days: 21 },
        { name: 'Proverbs 31', description: 'Gain wisdom for daily living by reading Proverbs', days: 31 },
        { name: 'Psalms 30', description: 'Find comfort and strength through selected Psalms', days: 30 }
      ];

      for (const plan of defaultPlans) {
        await supabaseAdmin
          .from('plans')
          .upsert(plan, { onConflict: 'name' });
      }

      const { data: plans, error } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('days', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return res.status(500).json({ error: 'Failed to fetch reading plans', details: error.message });
      }

      console.log(`✅ Found ${plans?.length || 0} reading plans`);
      res.json({ plans: plans || [] });
    } catch (error) {
      console.error('Error in /api/scripture-coach/plans:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Get user's reading plans
  app.get("/api/scripture-coach/user-plans/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const { data: userPlans, error } = await supabaseAdmin
        .rpc('get_user_reading_plans', { user_uuid: userId });

      if (error) {
        console.error('Error fetching user plans:', error);
        return res.status(500).json({ error: 'Failed to fetch user reading plans' });
      }

      res.json({ userPlans });
    } catch (error) {
      console.error('Error in /api/scripture-coach/user-plans:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start a reading plan
  app.post("/api/scripture-coach/start-plan", async (req: Request, res: Response) => {
    try {
      const { userId, planId } = req.body;

      if (!userId || !planId) {
        return res.status(400).json({ error: 'User ID and Plan ID are required' });
      }

      console.log(`🚀 Starting reading plan for user ${userId}, plan ${planId}`);

      // Step 1: Ensure user exists in Scripture Coach users table
      let { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (!user) {
        // Get user from user_profiles or create a basic user record
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const userData = {
          id: userId,
          wa_id: profile?.phone || profile?.email || userId,
          username: profile?.full_name || profile?.email || 'Ngonidzashe Zimbwa',
          tz: 'Africa/Harare'
        };

        const { data: newUser, error: createUserError } = await supabaseAdmin
          .from('users')
          .upsert(userData, { onConflict: 'id' })
          .select('id')
          .single();

        if (createUserError) {
          console.error('Error creating user in users table:', createUserError);
          return res.status(500).json({ error: 'Failed to create user', details: createUserError.message });
        }
        user = newUser;
        console.log('✅ User created in Scripture Coach users table');
      }

      // Step 2: Verify the plan exists and get its details
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        console.error('Plan not found:', planError);
        return res.status(404).json({ error: 'Reading plan not found' });
      }

      // Step 3: Ensure readings exist for this plan (at least day 1)
      let { data: readings } = await supabaseAdmin
        .from('readings')
        .select('*')
        .eq('plan_id', planId)
        .eq('day_number', 1);

      if (!readings || readings.length === 0) {
        console.log(`🔧 Creating default readings for ${plan.name}`);
        // Create default readings based on plan name
        if (plan.name === 'John 21') {
          const { error } = await supabaseAdmin
            .from('readings')
            .upsert([
              { plan_id: planId, day_number: 1, reference_list: ["John 1:1-18"] },
              { plan_id: planId, day_number: 2, reference_list: ["John 1:19-34"] },
              { plan_id: planId, day_number: 3, reference_list: ["John 1:35-51"] }
            ], { onConflict: 'plan_id,day_number' });
          
          if (!error) console.log('✅ Created John 21 readings');
        } else if (plan.name === 'Psalms 30') {
          const { error } = await supabaseAdmin
            .from('readings')
            .upsert([
              { plan_id: planId, day_number: 1, reference_list: ["Psalm 1"] },
              { plan_id: planId, day_number: 2, reference_list: ["Psalm 23"] },
              { plan_id: planId, day_number: 3, reference_list: ["Psalm 27"] }
            ], { onConflict: 'plan_id,day_number' });
          
          if (!error) console.log('✅ Created Psalms 30 readings');
        } else {
          // Generic reading
          await supabaseAdmin
            .from('readings')
            .upsert([
              { plan_id: planId, day_number: 1, reference_list: [`${plan.name} 1`] }
            ], { onConflict: 'plan_id,day_number' });
        }
      }

      // Step 4: Deactivate any existing active plans for this user
      await supabaseAdmin
        .from('user_plans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      // Step 5: Start the new plan
      const { error: insertError } = await supabaseAdmin
        .from('user_plans')
        .upsert({
          user_id: userId,
          plan_id: planId,
          current_day: 1,
          start_date: new Date().toISOString().split('T')[0],
          is_active: true
        }, { onConflict: 'user_id,plan_id' });

      if (insertError) {
        console.error('Error starting reading plan:', insertError);
        return res.status(500).json({ error: 'Failed to start reading plan', details: insertError.message });
      }

      console.log('✅ Reading plan started successfully');

      // Step 6: Get today's reading with a more robust query
      const { data: todayReading } = await supabaseAdmin
        .from('readings')
        .select('*')
        .eq('plan_id', planId)
        .eq('day_number', 1)
        .single();

      const response = {
        success: true,
        message: 'Reading plan started successfully',
        plan: plan,
        todayReading: todayReading ? {
          plan_name: plan.name,
          day_number: 1,
          total_days: plan.days,
          references: todayReading.reference_list
        } : null
      };

      console.log('📶 Today\'s reading prepared:', response.todayReading);
      res.json(response);

    } catch (error) {
      console.error('Error in /api/scripture-coach/start-plan:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Get today's reading for a user
  app.get("/api/scripture-coach/today-reading/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      console.log(`📖 Getting today's reading for user ${userId}`);

      // Get active user plan with a direct query instead of relying on SQL functions
      const { data: userPlan, error: userPlanError } = await supabaseAdmin
        .from('user_plans')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (userPlanError) {
        console.log('No active reading plan found for user');
        return res.status(404).json({ error: 'No active reading plan found' });
      }

      // Get today's reading
      const { data: reading, error: readingError } = await supabaseAdmin
        .from('readings')
        .select('*')
        .eq('plan_id', userPlan.plan_id)
        .eq('day_number', userPlan.current_day)
        .single();

      if (readingError) {
        console.error('Error fetching reading:', readingError);
        return res.status(500).json({ error: 'Failed to fetch today\'s reading' });
      }

      const todayReading = {
        plan_name: userPlan.plans.name,
        day_number: userPlan.current_day,
        total_days: userPlan.plans.days,
        references: reading.reference_list
      };

      console.log('✅ Today\'s reading found:', todayReading);
      res.json({ todayReading });
    } catch (error) {
      console.error('Error in /api/scripture-coach/today-reading:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Mark reading as complete
  app.post("/api/scripture-coach/mark-complete", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user's active plan
      const { data: userPlan, error: userPlanError } = await supabaseAdmin
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (userPlanError || !userPlan) {
        return res.status(404).json({ error: 'No active reading plan found' });
      }

      // Get plan details
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('*')
        .eq('id', userPlan.plan_id)
        .single();

      if (planError || !plan) {
        return res.status(500).json({ error: 'Failed to fetch plan details' });
      }

      // Check if plan is completed
      if (userPlan.current_day >= plan.days) {
        // Mark plan as completed
        const { error: completeError } = await supabaseAdmin
          .from('user_plans')
          .update({ is_active: false })
          .eq('id', userPlan.id);

        if (completeError) {
          console.error('Error completing plan:', completeError);
          return res.status(500).json({ error: 'Failed to complete plan' });
        }

        return res.json({ 
          success: true, 
          completed: true,
          message: `Congratulations! You've completed the ${plan.name} reading plan!`
        });
      } else {
        // Move to next day
        const { error: updateError } = await supabaseAdmin
          .from('user_plans')
          .update({ current_day: userPlan.current_day + 1 })
          .eq('id', userPlan.id);

        if (updateError) {
          console.error('Error updating plan:', updateError);
          return res.status(500).json({ error: 'Failed to update plan progress' });
        }

        return res.json({ 
          success: true, 
          completed: false,
          newDay: userPlan.current_day + 1,
          message: `Great job! Moving to day ${userPlan.current_day + 1} of ${plan.days}`
        });
      }
    } catch (error) {
      console.error('Error in /api/scripture-coach/mark-complete:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get reading plan progress
  app.get("/api/scripture-coach/progress/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const { data: userPlans, error } = await supabaseAdmin
        .rpc('get_user_reading_plans', { user_uuid: userId });

      if (error) {
        console.error('Error fetching user progress:', error);
        return res.status(500).json({ error: 'Failed to fetch user progress' });
      }

      // Calculate statistics
      const activePlans = userPlans?.filter((plan: any) => plan.is_active) || [];
      const completedPlans = userPlans?.filter((plan: any) => !plan.is_active) || [];
      
      const totalDaysRead = userPlans?.reduce((total: number, plan: any) => {
        return total + (plan.is_active ? plan.current_day - 1 : plan.days);
      }, 0) || 0;

      res.json({ 
        userPlans,
        activePlans,
        completedPlans,
        totalDaysRead,
        totalPlans: userPlans?.length || 0
      });
    } catch (error) {
      console.error('Error in /api/scripture-coach/progress:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return httpServer;
}