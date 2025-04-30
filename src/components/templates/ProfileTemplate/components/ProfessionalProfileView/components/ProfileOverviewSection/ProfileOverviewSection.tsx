/* eslint-disable max-lines-per-function */
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useState } from 'react';

export type ProfileOverviewSectionProps = {
  user: User;
  onEditPortfolio: () => void;
};

export function ProfileOverviewSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user,
  onEditPortfolio,
}: ProfileOverviewSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Mock data - would come from API in a real app
  const portfolioImages = [
    '/placeholder-image-1.jpg',
    '/placeholder-image-2.jpg',
    '/placeholder-image-3.jpg',
    '/placeholder-image-4.jpg',
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) =>
      prev === portfolioImages.length - 1 ? 0 : prev + 1,
    );
  };

  const prevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? portfolioImages.length - 1 : prev - 1,
    );
  };

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Typography variant="h3" className="font-bold text-foreground">
          Portfolio
        </Typography>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEditPortfolio}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-6">
          {/* Portfolio Carousel */}
          <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
            {/* This would be actual images in a real app */}
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Typography variant="h4" className="text-muted-foreground">
                Portfolio Image {currentSlide + 1}
              </Typography>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
              onClick={nextSlide}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {portfolioImages.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === currentSlide ? 'bg-primary' : 'bg-background/80'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
