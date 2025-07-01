import { CampusSection } from './components/CampusSection/CampusSection';
import { HeroSection } from './components/HeroSection/HeroSection';
import { ProfessionalCtaSection } from './components/ProfessionalCtaSection/ProfessionalCtaSection';
import { ProfessionalGrowthSection } from './components/ProfessionalGrowthSection/ProfessionalGrowthSection';
import { SalonOwnerSection } from './components/SalonOwnerSection/SalonOwnerSection';

export function HomeTemplate() {
  return (
    <div>
      <HeroSection />
      <ProfessionalCtaSection />
      <ProfessionalGrowthSection />
      <CampusSection />
      <SalonOwnerSection />
    </div>
  );
}
