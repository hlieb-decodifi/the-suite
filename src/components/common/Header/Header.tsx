'use client';

import { Logo } from '@/components/common/Logo/Logo';
import { cn } from '@/utils/cn';
import { AuthButtons } from './components/AuthButtons';
import { MobileMenu } from './components/MobileMenu/MobileMenu';
import { Modals } from './components/Modals';
import { SearchBox } from './components/SearchBox/SearchBox';
import { UserMenu } from './components/UserMenu/UserMenu';
import { useAuthData, useAuthModals } from './hooks';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { useSearch } from '@/stores/searchStore';

export type HeaderProps = {
  className?: string;
};

export function Header({ className }: HeaderProps) {
  const { isAuthenticated, userInfo, isLoading } = useAuthData();
  const {
    isSignUpModalOpen,
    isSignInModalOpen,
    setIsSignUpModalOpen,
    setIsSignInModalOpen,
    handlers: authHandlers,
  } = useAuthModals();
  const { handleSearch } = useSearch();

  const content =
    isAuthenticated && userInfo ? (
      <UserMenu userInfo={userInfo} />
    ) : (
      <AuthButtons
        onSignUpClick={authHandlers.handleSignUpClick}
        onSignInClick={authHandlers.handleSignInClick}
      />
    );

  return (
    <header
      className={cn(
        'md:min-h-[77px] sticky top-0 z-50 py-2 border-b border-[#ECECEC] bg-white shadow-sm',
        className,
      )}
    >
      <div className="container flex items-center justify-between">
        {/* Logo */}
        <Logo variant="large" className="mr-4" />

        {/* Search Services (Desktop) */}
        <div className="hidden md:block w-full max-w-md mx-4">
          <SearchBox onSearch={handleSearch} />
        </div>

        {/* Authentication / User Profile (Desktop) */}
        <div className="hidden md:flex items-center gap-4">
          {isLoading ? <LoadingOverlay /> : content}
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isAuthenticated={isAuthenticated}
          userInfo={isAuthenticated ? userInfo : undefined}
          onSignUpClick={authHandlers.handleSignUpClick}
          onSignInClick={authHandlers.handleSignInClick}
          onSearch={handleSearch}
        />
      </div>

      <Modals
        isSignUpModalOpen={isSignUpModalOpen}
        setIsSignUpModalOpen={setIsSignUpModalOpen}
        isSignInModalOpen={isSignInModalOpen}
        setIsSignInModalOpen={setIsSignInModalOpen}
        handleSignUpClick={authHandlers.handleSignUpClick}
        handleSignInClick={authHandlers.handleSignInClick}
        handleSignUpModalClose={authHandlers.handleModalClose}
        handleSignInModalClose={authHandlers.handleSignInModalClose}
      />
    </header>
  );
}
