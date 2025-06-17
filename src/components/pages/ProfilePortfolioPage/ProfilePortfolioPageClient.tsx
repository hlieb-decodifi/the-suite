'use client';

import { useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UploadCloud, Trash2, ImageIcon } from 'lucide-react';
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
  isSelected = false,
  onSelectionChange,
  onDelete,
}: {
  photo: PortfolioPhotoUI;
  isEditable?: boolean;
  isSelected?: boolean;
  onSelectionChange?: ((photoId: string, selected: boolean) => void) | undefined;
  onDelete?: ((photoId: string) => void) | undefined;
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
      {isEditable && (onSelectionChange || onDelete) && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {onSelectionChange && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => 
                onSelectionChange(photo.id, checked as boolean)
              }
              aria-label={`Select ${photo.description || 'portfolio image'}`}
              className="bg-white size-5 rounded-md"
            />
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="size-6 p-0"
              onClick={() => onDelete(photo.id)}
              aria-label={`Delete ${photo.description || 'portfolio image'}`}
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>
      )}
      {/* Optional: Add a semi-transparent overlay when selected */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/20 transition-all duration-200" />
      )}
    </div>
  );
}

// PortfolioGrid component
function PortfolioGrid({
  photos,
  isEditable = true,
  selectedPhotos,
  onSelectionChange,
  onDeleteSingle,
}: {
  photos: PortfolioPhotoUI[];
  isEditable?: boolean;
  selectedPhotos?: Set<string>;
  onSelectionChange?: ((photoId: string, selected: boolean) => void) | undefined;
  onDeleteSingle?: ((photoId: string) => void) | undefined;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <PortfolioItem
          key={photo.id}
          photo={photo}
          isEditable={isEditable}
          isSelected={selectedPhotos?.has(photo.id) || false}
          onSelectionChange={onSelectionChange}
          onDelete={onDeleteSingle}
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
  const [isDeletingPhotos, setIsDeletingPhotos] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  // Hooks
  const { toast } = useToast();

  // Constants
  const MAX_PHOTOS = 10;

  // Handlers
  const handleUploadSuccess = (newPhoto: PortfolioPhotoUI) => {
    setPhotos((prev) => [...prev, newPhoto]);
  };

  const handleSelectionChange = (photoId: string, selected: boolean) => {
    if (selected) {
      setSelectedPhotos(prev => new Set(prev).add(photoId));
    } else {
      setSelectedPhotos(prev => {
        const newSelectedPhotos = new Set(prev);
        newSelectedPhotos.delete(photoId);
        return newSelectedPhotos;
      });
    }
  };

  const handleDeleteSingle = (photoId: string) => {
    setPhotoToDelete(photoId);
    setShowDeleteDialog(true);
  };

  const handleDeleteSelected = () => {
    if (selectedPhotos.size === 0) return;
    setPhotoToDelete(null);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (isDeletingPhotos) return;

    const photosToDelete = photoToDelete ? [photoToDelete] : Array.from(selectedPhotos);
    if (photosToDelete.length === 0) return;

    setIsDeletingPhotos(true);
    setShowDeleteDialog(false);

    try {
      // Delete photos in parallel
      const deletePromises = photosToDelete.map(photoId =>
        deletePortfolioPhotoAction({
          id: photoId,
          userId: user.id,
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(result => result.success).length;
      const failureCount = results.filter(result => !result.success).length;

      if (successCount > 0) {
        // Remove successfully deleted photos from state
        setPhotos(prev => prev.filter(photo => !photosToDelete.includes(photo.id)));
        setSelectedPhotos(new Set());

        toast({
          title: 'Success',
          description: `${successCount} photo${successCount === 1 ? '' : 's'} deleted successfully!`,
        });
      }

      if (failureCount > 0) {
        toast({
          variant: 'destructive',
          title: 'Partial Deletion',
          description: `${failureCount} photo${failureCount === 1 ? '' : 's'} failed to delete.`,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'An unexpected error occurred while deleting photos',
      });
    } finally {
      setIsDeletingPhotos(false);
      setPhotoToDelete(null);
    }
  };

  const selectedCount = selectedPhotos.size;
  const deleteCount = photoToDelete ? 1 : selectedCount;

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
          <div className="flex justify-end items-end gap-3">
            {selectedCount > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={isDeletingPhotos}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Photo{selectedCount === 1 ? '' : 's'} ({selectedCount})
              </Button>
            )}
            <PortfolioUploader
              userId={user.id}
              maxPhotos={MAX_PHOTOS}
              currentPhotosCount={photos.length}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <PortfolioEmptyState isEditable={isEditable} />
      ) : (
        <PortfolioGrid
          photos={photos}
          isEditable={isEditable}
          selectedPhotos={selectedPhotos}
          onSelectionChange={isEditable ? handleSelectionChange : undefined}
          onDeleteSingle={isEditable ? handleDeleteSingle : undefined}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portfolio Photo{deleteCount === 1 ? '' : 's'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteCount} photo{deleteCount === 1 ? '' : 's'}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingPhotos}
            >
              {isDeletingPhotos ? 'Deleting...' : `Delete Photo${deleteCount === 1 ? '' : 's'}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
