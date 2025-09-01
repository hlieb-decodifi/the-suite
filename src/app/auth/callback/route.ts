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
    const role = url.searchParams.get('role');

    if (code) {
      console.log(`[AUTH_CALLBACK] Code found, proceeding with exchange.`);
      const supabase = await createClient();
      
      // Try to exchange the code for a session (OAuth flow)
      console.log(`[AUTH_CALLBACK] Attempting to exchange code for session...`);
      const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
      console.log(`[AUTH_CALLBACK] Exchange result:`, { session: !!sessionData?.session, error });

      if (sessionData?.session && !error) {
        console.log(`[AUTH_CALLBACK] Session successfully exchanged. User ID: ${sessionData.user.id}`);
        
        // For signin mode, check if this is a newly created user
        if (mode === 'signin') {
          console.log(`[AUTH_CALLBACK] Mode: signin. Checking if user was just created...`);
          const email = sessionData.user.email || sessionData.user.user_metadata?.email;
          
          // Check if user was created very recently (within last 10 seconds)
          // This indicates they were just created by the OAuth exchange and didn't exist before
          const userCreatedAt = new Date(sessionData.user.created_at);
          const now = new Date();
          const secondsSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000;
          
          console.log(`[AUTH_CALLBACK] User created at: ${userCreatedAt.toISOString()}, seconds since creation: ${secondsSinceCreation}`);
          
          if (secondsSinceCreation < 10) {
            console.log('[AUTH_CALLBACK] User was just created during signin, treating as new user - redirecting with googleError=no_account');
            
            // This is a new user trying to sign in, clean up and redirect
            await supabase.auth.signOut();
            
            // Clean up all auto-created records
            try {
              const admin = createAdminClient();
              
              // Delete from client_profiles first (due to foreign key constraint)
              console.log('[AUTH_CALLBACK] Deleting client profile...');
              const { error: profileError } = await admin
                .from('client_profiles')
                .delete()
                .eq('user_id', sessionData.user.id);
              
              if (profileError) {
                console.error('[AUTH_CALLBACK] Error deleting client profile:', profileError);
              }
              
              // Delete from users table
              console.log('[AUTH_CALLBACK] Deleting user record...');
              const { error: userError } = await admin
                .from('users')
                .delete()
                .eq('id', sessionData.user.id);
              
              if (userError) {
                console.error('[AUTH_CALLBACK] Error deleting user record:', userError);
              }
              
              // Delete from auth.users last
              console.log('[AUTH_CALLBACK] Deleting auth user...');
              await admin.auth.admin.deleteUser(sessionData.user.id);
              
              console.log('[AUTH_CALLBACK] Successfully cleaned up all auto-created records');
            } catch (deleteError) {
              console.error('[AUTH_CALLBACK] Failed to clean up auto-created records:', deleteError);
            }
            
            const redirectUrl = new URL('/', baseUrl);
            redirectUrl.searchParams.set('googleError', 'no_account');
            redirectUrl.searchParams.set('email', email);
            return NextResponse.redirect(redirectUrl);
          } else {
            // User existed before, this is a normal signin
            console.log('[AUTH_CALLBACK] User existed before signin, proceeding to profile');
            const response = NextResponse.redirect(new URL(redirectTo, baseUrl));
            return response;
          }
        }
        
        // Continue with signup mode logic
        if (mode === 'signup') {
          console.log('[AUTH_CALLBACK] Mode: signup. Checking if user was just created or already existed...');
          const email = sessionData.user.email || sessionData.user.user_metadata?.email;
          
          // Check if user was created very recently (within last 10 seconds)
          // This indicates they were just created by the OAuth exchange (legitimate signup)
          const userCreatedAt = new Date(sessionData.user.created_at);
          const now = new Date();
          const secondsSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000;
          
          console.log(`[AUTH_CALLBACK] User created at: ${userCreatedAt.toISOString()}, seconds since creation: ${secondsSinceCreation}`);
          
          if (secondsSinceCreation < 10) {
            // This is a legitimate new signup - user was just created
            console.log('[AUTH_CALLBACK] User was just created during signup, proceeding with new user setup');
            console.log('[AUTH_CALLBACK] Role from URL parameters:', role);
            
            // Handle role assignment and profile setup
            if (role && (role === 'professional' || role === 'client')) {
              try {
                const admin = createAdminClient();
                
                // Get the role ID
                const { data: roleData, error: roleError } = await admin
                  .from('roles')
                  .select('id')
                  .eq('name', role)
                  .single();
                
                if (roleError || !roleData?.id) {
                  console.error('[AUTH_CALLBACK] Error getting role ID:', roleError);
                } else {
                  // Update user role
                  console.log(`[AUTH_CALLBACK] Updating user role to: ${role}`);
                  const { error: updateError } = await admin
                    .from('users')
                    .update({ role_id: roleData.id })
                    .eq('id', sessionData.user.id);
                  
                  if (updateError) {
                    console.error('[AUTH_CALLBACK] Error updating user role:', updateError);
                  } else {
                    console.log('[AUTH_CALLBACK] Successfully updated user role');
                    
                    // If changing to professional, ensure professional profile exists
                    if (role === 'professional') {
                      const { error: profProfileError } = await admin
                        .from('professional_profiles')
                        .upsert({ user_id: sessionData.user.id }, { 
                          onConflict: 'user_id',
                          ignoreDuplicates: true 
                        });
                      
                      if (profProfileError) {
                        console.error('[AUTH_CALLBACK] Error creating professional profile:', profProfileError);
                      } else {
                        console.log('[AUTH_CALLBACK] Professional profile ensured');
                      }
                    }
                  }
                }
              } catch (roleAssignmentError) {
                console.error('[AUTH_CALLBACK] Error during role assignment:', roleAssignmentError);
              }
            }
            
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
          } else {
            // User existed before this OAuth attempt, this is a duplicate signup attempt
            console.log('[AUTH_CALLBACK] User existed before signup attempt, redirecting with googleError=account_exists');
            await supabase.auth.signOut();
            // Redirect to index page with googleError param for modal
            const redirectUrl = new URL(baseUrl);
            redirectUrl.searchParams.set('googleError', 'account_exists');
            redirectUrl.searchParams.set('email', email);
            return NextResponse.redirect(redirectUrl);
          }
        }
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
  } catch (error) {
    console.error('[AUTH_CALLBACK] Unhandled error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', baseUrl));
  }
}