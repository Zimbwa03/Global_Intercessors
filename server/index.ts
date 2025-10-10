import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { zoomAttendanceTracker } from "./services/zoomAttendanceTracker";
import { registerRoutes } from "./routes";
import { notificationScheduler } from "./services/notificationScheduler";
import { whatsAppBot } from "./services/whatsapp-bot-v2";
import { supabaseAdmin } from "./supabase";

// Set default server timezone to Africa/Harare to align with majority of intercessors
if (!process.env.TZ) {
  process.env.TZ = "Africa/Harare";
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Test Bible chat database table
  try {
    console.log('📚 Checking Bible chat database...');
    
    // Test if table exists by querying it
    const { data, error } = await supabaseAdmin
      .from('bible_chat_history')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Bible chat table not accessible:', error.message);
      console.log('ℹ️  Please ensure bible_chat_history table exists in Supabase');
      console.log('ℹ️  Bible chat will use fallback responses only');
    } else {
      console.log('✅ Bible chat database ready');
    }
  } catch (error) {
    console.error('❌ Bible chat initialization error:', error);
    console.log('ℹ️  Continuing without database persistence for Bible chat');
  }
  
  const server = await registerRoutes(app);
  
  // Start notification scheduler
  notificationScheduler.start();

  // Initialize WhatsApp bot (this starts the reminder system)
  console.log('🤖 Initializing WhatsApp Bot with reminder system...');
  // The bot is already instantiated when imported, which starts its cron jobs
  console.log('✅ WhatsApp Bot reminder system is now active');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start Zoom attendance tracking service
    zoomAttendanceTracker.startTracking();
  });
})();