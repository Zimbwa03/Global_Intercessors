# Global Intercessors - Supabase Database Setup Guide

## Step 1: Run the Database Setup Script

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content from `supabase-setup.sql`
4. Click "Run" to execute the script

This will create all necessary tables:
- `admin_users` - For admin authentication
- `prayer_slots` - For user prayer assignments
- `available_slots` - For available prayer time slots
- `prayer_sessions` - For tracking completed sessions
- `attendance_log` - For zoom attendance tracking
- `zoom_meetings` - For meeting data
- `audio_bible_progress` - For user Bible progress
- `fasting_registrations` - For event registrations

## Step 2: Create Your First Admin User

1. Navigate to `/create-admin` in your app
2. Enter your email address
3. Click "Create Admin User"
4. You should see a success message

## Step 3: Login as Admin

1. Navigate to `/admin/login`
2. Enter the same email you used in step 2
3. Create a password (this creates your Supabase Auth account)
4. You should be redirected to the admin dashboard

## Step 4: Verify Database Tables

In your Supabase dashboard, go to Table Editor and confirm you can see:
- admin_users (with your email)
- prayer_slots
- available_slots (with 48 time slots)
- Other tables as listed above

## Common Issues and Solutions

### Issue: "relation does not exist" error
**Solution:** Run the SQL setup script in Supabase SQL Editor

### Issue: Admin login fails
**Solution:** 
1. Ensure you've created the admin user via `/create-admin`
2. Use the exact same email for both steps
3. Check that the `admin_users` table exists and contains your email

### Issue: Permission denied
**Solution:** The RLS policies are configured to allow proper access. If issues persist, temporarily disable RLS on admin_users table.

### Issue: Tables not visible in Supabase
**Solution:** Refresh your Supabase dashboard and check the Table Editor

## Testing Your Setup

1. Create admin user at `/create-admin`
2. Login at `/admin/login` 
3. Access admin dashboard at `/admin/dashboard`
4. Register a regular user and assign them a prayer slot
5. Test the prayer slot management features

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Admins have elevated permissions
- All authentication goes through Supabase Auth