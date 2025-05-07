'use client';

import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { UserProfileSummary } from '@/components/common/Header/components/UserProfileSummary/UserProfileSummary';

export type MobileAuthSectionProps = {
  isAuthenticated?: boolean;
  userInfo:
    | {
        name: string;
        email: string;
        avatarUrl?: string | null;
      }
    | undefined;
  onSignUpClick?: () => void;
  onSignInClick?: () => void;
};

export function MobileAuthSection({
  isAuthenticated = false,
  userInfo,
  onSignUpClick,
  onSignInClick,
}: MobileAuthSectionProps) {
  return (
    <div className="mt-auto flex flex-col gap-3 pb-6">
      {isAuthenticated && userInfo ? (
        <>
          <UserProfileSummary
            userInfo={userInfo}
            className="bg-muted rounded-md p-3"
          />
          <div className="mt-4 border-t pt-4">
            <SignOutButton className="w-full" />
          </div>
        </>
      ) : (
        <>
          <Button
            className="w-full font-futura font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onSignUpClick}
          >
            Sign up
          </Button>
          <Button
            variant="outline"
            className="w-full font-futura font-medium border-primary text-foreground hover:bg-primary hover:text-primary-foreground"
            onClick={onSignInClick}
          >
            Login
          </Button>
        </>
      )}
    </div>
  );
}
