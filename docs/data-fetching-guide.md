# Data Fetching Architecture Guide

This guide outlines our data fetching architecture and best practices for implementing data access in the application.

## Architecture Overview

Our data fetching architecture follows a hybrid approach that balances clear client/server separation with domain-driven organization:

1. **Client/Server Separation**: Clear distinction between client-side and server-side code
2. **Domain-Driven Server Organization**: Server-side code organized by business domains
3. **Shared Type Definitions**: Centralized types used by both client and server
4. **React Query Caching**: Automatic data caching and synchronization
5. **Supabase Type Safety**: Strong typing with Supabase-generated types

## Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌───────────────┐     ┌───────────┐
│  React      │     │  API        │     │  Server       │     │  Database │
│  Components │────▶│  Layer      │────▶│  Actions      │────▶│  Access   │────▶ Supabase
│  (Client)   │◀────│  (Client)   │◀────│  (Server)     │◀────│  (Server) │◀────
└─────────────┘     └─────────────┘     └───────────────┘     └───────────┘
```

## Folder Structure

```
src/
├── api/                 # Client-side API layer
│   ├── profiles/        # Resource-specific client code
│   │   ├── api.ts       # API functions that call server actions
│   │   └── hooks.ts     # React Query hooks
│   ├── portfolio-photos/ # Portfolio photos client code
│   │   ├── api.ts
│   │   └── hooks.ts
│   └── photos/          # Profile photos client code
│       ├── api.ts
│       └── hooks.ts
├── server/              # Server-side code
│   └── domains/         # Domain-organized server code
│       ├── profiles/    # All profiles-related server code
│       │   ├── actions.ts # Server actions (with 'use server')
│       │   └── db.ts      # Database operations
│       └── portfolio-photos/ # Portfolio photos server code
│           ├── actions.ts
│           └── db.ts
└── types/               # Shared type definitions
    ├── profiles.ts      # Types shared between client and server
    └── portfolio-photos.ts # Portfolio photo types
```

## Implementation Guide

### 1. Shared Types

Create a file in `src/types/[resource].ts` with all shared type definitions:

```typescript
// src/types/services.ts
import { Database } from '@/../supabase/types';
import { ServiceFormValues } from '@/components/forms/ServiceForm';

// Database type from Supabase schema
export type ServiceDB = Database['public']['Tables']['services']['Row'];

// UI representation
export type ServiceUI = {
  id: string;
  name: string;
  price: number;
  duration: string; // formatted as "2h 30m"
  description: string;
};

// API parameter types
export type ServiceParams = {
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
};
```

### 2. Database Access Layer

Create a file in `src/server/domains/[resource]/db.ts`:

```typescript
// src/server/domains/services/db.ts
import { createClient } from '@/lib/supabase/server';
import { ServiceDB } from '@/types/services';

export type Service = ServiceDB;

export async function getServicesForUser({ userId, page, pageSize }) {
  const supabase = await createClient();
  // Implement database query with pagination, filtering, etc.
  // Return data and pagination info
}
```

### 3. Server Actions Layer

Create a file in `src/server/domains/[resource]/actions.ts`:

```typescript
// src/server/domains/services/actions.ts
'use server';

import { getServicesForUser } from './db';
import type { ServiceUI } from '@/types/services';

// Helper functions for data transformation

export async function getServices({ userId, page, pageSize }) {
  try {
    const result = await getServicesForUser({ userId, page, pageSize });
    return {
      success: true,
      services: result.services.map(serviceToUI),
      pagination: {
        /* pagination data */
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 4. Client API Layer

Create a file in `src/api/[resource]/api.ts`:

```typescript
// src/api/services/api.ts
import { getServices as getServicesAction } from '@/server/domains/services/actions';
import type { ServiceParams, ServiceUI } from '@/types/services';

export async function getServices(params: ServiceParams): Promise<ServiceUI[]> {
  const result = await getServicesAction(params);
  if (!result.success) throw new Error(result.error);
  return result.services ?? [];
}
```

### 5. React Query Hooks

Create a file in `src/api/[resource]/hooks.ts`:

```typescript
// src/api/services/hooks.ts
import { useQuery } from '@tanstack/react-query';
import { getServices } from './api';
import type { ServiceParams } from '@/types/services';

export function useServices(params: ServiceParams) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => getServices(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
```

## Best Practices

1. **Use Supabase Types**: Always reference types from the Supabase schema

   ```typescript
   import { Database } from '@/../supabase/types';
   export type ServiceDB = Database['public']['Tables']['services']['Row'];
   ```

2. **Implement Pagination**: All list queries should support pagination

   ```typescript
   function getItems({ page = 1, pageSize = 20 }) { ... }
   ```

3. **Optimistic Updates**: Use optimistic updates for better UX

   ```typescript
   onMutate: async (newData) => {
     await queryClient.cancelQueries(queryKey);
     const previous = queryClient.getQueryData(queryKey);
     queryClient.setQueryData(queryKey, (old) => [...old, optimisticUpdate]);
     return { previous };
   };
   ```

4. **Error Handling**: Implement consistent error handling
   ```typescript
   try {
     // Operation
     return { success: true, data };
   } catch (error) {
     return { success: false, error: error.message };
   }
   ```

## Implemented Resources

The following resources have been implemented using this architecture:

1. **Profiles**
   - User profile information
   - Path: `src/api/profiles/` and `src/server/domains/profiles/`
2. **Portfolio Photos**
   - Professional's portfolio photos management
   - Path: `src/api/portfolio-photos/` and `src/server/domains/portfolio-photos/`
3. **Profile Photos**
   - User avatar/profile photo
   - Path: `src/api/photos/` and `src/server/domains/photos/`

## Migration Guide

When migrating from API routes to this hybrid architecture:

1. First create the shared types in `/types/[resource].ts`
2. Implement database functions in `/server/domains/[resource]/db.ts`
3. Create server actions in `/server/domains/[resource]/actions.ts`
4. Update client API in `/api/[resource]/api.ts` to call server actions
5. Keep React Query hooks but update them to use new API functions
6. Finally, remove the old API routes

```

```
