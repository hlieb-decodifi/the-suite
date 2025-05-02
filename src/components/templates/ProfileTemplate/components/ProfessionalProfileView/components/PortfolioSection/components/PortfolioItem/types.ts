import { PortfolioPhotoUI } from '@/types/portfolio-photos';

export type PortfolioItemProps = {
  photo: PortfolioPhotoUI;
  onRemove: () => void;
}; 