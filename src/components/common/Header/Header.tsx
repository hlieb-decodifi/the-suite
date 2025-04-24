'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { Logo } from '@/components/common/Logo/Logo';
import { SearchBox } from './components/SearchBox/SearchBox';
import { UserMenu } from './components/UserMenu/UserMenu';
import { MobileMenu } from './components/MobileMenu/MobileMenu';

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
  // Default user info if authenticated but no info provided
  const defaultUserInfo = {
    name: 'User',
    email: 'user@example.com',
  };

  const userProfile = isAuthenticated && userInfo ? userInfo : defaultUserInfo;

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
                variant="outline"
                className="font-futura font-medium border-primary text-[#313131] hover:bg-[#DEA85B] hover:text-white"
              >
                Login
              </Button>
              <Button className="font-futura font-medium bg-primary text-white hover:bg-[#C89245]">
                Sign up
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isAuthenticated={isAuthenticated}
          userInfo={isAuthenticated ? userProfile : undefined}
        />
      </div>
    </header>
  );
}
