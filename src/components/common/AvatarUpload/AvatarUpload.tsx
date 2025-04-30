/* eslint-disable max-lines-per-function */
'use client';

import { ChangeEvent, useState, useEffect } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  type AvatarProps,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { updateProfilePhotoAction } from '@/api/photos/actions';
import { cn } from '@/utils/cn';
import imageCompression from 'browser-image-compression';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { useAuthStore } from '@/stores/authStore';

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Compression options (adjust as needed)
const compressionOptions = {
  maxSizeMB: 1, // Compress images over 1MB
  maxWidthOrHeight: 1024, // Resize images larger than 1024px
  useWebWorker: true,
  initialQuality: 0.8, // Start with 80% quality
};

// Extend props to include Avatar size, omit className which we handle internally
export type AvatarUploadProps = Omit<AvatarProps, 'className' | 'children'> & {
  userId: string;
  fallbackName: string;
  // avatarClassName is replaced by size prop + className for extra styles
  className?: string; // For the root div
  avatarContainerClassName?: string; // For extra styling on the Avatar container
  buttonClassName?: string;
  onUploadSuccess?: () => void;
};

export function AvatarUpload({
  userId,
  fallbackName,
  size = 'lg', // Default size to large ('h-24 w-24')
  className, // Root div className
  avatarContainerClassName, // Extra Avatar container styles
  buttonClassName = 'absolute bottom-0 right-0',
  onUploadSuccess,
  ...avatarProps // Pass remaining AvatarProps (like size) down
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTrigger, setUploadTrigger] = useState(0);
  const { toast } = useToast();

  const { avatarUrl: hookAvatarUrl, isLoading } = useAvatarUrl(
    userId,
    uploadTrigger,
  );
  const setStoreAvatarUrl = useAuthStore((state) => state.setAvatarUrl);

  useEffect(() => {
    if (!isLoading && hookAvatarUrl) {
      setStoreAvatarUrl(hookAvatarUrl);
    }
  }, [hookAvatarUrl, isLoading, setStoreAvatarUrl]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // --- Client-side validation ---
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
      });
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      // --- Compress Image ---
      console.log(`Original file size: ${file.size / 1024 / 1024} MB`);
      const compressedFile = await imageCompression(file, compressionOptions);
      console.log(
        `Compressed file size: ${compressedFile.size / 1024 / 1024} MB`,
      );
      file = compressedFile; // Use the compressed file for upload

      // --- Upload Logic ---
      const formData = new FormData();
      formData.append('file', file);
      const result = await updateProfilePhotoAction(userId, formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Profile photo updated successfully!',
        });
        setUploadTrigger((prev) => prev + 1); // Trigger refetch via hook dependency
        onUploadSuccess?.(); // Call optional callback
      } else {
        console.error('Upload failed:', result.error);
        toast({
          variant: 'destructive',
          title: 'Upload Error',
          description: result.error || 'Failed to update profile photo.',
        });
      }
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        // Specific handling for browser-image-compression errors if needed
        if (error.message.includes('Cannot read properties of undefined')) {
          errorMessage =
            'Image processing failed. Please try a different image.';
          console.error('Compression/Read Error:', error);
        } else {
          errorMessage = error.message;
        }
      }
      console.error('Error during upload/compression:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const fallbackInitials = fallbackName
    .split(' ')
    .map((n) => n?.[0]?.toUpperCase() || '')
    .slice(0, 2) // Max 2 initials
    .join('');

  // Map size prop to skeleton classes (could be more sophisticated)
  const skeletonSizeClasses: Record<string, string> = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
  };
  const skeletonClass =
    skeletonSizeClasses[size || 'default'] || skeletonSizeClasses.default;

  return (
    <div className={cn('relative', className)}>
      {isLoading ? (
        <Skeleton className={cn('rounded-full', skeletonClass)} />
      ) : (
        <Avatar
          size={size}
          className={cn(
            'bg-white border-4 border-white shadow-md',
            avatarContainerClassName,
          )}
          {...avatarProps}
        >
          {hookAvatarUrl ? (
            <AvatarImage
              className="object-cover"
              src={hookAvatarUrl}
              alt={fallbackName}
            />
          ) : (
            <AvatarFallback
              className={cn(
                'bg-primary text-primary-foreground font-semibold',
                size === 'sm' && 'text-xs',
                size === 'default' && 'text-sm',
                size === 'lg' && 'text-xl',
                size === 'xl' && 'text-2xl',
              )}
            >
              {fallbackInitials}
            </AvatarFallback>
          )}
        </Avatar>
      )}

      <div className={buttonClassName}>
        <Button
          size="icon"
          variant="secondary"
          className="cursor-pointer h-8 w-8 rounded-full"
          disabled={isUploading || isLoading}
          asChild
        >
          <label>
            <Camera className="h-4 w-4" />
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isUploading || isLoading}
            />
          </label>
        </Button>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
            <div className="size-7 animate-spin rounded-full border-2 border-solid border-white/80 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
}
