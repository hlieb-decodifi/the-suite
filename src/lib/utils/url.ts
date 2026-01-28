/**
 * Get the site URL from environment variables
 * Prioritizes NEXT_PUBLIC_SITE_URL, falls back to VERCEL_URL, then localhost
 * Ensures the URL starts with http:// or https://
 *
 * @param options.trailingSlash - Whether to include a trailing slash (default: false)
 */
export function getURL(options: { trailingSlash?: boolean } = {}): string {
  const { trailingSlash = false } = options;

  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_BRANCH_URL ||
    'http://localhost:3000';

  // Ensure URL starts with http:// or https://
  url = url.startsWith('http') ? url : `https://${url}`;

  // Add or remove trailing slash based on option
  if (trailingSlash) {
    url = url.endsWith('/') ? url : `${url}/`;
  } else {
    url = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  return url;
}
