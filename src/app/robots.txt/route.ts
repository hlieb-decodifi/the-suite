import { NextResponse } from 'next/server';

export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const robots = `User-agent: *
Allow: /

# Disallow admin and internal pages
Disallow: /admin/
Disallow: /dashboard/
Disallow: /profile/
Disallow: /client-profile/
Disallow: /booking/*/confirmation
Disallow: /bookings/
Disallow: /api/
Disallow: /_next/
Disallow: /auth/

# Allow important public pages
Allow: /professionals/
Allow: /services/
Allow: /about-us/
Allow: /contact/
Allow: /terms-and-conditions/
Allow: /privacy-policy/
Allow: /copyright-policy/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
