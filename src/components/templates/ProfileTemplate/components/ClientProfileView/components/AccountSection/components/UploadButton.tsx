'use client';

import { ChangeEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

export type UploadButtonProps = {
  userId: string;
  onSuccess: (url: string) => void;
  className?: string;
};

export function UploadButton({
  userId,
  onSuccess,
  className,
}: UploadButtonProps) {
  // TODO: Remove this once we have a real implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // For a real implementation, upload to Supabase storage here
      // This is a placeholder for demonstration
      console.log('Would upload file for user:', userId);

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create a temporary object URL for demonstration
      const imageUrl = URL.createObjectURL(file);
      onSuccess(imageUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        size="icon"
        variant="secondary"
        className="h-8 w-8 rounded-full"
        // TODO: Remove this once we have a real implementation
        disabled
        // disabled={isUploading}
        asChild
      >
        <label>
          <Camera className="h-4 w-4" />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            // TODO: Remove this once we have a real implementation
            disabled
            // disabled={isUploading}
          />
        </label>
      </Button>
    </div>
  );
}
