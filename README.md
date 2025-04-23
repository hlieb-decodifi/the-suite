# Next.js Project Template

A modern Next.js project template with TypeScript, Tailwind CSS, ShadCN UI, and Supabase integration.

## Features

- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- ShadCN UI components
- Supabase for database management
- Atomic Design pattern implementation
- Modern project structure

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── atoms/          # Basic building blocks
│   ├── molecules/      # Combinations of atoms
│   ├── organisms/      # Complex components
│   ├── templates/      # Page templates
│   └── ui/             # ShadCN components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   └── supabase/       # Supabase client configuration
├── api/                # API interactions
│   └── common/         # Shared API utilities and types
├── types/              # TypeScript type definitions
└── utils/              # Reusable utility functions

utils/
└── supabase/          # Supabase migrations, schemas, seeds

public/                 # Static assets
├── fonts/             # Font files
├── images/            # Image assets
├── icons/             # Icon assets
└── videos/            # Video files
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Set up environment variables:

   Create a `.env.local` file with the following variables:

   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

   # Next.js Configuration
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. Run the development server:

   ```bash
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Get your project URL and API keys from the Supabase dashboard:

   - Go to Project Settings > API
   - Copy the URL, anon key, and service_role key to your `.env.local` file

3. Set up your database schema:

   - You can use the schema file in `utils/supabase/schemas/schema.sql`
   - Run this in the SQL editor in your Supabase dashboard

4. (Optional) Seed your database with initial data:

   - Use the seed file in `utils/supabase/seeds/seed.sql`
   - Run this in the SQL editor after applying the schema

5. Database Types:
   - The project includes TypeScript types for the database schema
   - When you modify your database schema, update the types in `src/lib/supabase/types.ts`

## Development Guidelines

- Follow the Atomic Design pattern for component organization
- Use TypeScript for all new code
- Follow the established folder structure
- Use ShadCN UI components when possible
- Keep components modular and reusable

## Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn type-check` - Run TypeScript compiler check

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

For Supabase:

- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase features and API.
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) - Authentication helpers for Next.js.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
