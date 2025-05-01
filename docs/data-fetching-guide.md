# Data Fetching Architecture Guide

## Overview

This guide outlines our standardized approach to data fetching and state management in The Suite. We use a combination of React Query, server actions, and a consistent folder structure to ensure:

- Efficient data fetching with built-in caching
- Reduced duplicate requests
- Clear separation between client and server code
- Consistent patterns across all entity types
- Improved type safety throughout the application

## Architecture Principles

Our data fetching architecture follows these core principles:

1. **Client-Server Separation**: Clear separation between client-side data fetching and server-side data access
2. **Caching First**: Leverage React Query for automatic request deduplication and caching
3. **Type Safety**: Maintain strong typing across all data flows
4. **Consistent Patterns**: Use consistent file structure and naming conventions across all entity types
5. **Optimized Network Usage**: Minimize unnecessary network requests through proper invalidation
6. **Database-Driven Types**: Always use Supabase generated types rather than hardcoded types

## File Structure

```
src/
├── api/                    # Client-side API layer
│   ├── [entity]/           # e.g. profiles, services, etc.
│   │   ├── types.ts        # Shared type definitions (referencing Supabase types)
│   │   ├── hooks.ts        # React Query hooks (primary client usage point)
│   │   └── api.ts          # Fetch functions that call server endpoints
├── server/                 # Server-side code
│   ├── actions/            # Server actions (with 'use server')
│   │   └── [entity].ts     # e.g. profiles.ts, services.ts
│   ├── db/                 # Database access layer
│   │   └── [entity].ts     # Direct database operations
│   └── validation/         # Input validation schemas
supabase/
└── types.ts                # Generated Supabase types
```

## Data Flow Pattern

The data flows through our application layers in this sequence:

```
Client Component
  → api/[entity]/hooks.ts (React Query hook)
    → api/[entity]/api.ts (fetch to server endpoint)
      → server/actions/[entity].ts (server action)
        → server/db/[entity].ts (database operations)
```

## Using Supabase Types

### IMPORTANT: Always Reference Generated Types

We must **ALWAYS** use the generated types from `supabase/types.ts` rather than creating hardcoded types. This ensures:

1. **Type Safety**: Your types will always match the actual database schema
2. **Maintainability**: When the database schema changes, your types will automatically update
3. **Consistency**: All developers will use the same type definitions

### How to Reference Database Types

Here's how to correctly reference the Supabase generated types:

```typescript
// CORRECT APPROACH
import { Database } from '@/../supabase/types';

// Type aliases using table definition from Database types
type UserRow = Database['public']['Tables']['users']['Row'];
type ProfilePhotoRow = Database['public']['Tables']['profile_photos']['Row'];
type ProfessionalProfileRow =
  Database['public']['Tables']['professional_profiles']['Row'];

// Then create client-side types by transforming these database types
export type ProfileData = {
  id: UserRow['id'];
  firstName: UserRow['first_name'];
  lastName: UserRow['last_name'];
  profession: ProfessionalProfileRow['profession'];
  photoUrl?: ProfilePhotoRow['url'];
};
```

### NEVER Do This

```typescript
// INCORRECT APPROACH - Never hardcode types
export type ProfileData = {
  id: string;
  firstName: string; // No guarantee this matches database
  lastName: string;
  profession: string;
  photoUrl?: string;
};
```

## Implementation Guide

### 1. Client-Side API Layer

#### A. Type Definitions (`api/[entity]/types.ts`)

Always reference and transform types from the Supabase generated types:

```typescript
// api/profiles/types.ts
import { Database } from '@/../supabase/types';

// Reference the database types
type UserRow = Database['public']['Tables']['users']['Row'];
type ProfessionalProfileRow =
  Database['public']['Tables']['professional_profiles']['Row'];
type ProfilePhotoRow = Database['public']['Tables']['profile_photos']['Row'];

// Transform snake_case DB types to camelCase client types
export type ProfileData = {
  id: UserRow['id'];
  firstName: UserRow['first_name'];
  lastName: UserRow['last_name'];
  profession: ProfessionalProfileRow['profession'] | null;
  description: ProfessionalProfileRow['description'] | null;
  photoUrl?: ProfilePhotoRow['url'] | null;
};

// Form values should match the client-side types
export type HeaderFormValues = {
  firstName: string;
  lastName: string;
  profession: string;
  description: string;
  phoneNumber?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
};
```

#### B. API Client (`api/[entity]/api.ts`)

Create functions that call your server endpoints. These functions handle the HTTP communication but don't manage state.

