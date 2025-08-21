-- Advanced Reminder System (Supabase)

-- 1) Logs of all reminders sent
CREATE TABLE IF NOT EXISTS reminder_logs (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER REFERENCES prayer_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_type VARCHAR(50) NOT NULL, -- 'slot_reminder' | 'morning_message' | 'weekly_report' | 'custom'
  minutes_before INTEGER,             -- NULL for non-slot reminders
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'pending' | 'delivered'
  message_content TEXT,
  phone_number VARCHAR(20),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Custom reminders queue (user-defined)
CREATE TABLE IF NOT EXISTS custom_reminders (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'sent' | 'failed' | 'cancelled'
  created_by TEXT DEFAULT 'system',
  sent_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Per-user reminder preferences
CREATE TABLE IF NOT EXISTS reminder_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,  -- Auth UID (no FK to avoid permission issues)
  prayer_slot_reminders BOOLEAN DEFAULT true,
  daily_devotionals BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT true,
  custom_reminders BOOLEAN DEFAULT true,
  default_reminder_time INTEGER DEFAULT 30,  -- minutes before slot
  timezone VARCHAR(50) DEFAULT 'Africa/Harare',
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '06:00',
  reminder_days TEXT[] DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) Extend prayer_slots (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prayer_slots' AND column_name = 'reminder_time'
  ) THEN
    ALTER TABLE prayer_slots ADD COLUMN reminder_time INTEGER DEFAULT 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prayer_slots' AND column_name = 'custom_reminders'
  ) THEN
    ALTER TABLE prayer_slots ADD COLUMN custom_reminders BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prayer_slots' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE prayer_slots ADD COLUMN timezone VARCHAR(50) DEFAULT 'Africa/Harare';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prayer_slots' AND column_name = 'last_reminder_sent'
  ) THEN
    ALTER TABLE prayer_slots ADD COLUMN last_reminder_sent TIMESTAMPTZ;
  END IF;
