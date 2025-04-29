'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { SearchBox } from '../SearchBox/SearchBox';
import { MobileNavLinks } from './components/MobileNavLinks';
import { SignOutButton } from '@/components/common/SignOutButton/SignOutButton';
import { UserProfileSummary } from '@/components/common/Header/components/UserProfileSummary/UserProfileSummary';

export type MobileMenuProps = {
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

export function MobileMenu({
  isAuthenticated = false,
  userInfo,
  onSignUpClick,
  onSignInClick,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center gap-2">
      <Button variant="ghost" size="icon" className="text-[#313131]">
        <Search size={24} />
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-[#313131]">
            <Menu size={24} />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[300px] sm:w-[350px] font-futura"
        >
          <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle>
          <div className="flex flex-col h-full pt-6">
            {/* Mobile Search */}
            <SearchBox className="mb-6" />

            {/* Navigation Links */}
            <MobileNavLinks onItemClick={() => setIsOpen(false)} />

            {/* Authentication Controls */}
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
                    onClick={() => {
                      setIsOpen(false);
                      if (onSignUpClick) onSignUpClick();
                    }}
                  >
                    Sign up
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full font-futura font-medium border-primary text-foreground hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      setIsOpen(false);
                      if (onSignInClick) onSignInClick();
                    }}
                  >
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
