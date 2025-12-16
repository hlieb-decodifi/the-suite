/**
 * Simple in-memory rate limiting utility for contact form submissions
 * Uses Map to store rate limit data with automatic cleanup
 */

type RateLimitData = {
  count: number;
  resetTime: number;
};

class InMemoryRateLimit {
  private store = new Map<string, RateLimitData>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }

  async checkLimit(
    identifier: string,
  ): Promise<{ success: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + this.windowMs;

    const existing = this.store.get(identifier);

    if (!existing || now > existing.resetTime) {
      // First request or window expired
      this.store.set(identifier, { count: 1, resetTime });
      return {
        success: true,
        remaining: this.limit - 1,
        resetTime,
      };
    }

    if (existing.count >= this.limit) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
        resetTime: existing.resetTime,
      };
    }

    // Increment count
    existing.count++;
    this.store.set(identifier, existing);

    return {
      success: true,
      remaining: this.limit - existing.count,
      resetTime: existing.resetTime,
    };
  }
}

// Contact form rate limiter: 3 submissions per 15 minutes per IP
export const contactFormRateLimit = new InMemoryRateLimit(3, 15 * 60 * 1000);

// Helper function to get client IP from headers
export function getClientIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const realIP = headers.get('x-real-ip');
  const cfConnectingIP = headers.get('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const firstIP = forwarded.split(',')[0];
    return firstIP ? firstIP.trim() : 'anonymous';
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback for development/testing
  return 'anonymous';
}
