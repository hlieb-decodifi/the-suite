'use client';

import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils/cn';
import Image from 'next/image';
import { PLACEHOLDER_IMAGES } from '../../constants';

type HeroImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
};

function HeroImage({ src, alt, priority = false }: HeroImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover"
      priority={priority}
    />
  );
}

type HeroSectionProps = {
  className?: string;
};

export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section className={cn('relative overflow-hidden py-20', className)}>
      <div className="container relative z-10 mx-auto px-4">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <div className="text-left">
            <Typography
              variant="p"
              className="mb-3 opacity-80 font-caslon text-3xl italic text-foreground"
            >
              Only the best work for us
            </Typography>

            <div className="mb-6 border-t border-gray-200 pt-2">
              <Typography
                variant="h1"
                className="font-futura text-6xl md:text-7xl lg:text-8xl xl:text-[100px] font-bold text-foreground leading-tight"
              >
                Find your
              </Typography>
              <Typography
                variant="h1"
                className="font-futura text-6xl md:text-7xl lg:text-8xl xl:text-[100px] font-bold text-foreground leading-tight"
              >
                Suite
              </Typography>
            </div>

            <Button
              size="lg"
              className="mt-8 bg-primary px-10 py-6 font-futura text-xl font-bold text-white"
            >
              Book an appointment
            </Button>
          </div>

          {/* Right column: Images */}
          <div className="grid grid-cols-2 gap-2">
            {/* Top row */}
            <div className="relative h-44 overflow-hidden rounded-lg">
              <HeroImage
                src={PLACEHOLDER_IMAGES.HERO_BACKGROUND_1}
                alt="Beauty professional 1"
                priority
              />
            </div>
            <div className="relative h-44 overflow-hidden rounded-lg">
              <HeroImage
                src={PLACEHOLDER_IMAGES.HERO_BACKGROUND_2}
                alt="Beauty professional 2"
              />
            </div>

            {/* Bottom row */}
            <div className="relative h-44 overflow-hidden rounded-lg">
              <HeroImage
                src={PLACEHOLDER_IMAGES.HERO_BACKGROUND_3}
                alt="Beauty professional 3"
              />
            </div>
            <div className="relative h-72 overflow-hidden rounded-lg">
              <HeroImage
                src={PLACEHOLDER_IMAGES.HERO_BACKGROUND_4}
                alt="Beauty professional 4"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
