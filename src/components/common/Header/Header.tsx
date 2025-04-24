'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { Logo } from '@/components/common/Logo/Logo';
import { SearchBox } from './components/SearchBox/SearchBox';
import { UserMenu } from './components/UserMenu/UserMenu';
import { MobileMenu } from './components/MobileMenu/MobileMenu';
import { useState } from 'react';
import { SignUpModal } from '@/components/modals/SignUpModal/SignUpModal';

export type HeaderProps = {
  className?: string;
  isAuthenticated: boolean;
  userInfo?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
};

export function Header({
  className,
  isAuthenticated = false,
  userInfo,
}: HeaderProps) {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const defaultUserInfo = { name: 'User', email: 'user@example.com' };
  const userProfile = isAuthenticated && userInfo ? userInfo : defaultUserInfo;

  const handleSignUpClick = () => setIsSignUpModalOpen(true);

  const handleModalClose = () => setIsSignUpModalOpen(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 py-4 border-b border-[#ECECEC] bg-white shadow-sm',
        className,
      )}
    >
      <div className="container flex items-center justify-between">
        {/* Logo */}
        <Logo variant="large" className="mr-4" />

        {/* Search Services (Desktop) */}
        <div className="hidden md:block w-full max-w-md mx-4">
          <SearchBox />
        </div>

        {/* Authentication / User Profile (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <UserMenu userInfo={userProfile} />
          ) : (
            <>
              <Button
                className="font-futura font-medium bg-[#DEA85B] text-white hover:bg-[#C89245]"
                onClick={handleSignUpClick}
              >
                Sign up
              </Button>
              <Button
                variant="outline"
                className="font-futura font-medium border-[#DEA85B] text-[#313131] hover:bg-[#DEA85B] hover:text-white"
              >
                Login
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isAuthenticated={isAuthenticated}
          userInfo={isAuthenticated ? userProfile : undefined}
          onSignUpClick={handleSignUpClick}
        />
      </div>

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={isSignUpModalOpen}
        onOpenChange={setIsSignUpModalOpen}
        onSignInClick={handleModalClose}
        onSuccess={handleModalClose}
      />
    </header>
  );
}
