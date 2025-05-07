'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Search } from 'lucide-react';

export function ServicesTemplateEmptyState() {
  return (
    <Card className="border border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-muted rounded-full p-3 mb-4">
          <Search className="h-6 w-6 text-muted-foreground" />
        </div>
        <Typography variant="h3" className="font-semibold mb-2">
          No services found
        </Typography>
        <Typography className="text-muted-foreground max-w-md">
          We couldn't find any services matching your search criteria. Please
          try adjusting your search terms or location filter.
        </Typography>
      </CardContent>
    </Card>
  );
}
