import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Auth callback route handler
 * This is used for email verification and OAuth callbacks
 */
export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const redirectTo = url.searchParams.get('redirect_to') || '/profile';
    const mode = url.searchParams.get('mode') || 'signin';
    const role = url.searchParams.get('role');
    
    if (code) {
      const supabase = await createClient();
      
      // Try to exchange the code for a session (OAuth flow)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (data.session && !error) {
        // For signin mode, check if user already exists in our database
        if (mode === 'signin') {
          const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single();
          
          if (userError || !existingUser) {
            // User doesn't exist, sign them out and redirect with error
            await supabase.auth.signOut();
            return NextResponse.redirect(new URL('/auth/confirmed?verified=false&error=user_not_found', baseUrl));
          }
        }
        
        // For signup mode, handle role assignment and profile creation
        if (mode === 'signup' && role) {
          // Get the role ID for the selected role
          const { data: roleData } = await supabase
            .from('roles')
            .select('id')
            .eq('name', role)
            .single();
          
          if (!roleData) {
            console.error('Invalid role specified:', role);
            return NextResponse.redirect(new URL('/auth/confirmed?verified=false&error=invalid_role', baseUrl));
          }
          
          // Check current user data
          const { data: currentUser } = await supabase
            .from('users')
            .select('role_id, roles!inner(name)')
            .eq('id', data.user.id)
            .single();
          
          const currentRole = currentUser?.roles?.name;
          
          // Extract names from Google metadata
          const firstName = data.user.user_metadata?.given_name || 
                           data.user.user_metadata?.name?.split(' ')[0] || 
                           '';
          const lastName = data.user.user_metadata?.family_name || 
                          data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || 
                          '';
          
          // Update user with the selected role and correct names
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              role_id: roleData.id,
              first_name: firstName,
              last_name: lastName,
            })
            .eq('id', data.user.id);
          
          if (updateError) {
            console.error('Error updating user role:', updateError);
          }
          
          // Handle profile creation/switching
          if (currentRole !== role) {
            
            // If switching from client to professional
            if (currentRole === 'client' && role === 'professional') {
              // Create professional profile
              const { error: profError } = await supabase
                .from('professional_profiles')
                .insert({ user_id: data.user.id });
              
              if (profError && !profError.message.includes('duplicate')) {
                console.error('Error creating professional profile:', profError);
              }
            }
            
            // If switching from professional to client  
            if (currentRole === 'professional' && role === 'client') {
              // Client profile should already exist from trigger, but ensure it's there
              const { error: clientError } = await supabase
                .from('client_profiles')
                .insert({ user_id: data.user.id });
              
              if (clientError && !clientError.message.includes('duplicate')) {
                console.error('Error creating client profile:', clientError);
              }
            }
            
            // If this is a new user (no previous role), create the appropriate profile
            if (!currentRole) {
              if (role === 'professional') {
                const { error: profError } = await supabase
                  .from('professional_profiles')
                  .insert({ user_id: data.user.id });
                
                if (profError && !profError.message.includes('duplicate')) {
                  console.error('Error creating professional profile:', profError);
                }
              }
              // Client profile should already exist from trigger
            }
          }
        }
        
        // OAuth successful - redirect to intended destination
        return NextResponse.redirect(new URL(redirectTo, baseUrl));
      }
      
      // If OAuth fails, try email verification
      const { error: emailError } = await supabase.auth.verifyOtp({
        token_hash: code,
        type: 'email',
      });
      
      if (!emailError) {
        // Email verification successful
        return NextResponse.redirect(new URL('/auth/confirmed?verified=true', baseUrl));
      }
      
      // Both OAuth and email verification failed
      console.error('Auth callback errors:', { oauthError: error, emailError });
    }
    
    // Redirect to confirmed page with error state if verification failed
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', baseUrl));
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/auth/confirmed?verified=false', baseUrl));
  }
} 