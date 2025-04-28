'use client';

import { useAuthStore } from '@/stores/authStore';
import { signOutAction } from '@/api/auth/actions';
import { Button, type ButtonProps } from '@/components/ui/button';

export function SignOutButton(props: ButtonProps) {
  const { signOut } = useAuthStore();

  const handleLogoutClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) props.onClick(e);
    if (e.defaultPrevented) return;
    try {
      await signOutAction();
      signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Button
      type="button"
      variant={props.variant ?? 'ghost'}
      {...props}
      onClick={handleLogoutClick}
    >
      Sign Out
    </Button>
  );
}
