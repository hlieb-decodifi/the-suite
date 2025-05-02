'use client';

import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { usePortfolioUploads } from '../../hooks';
import { PortfolioUploaderProps } from './types';

export function PortfolioUploader({
  userId,
  maxPhotos,
  currentPhotosCount,
}: PortfolioUploaderProps) {
  const { fileInputRef, isUploading, handleFileChange, triggerFileSelect } =
    usePortfolioUploads(userId);

  const isMaxPhotosReached = currentPhotosCount >= maxPhotos;

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading || isMaxPhotosReached}
      />

      <Button
        onClick={triggerFileSelect}
        className="flex items-center gap-1"
        disabled={isUploading || isMaxPhotosReached}
      >
        {isUploading ? (
          <span className="size-4 border-2 border-t-transparent border-white/80 rounded-full animate-spin mr-1"></span>
        ) : (
          <UploadCloud className="h-4 w-4" />
        )}
        Upload Photos
      </Button>
    </div>
  );
}
