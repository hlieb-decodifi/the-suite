# Supabase Configuration & Database Management

A well-organized Supabase setup for The Suite platform, featuring modular seed files, type-safe database clients, and comprehensive migration management for the beauty services booking platform.

## Key Features

- **🎯 Modular Seed Files**: Organized seed data into core configuration, infrastructure, and test data
- **🔒 Type Safety**: Fully typed database clients with auto-generated TypeScript types
- **🔄 Multi-Client Architecture**: Separate clients for server, browser, and admin operations
- **📝 Migration Management**: Version-controlled database schema with comprehensive migrations
- **🛡️ Row-Level Security**: Authentication-aware middleware for secure data access
- **⚙️ Environment-Based Configuration**: Separate configurations for local, development, and production

## Directory Structure

```
supabase/
├── README.md                    # This file
├── config.toml                  # Supabase project configuration
├── middleware.ts                # Auth middleware for session management
├── types.ts                     # Auto-generated TypeScript types from database schema
├── migrations/                  # Database migrations (timestamped SQL files)
├── schemas/
│   └── schema.sql              # Complete database schema definition
├── seeds/                       # Database seed files (modular organization)
│   ├── seed.sql                # Core: payment methods, plans, admin configs, admin user
│   ├── seed-infrastructure.sql # Infrastructure: email templates, legal docs, storage
│   ├── seed-test-users.sql     # Test data: professional and client accounts
│   └── seed-additional-services.sql # Test data: 30+ services for pagination testing
└── templates/                   # Email templates for auth flows
    ├── confirmation.html
    ├── email_change.html
    └── recovery.html
```

## Database Clients

### Server-Side Client (Server Components & API Routes)

```typescript
// app/page.tsx or app/api/route.ts
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  
  // Authenticated queries use the current user's session
  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('*')
    .single();

  return <div>{profile?.profession}</div>;
}
```

**Key Features:**
- Uses `@supabase/ssr` for server-side rendering
- Automatically authenticates using cookie-based sessions
- Required for Server Components and API Routes
- Handles cookie management automatically

### Browser Client (Client Components)

```typescript
// components/booking-form.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function BookingForm() {
  const supabase = createClient();
  const [services, setServices] = useState([]);

  useEffect(() => {
    async function loadServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);
      setServices(data || []);
    }
    loadServices();
  }, [supabase]);

  return <div>{/* Form UI */}</div>;
}
```

**Key Features:**
- Uses `@supabase/ssr` for client-side operations
- Browser-safe authentication
- Required for Client Components with data fetching
- Supports real-time subscriptions

### Admin Client (Service Role Operations)

```typescript
// app/api/admin/route.ts
import { createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createAdminClient();
  
  // Bypass RLS policies - use with caution!
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('deleted', true);

  return Response.json({ users: data });
}
```

**Key Features:**
- Uses service role key for elevated permissions
- Bypasses Row-Level Security (RLS) policies
- Only use for administrative operations
- Never expose to client-side code

## Seed Files Organization

Our seed files are organized by purpose and dependency order:

### 1. `seed.sql` - Core Configuration (114 lines)

Essential system configuration that should exist in all environments.

**Contains:**
- Payment methods (Credit Card, Cash)
- Subscription plans with Stripe price IDs
- Admin configuration settings (review thresholds, fees, limits)
- Admin user account (admin@decodifi.uk)

**Usage:** Always required, safe for production

### 2. `seed-infrastructure.sql` - Infrastructure Setup (355 lines)

System infrastructure that needs to exist before users can interact with the platform.

**Contains:**
- Email templates (17 templates for booking, cancellation, support)
- Legal documents (Terms, Privacy Policy, Copyright Policy)
- Storage buckets (profile-photos, portfolio-photos, message-attachments)
- Storage bucket policies (RLS for file access)

**Usage:** Required for all environments

### 3. `seed-test-users.sql` - Test User Data (398 lines)

Development and testing data with sample users and services.

**Contains:**
- Professional test account (professional@mail.com / secret)
- Client test account (client@mail.com / secret)
- Professional's profile, services, and Stripe Connect setup
- Basic booking and payment test data

**Usage:** Development and staging only - remove from production

### 4. `seed-additional-services.sql` - Extended Test Data (305 lines)

Additional test data for pagination and UI testing.

**Contains:**
- 30 additional services for the test professional
- Various price points and durations
- Service descriptions for realistic UI testing

**Usage:** Development only - optional for staging

### Customizing Seed Execution

Edit `config.toml` to control which seeds run:

```toml
[db.seed]
enabled = true
sql_paths = [
  "./seeds/seed.sql",                      # Always required
  "./seeds/seed-infrastructure.sql",       # Always required
  # "./seeds/seed-test-users.sql",         # Comment out for production
  # "./seeds/seed-additional-services.sql" # Comment out for production
]
```

## Database Schema & Types

### Generating TypeScript Types

After making schema changes via migrations:

```bash
# Generate types from your database schema
npx supabase gen types typescript --local > supabase/types.ts

# For remote database
npx supabase gen types typescript --project-id your-project-id > supabase/types.ts
```

### Using Generated Types

