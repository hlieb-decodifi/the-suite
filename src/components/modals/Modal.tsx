'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ModalBaseProps = {
  children: React.ReactNode;
  title?: string;
  contentClassName?: string;
  hideCloseButton?: boolean;
};

type ControlledModalProps = ModalBaseProps & {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: never;
};

type UncontrolledModalProps = ModalBaseProps & {
  isOpen?: never;
  onOpenChange?: never;
  trigger: React.ReactNode;
};

export type ModalProps = ControlledModalProps | UncontrolledModalProps;

export function Modal({
  children,
  title,
  contentClassName,
  hideCloseButton = false,
  isOpen,
  onOpenChange,
  trigger,
}: ModalProps) {
  const isControlled = isOpen !== undefined && onOpenChange !== undefined;

  const content = (
    <DialogContent
      className={cn(
        'sm:max-w-[90vw] max-h-[90vh] overflow-auto',
        contentClassName,
      )}
    >
      {!hideCloseButton && (
        <DialogClose asChild className="absolute right-4 top-4 z-10">
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 rounded-full"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      )}

      {title && (
        <DialogHeader>
          <DialogTitle className="text-4xl md:text-5xl font-futura font-bold mb-6 text-center">
            {title}
          </DialogTitle>
        </DialogHeader>
      )}

      {children}
    </DialogContent>
  );

  // For controlled mode
  if (isControlled) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
        {content}
      </Dialog>
    );
  }

  // For uncontrolled mode
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {content}
    </Dialog>
  );
}
