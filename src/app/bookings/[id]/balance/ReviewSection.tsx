'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';

type ReviewSectionProps = {
  bookingId: string;
  professionalName: string;
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
}: ReviewSectionProps) {
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  // Fetch review status
  useEffect(() => {
    const fetchReviewStatus = async () => {
      try {
        const { getReviewStatus } = await import(
          '@/server/domains/reviews/actions'
        );
        const result = await getReviewStatus(bookingId);

        if (result.success && result.reviewStatus) {
          setReviewStatus(result.reviewStatus);
          if (result.reviewStatus.review) {
            setScore(result.reviewStatus.review.score);
            setMessage(result.reviewStatus.review.message);
          }
        }
      } catch (error) {
        console.error('Error fetching review status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewStatus();
  }, [bookingId]);

  const handleSubmitReview = async () => {
    if (!score || !message.trim()) {
      alert('Please provide both a rating and a review message.');
      return;
    }

    setSubmitting(true);

    try {
      const { submitReview } = await import('@/server/domains/reviews/actions');
      const result = await submitReview(bookingId, score, message.trim());

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit review');
      }

      // Update the review status to reflect the new review
      setReviewStatus({
        canReview: false,
        hasReview: true,
        review: result.review || null,
      });

      alert('Thank you for your review!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(
        `Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading review status...</p>
      </div>
    );
  }

  if (!reviewStatus) {
    return null;
  }

  // Show existing review
  if (reviewStatus.hasReview && reviewStatus.review) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your rating:</span>
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
          <p className="text-sm text-muted-foreground mb-2">Your review:</p>
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

  // Show review form if can review
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
                onClick={() => setScore(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= (hoveredStar || score)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
            {score > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                {score} star{score !== 1 ? 's' : ''}
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
          onClick={handleSubmitReview}
          disabled={submitting || !score || !message.trim()}
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    );
  }

  // Cannot review (appointment not completed, etc.)
  return null;
}
