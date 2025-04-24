'use client';

import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';

export type RootLayoutTemplateProps = {
  children: React.ReactNode;
};

export function RootLayoutTemplate({ children }: RootLayoutTemplateProps) {
  // This is just a placeholder since we don't have actual auth state management
  // In a real app, this would come from your auth context
  const isAuthenticated = false;

  return (
    <div className="flex min-h-screen flex-col relative">
      <Header isAuthenticated={isAuthenticated} />
      <main className="flex-1 pt-2">{children}</main>
      <Footer />
    </div>
  );
}
