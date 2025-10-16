
-- Add image_url column to updates table for Event Update images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'updates' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE updates ADD COLUMN image_url TEXT;
    RAISE NOTICE 'Added image_url column to updates table';
  ELSE
    RAISE NOTICE 'image_url column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'updates' 
ORDER BY ordinal_position;
