'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDeletePortfolioPhoto } from '@/api/portfolio-photos/hooks';
import { PortfolioItem } from '../PortfolioItem';
import { PortfolioGridProps } from './types';

export function PortfolioGrid({ photos, userId }: PortfolioGridProps) {
  const [showAll, setShowAll] = useState(false);
  const deletePhoto = useDeletePortfolioPhoto();

  // Display a limited number by default (4 items)
  const displayImages = showAll ? photos : photos.slice(0, 4);

  const handleRemoveImage = (id: string) => {
    deletePhoto.mutate({ id, userId });
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {displayImages.map((image) => (
          <PortfolioItem
            key={image.id}
            photo={image}
            onRemove={() => handleRemoveImage(image.id)}
          />
        ))}
      </div>

      {photos.length > 4 && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show Less' : `Show All (${photos.length})`}
          </Button>
        </div>
      )}
    </>
  );
}
