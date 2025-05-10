import { Typography } from '@/components/ui/typography';
import { Search } from 'lucide-react';

export type ServicesTemplateHeaderProps = {
  searchTerm?: string;
};

export function ServicesTemplateHeader({
  searchTerm = '',
}: ServicesTemplateHeaderProps) {
  const isSearching = searchTerm.trim() !== '';

  return (
    <div className="text-center mb-8">
      <Typography variant="h1" className="font-bold text-3xl md:text-4xl mb-2">
        Find Professional Services
      </Typography>

      <Typography className="text-muted-foreground max-w-2xl mx-auto mb-4">
        Browse through our selection of professional services tailored to your
        needs
      </Typography>

      <div className="flex items-center justify-center text-muted-foreground mt-6">
        <div className="flex items-center bg-muted/40 px-3 py-1.5 rounded-md text-sm font-medium">
          <Search className="h-4 w-4 mr-2 text-primary" />
          {isSearching ? (
            <Typography className="font-medium">
              Search results for:{' '}
              <span className="font-bold">"{searchTerm}"</span>
            </Typography>
          ) : (
            <Typography className="font-medium">
              Use the search bar above to find specific Services
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
}
