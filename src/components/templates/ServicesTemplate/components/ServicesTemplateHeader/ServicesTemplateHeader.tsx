import { Typography } from '@/components/ui/typography';

export function ServicesTemplateHeader() {
  return (
    <div className="text-center mb-8">
      <Typography variant="h1" className="font-bold text-3xl md:text-4xl mb-2">
        Find Professional Services
      </Typography>
      <Typography className="text-muted-foreground max-w-2xl mx-auto">
        Browse through our selection of professional services tailored to your
        needs
      </Typography>
    </div>
  );
}