```typescript
// api/profiles/api.ts
import type { ProfileData, HeaderFormValues } from './types';

export async function getProfile(userId: string): Promise<ProfileData> {
  const response = await fetch(`/api/profiles/${userId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch profile');
  }
  return response.json();
}

export async function updateProfileHeader(
  userId: string,
  data: HeaderFormValues,
) {
  const response = await fetch(`/api/profiles/${userId}/header`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update profile');
  }

  return response.json();
}
```

#### C. React Query Hooks (`api/[entity]/hooks.ts`)

Create hooks that use React Query to manage data fetching, caching, and mutations.

```typescript
// api/profiles/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfileHeader } from './api';
import type { ProfileData, HeaderFormValues } from './types';

// Define query keys as constants for consistency
export const QUERY_KEYS = {
  profile: (userId: string) => ['profile', userId],
  // Other related keys...
};

export function useProfile(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.profile(userId),
    queryFn: () => getProfile(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}

export function useUpdateProfileHeader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: HeaderFormValues;
    }) => updateProfileHeader(userId, data),
    onSuccess: (_, { userId }) => {
      // Invalidate relevant queries on success
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(userId) });
    },
  });
}
```

### 2. Server-Side Layer

#### A. Server Actions (`server/actions/[entity].ts`)

Create server actions that handle your business logic and validate inputs.

```typescript
// server/actions/profiles.ts
'use server';

import { z } from 'zod';
import { getProfileFromDb, updateProfileHeaderInDb } from '../db/profiles';
import { headerFormSchema } from '../validation/profiles';
import type { ProfileData } from '@/api/profiles/types';

export async function getProfileAction(userId: string) {
  try {
    const profile = await getProfileFromDb(userId);
    return { success: true, data: profile };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile',
    };
  }
}