```typescript
import { Database } from '@/supabase/types';

// Table type
type Service = Database['public']['Tables']['services']['Row'];

// Insert type (fields required for insert)
type ServiceInsert = Database['public']['Tables']['services']['Insert'];

// Update type (all fields optional)
type ServiceUpdate = Database['public']['Tables']['services']['Update'];

// Use with Supabase client
const supabase = await createClient();
const { data } = await supabase
  .from('services')
  .select('*')
  .returns<Service[]>();
```

### Helper Type Utilities

```typescript
// Get a specific table's row type
type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

// Usage
type ProfessionalProfile = Tables<'professional_profiles'>;
type Booking = Tables<'bookings'>;
```

## Migrations

### Creating a New Migration

```bash
# Create a new migration file
npx supabase migration new your_migration_name

# Edit the generated file in supabase/migrations/
```

### Migration Best Practices

1. **Never Edit Existing Migrations**: Create new migrations to modify schema
2. **Test Locally First**: Always test migrations with local Supabase
3. **Descriptive Names**: Use clear migration names (`add_tips_table`, not `update_db`)
4. **Include Rollbacks**: When possible, include rollback instructions in comments
5. **RLS Policies**: Always include necessary RLS policies with new tables

### Applying Migrations

```bash
# Apply locally
npx supabase db reset

# Apply to remote (after pushing)
npx supabase db push

# View migration status
npx supabase migration list
```

## Authentication Flow

### Server-Side Auth

```typescript
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Use user.id for queries
  const { data: profile } = await supabase
    .from('professional_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return <div>Welcome, {user.email}</div>;
}
```

### Client-Side Auth

```typescript
// components/auth-form.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function AuthForm() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      router.refresh(); // Refresh server components
      router.push('/dashboard');
    }
  }

  return <form>{/* Form fields */}</form>;
}
```

### Middleware Auth Check

The middleware in `supabase/middleware.ts` runs on every request to:
- Refresh user sessions automatically
- Protect authenticated routes
- Handle cookie management
- Redirect unauthenticated users to login

**Protected Routes:** All routes except `/`, `/auth/*`, and `/services/*` require authentication.

## Common Patterns

### Fetching with Joins

```typescript
const supabase = await createClient();

// Get bookings with related data
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    *,
    service:services(*),
    professional:professional_profiles(
      *,
      user:users(email, id)
    )
  `)
  .eq('client_id', userId);
```

### Real-Time Subscriptions

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export function BookingNotifications() {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('New booking:', payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return <div>{/* Notifications UI */}</div>;
}
```

### Server Actions with Supabase

```typescript
// app/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createBooking(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('bookings')
    .insert({
      client_id: user.id,
      service_id: formData.get('service_id'),
      scheduled_at: formData.get('scheduled_at'),
    });

  if (error) throw error;

  revalidatePath('/bookings');
}
```

## Local Development

### Starting Local Supabase

```bash
# Start local Supabase stack
npx supabase start

# View credentials
npx supabase status

# Stop local stack
npx supabase stop
```

### Resetting Local Database

```bash
# Reset database and run seeds
npx supabase db reset

# Reset without seeds
npx supabase db reset --no-seed
```

### Accessing Local Studio

After starting Supabase, access the local Studio at `http://localhost:54323`

## Environment Variables

Required environment variables (`.env.local`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For local development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh... (from supabase status)
SUPABASE_SERVICE_ROLE_KEY=eyJh... (from supabase status)
```

## Testing

### Test Credentials

After running seeds, use these test accounts:

**Admin:**
- Email: `admin@decodifi.uk`
- Password: `mHMGB1uzkdfQ16xU`

**Professional:**
- Email: `professional@mail.com`
- Password: `secret`
- Has Stripe Connect, subscription, and services

**Client:**
- Email: `client@mail.com`
- Password: `secret`

## Troubleshooting

### "relation does not exist" Error

```bash
# Ensure migrations are applied
npx supabase db reset
```

### Type Mismatches

```bash
# Regenerate types after schema changes
npx supabase gen types typescript --local > supabase/types.ts
```

### Authentication Issues

```typescript
// Check if user is logged in
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

### RLS Policy Issues

```sql
-- Temporarily disable RLS for testing (DEV ONLY)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

## Best Practices

### Server vs Client

✅ **Use Server Client for:**
- Initial page data fetching
- SEO-critical content
- Secure operations (admin functions)
- API routes

✅ **Use Browser Client for:**
- Interactive forms
- Real-time updates
- Client-side filtering/search
- User actions after page load

### Security

- ✅ Never expose service role key to client
- ✅ Always implement RLS policies on new tables
- ✅ Validate user permissions in Server Actions
- ✅ Use middleware for route protection
- ✅ Sanitize user inputs before database operations

### Performance

- ✅ Use `.select()` to limit returned columns
- ✅ Add database indexes for frequently queried fields
- ✅ Use `.limit()` for pagination
- ✅ Cache static data on the server
- ✅ Implement proper loading states

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SSR Package](https://supabase.com/docs/guides/auth/server-side)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## Support

For project-specific questions, refer to:
- `/docs/the-suite-context.md` - Project overview and architecture
- `.cursor/rules/` - Code quality standards and conventions
- Team documentation and style guides
