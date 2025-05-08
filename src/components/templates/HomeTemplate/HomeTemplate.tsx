import { CampusSection } from './components/CampusSection/CampusSection';
import { HeroSection } from './components/HeroSection/HeroSection';
import { ProfessionalCtaSection } from './components/ProfessionalCtaSection/ProfessionalCtaSection';
import { SalonOwnerSection } from './components/SalonOwnerSection/SalonOwnerSection';

export function HomeTemplate() {
  return (
    <div>
      <HeroSection />
      <ProfessionalCtaSection />
      <CampusSection />
      <SalonOwnerSection />
    </div>
  );
}
