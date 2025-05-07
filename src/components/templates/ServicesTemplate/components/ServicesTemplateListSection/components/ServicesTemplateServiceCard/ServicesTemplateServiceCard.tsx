/* eslint-disable max-lines-per-function */
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Clock, MapPin } from 'lucide-react';
import { ServiceListItem, AuthStatus } from '../../../../types';
import { ExpandableText } from '@/components/common/ExpandableText/ExpandableText';
import { formatDuration } from '@/utils/formatDuration';
import { useState } from 'react';
import { SignInModal } from '@/components/modals/SignInModal';

export type ServicesTemplateServiceCardProps = {
  service: ServiceListItem;
  authStatus: AuthStatus;
};

export function ServicesTemplateServiceCard({
  service,
  authStatus,
}: ServicesTemplateServiceCardProps) {
  const { name, description, price, duration, professional, isBookable } =
    service;
  const { isAuthenticated, isLoading, isClient } = authStatus;
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  // Determine if the Book Now button should be shown
  const shouldShowBookButton =
    isBookable &&
    (!isAuthenticated || // Not authenticated
      isClient); // Client role

  const handleBookNowClick = () => {
    if (!isAuthenticated) {
      // Open sign-in modal for unauthenticated users
      setIsSignInModalOpen(true);
    } else {
      // Handle booking for authenticated clients
      console.log('Booking service:', service.id);
      // Additional booking logic would go here
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <>
      <Card className="border border-border w-full overflow-hidden hover:shadow-card transition-shadow duration-200">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row w-full">
            {/* Service info section - left side on desktop */}
            <div className="flex-grow p-6 md:w-[68%]">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <Typography
                    variant="large"
                    className="font-semibold text-foreground"
                  >
                    {name}
                  </Typography>
                  <div className="flex items-center gap-3">
                    <Typography
                      variant="p"
                      className="leading-tight font-medium text-primary"
                    >
                      ${price.toFixed(2)}
                    </Typography>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <Typography
                        variant="p"
                        className="leading-tight text-muted-foreground"
                      >
                        {formatDuration(duration)}
                      </Typography>
                    </div>
                  </div>
                </div>
              </div>

              {description && (
                <ExpandableText
                  text={description}
                  maxLines={2}
                  className="mt-3"
                  variant="small"
                  textClassName="text-muted-foreground"
                />
              )}

              {/* Mobile professional info without border */}
              <div className="md:hidden mt-4 pt-4 border-t border-border">
                <div className="flex items-start">
                  <div className="relative">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20 flex-shrink-0">
                      <AvatarImage
                        src={professional.avatar}
                        alt={professional.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(professional.name)}
                      </AvatarFallback>
                    </Avatar>
                    {professional.reviewCount > 0 && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-background font-medium">
                        {professional.rating}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex-1">
                    <Typography className="font-semibold text-foreground">
                      {professional.name}
                    </Typography>

                    <div className="flex flex-col gap-1 mt-0.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <Typography
                          variant="small"
                          className="text-xs truncate max-w-[200px]"
                        >
                          {professional.address}
                        </Typography>
                      </div>

                      {professional.reviewCount > 5 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Typography variant="small" className="text-xs">
                            {professional.reviewCount}{' '}
                            {professional.reviewCount === 1
                              ? 'review'
                              : 'reviews'}
                          </Typography>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Book button - full width at the bottom */}
                {shouldShowBookButton && (
                  <div className="mt-4">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={handleBookNowClick}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 'Book Now'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Professional info section - right side on desktop only */}
            <div className="hidden md:flex md:flex-col p-6 md:min-w-[25%] md:border-l md:border-border md:bg-muted/10">
              {/* Professional profile info */}
              <div className="flex pb-2 items-start space-x-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20 flex-shrink-0">
                    <AvatarImage
                      src={professional.avatar}
                      alt={professional.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(professional.name)}
                    </AvatarFallback>
                  </Avatar>
                  {professional.reviewCount > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-background font-medium">
                      {professional.rating}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Typography className="font-semibold text-foreground truncate">
                    {professional.name}
                  </Typography>

                  <div className="flex flex-col gap-1 mt-0.5">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <Typography variant="small" className="text-xs truncate">
                        {professional.address}
                      </Typography>
                    </div>

                    {professional.reviewCount > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Typography variant="small" className="text-xs">
                          {professional.reviewCount}{' '}
                          {professional.reviewCount === 1
                            ? 'review'
                            : 'reviews'}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Booking button (if applicable) */}
              {shouldShowBookButton && (
                <div className="mt-auto pt-4 border-t border-border/40 mt-4">
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleBookNowClick}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Book Now'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign-in modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onOpenChange={setIsSignInModalOpen}
        redirectTo={`/services?booking=${service.id}`}
      />
    </>
  );
}
