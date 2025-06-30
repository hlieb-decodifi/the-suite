import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import Image from 'next/image';
import Link from 'next/link';
import { PLACEHOLDER_IMAGES } from '../../constants';

type SalonOwnerSectionProps = {
  className?: string;
};

const IMAGES = [
  PLACEHOLDER_IMAGES.HERO_BACKGROUND_1,
  PLACEHOLDER_IMAGES.HERO_BACKGROUND_2,
  PLACEHOLDER_IMAGES.HERO_BACKGROUND_3,
  PLACEHOLDER_IMAGES.HERO_BACKGROUND_4,
];

export function SalonOwnerSection({ className }: SalonOwnerSectionProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden bg-gradient-to-br from-background to-secondary/30 py-20',
        className,
      )}
    >
      <div className="container relative z-10 mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          {/* Left column: Text and CTA */}
          <div className="text-left">
            <Typography
              variant="h2"
              className="font-futura text-3xl font-bold text-foreground md:text-4xl"
            >
              Are you a salon owner looking to leverage unused space?
            </Typography>
            <Typography
              variant="lead"
              className="mt-6 max-w-xl text-muted-foreground"
            >
              Let The Suite help you make the most of your unused space. We
              partner with professionals and collegiate institutions to host
              styling events and are always looking for new salon spaces to use.
            </Typography>

            <Button
              asChild
              size="lg"
              className="mt-8 bg-primary px-10 py-6 font-futura text-xl font-bold text-white hover:bg-primary/90"
            >
              <Link href="/contact">Connect with us</Link>
            </Button>
          </div>

          {/* Right column: Images */}
          <div className="relative grid grid-cols-2 grid-rows-2 gap-4 p-4">
            {IMAGES.map((src, index) => (
              <div
                key={index}
                className="relative h-40 overflow-hidden rounded-lg md:h-48"
              >
                <Image
                  src={src}
                  alt={`Beauty professional ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
