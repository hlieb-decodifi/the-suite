import { useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useUploadPortfolioPhoto } from '@/api/portfolio-photos/hooks';
import { compressImage } from '@/utils/imageCompression';

export function usePortfolioUploads(userId: string) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPortfolioPhoto();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0] as File;
    
    try {
      // Compress the image with 2MB limit
      const compressedFile = await compressImage(file, { maxSizeMB: 2 });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', compressedFile);
      
      // Upload the photo
      await uploadPhoto.mutateAsync(
        { userId, formData },
        {
          onSettled: () => {
            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          },
        },
      );
    } catch (error) {
      console.error('Error compressing or uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Failed to process or upload the image.',
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return {
    fileInputRef,
    isUploading: uploadPhoto.isPending,
    handleFileChange,
    triggerFileSelect: () => fileInputRef.current?.click(),
  };
} 