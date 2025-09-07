'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ReviewPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
  professionalName: string;
  serviceName: string;
};

export function ReviewPromptModal({
  isOpen,
  onClose,
  professionalName,
  serviceName,
}: ReviewPromptModalProps) {
  const router = useRouter();

  const handleLeaveReview = () => {
    // Close the modal first
    onClose();
    // Scroll to the review section (assuming it has an id="review-section")
    // const reviewSection = document.getElementById('review-section');
    // if (reviewSection) {
    //   reviewSection.scrollIntoView({ behavior: 'smooth' });
    // }
  };

  const handleRemindLater = () => {
    onClose();
    // Remove the URL parameter to avoid showing the modal again
    const url = new URL(window.location.href);
    url.searchParams.delete('showReviewPrompt');
    router.replace(url.pathname + url.search);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Share Your Experience
          </DialogTitle>
          <DialogDescription>
            Your appointment with {professionalName} for {serviceName} has been
            completed. How was your experience?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <Star className="h-8 w-8 text-yellow-500" />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg">
                Help other clients make informed decisions
              </h3>
              <p className="text-muted-foreground text-sm">
                Your honest review helps our community and supports quality
                professionals.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                <MessageCircle className="h-4 w-4" />
                What you can include:
              </div>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Quality of service provided</li>
                <li>• Professionalism and communication</li>
                <li>• Overall satisfaction</li>
                <li>• Tips for future clients</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                <Star className="h-4 w-4" />
                Show Your Appreciation
              </div>
              <p className="text-sm text-amber-700">
                Don't forget to leave a tip in the Payment Information section
                if you were happy with the service. Tips help support quality
                professionals in our community.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button onClick={handleLeaveReview} className="w-full sm:w-auto">
            Leave a Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
