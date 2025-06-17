import { Typography } from '@/components/ui/typography';
import { Users } from 'lucide-react';

export type ProfessionalsTemplateEmptyStateProps = {
  searchTerm?: string | undefined;
};

export function ProfessionalsTemplateEmptyState({
  searchTerm,
}: ProfessionalsTemplateEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6 p-6 rounded-full bg-muted/50">
        <Users className="h-12 w-12 text-muted-foreground" />
      </div>

      <Typography
        variant="h3"
        className="font-futura font-bold text-xl mb-3 text-foreground"
      >
        {searchTerm ? 'No professionals found' : 'No professionals available'}
      </Typography>

      <Typography variant="p" className="text-muted-foreground max-w-md">
        {searchTerm
          ? `We couldn't find any professionals matching "${searchTerm}". Try adjusting your search terms or check back later.`
          : 'There are currently no professionals available on our platform. Please check back soon as we are constantly growing our network of talented professionals.'}
      </Typography>
    </div>
  );
}
