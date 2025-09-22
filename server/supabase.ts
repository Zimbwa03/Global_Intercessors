import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and service role key from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjkxMzIsImV4cCI6MjA2NDc0NTEzMn0.I_HFYuMj3viPL1xamwL88tJyEBFrXLJZpGDjnScvMeg';

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
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-my-custom-header': 'my-app-name'
    }
  }
});

// Export regular supabase client for general use  
export { supabaseAdmin as supabase };