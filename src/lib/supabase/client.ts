import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// These env vars are automatically set by Vercel
// https://vercel.com/docs/concepts/edge-network/environment-variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// This client is used for server-side operations
export const serverSupabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
}); 