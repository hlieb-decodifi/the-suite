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
    const type = url.searchParams.get('type'); // Added to detect email verification

    if (code) {
      console.log(
        `[AUTH_CALLBACK] Code found, proceeding with exchange. Type: ${type}`,
      );
      const supabase = await createClient();

      // If this is specifically an email verification, skip OAuth and go directly to email verification
      if (type === 'email_verification') {
        console.log(
          '[AUTH_CALLBACK] Email verification detected, attempting email verification...',
        );

        // For email verification, we need to exchange the code for a session first
        const { data: sessionData, error: emailError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!emailError && sessionData?.session) {
          // Email verification successful - user is now authenticated
          console.log(
            '[AUTH_CALLBACK] Email verification successful. User authenticated.',
          );

          // Check user role to determine correct redirect destination
          const { data: userRoleData, error: userRoleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', sessionData.user.id)
            .single();

          let finalRedirectTo = redirectTo;

          if (!userRoleError && userRoleData?.role) {
            const roleName = userRoleData.role;
            console.log('[AUTH_CALLBACK] User role:', roleName);

            // Override redirect destination based on role
            if (roleName === 'client') {
              finalRedirectTo = '/client-profile';
            } else if (roleName === 'professional') {
              finalRedirectTo = '/profile';
            } else if (roleName === 'admin') {
              finalRedirectTo = '/admin';
            }
          }

          console.log('[AUTH_CALLBACK] Redirecting to:', finalRedirectTo);
          return NextResponse.redirect(new URL(finalRedirectTo, baseUrl));
        } else {
          console.error(
            '[AUTH_CALLBACK] Email verification failed:',
            emailError,
          );
          return NextResponse.redirect(
            new URL('/auth/confirmed?verified=false', baseUrl),
          );
        }
      }

      // Try to exchange the code for a session (OAuth flow)
      console.log(`[AUTH_CALLBACK] Attempting to exchange code for session...`);
      const { data: sessionData, error } =
        await supabase.auth.exchangeCodeForSession(code);
      console.log(`[AUTH_CALLBACK] Exchange result:`, {
        session: !!sessionData?.session,
        error,
      });

      if (sessionData?.session && !error) {
        console.log(
          `[AUTH_CALLBACK] Session successfully exchanged. User ID: ${sessionData.user.id}`,
        );

        // For signin mode, check if this is a newly created user
        if (mode === 'signin') {
          console.log(
            `[AUTH_CALLBACK] Mode: signin. Checking if user was just created...`,
          );
          const email =
            sessionData.user.email || sessionData.user.user_metadata?.email;

          // Check if user was created very recently (within last 10 seconds)
          // This indicates they were just created by the OAuth exchange and didn't exist before
          const userCreatedAt = new Date(sessionData.user.created_at);
          const now = new Date();
          const secondsSinceCreation =
            (now.getTime() - userCreatedAt.getTime()) / 1000;

          console.log(
            `[AUTH_CALLBACK] User created at: ${userCreatedAt.toISOString()}, seconds since creation: ${secondsSinceCreation}`,
          );

          if (secondsSinceCreation < 10) {
            console.log(
              '[AUTH_CALLBACK] User was just created during signin, treating as new user - redirecting with googleError=no_account',
            );

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
                console.error(
                  '[AUTH_CALLBACK] Error deleting client profile:',
                  profileError,
                );
              }

              // Delete from users table
              console.log('[AUTH_CALLBACK] Deleting user record...');
              const { error: userError } = await admin
                .from('users')
                .delete()
                .eq('id', sessionData.user.id);

              if (userError) {
                console.error(
                  '[AUTH_CALLBACK] Error deleting user record:',
                  userError,
                );
              }

              // Delete from auth.users last
              console.log('[AUTH_CALLBACK] Deleting auth user...');
              await admin.auth.admin.deleteUser(sessionData.user.id);

              console.log(
                '[AUTH_CALLBACK] Successfully cleaned up all auto-created records',
              );
            } catch (deleteError) {
              console.error(
                '[AUTH_CALLBACK] Failed to clean up auto-created records:',
                deleteError,
              );
            }

            const redirectUrl = new URL('/', baseUrl);
            redirectUrl.searchParams.set('googleError', 'no_account');
            redirectUrl.searchParams.set('email', email);
            return NextResponse.redirect(redirectUrl);
          } else {
            // User existed before, this is a normal signin
            console.log(
              '[AUTH_CALLBACK] User existed before signin, checking role for redirect',
            );

            // Check user role to determine correct redirect destination
            const { data: userRoleData, error: userRoleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', sessionData.user.id)
              .single();

            let finalRedirectTo = redirectTo;

            if (!userRoleError && userRoleData?.role) {
              const roleName = userRoleData.role;
              console.log('[AUTH_CALLBACK] User role:', roleName);

              // Override redirect destination based on role
              if (roleName === 'client') {
                finalRedirectTo = '/client-profile';
              } else if (roleName === 'professional') {
                finalRedirectTo = '/profile';
              } else if (roleName === 'admin') {
                finalRedirectTo = '/admin';
              }
            }

            console.log(
              '[AUTH_CALLBACK] Redirecting existing user to:',
              finalRedirectTo,
            );
            const response = NextResponse.redirect(
              new URL(finalRedirectTo, baseUrl),
            );
            return response;
          }
        }

        // Continue with signup mode logic
        if (mode === 'signup') {
          console.log(
            '[AUTH_CALLBACK] Mode: signup. Checking if user was just created or already existed...',
          );
          const email =
            sessionData.user.email || sessionData.user.user_metadata?.email;

          // Check if user was created very recently (within last 10 seconds)
          // This indicates they were just created by the OAuth exchange (legitimate signup)
          const userCreatedAt = new Date(sessionData.user.created_at);
          const now = new Date();
          const secondsSinceCreation =
            (now.getTime() - userCreatedAt.getTime()) / 1000;

          console.log(
            `[AUTH_CALLBACK] User created at: ${userCreatedAt.toISOString()}, seconds since creation: ${secondsSinceCreation}`,
          );

          if (secondsSinceCreation < 10) {
            // This is a legitimate new signup - user was just created
            console.log(
              '[AUTH_CALLBACK] User was just created during signup, proceeding with new user setup',
            );
            console.log('[AUTH_CALLBACK] Role from URL parameters:', role);

            // Update role if specified in URL (from signup flow)
            // Note: Trigger has already run and created default 'client' role
            // We need to update it if user selected 'professional' during OAuth signup
            if (role && role === 'professional') {
              try {
                const admin = createAdminClient();
                console.log(`[AUTH_CALLBACK] Updating user role to: ${role}`);
                
                const { error: updateError } = await admin
                  .from('user_roles')
                  .update({ role: 'professional', updated_at: new Date().toISOString() })
                  .eq('user_id', sessionData.user.id);

                if (updateError) {
                  console.error(
                    '[AUTH_CALLBACK] Error updating user role:',
                    updateError,
                  );
                } else {
                  console.log('[AUTH_CALLBACK] Successfully updated user role');

                  // Create professional profile and remove client profile
                  const { error: profProfileError } = await admin
                    .from('professional_profiles')
                    .upsert(
                      { user_id: sessionData.user.id },
                      {
                        onConflict: 'user_id',
                        ignoreDuplicates: true,
                      },
                    );

                  if (profProfileError) {
                    console.error(
                      '[AUTH_CALLBACK] Error creating professional profile:',
                      profProfileError,
                    );
                  } else {
                    console.log(
                      '[AUTH_CALLBACK] Professional profile ensured',
                    );
                  }

                  // Remove client profile if it exists
                  await admin
                    .from('client_profiles')
                    .delete()
                    .eq('user_id', sessionData.user.id);
                }
              } catch (roleAssignmentError) {
                console.error(
                  '[AUTH_CALLBACK] Error during role assignment:',
                  roleAssignmentError,
                );
              }
            }

            // Auto-upload profile photo from Google OAuth for any new user
            const avatarUrl =
              sessionData.user.user_metadata?.avatar_url ||
              sessionData.user.user_metadata?.picture;
            console.log('[AUTH_CALLBACK] Avatar URL from OAuth:', avatarUrl);
            if (avatarUrl) {
              console.log(
                '[AUTH_CALLBACK] Attempting to upload OAuth profile photo...',
              );
              try {
                const photoResult = await uploadOAuthProfilePhoto(
                  sessionData.user.id,
                  avatarUrl,
                  'google',
                );
                console.log(
                  '[AUTH_CALLBACK] Photo upload result:',
                  photoResult,
                );
              } catch (error) {
                console.error(
                  '[AUTH_CALLBACK] Error uploading OAuth profile photo:',
                  error,
                );
              }
            }

            // Add a small delay to ensure all database operations are complete
            console.log(
              '[AUTH_CALLBACK] Waiting for 1 second before redirect...',
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Check user role to determine correct redirect destination for new OAuth signup
            const { data: userRoleData, error: userRoleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', sessionData.user.id)
              .single();

            let finalRedirectTo = redirectTo;

            if (!userRoleError && userRoleData?.role) {
              const roleName = userRoleData.role;
              console.log('[AUTH_CALLBACK] New OAuth user role:', roleName);

              // Override redirect destination based on role
              if (roleName === 'client') {
                finalRedirectTo = '/client-profile';
              } else if (roleName === 'professional') {
                finalRedirectTo = '/profile';
              } else if (roleName === 'admin') {
                finalRedirectTo = '/admin';
              }
            }

            console.log(
              '[AUTH_CALLBACK] Redirecting new OAuth user to:',
              finalRedirectTo,
            );
            // Create response and set session cookie explicitly
            const response = NextResponse.redirect(
              new URL(finalRedirectTo, baseUrl),
            );
            // Verify user is properly authenticated before redirect
            console.log('[AUTH_CALLBACK] Verifying user authentication...');
            const {
              data: { user },
              error: userError,
            } = await supabase.auth.getUser();
            if (!user || userError) {
              console.error(
                '[AUTH_CALLBACK] User verification failed:',
                userError,
              );
              return NextResponse.redirect(
                new URL('/auth/confirmed?verified=false', baseUrl),
              );
            }
            return response;
          } else {
            // User existed before this OAuth attempt, this is a duplicate signup attempt
            console.log(
              '[AUTH_CALLBACK] User existed before signup attempt, redirecting with googleError=account_exists',
            );
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
      console.log(
        '[AUTH_CALLBACK] OAuth exchange failed, trying email verification...',
      );
      const { error: emailError } = await supabase.auth.verifyOtp({
        token_hash: code,
        type: 'email',
      });
      if (!emailError) {
        // Email verification successful
        console.log('[AUTH_CALLBACK] Email verification successful.');
        return NextResponse.redirect(
          new URL('/auth/confirmed?verified=true', baseUrl),
        );
      }
      // Both OAuth and email verification failed
      console.error('[AUTH_CALLBACK] All auth attempts failed.', {
        oauthError: error,
        emailError,
      });
      return NextResponse.redirect(
        new URL('/auth/confirmed?verified=false', baseUrl),
      );
    }
    // If no code is present, redirect with error
    console.log(
      '[AUTH_CALLBACK] No code found or all attempts failed, redirecting with error.',
    );
    return NextResponse.redirect(
      new URL('/auth/confirmed?verified=false', baseUrl),
    );
  } catch (error) {
    console.error('[AUTH_CALLBACK] Unhandled error in auth callback:', error);
    return NextResponse.redirect(
      new URL('/auth/confirmed?verified=false', baseUrl),
    );
  }
}
