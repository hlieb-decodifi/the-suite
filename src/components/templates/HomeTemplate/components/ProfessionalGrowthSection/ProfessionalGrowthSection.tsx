'use client';

import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import { SignUpModal } from '@/components/modals/SignUpModal';
import { SignInModal } from '@/components/modals/SignInModal';

type ProfessionalGrowthSectionProps = {
  className?: string;
};

export function ProfessionalGrowthSection({
  className,
}: ProfessionalGrowthSectionProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  // Determine user role and appropriate redirect
  const isProfessional = user?.user_metadata?.role === 'professional';

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      // Show sign up modal for unauthenticated users
      setIsSignUpModalOpen(true);
    }
    // For authenticated users, the button will be wrapped with Link component
  };

  const getButtonContent = () => {
    if (!isAuthenticated) {
      return (
        <Button
          size="lg"
          className="bg-primary px-10 py-6 font-futura text-xl font-bold text-white hover:bg-primary/90"
          onClick={handleButtonClick}
        >
          Sign up
        </Button>
      );
    }

    // For authenticated users, determine redirect path
    const redirectPath = isProfessional ? '/profile' : '/client-profile';

    return (
      <Button
        asChild
        size="lg"
        className="bg-primary px-10 py-6 font-futura text-xl font-bold text-white hover:bg-primary/90"
      >
        <Link href={redirectPath}>View Profile</Link>
      </Button>
    );
  };

  return (
    <>
      <section className={cn('py-20 bg-muted/30', className)}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Typography
              variant="p"
              className="mb-6 font-caslon text-3xl italic text-primary"
            >
              Are you a haircare professional ready to attract more clients
            </Typography>

            <Typography
              variant="h2"
              className="font-futura text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-8 leading-tight"
            >
              Let The Suite help you grow your reach – partner with us to expand
              your client base and showcase your services.
            </Typography>

            <Typography className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              With The Suite, you'll get a standout landing page that makes it
              easy for clients to find you online. Expand your reach and attract
              more clients, no matter where you're based!
            </Typography>

            {getButtonContent()}
          </div>
        </div>
      </section>

      {/* Auth Modals */}
      <SignUpModal
        isOpen={isSignUpModalOpen}
        onOpenChange={setIsSignUpModalOpen}
        onSignInClick={() => {
          setIsSignUpModalOpen(false);
          setIsSignInModalOpen(true);
        }}
      />

      <SignInModal
        isOpen={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
        onSignUpClick={() => {
          setIsSignInModalOpen(false);
          setIsSignUpModalOpen(true);
        }}
      />
    </>
  );
}
