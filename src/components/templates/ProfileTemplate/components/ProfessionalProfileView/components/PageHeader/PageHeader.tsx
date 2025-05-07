import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Typography } from '@/components/ui/typography';
import { Eye, EyeOff } from 'lucide-react';

// Type for PageHeader props
export type PageHeaderProps = {
  isPublished: boolean;
  onPublishToggle: () => void;
  onPreview: () => void;
  isPreviewMode?: boolean;
};

export function PageHeader({
  isPublished,
  onPublishToggle,
  onPreview,
  isPreviewMode = false,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Typography variant="h2" className="font-bold text-foreground">
          Professional Profile
          {isPreviewMode && (
            <span className="ml-2 text-sm font-normal text-primary">
              (Preview Mode)
            </span>
          )}
        </Typography>
        <div className="flex items-center gap-3">
          {!isPreviewMode && (
            <Button variant="outline" className="bg-background">
              Go to Dashboard
            </Button>
          )}
          <Button
            variant="outline"
            className="bg-background flex items-center gap-1.5"
            onClick={onPreview}
          >
            {isPreviewMode ? (
              <>
                <EyeOff className="h-4 w-4" />
                Exit Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Preview Profile
              </>
            )}
          </Button>
          {!isPreviewMode && (
            <Button
              variant={isPublished ? 'default' : 'outline'}
              className={
                isPublished
                  ? 'bg-primary'
                  : 'bg-background border-primary text-primary'
              }
              onClick={onPublishToggle}
            >
              {isPublished ? 'Unpublish Profile' : 'Publish Profile'}
            </Button>
          )}
        </div>
      </div>
      <Typography className="text-muted-foreground">
        {isPreviewMode
          ? 'This is how your profile appears to visitors'
          : 'Manage your professional profile information and services'}
      </Typography>
      <Separator className="my-4" />
    </div>
  );
}
