
-- Add zoom_link column to zoom_meetings table if it doesn't exist
DO $$
BEGIN
    -- Check if zoom_link column exists, if not add it
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='zoom_meetings' AND column_name='zoom_link') THEN
        ALTER TABLE zoom_meetings ADD COLUMN zoom_link TEXT;
    END IF;
END $$;

-- Update existing records to have zoom_link based on meeting_id
UPDATE zoom_meetings 
SET zoom_link = 'https://zoom.us/j/' || meeting_id 
WHERE zoom_link IS NULL AND meeting_id IS NOT NULL;
