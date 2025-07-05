import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and service role key from environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase environment variables not found:', {
    url: !!supabaseUrl,
    key: !!supabaseServiceRoleKey,
    env: process.env
  });
  console.error('Available environment variables:', Object.keys(process.env));
  throw new Error('Missing Supabase environment variables. Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

// Create Supabase client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Export regular supabase client for general use  
export { supabaseAdmin as supabase };