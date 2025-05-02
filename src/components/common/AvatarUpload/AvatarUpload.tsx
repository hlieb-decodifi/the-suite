/* eslint-disable max-lines-per-function */
'use client';

import { ChangeEvent } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  type AvatarProps,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAvatarUrlQuery, useUpdateProfilePhoto } from '@/api/photos/hooks';
import { compressImage, MAX_FILE_SIZE_BYTES } from '@/utils/imageCompression';

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
  buttonClassName, // We'll ignore this prop now and use our own consistent positioning
  onUploadSuccess,
  ...avatarProps // Pass remaining AvatarProps (like size) down
}: AvatarUploadProps) {
  // Use React Query hooks for data fetching and mutation
  const { data: avatarUrl, isLoading: isLoadingAvatar } =
    useAvatarUrlQuery(userId);

  const updatePhotoMutation = useUpdateProfilePhoto();
  const isUploading = updatePhotoMutation.isPending;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // --- Client-side validation ---
    if (file.size > MAX_FILE_SIZE_BYTES) {
      updatePhotoMutation.reset();
      e.target.value = '';
      return;
    }

    try {
      // --- Compress Image ---
      file = await compressImage(file);

      // --- Upload Logic ---
      const formData = new FormData();
      formData.append('file', file);

      await updatePhotoMutation.mutateAsync(
        { userId, formData },
        {
          onSuccess: () => {
            onUploadSuccess?.(); // Call optional callback
          },
        },
      );
    } catch (error: unknown) {
      console.error('Error during upload/compression:', error);
    } finally {
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

  // Define button position based on avatar size
  const buttonPositions: Record<string, string> = {
    sm: 'bottom-[-4px] right-[-4px]',
    default: 'bottom-[-4px] right-[-4px]',
    lg: 'bottom-0 right-0',
    xl: 'bottom-0 right-0',
  };
  const buttonPosition = buttonPositions[size || 'default'];

  return (
    <div className={cn('relative', className)}>
      {isLoadingAvatar ? (
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
          {avatarUrl ? (
            <AvatarImage
              className="object-cover"
              src={avatarUrl}
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

      <div className={cn('absolute', buttonPosition, buttonClassName)}>
        <Button
          size="icon"
          variant="secondary"
          className="cursor-pointer h-8 w-8 rounded-full"
          disabled={isUploading || isLoadingAvatar}
          asChild
        >
          <label>
            <Camera className="h-4 w-4" />
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isUploading || isLoadingAvatar}
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
