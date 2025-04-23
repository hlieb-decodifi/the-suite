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
├── services/           # Supabase API interactions
├── types/              # TypeScript type definitions
└── utils/              # Reusable utility functions

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

   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase project URL and anon key

4. Run the development server:

   ```bash
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

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

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