END $$;

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_reminder_logs_slot_id ON reminder_logs(slot_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_id ON reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_type ON reminder_logs(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_status ON reminder_logs(status);

CREATE INDEX IF NOT EXISTS idx_custom_reminders_status ON custom_reminders(status);
CREATE INDEX IF NOT EXISTS idx_custom_reminders_scheduled_for ON custom_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_custom_reminders_phone ON custom_reminders(phone_number);

CREATE INDEX IF NOT EXISTS idx_reminder_prefs_user ON reminder_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_prefs_tz ON reminder_preferences(timezone);

CREATE INDEX IF NOT EXISTS idx_prayer_slots_reminder_time ON prayer_slots(reminder_time);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_status_rem ON prayer_slots(status, reminder_time);
CREATE INDEX IF NOT EXISTS idx_prayer_slots_tz ON prayer_slots(timezone);

-- 6) Helper functions (no-op guards for app calls)
CREATE OR REPLACE FUNCTION create_reminder_logs_table()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- no-op (table created above)
  NULL;
END $$;

CREATE OR REPLACE FUNCTION add_reminder_columns_to_prayer_slots()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- no-op (columns added above)
  NULL;
END $$;

-- 7) App functions
CREATE OR REPLACE FUNCTION log_reminder_sent(
  p_slot_id INTEGER,
  p_user_id UUID,
  p_reminder_type TEXT,
  p_minutes_before INTEGER DEFAULT NULL,
  p_message_content TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  log_id INTEGER;
BEGIN
  INSERT INTO reminder_logs (
    slot_id, user_id, reminder_type, minutes_before,
    message_content, phone_number, status
  ) VALUES (
    p_slot_id, p_user_id, p_reminder_type, p_minutes_before,
    p_message_content, p_phone_number, 'sent'
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END $$;

CREATE OR REPLACE FUNCTION update_slot_reminder_time(
  p_user_id UUID,
  p_minutes INTEGER
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  UPDATE prayer_slots
  SET reminder_time = p_minutes, updated_at = NOW()
  WHERE user_id = p_user_id::text
    AND status = 'active';

  RETURN FOUND;
END $$;

-- 8) Users due for reminders (deduped by last hour)
CREATE OR REPLACE FUNCTION get_users_due_for_reminders()
RETURNS TABLE(
  user_id UUID,
  phone_number TEXT,
  full_name TEXT,
  slot_id INTEGER,
  slot_time TEXT,
  reminder_time INTEGER,
  timezone TEXT,
  reminder_type TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id::uuid,
    up.phone_number,
    up.full_name,
    ps.id,
    ps.slot_time,
    COALESCE(ps.reminder_time, 30) AS reminder_time,
    COALESCE(ps.timezone, 'Africa/Harare') AS timezone,
    'slot_reminder' AS reminder_type
  FROM prayer_slots ps
  JOIN user_profiles up ON ps.user_id = up.id
  WHERE ps.status = 'active'
    AND up.phone_number IS NOT NULL
    AND up.phone_number <> ''
    AND NOT EXISTS (
      SELECT 1 FROM reminder_logs rl
      WHERE rl.slot_id = ps.id
        AND rl.reminder_type = 'slot_reminder'
        AND rl.sent_at > NOW() - INTERVAL '1 hour'
    );
END $$;

-- 9) Triggers to maintain updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_custom_reminders_updated_at ON custom_reminders;
CREATE TRIGGER trg_custom_reminders_updated_at
BEFORE UPDATE ON custom_reminders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reminder_prefs_updated_at ON reminder_preferences;
CREATE TRIGGER trg_reminder_prefs_updated_at
BEFORE UPDATE ON reminder_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10) RLS
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_preferences ENABLE ROW LEVEL SECURITY;

-- Reminder logs: user can select own; service role full
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminder_logs'
      AND policyname = 'user_select_own_reminder_logs'
  ) THEN
    CREATE POLICY user_select_own_reminder_logs ON reminder_logs
      FOR SELECT USING (auth.uid()::text = user_id::text);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminder_logs'
      AND policyname = 'service_all_reminder_logs'
  ) THEN
    CREATE POLICY service_all_reminder_logs ON reminder_logs
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Custom reminders: user can select own by phone; service full
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_reminders'
      AND policyname = 'user_select_own_custom_reminders'
  ) THEN
    CREATE POLICY user_select_own_custom_reminders ON custom_reminders
      FOR SELECT USING (
        phone_number IN (
          SELECT phone_number FROM user_profiles WHERE id = auth.uid()::text
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_reminders'
      AND policyname = 'service_all_custom_reminders'
  ) THEN
    CREATE POLICY service_all_custom_reminders ON custom_reminders
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Reminder preferences: user select/update own; service full
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminder_preferences'
      AND policyname = 'user_select_own_reminder_prefs'
  ) THEN
    CREATE POLICY user_select_own_reminder_prefs ON reminder_preferences
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminder_preferences'
      AND policyname = 'user_update_own_reminder_prefs'
  ) THEN
    CREATE POLICY user_update_own_reminder_prefs ON reminder_preferences
      FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminder_preferences'
      AND policyname = 'service_all_reminder_prefs'
  ) THEN
    CREATE POLICY service_all_reminder_prefs ON reminder_preferences
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 11) Dashboard view
CREATE OR REPLACE VIEW reminder_system_dashboard AS
SELECT
  up.id AS user_id,
  up.full_name,
  up.phone_number,
  up.email,
  COALESCE(rp.timezone, 'Africa/Harare') AS timezone,
  rp.prayer_slot_reminders,
  rp.daily_devotionals,
  rp.weekly_reports,
  rp.custom_reminders,
  rp.default_reminder_time,
  rp.quiet_hours_enabled,
  rp.quiet_hours_start,
  rp.quiet_hours_end,
  COUNT(ps.id) FILTER (WHERE ps.status = 'active') AS active_prayer_slots,
  COUNT(rl.id) FILTER (WHERE rl.sent_at >= CURRENT_DATE) AS reminders_sent_today,
  MAX(rl.sent_at) AS last_reminder_sent
FROM user_profiles up
LEFT JOIN reminder_preferences rp ON up.id::uuid = rp.user_id
LEFT JOIN prayer_slots ps ON up.id = ps.user_id
LEFT JOIN reminder_logs rl ON up.id::uuid = rl.user_id
GROUP BY up.id, up.full_name, up.phone_number, up.email, rp.timezone,
         rp.prayer_slot_reminders, rp.daily_devotionals, rp.weekly_reports,
         rp.custom_reminders, rp.default_reminder_time, rp.quiet_hours_enabled,
         rp.quiet_hours_start, rp.quiet_hours_end;

-- 12) Optional seed log for visibility
INSERT INTO reminder_logs (slot_id, user_id, reminder_type, minutes_before, message_content, status)
SELECT
  ps.id,
  ps.user_id::uuid,
  'system_initialization',
  COALESCE(ps.reminder_time, 30),
  'Advanced reminder system initialized for your prayer slot',
  'sent'
FROM prayer_slots ps
WHERE ps.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM reminder_logs rl WHERE rl.slot_id = ps.id AND rl.reminder_type = 'system_initialization'
  );