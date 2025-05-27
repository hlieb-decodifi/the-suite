'use client';

import { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UploadCloud, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { PortfolioPhotoUI } from '@/types/portfolio-photos';
import { cn } from '@/utils/cn';
import { useToast } from '@/components/ui/use-toast';
import { compressImage } from '@/utils/imageCompression';
import {
  uploadPortfolioPhotoAction,
  deletePortfolioPhotoAction,
} from './ProfilePortfolioPage';

export type ProfilePortfolioPageClientProps = {
  user: User;
  initialPhotos: PortfolioPhotoUI[];
  isEditable?: boolean;
};

// PortfolioEmptyState component
function PortfolioEmptyState({ isEditable = true }: { isEditable?: boolean }) {
  return (
    <Card className={cn('border bg-background/50')}>
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-muted p-3 mb-3">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <Typography variant="h4" className="text-muted-foreground mb-2">
          No Portfolio Photos
        </Typography>
        <Typography className="text-muted-foreground mb-4">
          {isEditable
            ? 'Upload photos to showcase your work and attract more clients.'
            : "This professional hasn't added any portfolio photos yet."}
        </Typography>
      </CardContent>
    </Card>
  );
}

// PortfolioItem component
function PortfolioItem({
  photo,
  isEditable = true,
  onRemove,
}: {
  photo: PortfolioPhotoUI;
  isEditable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="relative group aspect-square bg-muted rounded-md overflow-hidden">
      <Image
        src={photo.url}
        alt={photo.description || 'Portfolio image'}
        fill
        sizes="(max-width: 768px) 100vw, 400px"
        className="object-cover"
      />
      {isEditable && onRemove && (
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
      )}
    </div>
  );
}

// PortfolioGrid component
function PortfolioGrid({
  photos,
  isEditable = true,
  onRemovePhoto,
}: {
  photos: PortfolioPhotoUI[];
  isEditable?: boolean;
  onRemovePhoto?: ((photoId: string) => void) | undefined;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <PortfolioItem
          key={photo.id}
          photo={photo}
          isEditable={isEditable}
          onRemove={() => onRemovePhoto?.(photo.id)}
        />
      ))}
    </div>
  );
}

// PortfolioUploader component
function PortfolioUploader({
  userId,
  maxPhotos,
  currentPhotosCount,
  onUploadSuccess,
}: {
  userId: string;
  maxPhotos: number;
  currentPhotosCount: number;
  onUploadSuccess: (photo: PortfolioPhotoUI) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const isMaxPhotosReached = currentPhotosCount >= maxPhotos;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0] as File;
    setIsUploading(true);

    try {
      // Compress the image with 2MB limit
      const compressedFile = await compressImage(file, { maxSizeMB: 2 });

      // Create form data
      const formData = new FormData();
      formData.append('file', compressedFile);

      // Upload the photo
      const result = await uploadPortfolioPhotoAction({
        userId,
        formData,
      });

      if (result.success && result.photo) {
        onUploadSuccess(result.photo);
        toast({
          title: 'Success',
          description: 'Portfolio photo uploaded successfully!',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: result.error || 'Failed to upload portfolio photo',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Failed to process or upload the image.',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

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

export function ProfilePortfolioPageClient({
  user,
  initialPhotos,
  isEditable = true,
}: ProfilePortfolioPageClientProps) {
  // State
  const [photos, setPhotos] = useState<PortfolioPhotoUI[]>(initialPhotos);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);

  // Hooks
  const { toast } = useToast();

  // Constants
  const MAX_PHOTOS = 10;

  // Handlers
  const handleUploadSuccess = (newPhoto: PortfolioPhotoUI) => {
    setPhotos((prev) => [...prev, newPhoto]);
  };

  const handleRemovePhoto = (photoId: string) => {
    if (isDeletingPhoto) return; // Prevent multiple deletions

    setIsDeletingPhoto(photoId);

    deletePortfolioPhotoAction({
      id: photoId,
      userId: user.id,
    })
      .then((result) => {
        if (result.success) {
          setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
          toast({
            title: 'Success',
            description: 'Portfolio photo deleted successfully!',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: result.error || 'Failed to delete portfolio photo',
          });
        }
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: 'An unexpected error occurred while deleting the photo',
        });
      })
      .finally(() => {
        setIsDeletingPhoto(null);
      });
  };

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
            maxPhotos={MAX_PHOTOS}
            currentPhotosCount={photos.length}
            onUploadSuccess={handleUploadSuccess}
          />
        )}
      </div>

      {photos.length === 0 ? (
        <PortfolioEmptyState isEditable={isEditable} />
      ) : (
        <PortfolioGrid
          photos={photos}
          isEditable={isEditable}
          onRemovePhoto={isDeletingPhoto ? undefined : handleRemovePhoto}
        />
      )}
    </div>
  );
}
