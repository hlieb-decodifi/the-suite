'use client';

import { Button } from '@/components/ui/button';

type AuthButtonsProps = {
  onSignUpClick: () => void;
  onSignInClick: () => void;
};

export function AuthButtons({
  onSignUpClick,
  onSignInClick,
}: AuthButtonsProps) {
  return (
    <>
      <Button
        className="font-futura font-medium bg-[#DEA85B] text-white hover:bg-[#C89245]"
        onClick={onSignUpClick}
      >
        Sign up
      </Button>
      <Button
        variant="outline"
        className="font-futura font-medium border-[#DEA85B] text-[#313131] hover:bg-[#DEA85B] hover:text-white"
        onClick={onSignInClick}
      >
        Login
      </Button>
    </>
  );
}
