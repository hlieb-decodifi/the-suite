import { createClient } from '@/lib/supabase/server';
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
    const code = url.searchParams.get('code');
    const redirectTo = url.searchParams.get('redirect_to') || '/profile';
    const mode = url.searchParams.get('mode') || 'signin';
    const role = url.searchParams.get('role');
    
    console.log(`[AUTH_CALLBACK] Parsed params:`, { code, redirectTo, mode, role });
    
    if (code) {
      console.log(`[AUTH_CALLBACK] Code found, proceeding with exchange.`);
      const supabase = await createClient();
      
      // Try to exchange the code for a session (OAuth flow)
      console.log(`[AUTH_CALLBACK] Attempting to exchange code for session...`);
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      console.log(`[AUTH_CALLBACK] Exchange result:`, { data: !!data.session, error });

      if (data.session && !error) {
        console.log(`[AUTH_CALLBACK] Session successfully exchanged. User ID: ${data.user.id}`);
        // For signin mode, check if user already exists in our database
        if (mode === 'signin') {
          console.log(`[AUTH_CALLBACK] Mode: signin. Checking for existing user...`);
          const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single();
          
          console.log(`[AUTH_CALLBACK] Existing user check result:`, { existingUser: !!existingUser, userError });
          
          if (userError || !existingUser) {
            console.log('[AUTH_CALLBACK] User not found during signin, redirecting with error');
            // User doesn't exist, sign them out and redirect with error
            await supabase.auth.signOut();
            return NextResponse.redirect(new URL('/auth/confirmed?verified=false&error=user_not_found', baseUrl));
          }
        }
        
        // For signup mode, handle role assignment and profile creation
        if (mode === 'signup' && role) {
          console.log('[AUTH_CALLBACK] Mode: signup. Processing signup with role:', role);
          
          // Auto-upload profile photo from Google OAuth for any new user
          const avatarUrl = data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture;
          console.log('[AUTH_CALLBACK] Avatar URL from OAuth:', avatarUrl);
          
          if (avatarUrl) {
            console.log('[AUTH_CALLBACK] Attempting to upload OAuth profile photo...');
            try {
              const photoResult = await uploadOAuthProfilePhoto(data.user.id, avatarUrl, 'google');
              console.log('[AUTH_CALLBACK] Photo upload result:', photoResult);
            } catch (error) {
              console.error('[AUTH_CALLBACK] Error uploading OAuth profile photo:', error);
            }
          }
          
          // Get the role ID for the selected role
          console.log(`[AUTH_CALLBACK] Looking up role ID for role: ${role}`);
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', role)
            .single();
          
          console.log('[AUTH_CALLBACK] Role lookup result:', { roleData, roleError, requestedRole: role });
          
          if (!roleData) {
            console.error('[AUTH_CALLBACK] Invalid role specified:', role);
            return NextResponse.redirect(new URL('/auth/confirmed?verified=false&error=invalid_role', baseUrl));
          }
          
          // Check current user data
          console.log(`[AUTH_CALLBACK] Looking up current user data for user ID: ${data.user.id}`);
          const { data: currentUser, error: currentUserError } = await supabase
            .from('users')
            .select('role_id, roles!inner(name)')
            .eq('id', data.user.id)
            .single();
          
          console.log('[AUTH_CALLBACK] Current user lookup:', { currentUser, currentUserError });
          
          const currentRole = currentUser?.roles?.name;
          console.log('[AUTH_CALLBACK] Current role vs requested role:', { currentRole, requestedRole: role });
          
          // Extract names from Google metadata
          const firstName = data.user.user_metadata?.given_name || 
                           data.user.user_metadata?.name?.split(' ')[0] || 
                           '';
          const lastName = data.user.user_metadata?.family_name || 
                          data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || 
                          '';
          
          console.log('[AUTH_CALLBACK] Extracted names:', { firstName, lastName });
          
          // Update user with the selected role and correct names
          console.log(`[AUTH_CALLBACK] Updating user with role ID: ${roleData.id}`);
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              role_id: roleData.id,
              first_name: firstName,
              last_name: lastName,
            })
            .eq('id', data.user.id);
          
          console.log('[AUTH_CALLBACK] User update result:', { updateError });
          
          if (updateError) {
            console.error('[AUTH_CALLBACK] Error updating user role:', updateError);
          }
          
          // Handle profile creation/switching
          if (currentRole !== role) {
            console.log('[AUTH_CALLBACK] Role change detected, creating/checking profiles...');
            
            // If switching from client to professional
            if (currentRole === 'client' && role === 'professional') {
              console.log('[AUTH_CALLBACK] Role switch: client -> professional. Creating professional profile...');
              // Create professional profile
              const { error: profError } = await supabase
                .from('professional_profiles')
                .insert({ user_id: data.user.id });
              
              console.log('[AUTH_CALLBACK] Professional profile creation result:', { profError });
              
              if (profError && !profError.message.includes('duplicate')) {
                console.error('[AUTH_CALLBACK] Error creating professional profile:', profError);
              }
            }
            
            // If switching from professional to client  
            if (currentRole === 'professional' && role === 'client') {
              console.log('[AUTH_CALLBACK] Role switch: professional -> client. Ensuring client profile exists...');
              // Client profile should already exist from trigger, but ensure it's there
              const { error: clientError } = await supabase
                .from('client_profiles')
                .insert({ user_id: data.user.id });
              
              console.log('[AUTH_CALLBACK] Client profile creation result:', { clientError });
              
              if (clientError && !clientError.message.includes('duplicate')) {
                console.error('[AUTH_CALLBACK] Error creating client profile:', clientError);
              }
            }
            
            // If this is a new user (no previous role), create the appropriate profile
            if (!currentRole) {
              console.log('[AUTH_CALLBACK] New user detected, creating profile for role:', role);
              
              if (role === 'professional') {
                const { error: profError } = await supabase
                  .from('professional_profiles')
                  .insert({ user_id: data.user.id });
                
                console.log('[AUTH_CALLBACK] New professional profile creation result:', { profError });
                
                if (profError && !profError.message.includes('duplicate')) {
                  console.error('[AUTH_CALLBACK] Error creating professional profile:', profError);
                }
              }
              // Client profile should already exist from trigger
            }
          }
        }
        
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
    }
    
    // Redirect to confirmed page with error state if verification failed
    console.log('[AUTH_CALLBACK] No code found or all attempts failed, redirecting with error.');
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', baseUrl));
  } catch (error) {
    console.error('[AUTH_CALLBACK] Unhandled error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', baseUrl));
  }
} 