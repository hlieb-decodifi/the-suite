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

const getURL = () => {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';
  return url.startsWith('http') ? url : `https://${url}`;
};

const siteName = 'The Suite';
const description = 'Premium services at your fingertips';

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: siteName,
  description: description,

  // Open Graph (Facebook, LinkedIn, Discord, etc.)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: getURL(),
    siteName: siteName,
    title: siteName,
    description: description,
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: description,
  },

  // Icons
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
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
