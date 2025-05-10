'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDeletePortfolioPhoto } from '@/api/portfolio-photos/hooks';
import { PortfolioItem } from '../PortfolioItem';
import { PortfolioGridProps } from './types';
import { PortfolioItemProps } from '../PortfolioItem/types';

export function PortfolioGrid({
  photos,
  userId,
  isEditable = true,
}: PortfolioGridProps) {
  const [showAll, setShowAll] = useState(false);
  const deletePhoto = useDeletePortfolioPhoto();

  // Display a limited number by default (4 items)
  const displayImages = showAll ? photos : photos.slice(0, 4);

  const handleRemoveImage = (id: string) => {
    deletePhoto.mutate({ id, userId });
  };

  // Create a no-op function for when we're in view mode
  const noop = () => {
    /* do nothing */
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {displayImages.map((image) => {
          // Create props with type casting to satisfy TypeScript
          const itemProps: PortfolioItemProps = {
            photo: image,
            userId,
            isEditable,
            // Use noop function instead of undefined to satisfy the type checker
            onRemove: isEditable ? () => handleRemoveImage(image.id) : noop,
          };

          return <PortfolioItem key={image.id} {...itemProps} />;
        })}
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
