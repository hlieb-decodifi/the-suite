import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { uploadOAuthProfilePhoto } from '@/server/domains/photos/oauth-photo-upload';

/**
 * Auth callback route handler
 * This is used for email verification and OAuth callbacks
 */
export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  console.log(`[AUTH_CALLBACK] Received request: ${request.url}`);
  
  try {
    const url = new URL(request.url);
    // url is already declared above
    const code = url.searchParams.get('code');
    const redirectTo = url.searchParams.get('redirect_to') || '/profile';
    const mode = url.searchParams.get('mode') || 'signin';

    if (code) {
      console.log(`[AUTH_CALLBACK] Code found, proceeding with exchange.`);
      const supabase = await createClient();
      // Try to exchange the code for a session (OAuth flow)
      console.log(`[AUTH_CALLBACK] Attempting to exchange code for session...`);

      const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
      console.log(`[AUTH_CALLBACK] Exchange result:`, { session: !!sessionData?.session, error });

      if (sessionData?.session && !error) {
        console.log(`[AUTH_CALLBACK] Session successfully exchanged. User ID: ${sessionData.user.id}`);
        // For signin mode, check if user already exists in our database
        if (mode === 'signin') {
          console.log(`[AUTH_CALLBACK] Mode: signin. Checking for existing user...`);
          // Use the admin client to check the auth.users table by id
          const admin = createAdminClient();
          let existingUser = null;
          let userError = null;
          try {
            const { data: user, error } = await admin.auth.admin.getUserById(sessionData.user.id);
            existingUser = user;
            userError = error;
          } catch (e) {
            userError = e;
          }
          console.log(`[AUTH_CALLBACK] Existing user check result:`, { existingUser: !!existingUser, userError });
          const email = sessionData.user.email || sessionData.user.user_metadata?.email;
          if (userError || !existingUser) {
            console.log('[AUTH_CALLBACK] User not found during signin, redirecting with googleError=no_account');
            await supabase.auth.signOut();
            // Redirect to original page with googleError param for modal
            const redirectUrl = new URL(redirectTo, baseUrl);
            redirectUrl.searchParams.set('googleError', 'no_account');
            redirectUrl.searchParams.set('email', email);
            return NextResponse.redirect(redirectUrl);
          } else {
            // User exists, proceed to profile (redirectTo)
            console.log('[AUTH_CALLBACK] User found during signin, redirecting to profile');
            const response = NextResponse.redirect(new URL(redirectTo, baseUrl));
            // Optionally refresh session cookie
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              });
            }
            return response;
          }
        }
  // For signup mode, allow account creation regardless of role (role will be set later in onboarding)
  if (mode === 'signup') {
          console.log('[AUTH_CALLBACK] Mode: signup. Checking if user already exists for email using user_exists RPC...');
          const email = sessionData.user.email || sessionData.user.user_metadata?.email;
          const admin = createAdminClient();
          let userExists = false;
          let userError = null;
          try {
            const { data, error } = await admin.rpc('user_exists', { p_email: email });
            userExists = !!data;
            userError = error;
          } catch (e) {
            userError = e;
          }
          if (userExists && !userError) {
            console.log('[AUTH_CALLBACK] User already exists for email, redirecting with googleError=account_exists');
            await supabase.auth.signOut();
            // Redirect to index page with googleError param for modal
            const redirectUrl = new URL(baseUrl);
            redirectUrl.searchParams.set('googleError', 'account_exists');
            redirectUrl.searchParams.set('email', email);
            return NextResponse.redirect(redirectUrl);
          }
          // ...existing code for new user creation...
          // Auto-upload profile photo from Google OAuth for any new user
          const avatarUrl = sessionData.user.user_metadata?.avatar_url || sessionData.user.user_metadata?.picture;
          console.log('[AUTH_CALLBACK] Avatar URL from OAuth:', avatarUrl);
          if (avatarUrl) {
            console.log('[AUTH_CALLBACK] Attempting to upload OAuth profile photo...');
            try {
              const photoResult = await uploadOAuthProfilePhoto(sessionData.user.id, avatarUrl, 'google');
              console.log('[AUTH_CALLBACK] Photo upload result:', photoResult);
            } catch (error) {
              console.error('[AUTH_CALLBACK] Error uploading OAuth profile photo:', error);
            }
          }
          // ...rest of the signup logic remains unchanged...
        // Add a small delay to ensure all database operations are complete
        console.log('[AUTH_CALLBACK] Waiting for 1 second before redirect...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('[AUTH_CALLBACK] Redirecting to:', redirectTo);
        // Create response and set session cookie explicitly
        const response = NextResponse.redirect(new URL(redirectTo, baseUrl));
        // Ensure session is properly set in cookies
        console.log('[AUTH_CALLBACK] Refreshing session cookie...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Refresh the session to ensure it's properly established
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        }
        return response;
      }

      // If OAuth fails, try email verification
      console.log('[AUTH_CALLBACK] OAuth exchange failed, trying email verification...');
      const { error: emailError } = await supabase.auth.verifyOtp({
        token_hash: code,
        type: 'email',
      });
      if (!emailError) {
        // Email verification successful
        console.log('[AUTH_CALLBACK] Email verification successful.');
        return NextResponse.redirect(new URL('/auth/confirmed?verified=true', baseUrl));
      }
      // Both OAuth and email verification failed
      console.error('[AUTH_CALLBACK] All auth attempts failed.', { oauthError: error, emailError });
      return NextResponse.redirect(new URL('/auth/confirmed?verified=false', baseUrl));
    }
    // If no code is present, redirect with error
    console.log('[AUTH_CALLBACK] No code found or all attempts failed, redirecting with error.');
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', baseUrl));
}
  } catch (error) {
    console.error('[AUTH_CALLBACK] Unhandled error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', baseUrl));
  }
}