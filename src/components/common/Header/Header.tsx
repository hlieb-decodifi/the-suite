'use client';

import { Logo } from '@/components/common/Logo/Logo';
import { cn } from '@/utils/cn';
import { useState } from 'react';
import { AuthButtons } from './components/AuthButtons';
import { MobileMenu } from './components/MobileMenu/MobileMenu';
import { Modals } from './components/Modals';
import { SearchBox } from './components/SearchBox/SearchBox';
import { UserMenu } from './components/UserMenu/UserMenu';

export type HeaderProps = {
  className?: string;
  isAuthenticated: boolean;
  userInfo?:
    | {
        name: string;
        email: string;
        avatarUrl?: string | null;
      }
    | undefined;
};

export function Header({
  className,
  isAuthenticated = false,
  userInfo,
}: HeaderProps) {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleSignUpClick = () => setIsSignUpModalOpen(true);
  const handleSignInClick = () => setIsSignInModalOpen(true);

  const handleModalClose = () => setIsSignUpModalOpen(false);
  const handleSignInModalClose = () => setIsSignInModalOpen(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 py-2 border-b border-[#ECECEC] bg-white shadow-sm',
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
          {isAuthenticated && userInfo ? (
            <UserMenu userInfo={userInfo} />
          ) : (
            <AuthButtons
              onSignUpClick={handleSignUpClick}
              onSignInClick={handleSignInClick}
            />
          )}
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isAuthenticated={isAuthenticated}
          userInfo={isAuthenticated ? userInfo : undefined}
          onSignUpClick={handleSignUpClick}
          onSignInClick={handleSignInClick}
        />
      </div>

      <Modals
        isSignUpModalOpen={isSignUpModalOpen}
        setIsSignUpModalOpen={setIsSignUpModalOpen}
        isSignInModalOpen={isSignInModalOpen}
        setIsSignInModalOpen={setIsSignInModalOpen}
        handleSignUpClick={handleSignUpClick}
        handleSignInClick={handleSignInClick}
        handleSignUpModalClose={handleModalClose}
        handleSignInModalClose={handleSignInModalClose}
      />
    </header>
  );
}
