/* eslint-disable max-lines-per-function */
'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export type ReviewsSectionProps = {
  user: User;
};

// Define a type for review
type Review = {
  id: string;
  customerName: string;
  rating: number;
  date: string;
  text: string;
};

// Helper component to render a single review
function ReviewItem({ review }: { review: Review }) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Typography variant="h4" className="font-semibold text-foreground">
              {review.customerName}
            </Typography>
            <Typography variant="small" className="text-muted-foreground">
              {review.date}
            </Typography>
          </div>

          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= review.rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
              />
            ))}
          </div>

          <Typography className="text-foreground">{review.text}</Typography>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewsSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
}: ReviewsSectionProps) {
  const [visibleReviews, setVisibleReviews] = useState(3);

  // Mock data - would come from API in a real app
  const reviews = [
    {
      id: '1',
      customerName: 'Sarah Johnson',
      rating: 5,
      date: 'May 15, 2023',
      text: 'Amazing work! John did an incredible job on my hair. The color is exactly what I wanted and the cut is perfect. Will definitely be coming back!',
    },
    {
      id: '2',
      customerName: 'Michael Thompson',
      rating: 4,
      date: 'April 20, 2023',
      text: 'Great service and very professional. The salon was clean and welcoming. My haircut turned out great!',
    },
    {
      id: '3',
      customerName: 'Jennifer Davis',
      rating: 5,
      date: 'March 12, 2023',
      text: 'John is a hair genius! He understood exactly what I wanted and delivered. The highlights look so natural and beautiful.',
    },
    {
      id: '4',
      customerName: 'Robert Wilson',
      rating: 4,
      date: 'February 28, 2023',
      text: 'Solid service. Haircut was good, though the wait was a bit longer than expected. Overall happy with the results.',
    },
    {
      id: '5',
      customerName: 'Emily Martinez',
      rating: 5,
      date: 'January 15, 2023',
      text: "The best stylist I've ever been to! John has a real talent for color and cutting. My hair has never looked better.",
    },
  ];

  const averageRating =
    reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  const displayedReviews = reviews.slice(0, visibleReviews);

  const handleShowMore = () => {
    setVisibleReviews(reviews.length);
  };

  const handleShowLess = () => {
    setVisibleReviews(3);
  };

  if (reviews.length <= 5) {
    return null;
  }

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
              See what your clients are saying about your services
            </Typography>
          </div>
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
                ({reviews.length} reviews)
              </Typography>
            </div>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-muted rounded-md p-8 text-center">
            <Typography className="text-muted-foreground">
              No reviews yet. Reviews will appear here when clients leave
              feedback.
            </Typography>
          </div>
        ) : (
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
        )}
      </div>
    </>
  );
}
