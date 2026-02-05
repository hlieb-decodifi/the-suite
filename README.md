# The Suite

A modern platform connecting clients with beauty professionals. Book appointments, manage portfolios, handle payments, and grow your beauty business.

## Quick Start

### 1. Install dependencies

```bash
yarn install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in the required values (see [Environment Variables](#environment-variables) section).

### 3. Start the local database

```bash
yarn db:start
```

This spins up a local Supabase instance with PostgreSQL, Auth, Storage, and the Studio UI at `http://localhost:54323`.

### 4. Run the development server

```bash
yarn dev
```

Visit `http://localhost:3000` to see the app. You can log in with:
- **Admin**: `admin@decodifi.uk` / `mHMGB1uzkdfQ16xU`
- **Professional**: `professional@mail.com` / `secret`
- **Client**: `client@mail.com` / `secret`

## Development Workflow

### Database Changes

We use Supabase migrations for all database changes. **Never edit existing migration files** - always create new ones.

#### Making schema changes

1. Edit `supabase/schemas/schema.sql` with your changes
2. Stop the database if running: `yarn db:stop`
3. Generate a migration: `npx supabase db diff -f your_change_name`
4. Start the database and apply: `yarn db:start && npx supabase db push --local`
5. Regenerate TypeScript types: `yarn db:gen-types`

See `.cursor/rules/never-edit-migration-files.mdc` for the full workflow and why this matters.

#### Seeding data

Seeds are organized by purpose:
- `seed.sql` - Core config, payment methods, subscription plans, admin user
- `seed-infrastructure.sql` - Email templates, legal docs, storage buckets
- `seed-test-users.sql` - Test professional and client accounts
- `seed-additional-services.sql` - Extra services for UI testing

Reset your database with seeds: `yarn db:reset`

For more on the database structure, see [supabase/README.md](supabase/README.md).

### Running everything at once

If you need the full stack (app + database + Stripe webhooks):

```bash
yarn dev:all
```

Or just backend services:

```bash
yarn dev:be
```

## Integrations

### Stripe (Payments)

The Suite uses Stripe for all payment processing - bookings, tips, subscriptions, and payouts to professionals via Stripe Connect.

#### Local development

Start the Stripe CLI webhook listener:

```bash
yarn stripe:listen
```

This forwards Stripe events to your local API at `/api/webhooks/stripe`. Copy the webhook signing secret it prints and add to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

You'll also need your Stripe test keys:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

#### Production setup

1. Create a webhook endpoint in the Stripe dashboard pointing to `https://your-domain.com/api/webhooks/stripe`
2. Select all events (or at minimum: payment intents, subscriptions, invoices)
3. Copy the webhook secret to your production environment variables

### Brevo (Transactional Emails)

Brevo sends all transactional emails - booking confirmations, cancellations, password resets, etc.

#### Local email testing

