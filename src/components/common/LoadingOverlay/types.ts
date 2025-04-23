import { type LoaderSize, type LoaderSpeed } from '@/components/common/Loader';

export type LoadingOverlayVariant = 'default' | 'light' | 'dark' | 'solid';
export type LoadingOverlayPosition = 'center' | 'top' | 'bottom';

export type LoadingOverlayProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Whether the overlay is currently shown */
  isLoading?: boolean;
  /** Optional overlay variant */
  variant?: LoadingOverlayVariant;
  /** Optional positioning of the loader */
  position?: LoadingOverlayPosition;
  /** Optional custom loader size, defaults to large */
  loaderSize?: LoaderSize;
  /** Optional loading text */
  loadingText?: string;
  /** Optional animation speed */
  speed?: LoaderSpeed;
}; 