import type { Metadata } from 'next';
import { Titillium_Web, Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { Providers } from '@/providers';
import { Toaster } from '@/components/ui/toaster';
import { RootLayoutTemplate } from '@/components/templates';
import { cn } from '@/utils/cn';

const titillium = Titillium_Web({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700', '900'],
  variable: '--font-titillium-web',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'The Suite',
  description: 'Premium services at your fingertips',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          titillium.variable,
          inter.variable,
        )}
      >
        <Providers>
          <RootLayoutTemplate>{children}</RootLayoutTemplate>
          <Toaster />
        </Providers>
        <GoogleAnalytics
          gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''}
        />
      </body>
    </html>
  );
};

export default RootLayout;
