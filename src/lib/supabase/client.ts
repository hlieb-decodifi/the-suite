import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// These env vars are automatically set by Vercel
// https://vercel.com/docs/concepts/edge-network/environment-variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This client is used for server-side operations with service role privileges
export const serverSupabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
}); 