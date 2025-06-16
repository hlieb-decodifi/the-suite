'use client';

import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { LegalDocument } from '@/server/domains/legal-documents/actions';

export type LegalDocumentPageClientProps = {
  document: LegalDocument;
};

export function LegalDocumentPageClient({
  document,
}: LegalDocumentPageClientProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden py-16 bg-gradient-to-b from-muted/30 to-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Typography
              variant="p"
              className="mb-4 opacity-80 font-caslon text-xl italic text-muted-foreground"
            >
              Legal Information
            </Typography>

            <Typography
              variant="h1"
              className="mb-6 font-futura text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
            >
              {document.title}
            </Typography>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span>Version {document.version}</span>
              </div>
              {document.effectiveDate && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  <span>Effective: {formatDate(document.effectiveDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span>Updated: {formatDate(document.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
              <div className="p-8 md:p-12">
                <div
                  className="text-foreground space-y-6
                    [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:font-futura [&_h1]:text-foreground [&_h1]:mb-8 [&_h1]:mt-0 [&_h1]:pb-4 [&_h1]:border-b [&_h1]:border-border
                    [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:font-futura [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-6
                    [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:font-futura [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-4
                    [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-6 [&_p]:text-base
                    [&_strong]:text-foreground [&_strong]:font-semibold
                    [&_em]:text-muted-foreground [&_em]:italic
                    [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline
                    [&_ul]:text-muted-foreground [&_ul]:space-y-2 [&_ul]:ml-6 [&_ul]:list-disc
                    [&_ol]:text-muted-foreground [&_ol]:space-y-2 [&_ol]:ml-6 [&_ol]:list-decimal
                    [&_li]:mb-2"
                  dangerouslySetInnerHTML={{ __html: document.content }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Navigation */}
      <section className="py-12 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Typography variant="p" className="mb-6 text-muted-foreground">
              Need help or have questions about our policies?
            </Typography>

            <div className="flex flex-wrap justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                asChild
                className="font-futura font-medium"
              >
                <Link href="/">Back to Home</Link>
              </Button>

              <Button
                size="lg"
                asChild
                className="font-futura font-medium bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
