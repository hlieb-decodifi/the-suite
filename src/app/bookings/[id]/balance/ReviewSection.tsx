'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { submitReview } from '@/server/domains/reviews/actions';
import { format } from 'date-fns';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ReviewSectionProps = {
  bookingId: string;
  professionalName: string;
  reviewStatus?: {
    canReview: boolean;
    hasReview: boolean;
    review: {
      id: string;
      score: number;
      message: string;
      createdAt: string;
    } | null;
  } | null;
};

type ReviewData = {
  id: string;
  score: number;
  message: string;
  createdAt: string;
};

type ReviewStatus = {
  canReview: boolean;
  hasReview: boolean;
  review: ReviewData | null;
};

export function ReviewSection({
  bookingId,
  professionalName,
  reviewStatus: initialReviewStatus = null,
}: ReviewSectionProps) {
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(
    initialReviewStatus,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(initialReviewStatus?.review?.score || 0);
  const [message, setMessage] = useState(
    initialReviewStatus?.review?.message || '',
  );
  const [hoveredStar, setHoveredStar] = useState(0);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await submitReview(bookingId, rating, message);
      if (!result.success || !result.review) {
        throw new Error(result.error || 'Failed to submit review');
      }

      toast({
        title: 'Review submitted',
        description: 'Thank you for your feedback!',
        variant: 'default',
      });

      // Update the review status to immediately show the review
      setReviewStatus({
        canReview: false,
        hasReview: true,
        review: {
          id: result.review.id,
          score: rating,
          message: message,
          createdAt: new Date().toISOString(),
        },
      });

      setRating(0);
      setMessage('');

      // Revalidate the page to show the new review
      router.refresh();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reviewStatus) {
    return null;
  }

  // Show existing review
  if (reviewStatus.hasReview && reviewStatus.review) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rating:</span>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= reviewStatus.review!.score
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Review:</p>
          <p className="text-sm bg-muted/50 p-3 rounded-lg border">
            {reviewStatus.review.message}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Submitted on{' '}
          {format(new Date(reviewStatus.review.createdAt), 'MMMM d, yyyy')}
        </p>
      </div>
    );
  }

  // Show review form if can review (only for clients)
  if (reviewStatus.canReview) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share your experience with {professionalName}
        </p>

        {/* Star Rating */}
        <div className="space-y-2">
          <Label>Rating</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= (hoveredStar || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                {rating} star{rating !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Review Message */}
        <div className="space-y-2">
          <Label htmlFor="review-message">Your Review</Label>
          <Textarea
            id="review-message"
            placeholder="Tell others about your experience..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !rating || !message.trim()}
          className="w-full"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    );
  }

  // Show "no review yet" message for professionals/admins when appointment is completed but no review exists
  if (!reviewStatus.canReview && !reviewStatus.hasReview) {
    return (
      <div className="text-center py-6 space-y-3">
        <Star className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground text-sm">
          No review has been submitted for this appointment yet.
        </p>
      </div>
    );
  }

  return null;
}
