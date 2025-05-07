'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Menu, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { SearchBox } from '../SearchBox/SearchBox';
import { MobileNavLinks } from './components/MobileNavLinks';
import { MobileAuthSection } from './components/MobileAuthSection';

// Helper function to focus search input
function useFocusSearch(
  isOpen: boolean,
  shouldFocus: boolean,
  ref: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (isOpen && shouldFocus && ref.current) {
      const input = ref.current.querySelector('input');
      if (input) {
        setTimeout(() => {
          input.focus();
        }, 300);
      }
    }
  }, [isOpen, shouldFocus, ref]);
}

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
  onSearch?: (term: string) => void;
};

export function MobileMenu({
  isAuthenticated = false,
  userInfo,
  onSignUpClick,
  onSignInClick,
  onSearch,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Use the focus hook
  useFocusSearch(isOpen, shouldFocusSearch, searchBoxRef);

  const handleSearchClick = () => {
    setIsOpen(true);
    setShouldFocusSearch(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setShouldFocusSearch(false);
    }
  };

  const handleSignUpClick = () => {
    setIsOpen(false);
    if (onSignUpClick) onSignUpClick();
  };

  const handleSignInClick = () => {
    setIsOpen(false);
    if (onSignInClick) onSignInClick();
  };

  return (
    <div className="md:hidden flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="text-[#313131]"
        onClick={handleSearchClick}
      >
        <Search size={24} />
      </Button>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
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
            <div ref={searchBoxRef}>
              <SearchBox className="mb-6" onSearch={onSearch} />
            </div>

            {/* Navigation Links */}
            <MobileNavLinks onItemClick={() => setIsOpen(false)} />

            {/* Authentication Controls */}
            <MobileAuthSection
              isAuthenticated={isAuthenticated}
              userInfo={userInfo}
              onSignUpClick={handleSignUpClick}
              onSignInClick={handleSignInClick}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
