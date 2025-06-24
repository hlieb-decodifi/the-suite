'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { UserProfileSummary } from '@/components/common/Header/components/UserProfileSummary/UserProfileSummary';
import { MessageBadge } from '@/components/ui/message-badge';

export type MobileAuthSectionProps = {
  isAuthenticated?: boolean;
  userInfo:
    | {
        name: string;
        email: string;
        avatarUrl?: string | null;
      }
    | undefined;
  isProfessional?: boolean;
  unreadMessagesCount?: number;
  onSignUpClick?: () => void;
  onSignInClick?: () => void;
};

export function MobileAuthSection({
  isAuthenticated = false,
  userInfo,
  isProfessional = false,
  unreadMessagesCount = 0,
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

          {/* Navigation Links */}
          <div className="flex text-sm flex-col gap-4 mt-2">
            <Link
              className="hover:text-primary w-full justify-start text-left"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="hover:text-primary w-full justify-start text-left"
              href={isProfessional ? '/profile' : '/client-profile'}
            >
              Profile
            </Link>
            <Link
              className="hover:text-primary w-full justify-start text-left"
              href="/dashboard/appointments"
            >
              My Bookings
            </Link>
            <Link
              className="hover:text-primary w-full justify-start text-left flex items-center justify-between"
              href="/dashboard/messages"
            >
              <span>Messages</span>
              <MessageBadge count={unreadMessagesCount} size="sm" />
            </Link>
          </div>

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
