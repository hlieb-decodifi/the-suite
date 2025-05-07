/* eslint-disable max-lines-per-function */
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Image as ImageIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePortfolioPhotos } from '@/api/portfolio-photos/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export type ProfileOverviewSectionProps = {
  user: User;
  onEditPortfolio: () => void;
  isEditable?: boolean;
};

export function ProfileOverviewSection({
  user,
  onEditPortfolio,
  isEditable = true,
}: ProfileOverviewSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch portfolio photos from the API
  const {
    data: portfolioPhotos = [],
    isLoading,
    error,
  } = usePortfolioPhotos(user.id);

  // Reset currentSlide when portfolioPhotos changes
  useEffect(() => {
    if (portfolioPhotos.length > 0 && currentSlide >= portfolioPhotos.length) {
      setCurrentSlide(0);
    }
  }, [portfolioPhotos, currentSlide]);

  const nextSlide = () => {
    if (portfolioPhotos.length === 0) return;
    setCurrentSlide((prev) =>
      prev === portfolioPhotos.length - 1 ? 0 : prev + 1,
    );
  };

  const prevSlide = () => {
    if (portfolioPhotos.length === 0) return;
    setCurrentSlide((prev) =>
      prev === 0 ? portfolioPhotos.length - 1 : prev - 1,
    );
  };

  // Get the current photo safely
  const currentPhoto = portfolioPhotos[currentSlide];

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Portfolio
        </Typography>
        {isEditable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditPortfolio}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-6">
          {/* Loading state */}
          {isLoading && <Skeleton className="aspect-video w-full rounded-md" />}

          {/* Error state */}
          {error && !isLoading && (
            <div className="aspect-video bg-red-50 border border-red-200 rounded-md flex items-center justify-center p-4">
              <Typography className="text-red-600 text-center">
                Error loading portfolio images
              </Typography>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && portfolioPhotos.length === 0 && (
            <div className="aspect-video bg-muted rounded-md flex flex-col items-center justify-center p-4">
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
              <Typography className="text-muted-foreground text-center">
                No portfolio images yet
              </Typography>
              {isEditable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={onEditPortfolio}
                >
                  Add Photos
                </Button>
              )}
            </div>
          )}

          {/* Portfolio Carousel */}
          {!isLoading &&
            !error &&
            portfolioPhotos.length > 0 &&
            currentPhoto && (
              <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                <Image
                  src={currentPhoto.url}
                  alt={currentPhoto.description || 'Portfolio image'}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-cover"
                  priority
                />

                {/* Navigation buttons (only if there's more than one photo) */}
                {portfolioPhotos.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={prevSlide}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={nextSlide}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>

                    {/* Dots indicator */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {portfolioPhotos.map((_, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="icon"
                          className={`size-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            index === currentSlide
                              ? 'bg-primary'
                              : 'bg-background/80'
                          }`}
                          onClick={() => setCurrentSlide(index)}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
