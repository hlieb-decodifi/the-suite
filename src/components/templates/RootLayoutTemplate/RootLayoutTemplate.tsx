import { ReactNode } from 'react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { Toaster } from '@/components/ui/toaster';

export type RootLayoutTemplateProps = {
  children: ReactNode;
};

export function RootLayoutTemplate({ children }: RootLayoutTemplateProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex flex-grow container mx-auto py-8">{children}</main>
      <Footer />
      <Toaster />
    </div>
  );
}
