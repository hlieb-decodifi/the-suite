'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

type PreviewActionsProps = {
  compiledTemplate: string;
};

export function PreviewActions({ compiledTemplate }: PreviewActionsProps) {
  const handleOpenInNewTab = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(compiledTemplate);
      newWindow.document.close();
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
      <ExternalLink className="h-4 w-4 mr-2" />
      Open in New Tab
    </Button>
  );
}
