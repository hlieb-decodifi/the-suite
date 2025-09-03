import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';

// Parse Supabase URL to extract components for remotePatterns
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabasePattern: RemotePattern | undefined;

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    // Ensure protocol is typed as 'http' or 'https'
    const protocol = url.protocol.startsWith('https') ? 'https' : 'http';

    // Create pattern without port by default
    const pattern: RemotePattern = {
      protocol,
      hostname: url.hostname,
      pathname: '/storage/v1/**',
    };

    // Only add port if it exists
    if (url.port) {
      pattern.port = url.port;
    }

    supabasePattern = pattern;
  } catch (error) {
    console.error('Invalid SUPABASE_URL:', error);
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: supabasePattern ? [supabasePattern] : [],
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
