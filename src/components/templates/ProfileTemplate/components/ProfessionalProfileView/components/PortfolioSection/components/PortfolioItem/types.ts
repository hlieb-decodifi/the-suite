import { PortfolioPhotoUI } from '@/types/portfolio-photos';

export type PortfolioItemProps = {
  photo: PortfolioPhotoUI;
  userId: string;
  isEditable?: boolean;
  onRemove?: () => void;
}; 