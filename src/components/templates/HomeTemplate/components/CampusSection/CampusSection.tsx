import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';

export type CampusSectionProps = {
  className?: string;
};

export function CampusSection({ className }: CampusSectionProps) {
  const steps = [
    {
      number: '1',
      description:
        "The Suite works to identify your community's specific needs",
    },
    {
      number: '2',
      description:
        'The Suite sources haircare professionals that focus on caring for highly-textured hair',
    },
    {
      number: '3',
      description:
        'The Suite curates conveniently located haircare events where diverse community members can access the services they need',
    },
  ];

  return (
    <section className={cn('py-16 bg-background', className)}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <Typography
              variant="p"
              as="p"
              className="italic font-caslon text-3xl text-primary mb-4"
            >
              Bring The Suite to your campus
            </Typography>

            <Typography
              variant="h3"
              className="font-futura text-2xl md:text-3xl font-bold text-foreground mb-6"
            >
              Enhance the campus experience with curated styling events for
              diverse students, faculty, and staff
            </Typography>

            <Typography variant="p" className="text-muted-foreground mb-8">
              The Suite brings experienced haircare professionals directly to
              your campus, allowing your diverse students, faculty, and staff to
              enjoy professional services without the need to travel.
            </Typography>
          </div>

          <div className="grid gap-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-muted p-6 rounded-lg border border-border flex"
              >
                <div className="flex-shrink-0 flex items-center justify-center mr-6">
                  <div className="bg-primary w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {step.number}
                  </div>
                </div>
                <div>
                  <Typography
                    variant="p"
                    className="font-medium text-foreground"
                  >
                    {step.description}
                  </Typography>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
