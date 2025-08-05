'use client';

import { Logo } from '@/components/common/Logo/Logo';
import { useSearch } from '@/stores/searchStore';
import { cn } from '@/utils/cn';
import { AuthButtons } from './components/AuthButtons';
import { MobileMenu } from './components/MobileMenu/MobileMenu';
import { Modals } from './components/Modals';
import { SearchBox } from './components/SearchBox/SearchBox';
import { UserMenu } from './components/UserMenu/UserMenu';
import { useAuthModals } from './hooks';

export type UserInfo = {
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
};

export type HeaderProps = {
  className?: string;
  isAuthenticated: boolean;
  userInfo: UserInfo | null;
  isProfessional?: boolean;
  unreadMessagesCount?: number;
};

export function Header({
  className,
  isAuthenticated,
  userInfo,
  isProfessional = false,
  unreadMessagesCount = 0,
}: HeaderProps) {
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
      <UserMenu
        isProfessional={isProfessional}
        userInfo={userInfo}
        unreadMessagesCount={unreadMessagesCount}
      />
    ) : (
      <AuthButtons
        onSignUpClick={authHandlers.handleSignUpClick}
        onSignInClick={authHandlers.handleSignInClick}
      />
    );

  // Convert userInfo to match MobileMenu expected type
  const mobileUserInfo = userInfo
    ? {
        name: userInfo.name,
        email: userInfo.email,
        avatarUrl: userInfo.avatarUrl,
        isAdmin: userInfo.isAdmin,
      }
    : undefined;

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
        <div className="hidden md:flex items-center gap-4">{content}</div>

        {/* Mobile Menu */}
        <MobileMenu
          isAuthenticated={isAuthenticated}
          userInfo={mobileUserInfo}
          isProfessional={isProfessional}
          unreadMessagesCount={unreadMessagesCount}
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
