import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import { CalendarClock, LucideIcon, MapPinned, Users } from 'lucide-react';

type ServiceCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

function ServiceCard({ icon: Icon, title, description }: ServiceCardProps) {
  return (
    <div className="bg-white rounded-lg border border-border p-8 text-center flex flex-col items-center">
      <div className="size-16 flex items-center justify-center text-primary mb-6">
        <Icon size={60} className="stroke-primary" strokeWidth={1} />
      </div>

      <Typography
        variant="h4"
        className="font-futura text-xl font-bold text-foreground mb-4"
      >
        {title}
      </Typography>

      <Typography variant="p" className="text-muted-foreground">
        {description}
      </Typography>
    </div>
  );
}

export type ProfessionalCtaSectionProps = {
  className?: string;
};

export function ProfessionalCtaSection({
  className,
}: ProfessionalCtaSectionProps) {
  const services = [
    {
      icon: MapPinned,
      title: 'Select your service and location',
      description:
        'With The Suite, expert stylists and barbers are always nearby, providing the services you want, close to where you are.',
    },
    {
      icon: CalendarClock,
      title: 'Book your preferred date',
      description:
        'Our stylists and barbers are available when you need them, ensuring you can always get the look you want, right when you want it.',
    },
    {
      icon: Users,
      title: 'Show up and enjoy your Suite',
      description:
        'Arrive and let our professionals transform your look with personalized care and expertise, ensuring a top-notch experience from start to finish.',
    },
  ];

  return (
    <section className={cn('pb-10 pt-4 bg-background', className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Typography
            variant="p"
            className="font-caslon italic text-3xl text-primary mb-2"
          >
            The Suite Service
          </Typography>

          <Typography
            variant="h2"
            className="font-futura text-4xl md:text-5xl font-bold text-foreground max-w-3xl mx-auto"
          >
            Look your best wherever you are
          </Typography>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              icon={service.icon}
              title={service.title}
              description={service.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
