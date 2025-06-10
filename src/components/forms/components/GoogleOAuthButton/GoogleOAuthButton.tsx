'use client';

import { getGoogleOAuthUrlAction } from '@/api/auth/actions';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { UserType } from '@/components/forms/SignUpForm/schema';

export type GoogleOAuthButtonProps = {
  mode: 'signin' | 'signup';
  className?: string;
  redirectTo?: string;
  role?: UserType; // Required for signup mode
  disabled?: boolean;
};

export function GoogleOAuthButton({
  mode,
  className,
  redirectTo = '/profile',
  role,
  disabled = false,
}: GoogleOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleGoogleAuth = async () => {
    // Don't proceed if disabled
    if (disabled) return;
    
    setIsLoading(true);
    
    try {
      // Use server action to get the OAuth URL
      const result = await getGoogleOAuthUrlAction(redirectTo, mode, role);
      
      if (result.success && result.url) {
        // Redirect to Google OAuth
        window.location.href = result.url;
        return;
      }
      
      console.error('Failed to get OAuth URL:', result.error);
      setIsLoading(false);
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
      setIsLoading(false);
    }
  };

  const buttonText = mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google';
  const loadingText = 'Redirecting...';
  const isButtonDisabled = isLoading || disabled;

  const button = (
    <Button
      type="button"
      variant="outline"
      className={`w-full ${className}`}
      onClick={handleGoogleAuth}
      disabled={isButtonDisabled}
    >
      {!isLoading && (
        <svg
          className="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      {isLoading ? loadingText : buttonText}
    </Button>
  );

  // If disabled due to no role selection in signup mode, show tooltip
  if (disabled && mode === 'signup' && !role) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              {button}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Please select whether you are a professional or client first</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <div />;
} 