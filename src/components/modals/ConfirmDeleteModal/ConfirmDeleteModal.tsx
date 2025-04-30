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

export type ConfirmDeleteModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  itemName?: string; // Optional name of the item being deleted for clarity
  title?: string;
  description?: string;
};

export function ConfirmDeleteModal({
  isOpen,
  onOpenChange,
  onConfirm,
  // itemName can be kept for other potential uses or removed if only description is used
  // itemName = "item",
  title = 'Are you absolutely sure?',
  // Default description assumes no specific item name is interpolated here
  description = 'This action cannot be undone. This will permanently delete the selected item.',
}: ConfirmDeleteModalProps) {
  // Prevent modal closing on confirm click if onConfirm throws error
  const handleConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      onConfirm();
      // onOpenChange(false); // Let onConfirm handle closing if needed, or close here
    } catch (error) {
      console.error('Confirmation action failed:', error);
      // Prevent modal from closing if confirm action fails
      event.preventDefault();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Optional: <AlertDialogTrigger asChild><Button>Open</Button></AlertDialogTrigger> */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild onClick={handleConfirm}>
            <Button variant="destructive">Confirm Delete</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
