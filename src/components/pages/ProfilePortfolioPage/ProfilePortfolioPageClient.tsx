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
        className="object-contain"
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, { progress: number; status: 'uploading' | 'success' | 'error' }>>({});
  const { toast } = useToast();

  const isMaxPhotosReached = currentPhotosCount >= maxPhotos;
  const isUploading = Object.keys(uploadProgress).length > 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxPhotos - currentPhotosCount;
    
    if (fileArray.length > remainingSlots) {
      toast({
        variant: 'destructive',
        title: 'Too Many Files',
        description: `You can only upload ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'}.`,
      });
      // Only process the allowed number of files
      fileArray.splice(remainingSlots);
    }

    // Initialize progress tracking for all files
    const initialProgress: Record<string, { progress: number; status: 'uploading' | 'success' | 'error' }> = {};
    fileArray.forEach((file, index) => {
      initialProgress[`${file.name}_${index}`] = { progress: 0, status: 'uploading' };
    });
    setUploadProgress(initialProgress);

    // Process uploads in parallel
    const uploadPromises = fileArray.map(async (file, index) => {
      const fileKey = `${file.name}_${index}`;
      
      try {
        // Update progress to show compression phase
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { progress: 25, status: 'uploading' }
        }));

        // Compress the image with 2MB limit
        const compressedFile = await compressImage(file, { maxSizeMB: 2 });

        // Update progress to show upload phase
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { progress: 50, status: 'uploading' }
        }));

        // Create form data
        const formData = new FormData();
        formData.append('file', compressedFile);

        // Upload the photo
        const result = await uploadPortfolioPhotoAction({
          userId,
          formData,
        });

        if (result.success && result.photo) {
          // Update progress to success
          setUploadProgress(prev => ({
            ...prev,
            [fileKey]: { progress: 100, status: 'success' }
          }));
          
          onUploadSuccess(result.photo);
          return { success: true, photo: result.photo, fileName: file.name };
        } else {
          // Update progress to error
          setUploadProgress(prev => ({
            ...prev,
            [fileKey]: { progress: 0, status: 'error' }
          }));
          
          return { success: false, error: result.error, fileName: file.name };
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: 'An unexpected error occurred during upload.',
        });
        setUploadProgress({});
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });

    // Wait for all uploads to complete
    try {
      const results = await Promise.all(uploadPromises);
      
      // Count successes and failures
      const successes = results.filter(r => r && r.success);
      const failures = results.filter(r => r && !r.success);

      // Show summary toast
      if (successes.length > 0 && failures.length === 0) {
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded ${successes.length} photo${successes.length === 1 ? '' : 's'}!`,
        });
      } else if (successes.length > 0 && failures.length > 0) {
        toast({
          title: 'Partial Success',
          description: `Uploaded ${successes.length} photo${successes.length === 1 ? '' : 's'}, ${failures.length} failed.`,
        });
      } else if (failures.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: `Failed to upload ${failures.length} photo${failures.length === 1 ? '' : 's'}.`,
        });
      }

      // Clear progress after a short delay to show completion
      setTimeout(() => {
        setUploadProgress({});
      }, 1500);

    } catch {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'An unexpected error occurred during upload.',
      });
      setUploadProgress({});
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const activeUploads = Object.values(uploadProgress).filter(p => p.status === 'uploading').length;
  const completedUploads = Object.values(uploadProgress).filter(p => p.status === 'success').length;
  const failedUploads = Object.values(uploadProgress).filter(p => p.status === 'error').length;

  return (
    <div className="flex flex-col items-end space-y-3">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
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
        {isUploading ? 'Uploading...' : 'Upload Photos'}
      </Button>

      {/* Upload Progress Display */}
      {isUploading && (
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <span>Uploading {activeUploads} photo{activeUploads === 1 ? '' : 's'}...</span>
            {completedUploads > 0 && (
              <span className="text-green-600">
                {completedUploads} completed
              </span>
            )}
            {failedUploads > 0 && (
              <span className="text-red-600">
                {failedUploads} failed
              </span>
            )}
          </div>
        </div>
      )}
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
