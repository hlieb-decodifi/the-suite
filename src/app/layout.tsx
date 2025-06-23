import type { Metadata } from 'next';
import { Titillium_Web, Inter } from 'next/font/google';
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

const RootLayout = ({ children }: { children: React.ReactNode }) => (
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
    </body>
  </html>
);

export default RootLayout;
