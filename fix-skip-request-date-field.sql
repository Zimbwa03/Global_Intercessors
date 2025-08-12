-- Fix skip request approval by checking and fixing the updates table date field issue
-- First, check the structure of updates table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'updates' 
ORDER BY ordinal_position;

-- Check if there are any constraints or triggers on the date field
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'updates'::regclass AND contype = 'c';

-- If the date field has a NOT NULL constraint but isn't being provided, we need to:
-- 1. Either make the date field nullable temporarily
-- 2. Or always provide a valid date value in the insert

-- Option 1: Make date field nullable (if needed)
-- ALTER TABLE updates ALTER COLUMN date DROP NOT NULL;

-- Option 2: Check if date field has a default value
-- ALTER TABLE updates ALTER COLUMN date SET DEFAULT NOW();

-- Let's see what's in the updates table currently
SELECT id, title, date, created_at FROM updates ORDER BY created_at DESC LIMIT 5;