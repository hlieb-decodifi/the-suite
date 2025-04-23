import { type ClassValue } from 'clsx';

export type LoaderSize = 'small' | 'default' | 'large' | 'xl';
export type LoaderSpeed = 'slow' | 'normal' | 'fast';

export type LoaderVariantProps = {
  size?: LoaderSize;
};

export type LoaderProps = React.HTMLAttributes<HTMLDivElement> & 
  LoaderVariantProps & {
    className?: ClassValue;
    /** Controls the animation speed. Defaults to normal. */
    speed?: LoaderSpeed;
  }; 