import { ProfessionalListItem } from '../../../../types';
import { ProfessionalsTemplateProfessionalCard } from '../ProfessionalsTemplateProfessionalCard/ProfessionalsTemplateProfessionalCard';

export type ProfessionalsTemplateProfessionalsListProps = {
  professionals: ProfessionalListItem[];
};

export function ProfessionalsTemplateProfessionalsList({
  professionals,
}: ProfessionalsTemplateProfessionalsListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {professionals.map((professional) => (
        <ProfessionalsTemplateProfessionalCard
          key={professional.id}
          professional={professional}
        />
      ))}
    </div>
  );
}
