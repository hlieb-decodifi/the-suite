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
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import React from 'react';

export type ConfirmDeleteModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  itemName?: string; // Optional name of the item being deleted for clarity
  title?: string;
  description?: string;
  isDeleting?: boolean;
};

export function ConfirmDeleteModal({
  isOpen,
  onOpenChange,
  onConfirm,
  // itemName = "item",
  title = 'Are you absolutely sure?',
  description = 'This action cannot be undone. This will permanently delete the selected item.',
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  // Prevent modal closing on confirm click if onConfirm throws error or while deleting
  const handleConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDeleting) return;
    try {
      onConfirm();
    } catch (error) {
      console.error('Confirmation action failed:', error);
      event.preventDefault(); // Prevent closing if action fails
    }
  };

  // Handle open change logic
  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      onOpenChange(open);
    }
  };

  return (
    // Prevent closing via escape key when deleting
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        onEscapeKeyDown={(e: KeyboardEvent) => {
          if (isDeleting) e.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild disabled={isDeleting}>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction
            asChild
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            <Button variant="destructive">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
