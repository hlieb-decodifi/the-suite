'use client';

import { useState } from 'react';

import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ReviewData, ProfessionalRatingStats } from '@/api/reviews/api';

export type ReviewsSectionProps = {
  reviews: ReviewData[];
  reviewStats: ProfessionalRatingStats | null;
  isEditable?: boolean;
};

// Helper component to render a single review
function ReviewItem({ review }: { review: ReviewData }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={review.clientAvatar}
                  alt={review.clientName}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(review.clientName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Typography
                  variant="h5"
                  className="font-semibold text-foreground"
                >
                  {review.clientName}
                </Typography>
                <div className="flex items-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= review.score ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Typography variant="small" className="text-muted-foreground">
              {formatDate(review.createdAt)}
            </Typography>
          </div>

          <Typography className="text-foreground">{review.message}</Typography>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewsSection({
  reviews,
  reviewStats,
  isEditable = true,
}: ReviewsSectionProps) {
  const [visibleReviews, setVisibleReviews] = useState(3);

  // Use real data from reviewStats (which shows actual counts regardless of display threshold)
  const actualReviewCount = reviewStats?.totalReviews || 0;
  const hasReviews = reviews.length > 0; // Reviews visible after threshold/permission check
  const hasActualReviews = actualReviewCount > 0; // Whether reviews actually exist
  const averageRating = reviewStats?.averageRating || 0;
  const totalReviews = reviewStats?.totalReviews || 0;
  const displayedReviews = reviews.slice(0, visibleReviews);

  const handleShowMore = () => {
    setVisibleReviews(reviews.length);
  };

  const handleShowLess = () => {
    setVisibleReviews(3);
  };

  // Get appropriate header text based on mode
  const getHeaderText = () => {
    if (isEditable) {
      return hasReviews
        ? 'See what your clients are saying about your services'
        : hasActualReviews
          ? `You have ${actualReviewCount} ${actualReviewCount === 1 ? 'review' : 'reviews'} from your clients`
          : 'Client reviews will appear here after you complete your first service';
    } else {
      return hasReviews
        ? 'What clients are saying about this professional'
        : hasActualReviews
          ? 'This professional has received positive client feedback'
          : 'This professional is new to our platform';
    }
  };

  // Get appropriate empty state text based on mode
  const getEmptyStateText = () => {
    if (isEditable) {
      // Edit mode - more direct messaging to the professional
      if (!hasActualReviews) {
        return 'No reviews yet. Reviews will appear here when clients leave feedback.';
      } else if (!hasReviews) {
        return `You have ${actualReviewCount} ${actualReviewCount === 1 ? 'review' : 'reviews'}, but they will be shown publicly once you reach the minimum threshold. Keep providing great service!`;
      } else {
        return `${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'} so far. More reviews will help potential clients make decisions.`;
      }
    } else {
      // Client-facing mode - more positive messaging about the professional
      if (!hasActualReviews) {
        return "This professional is new to our platform and hasn't received any reviews yet.";
      } else if (!hasReviews) {
        return `This professional has received ${actualReviewCount} positive ${actualReviewCount === 1 ? 'review' : 'reviews'} but needs a few more before they're displayed publicly. Quality is our priority!`;
      } else {
        return `This professional has received ${totalReviews} positive ${totalReviews === 1 ? 'review' : 'reviews'} recently. Check back soon for more client experiences.`;
      }
    }
  };

  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Typography variant="h2" className="font-bold text-foreground">
              Reviews
            </Typography>
            <Typography className="text-muted-foreground">
              {getHeaderText()}
            </Typography>
          </div>
          {hasReviews && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= Math.round(averageRating) ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
              <div className="flex items-baseline space-x-2">
                <Typography variant="h4" className="font-bold text-foreground">
                  {averageRating.toFixed(1)}
                </Typography>
                <Typography variant="small" className="text-muted-foreground">
                  ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                </Typography>
              </div>
            </div>
          )}
        </div>

        {hasReviews ? (
          <>
            <div className="space-y-4">
              {displayedReviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>

            {reviews.length > 3 && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={
                    visibleReviews < reviews.length
                      ? handleShowMore
                      : handleShowLess
                  }
                >
                  {visibleReviews < reviews.length
                    ? 'Show More Reviews'
                    : 'Show Less'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-muted rounded-md p-8 text-center">
            <Typography className="text-muted-foreground">
              {getEmptyStateText()}
            </Typography>
          </div>
        )}
      </div>
    </>
  );
}
