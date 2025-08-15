'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { UserProfileSummary } from '@/components/common/Header/components/UserProfileSummary/UserProfileSummary';
import { MessageBadge } from '@/components/ui/message-badge';

export type MobileAuthSectionProps = {
  isAuthenticated?: boolean;
  userInfo:
    | ({
        name: string;
        email: string;
        avatarUrl?: string | null;
        isAdmin?: boolean;
      })
    | undefined;
  isProfessional?: boolean;
  unreadMessagesCount?: number;
  unreadSupportRequestsCount?: number;
  onSignUpClick?: () => void;
  onSignInClick?: () => void;
};

export function MobileAuthSection({
  isAuthenticated = false,
  userInfo,
  isProfessional = false,
  unreadMessagesCount = 0,
  unreadSupportRequestsCount = 0,
  onSignUpClick,
  onSignInClick,
}: MobileAuthSectionProps) {
  const isAdmin = userInfo && 'isAdmin' in userInfo && userInfo.isAdmin;
  return (
    <div className="mt-auto flex flex-col gap-3 pb-6">
      {isAuthenticated && userInfo ? (
        <>
          <UserProfileSummary
            userInfo={userInfo}
            className="bg-muted rounded-md p-3"
            unreadMessagesCount={unreadMessagesCount}
            unreadSupportRequestsCount={unreadSupportRequestsCount}
          />

          {/* Navigation Links */}
          <div className="flex text-sm flex-col gap-4 mt-2">
            <Link
              className="hover:text-primary w-full justify-start text-left"
              href={isAdmin ? '/admin' : '/dashboard'}
            >
              Dashboard
            </Link>
            {!isAdmin && (
              <>
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
                <Link
                  className="hover:text-primary w-full justify-start text-left flex items-center justify-between"
                  href="/dashboard/support-requests"
                >
                  <span>Support Requests</span>
                  <MessageBadge count={unreadSupportRequestsCount} size="sm" />
                </Link>
              </>
            )}
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
