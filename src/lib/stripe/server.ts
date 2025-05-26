import Stripe from 'stripe';

// Initialize Stripe with the API key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Let TypeScript infer the correct API version
  appInfo: {
    name: 'The Suite',
    version: '1.0.0',
  },
}); 