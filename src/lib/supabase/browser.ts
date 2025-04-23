import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Environment variables with NEXT_PUBLIC_ prefix are available in the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client is used for client-side operations with anonymous privileges
export const browserSupabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}); 