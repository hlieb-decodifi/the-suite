import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Type for PageHeader props
export type PageHeaderProps = {
  isPublished: boolean;
  isSubscribed: boolean;
  onPublishToggle: () => void;
  onSubscribe: () => void;
};

export function PageHeader({
  isPublished,
  isSubscribed,
  onPublishToggle,
  onSubscribe,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Typography variant="h2" className="font-bold text-foreground">
          Professional Profile
        </Typography>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-background">
            Go to Dashboard
          </Button>
          <Button
            variant={isPublished ? 'default' : 'outline'}
            className={
              isPublished
                ? 'bg-primary'
                : 'bg-background border-primary text-primary'
            }
            onClick={onPublishToggle}
            disabled={!isSubscribed}
          >
            {isPublished ? 'Unpublish Profile' : 'Publish Profile'}
          </Button>
        </div>
      </div>
      {!isSubscribed && (
        <div className="bg-muted p-3 rounded-md">
          <Typography className="text-muted-foreground text-sm">
            You need to subscribe to publish your profile.{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={onSubscribe}
            >
              Subscribe now
            </Button>
          </Typography>
        </div>
      )}
      <Typography className="text-muted-foreground">
        Manage your professional profile information and services
      </Typography>
      <Separator className="my-4" />
    </div>
  );
}
