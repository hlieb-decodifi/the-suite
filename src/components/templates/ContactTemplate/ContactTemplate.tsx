'use client';

import { useState } from 'react';
import { ContactForm } from '@/components/forms/ContactForm';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { SignInModal } from '@/components/modals/SignInModal';
import { SignUpModal } from '@/components/modals/SignUpModal';
import { Card, CardContent } from '@/components/ui/card';

type ContactTemplateProps = {
  userData?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  isAuthenticated: boolean;
};

export function ContactTemplate({
  userData,
  isAuthenticated,
}: ContactTemplateProps) {
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  const handleSignInClick = () => {
    setIsSignUpOpen(false);
    setIsSignInOpen(true);
  };

  const handleSignUpClick = () => {
    setIsSignInOpen(false);
    setIsSignUpOpen(true);
  };

  return (
    <div className="w-full bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Typography
            variant="p"
            className="mb-4 font-caslon text-3xl italic text-primary"
          >
            We're here to help
          </Typography>

          <Typography
            variant="h1"
            className="mb-6 text-4xl font-bold font-futura md:text-5xl tracking-tight text-foreground"
          >
            Contact Us
          </Typography>

          <Typography
            variant="lead"
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Need help with your account, have a question about our services, or
            want to provide feedback? We're here to help and would love to hear
            from you.
          </Typography>
        </div>

        {/* Contact Form or Sign In Prompt */}
        <div className="flex justify-center my-20">
          {isAuthenticated ? (
            <ContactForm
              className="w-full max-w-2xl"
              {...(userData && { userData })}
            />
          ) : (
            <Card className="w-full max-w-2xl">
              <CardContent className="pt-6 pb-8 px-8 text-center">
                <Typography variant="h3" className="mb-4 text-2xl font-bold">
                  Sign in to Contact Us
                </Typography>
                <Typography
                  variant="p"
                  className="mb-6 text-muted-foreground text-lg"
                >
                  To submit a contact inquiry, please sign in to your account.
                  This helps us respond to you more efficiently and prevents
                  spam.
                </Typography>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" onClick={handleSignInClick}>
                    Sign In
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleSignUpClick}
                  >
                    Create Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sign In/Up Modals */}
      <SignInModal
        isOpen={isSignInOpen}
        onOpenChange={setIsSignInOpen}
        onSignUpClick={handleSignUpClick}
        redirectTo="/contact"
      />
      <SignUpModal
        isOpen={isSignUpOpen}
        onOpenChange={setIsSignUpOpen}
        onSignInClick={handleSignInClick}
        redirectTo="/contact"
      />
    </div>
  );
}
