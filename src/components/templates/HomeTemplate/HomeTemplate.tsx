'use client';

import { cn } from '@/utils/cn';
import { HeroSection } from './components/HeroSection';
import { ProfessionalCtaSection } from './components/ProfessionalCtaSection';
import { CampusSection } from './components/CampusSection';
import { SalonOwnerSection } from './components/SalonOwnerSection';

export type HomeTemplateProps = {
  className?: string;
};

export function HomeTemplate({ className }: HomeTemplateProps) {
  return (
    <div className={cn('', className)}>
      <HeroSection />
      <ProfessionalCtaSection />
      <CampusSection />
      <SalonOwnerSection />
    </div>
  );
}
