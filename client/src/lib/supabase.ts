import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lmhbvdxainxcjuveisfe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaGJ2ZHhhaW54Y2p1dmVpc2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjkxMzIsImV4cCI6MjA2NDc0NTEzMn0.I_HFYuMj3viPL1xamwL88tJyEBFrXLJZpGDjnScvMeg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
};