We use [Mailpit](https://github.com/axllent/mailpit) to catch emails locally:

```bash
yarn mailpit:start
```

View emails at `http://localhost:8025`. Stop with `yarn mailpit:stop`.

#### Syncing templates

Email templates are defined in `src/providers/brevo/templates.ts` and stored in the database. To sync them with Brevo:

```bash
yarn sync-brevo-templates
```

Required environment variables:

```env
BREVO_API_KEY=your-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=The Suite
```

### Cron Jobs

Three cron jobs keep the platform running smoothly:

1. **Balance Notifications** - Reminds professionals to check their earnings
2. **Capture Payments** - Captures pre-authorized payments after appointments
3. **Pre-auth Payments** - Handles payment authorization before appointments

In production, these run via Vercel Cron (configured in `vercel.json`). For local testing:

```bash
# Run a specific job
yarn cron:balance
yarn cron:capture
yarn cron:preauth

# Run all jobs
yarn cron:all
```

Jobs are implemented in `src/app/api/cron/` and protected by auth tokens.

### Google SSO

Users can sign in with Google. You'll need OAuth credentials:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - `http://localhost:54321/auth/v1/callback` (local)
   - `https://your-project.supabase.co/auth/v1/callback` (production)

Add to `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

Also configure in Supabase: `supabase/config.toml` → `[auth.external.google]`

### Google Places (Location Search)

We use Google Places API for address autocomplete and location search.

```env
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-api-key
```

Get an API key from [Google Cloud Console](https://console.cloud.google.com) and enable:
- Places API
- Geocoding API
- Maps JavaScript API

### OpenStreetMap (Map Display)

For displaying locations, we use Leaflet with OpenStreetMap tiles (free, no API key needed). The map components are in `src/components/map/`.

### Google Analytics

Page views and events are tracked via Google Analytics 4.

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Implementation uses `@next/third-parties` for optimal performance. See `src/app/layout.tsx`.

### PostHog (Product Analytics)

Feature flags, A/B testing, and user analytics via PostHog.

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

The PostHog provider is in `src/providers/PostHogProvider/`. See `.cursor/rules/posthog-integration.mdc` for feature flag patterns.

## Testing

We use Playwright for end-to-end testing against a test database.

```bash
# Run tests headless
yarn test

# Open UI mode
yarn test:ui

# Debug mode
yarn test:debug

# Watch in browser
yarn test:headed

# Record new tests
yarn test:codegen
```

Tests are in the `tests/` directory. Write tests for both success and failure cases - especially for RLS policies.

## Code Quality

### Linting and Formatting

```bash
# Check for issues
yarn lint

# Auto-fix issues
yarn lint:fix

# Format all files
yarn format
```

We use ESLint and Prettier with TypeScript strict mode. See `docs/eslint-prettier.md` for configuration details.

### Type Safety

All database types are auto-generated from the Supabase schema:

```bash
yarn db:gen-types
```

This creates `supabase/types.ts` which you import throughout the app. Never edit this file manually.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # API endpoints
│   │   ├── cron/         # Scheduled jobs
│   │   └── webhooks/     # Stripe, etc.
│   ├── (auth)/           # Auth pages (login, signup)
│   ├── admin/            # Admin dashboard
│   ├── client/           # Client dashboard
│   └── professional/     # Professional dashboard
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   └── ...              # Feature components
├── lib/                 # Core utilities
│   └── supabase/       # Supabase clients
├── providers/           # React context providers
├── server/              # Server-side business logic
├── stores/              # Zustand state stores
└── types/               # TypeScript type definitions
```

### Key Patterns

- **Pages are Server Components** - Data fetching happens on the server
- **Client Components** for interactivity - Mark with `'use client'`
- **Server Actions** in `actions.ts` files - Form submissions and mutations
- **Zustand for client state** - UI state, form state, temporary data
- **React Query for server state** - Data fetching, caching, mutations

See `docs/` for detailed guides on creating pages, components, and forms.

## Environment Variables

Required for local development:

```env
# Next.js
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase (from yarn db:status)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Brevo
BREVO_API_KEY=your-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=The Suite

# Google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-api-key
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Cron (generate a random string)
CRON_SECRET_TOKEN=your-secret-token
```

## Deployment

### Git Branching Strategy

The project uses three main branches:

- **`main`** - Main development branch (auto-deploys to dev environment)
- **`staging`** - Pre-production environment connected to staging Supabase
- **`production`** - Production branch (auto-deploys to production)

Create feature branches from `main`, and merge through `main` → `staging` → `production`.

### Vercel

```bash
# Link to Vercel project
vercel link

# Deploy
vercel
```

Set all environment variables in the Vercel dashboard before deploying.

### Supabase

Link to your remote Supabase project:

```bash
yarn db:link:staging    # or
yarn db:link:production
```

Push migrations:

```bash
npx supabase db push
```

In your Supabase project:
1. Set **Site URL** to your production URL in Auth settings
2. Add **Redirect URLs** for OAuth (Google, etc.)
3. Configure **SMTP settings** if not using Brevo
4. Set **JWT expiry** and other auth settings
5. Configure **Storage buckets** via the dashboard or seeds

### Environment-Specific URLs

Update these in your environment:

- **Stripe webhook**: Point to `https://your-domain.com/api/webhooks/stripe`
- **Google OAuth redirect**: Add `https://your-project.supabase.co/auth/v1/callback`
- **Supabase Site URL**: Set to your production domain
- **Brevo sender**: Use your verified domain

## Styling & Theming

We use [shadcn/ui](https://ui.shadcn.com/) components with Tailwind CSS. Theme is defined in `src/app/globals.css`.

### Customizing the theme

Use [tweakcn theme generator](https://tweakcn.com/editor/theme) to visually customize colors and export to your project.

**Important**: After installing a theme via CLI, convert color formats from OKLCH to RGB so Tailwind opacity utilities work (`bg-primary/50`, etc).

## Useful Commands

```bash
# Development
yarn dev                     # Start Next.js dev server
yarn dev:all                # Dev + database + Stripe
yarn dev:be                 # Backend services only

# Database
yarn db:start               # Start local Supabase
yarn db:stop                # Stop local Supabase
yarn db:reset               # Reset and reseed database
yarn db:status              # Show connection info
yarn db:gen-types           # Generate TypeScript types

# Stripe
yarn stripe:listen          # Listen for webhooks
yarn stripe:secret          # Get webhook secret

# Email
yarn mailpit:start          # Start email catcher
yarn mailpit:stop           # Stop email catcher
yarn sync-brevo-templates   # Sync email templates

# Cron
yarn cron:balance           # Test balance notifications
yarn cron:capture           # Test payment capture
yarn cron:preauth           # Test pre-auth
yarn cron:all              # Test all cron jobs

# Testing
yarn test                   # Run Playwright tests
yarn test:ui               # Open test UI
yarn test:debug            # Debug tests

# Code Quality
yarn lint                   # Check code
yarn lint:fix              # Fix issues
yarn format                # Format code
```

## Documentation

- [`docs/the-suite-context.md`](docs/the-suite-context.md) - Project overview and architecture
- [`docs/page-creation-guide.md`](docs/page-creation-guide.md) - How to create new pages
- [`docs/component-creation-guide.md`](docs/component-creation-guide.md) - Component patterns
- [`docs/form-creation-guide.md`](docs/form-creation-guide.md) - Building forms
- [`docs/data-fetching-guide.md`](docs/data-fetching-guide.md) - Data fetching patterns
- [`supabase/README.md`](supabase/README.md) - Database and Supabase setup

## Troubleshooting

### "Invalid JWT token" errors

Your session expired. Log out and log back in.

### Stripe webhooks not working locally

Make sure `yarn stripe:listen` is running and the webhook secret matches `.env.local`.

### Email not sending locally

Check that Mailpit is running: `yarn mailpit:start` and visit `http://localhost:8025`.

### Database out of sync

Reset everything: `yarn db:stop && yarn db:reset`

### Type errors after schema changes

Regenerate types: `yarn db:gen-types`

### RLS policy errors

Check your user is logged in and has the right role. Test policies in Supabase Studio.

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the code style guides
3. Write tests for new features
4. Run `yarn lint` and `yarn test` before committing
5. Push and open a PR with a clear description