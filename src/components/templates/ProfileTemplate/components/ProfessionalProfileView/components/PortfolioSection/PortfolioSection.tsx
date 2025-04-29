'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { UploadCloud, X } from 'lucide-react';

export type PortfolioSectionProps = {
  user: User;
};

// Helper component to show individual portfolio item
function PortfolioItem({ onRemove }: { onRemove: () => void }) {
  return (
    <div className="relative group aspect-square bg-muted rounded-md overflow-hidden">
      {/* This would be an actual image in production */}
      <div className="absolute inset-0 flex items-center justify-center bg-muted">
        <Typography className="text-muted-foreground">Image</Typography>
      </div>
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PortfolioSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
}: PortfolioSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Mock data - would come from API in a real app
  const portfolioImages = Array(12)
    .fill('')
    .map((_, i) => ({
      id: `image-${i + 1}`,
      url: `/placeholder-image-${i + 1}.jpg`,
    }));

  const displayImages = showAll ? portfolioImages : portfolioImages.slice(0, 6);

  const handleRemoveImage = (id: string) => {
    // Would handle removing image in a real app
    console.log('Remove image', id);
  };

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
        <Button
          onClick={() => setIsUploading(true)}
          className="flex items-center gap-1"
        >
          <UploadCloud className="h-4 w-4" />
          Upload Photos
        </Button>
      </div>

      {portfolioImages.length === 0 ? (
        <div className="bg-muted rounded-md p-8 text-center">
          <Typography className="text-muted-foreground">
            No portfolio images yet. Upload your first photo to showcase your
            work.
          </Typography>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayImages.map((image) => (
              <PortfolioItem
                key={image.id}
                onRemove={() => handleRemoveImage(image.id)}
              />
            ))}
          </div>

          {portfolioImages.length > 6 && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show Less' : `Show All (${portfolioImages.length})`}
              </Button>
            </div>
          )}
        </>
      )}

      {isUploading && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-background border border-border p-6 rounded-lg shadow-lg max-w-md w-full">
            <Typography variant="h3" className="font-bold text-foreground mb-4">
              Upload Portfolio Images
            </Typography>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-md p-8 text-center mb-4">
              <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <Typography className="text-muted-foreground mb-2">
                Drag and drop your images here, or click to browse
              </Typography>
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsUploading(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsUploading(false)}>Upload</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
