import type { Metadata } from 'next';
import { Titillium_Web } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers';
import { Toaster } from '@/components/ui/toaster';
import { RootLayoutTemplate } from '@/components/templates/RootLayoutTemplate';

const titilliumWeb = Titillium_Web({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700', '900'],
  variable: '--font-titillium-web',
});

export const metadata: Metadata = {
  title: 'The Suite',
  description: 'Premium services at your fingertips',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en" className={titilliumWeb.variable}>
        <body className={titilliumWeb.className}>
          <RootLayoutTemplate>{children}</RootLayoutTemplate>
          <Toaster />
        </body>
      </html>
    </Providers>
  );
}