export async function updateProfileHeaderAction(
  userId: string,
  rawData: unknown,
) {
  try {
    // Validate input with Zod
    const data = headerFormSchema.parse(rawData);

    await updateProfileHeaderInDb(userId, data);
    return { success: true };
  } catch (error) {
    console.error('Error updating profile header:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}
```

#### B. Database Access (`server/db/[entity].ts`)

Create functions that handle direct database operations, using Supabase types.

```typescript
// server/db/profiles.ts
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/../supabase/types';
import type { ProfileData, HeaderFormValues } from '@/api/profiles/types';

export async function getProfileFromDb(userId: string): Promise<ProfileData> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      first_name,
      last_name,
      professional_profiles (
        description,
        profession,
        phone_number,
        facebook_url,
        instagram_url,
        tiktok_url
      ),
      profile_photos (url)
    `,
    )
    .eq('id', userId)
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  if (!data) throw new Error('Profile not found');

  // Transform from snake_case DB model to camelCase client model
  // Using properly typed database responses
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    profession: data.professional_profiles?.profession,
    description: data.professional_profiles?.description,
    photoUrl: data.profile_photos?.url,
  };
}

export async function updateProfileHeaderInDb(
  userId: string,
  data: HeaderFormValues,
) {
  const supabase = await createClient();

  // Using proper database types for your updates
  const profileUpdate: Partial<
    Database['public']['Tables']['professional_profiles']['Update']
  > = {
    profession: data.profession || null,
    description: data.description || null,
    phone_number: data.phoneNumber || null,
    facebook_url: data.facebookUrl || null,
    instagram_url: data.instagramUrl || null,
    tiktok_url: data.tiktokUrl || null,
    updated_at: new Date().toISOString(),
  };

  // Update professional profile
  const { error: profileError } = await supabase
    .from('professional_profiles')
    .update(profileUpdate)
    .eq('user_id', userId);

  if (profileError)
    throw new Error(`Profile update error: ${profileError.message}`);

  // Update user info
  const userUpdate: Partial<Database['public']['Tables']['users']['Update']> = {
    first_name: data.firstName,
    last_name: data.lastName,
    updated_at: new Date().toISOString(),
  };

  const { error: userError } = await supabase
    .from('users')
    .update(userUpdate)
    .eq('id', userId);

  if (userError) throw new Error(`User update error: ${userError.message}`);
}
```

#### C. Validation Schemas (`server/validation/[entity].ts`)

Define Zod schemas for validating inputs.

```typescript
// server/validation/profiles.ts
import { z } from 'zod';

export const headerFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  profession: z.string().optional(),
  description: z.string().optional(),
  phoneNumber: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
});
```

### 3. API Route Handlers

Create route handlers to expose server actions to client API calls. In Next.js 15+, params in dynamic routes are passed as a Promise.

```typescript
// app/api/profiles/[userId]/route.ts
import { getProfileAction } from '@/server/actions/profiles';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const result = await getProfileAction(userId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
```

```typescript
// app/api/profiles/[userId]/header/route.ts
import { updateProfileHeaderAction } from '@/server/actions/profiles';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const body = await request.json();
  const result = await updateProfileHeaderAction(userId, body);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
```

For routes with multiple dynamic parameters, the same pattern applies:

```typescript
// app/api/services/[userId]/[serviceId]/route.ts
import { deleteServiceAction } from '@/api/services/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; serviceId: string }> },
) {
  const { userId, serviceId } = await params;
  const result = await deleteServiceAction(userId, serviceId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
```

## Component Usage Example

Here's how to use the data fetching hooks in your components:

```tsx
// components/templates/ProfileTemplate/components/ProfileTabContent/ProfileTabContent.tsx
import { useProfile, useUpdateProfileHeader } from '@/api/profiles/hooks';
import { Typography } from '@/components/ui/typography';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

export function ProfileTabContent({ userId }) {
  // Get profile data with automatic caching
  const { data: profile, isLoading, error } = useProfile(userId);

  // Get mutation function for updates
  const { mutate: updateHeader, isPending } = useUpdateProfileHeader();

  // Handle form submission
  const handleSubmit = (data) => {
    updateHeader(
      { userId, data },
      {
        onSuccess: () => {
          toast({ description: 'Profile updated successfully' });
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error updating profile',
            description: error.message,
          });
        },
      },
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[100px] w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Typography className="text-destructive">
        Error loading profile: {error.message}
      </Typography>
    );
  }

  // Render component with data
  return <div>{/* Component implementation */}</div>;
}
```

## React Query Provider Setup

Ensure the React Query provider is set up at the app level:

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Best Practices

### 1. Database Type Safety

- **ALWAYS** reference Supabase types from `supabase/types.ts`
- Never hardcode database field types manually
- When creating client-side types, transform from the database types
- Use proper typing for database operations (inserts, updates)

### 2. Query Keys

- Use consistent, nested query key structures
- Define query keys in a central place within each entity folder
- Structure keys hierarchically: `[entity, id, subentity?]`

### 3. Stale Time and Caching

- Set appropriate `staleTime` based on how frequently data changes
- Configure global defaults in the QueryClient
- Override for specific cases if needed

### 4. Optimistic Updates

For a better user experience, use optimistic updates:

```typescript
const { mutate } = useMutation({
  mutationFn: updateFunction,
  onMutate: async (newData) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey });

    // Snapshot the previous value
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistically update to the new value
    queryClient.setQueryData(queryKey, (old) => ({
      ...old,
      ...newData,
    }));

    // Return context object with previous data
    return { previousData };
  },
  onError: (err, newData, context) => {
    // If the mutation fails, roll back
    queryClient.setQueryData(queryKey, context.previousData);
  },
  onSettled: () => {
    // Refetch after error or success
    queryClient.invalidateQueries({ queryKey });
  },
});
```

### 5. Error Handling

- Provide meaningful error messages
- Use toast notifications for user feedback
- Log detailed errors on the server

### 6. Prefetching Data

For improved performance, prefetch data before the user needs it:

```typescript
// Prefetch profile data before navigating to profile page
queryClient.prefetchQuery({
  queryKey: ['profile', userId],
  queryFn: () => getProfile(userId),
});
```

## Migrating from Existing Code

When migrating existing components, follow these steps:

1. Create proper types in `api/[entity]/types.ts` that reference Supabase types
2. Move API fetch logic to `api/[entity]/api.ts`
3. Implement React Query hooks in `api/[entity]/hooks.ts`
4. Move server-side code to `server/actions/[entity].ts` and `server/db/[entity].ts`
5. Set up API route handlers if needed
6. Update components to use the new hooks

## Benefits of This Architecture

- **Reduced Network Traffic**: Cached responses eliminate duplicate requests
- **Better UX**: Loading states, error handling, and optimistic updates
- **Simplified Component Code**: Data fetching logic is abstracted away
- **Type Safety**: Consistent typing across client and server
- **Performance**: Automatic request deduplication and background refetching
- **Maintainability**: Consistent patterns make the codebase easier to understand
- **Database Alignment**: Types always match the actual database schema

## Troubleshooting

### Common Issues

1. **Queries not invalidating properly**

   - Check that you're using the correct query key structure
   - Ensure invalidation is called after mutations complete

2. **Stale data persisting**

   - Verify your `staleTime` settings
   - Check if cache is being manually updated incorrectly

3. **Type errors in data flow**

   - Ensure you're referencing the correct Supabase types
   - Add proper transformations between database and client models

4. **Missing database fields**
   - Check if your Supabase types are up to date
   - Run the type generator if database schema has changed

```

```
