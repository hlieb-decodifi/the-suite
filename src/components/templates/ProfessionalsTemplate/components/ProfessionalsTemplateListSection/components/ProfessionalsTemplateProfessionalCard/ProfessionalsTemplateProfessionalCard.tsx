'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { MapPin, Star, Calendar, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { ProfessionalListItem } from '../../../../types';

export type ProfessionalsTemplateProfessionalCardProps = {
  professional: ProfessionalListItem;
};

export function ProfessionalsTemplateProfessionalCard({
  professional,
}: ProfessionalsTemplateProfessionalCardProps) {
  const {
    name,
    avatar,
    profession,
    description,
    location,
    rating,
    reviewCount,
    serviceCount,
    isSubscribed,
    joinedDate,
    user_id: userId,
  } = professional;

  // Format join date
  const joinDate = new Date(joinedDate).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  // Get initials for avatar fallback
  const initials = name
    .split(' ')
    .map((word: string) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="flex flex-col justify-between group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border-border">
      <CardContent className="p-6">
        {/* Header with Avatar and Basic Info */}
        <div className="mb-4 flex items-start space-x-4">
          <Avatar className="h-16 w-16 border-2 border-primary/10">
            <AvatarImage src={avatar} alt={`${name}'s profile`} />
            <AvatarFallback className="bg-primary/10 text-primary font-futura font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <Typography
                variant="h3"
                className="font-futura font-bold text-lg text-foreground truncate"
              >
                {name}
              </Typography>
              {isSubscribed && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 hover:bg-primary/20 text-primary text-xs"
                >
                  Pro
                </Badge>
              )}
            </div>

            {profession && (
              <Typography
                variant="small"
                className="text-base text-muted-foreground mb-1 truncate"
              >
                {profession}
              </Typography>
            )}

            {location && (
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" />
                <Typography variant="small" className="text-sm truncate">
                  {location}
                </Typography>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 min-h-[2.5rem]">
          {description && (
            <Typography
              variant="p"
              className="text-muted-foreground text-sm line-clamp-2"
            >
              {description}
            </Typography>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center space-x-4">
            {/* Show rating only if professional has reviews to display */}
            {reviewCount > 0 && (
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-medium">{rating}</span>
                <span className="text-muted-foreground/70 ml-1">
                  ({reviewCount})
                </span>
              </div>
            )}

            <div className="flex items-center">
              <Briefcase className="h-4 w-4 mr-1" />
              <span>
                {serviceCount} service{serviceCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Since {joinDate}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Link href={`/professionals/${userId}`} className="w-full">
          <Button
            variant="outline"
            className="w-full font-futura font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            View Profile
          </Button>
        </Link>
      </CardFooter>

      {/* Hover overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  );
}
