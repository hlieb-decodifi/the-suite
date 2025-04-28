import { Button } from '@/components/ui/button';
import { Loader2, CheckIcon } from 'lucide-react';

export type FormButtonsProps = {
  isPending: boolean;
  saveSuccess: boolean;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  loadingText?: string;
  successText?: string;
};

export function FormButtons({
  isPending,
  saveSuccess,
  onCancel,
  submitText = 'Save Changes',
  cancelText = 'Cancel',
  loadingText = 'Saving',
  successText = 'Saved',
}: FormButtonsProps) {
  return (
    <div className="flex items-center justify-end space-x-3">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isPending}
        className="border-[#ECECEC] text-[#5D6C6F]"
      >
        {cancelText}
      </Button>
      <Button
        type="submit"
        disabled={isPending}
        className="bg-[#DEA85B] hover:bg-[#C89245] text-white"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText}
          </>
        ) : saveSuccess ? (
          <>
            <CheckIcon className="mr-2 h-4 w-4" />
            {successText}
          </>
        ) : (
          submitText
        )}
      </Button>
    </div>
  );
}
