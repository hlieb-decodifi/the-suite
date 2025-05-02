'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Image from 'next/image';
import { PortfolioItemProps } from './types';

export function PortfolioItem({ photo, onRemove }: PortfolioItemProps) {
  return (
    <div className="relative group aspect-square bg-muted rounded-md overflow-hidden">
      <Image
        src={photo.url}
        alt={photo.description || 'Portfolio image'}
        fill
        sizes="(max-width: 768px) 100vw, 400px"
        className="object-cover"
      />
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
