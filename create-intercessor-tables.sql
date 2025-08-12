-- Create intercessor schedules table
CREATE TABLE IF NOT EXISTS intercessor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    active_days TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Create prayer attendance table
CREATE TABLE IF NOT EXISTS prayer_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prayer_date TEXT NOT NULL,
    is_attended BOOLEAN NOT NULL,
    scheduled_day_of_week INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, prayer_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_intercessor_schedules_user_id ON intercessor_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_attendance_user_id ON prayer_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_attendance_date ON prayer_attendance(prayer_date);
CREATE INDEX IF NOT EXISTS idx_prayer_attendance_user_date ON prayer_attendance(user_id, prayer_date);