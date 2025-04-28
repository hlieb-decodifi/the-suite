import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Auth callback route handler
 * This is used for email verification and OAuth callbacks
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (code) {
      const supabase = await createClient();
      
      // Instead of exchanging code for session (which logs the user in),
      // just verify the email without creating a session
      const { error } = await supabase.auth.verifyOtp({
        token_hash: code,
        type: 'email',
      });
      
      if (!error) {
        // Redirect to confirmed page after successful verification
        return NextResponse.redirect(new URL('/auth/confirmed?verified=true', 'http://localhost:3000'));
      }
    }
    
    // Redirect to confirmed page with error state if verification failed
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', 'http://localhost:3000'));
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', 'http://localhost:3000'));
  }
} 