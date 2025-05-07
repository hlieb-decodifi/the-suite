import { PortfolioPhotoUI } from '@/types/portfolio-photos';
import { PortfolioItem } from './PortfolioItem/PortfolioItem';

export type PortfolioGridProps = {
  photos: PortfolioPhotoUI[];
  userId: string;
  isEditable?: boolean;
};

export function PortfolioGrid({
  photos,
  userId,
  isEditable = true,
}: PortfolioGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <PortfolioItem
          key={photo.id}
          photo={photo}
          userId={userId}
          isEditable={isEditable}
        />
      ))}
    </div>
  );
}
