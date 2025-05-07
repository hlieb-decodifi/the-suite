'use client';

import { usePortfolioPhotos } from '@/api/portfolio-photos/hooks';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import { PortfolioEmptyState } from './components/PortfolioEmptyState';
import { PortfolioGrid } from './components/PortfolioGrid';
import { PortfolioLoadingState } from './components/PortfolioLoadingState';
import { PortfolioUploader } from './components/PortfolioUploader';

export type PortfolioSectionProps = {
  user: User;
  isEditable?: boolean;
};

export function PortfolioSection({
  user,
  isEditable = true,
}: PortfolioSectionProps) {
  // Fetch portfolio images using React Query
  const {
    data: portfolioImages = [],
    isLoading,
    error,
  } = usePortfolioPhotos(user.id);

  // Handle loading state
  if (isLoading) {
    return <PortfolioLoadingState />;
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Typography variant="h2" className="font-bold text-foreground">
              Portfolio
            </Typography>
            <Typography className="text-muted-foreground">
              Showcase your work with photos
            </Typography>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
          <Typography>
            Error loading portfolio images. Please try again later.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Typography variant="h2" className="font-bold text-foreground">
            Portfolio
          </Typography>
          <Typography className="text-muted-foreground">
            {isEditable
              ? 'Showcase your work with photos'
              : "This professional's portfolio of work"}
          </Typography>
        </div>

        {isEditable && (
          <PortfolioUploader
            userId={user.id}
            maxPhotos={10}
            currentPhotosCount={portfolioImages.length}
          />
        )}
      </div>

      {portfolioImages.length === 0 ? (
        <PortfolioEmptyState isEditable={isEditable} />
      ) : (
        <PortfolioGrid
          photos={portfolioImages}
          userId={user.id}
          isEditable={isEditable}
        />
      )}
    </div>
  );
}
