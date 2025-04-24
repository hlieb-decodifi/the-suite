import { cn } from '@/utils/cn';
import { HeroSection } from './components/HeroSection/HeroSection';
import { ProfessionalCtaSection } from './components/ProfessionalCtaSection/ProfessionalCtaSection';
import { CampusSection } from './components/CampusSection/CampusSection';
import { SalonOwnerSection } from './components/SalonOwnerSection/SalonOwnerSection';

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
