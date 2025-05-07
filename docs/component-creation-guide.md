# Component Creation Guide

## Introduction

This guide outlines the standards and best practices for creating components in our Next.js TypeScript application. Following these guidelines ensures consistency, maintainability, and scalability across the codebase.

> **Note:** This guide focuses on component implementation details and works in conjunction with the [Page Creation Guide](./page-creation-guide.md), which provides the overall architecture for pages. Please refer to both guides when developing new features.

## Table of Contents

1. [Component Organization](#component-organization)
2. [Component Structure](#component-structure)
3. [Size and Complexity](#size-and-complexity)
4. [Type Safety](#type-safety)
5. [State Management](#state-management)
6. [Performance Considerations](#performance-considerations)
7. [Component Naming Convention](#component-naming-convention)
8. [Examples](#examples)

## Component Organization

Components should be organized according to the following structure:

```
src/
├── components/
│   ├── common/             # Shared reusable components
│   │   ├── ComponentName/
│   │   │   ├── ComponentName.tsx
│   │   │   ├── index.ts    # Re-export the component
│   │   │   ├── types.ts    # Component-specific types
│   │   │   ├── constants.ts # Component-specific constants
│   │   │   ├── helpers.ts  # Component-specific utilities
│   │   │   └── components/ # Sub-components used only by this component
│   │   │       └── SubComponent/
│   │   │           └── SubComponent.tsx
│   │   │
│   │   ├── forms/              # Form components
│   │   │   └── [NameForm]/
│   │   │       ├── [NameForm].tsx
│   │   │       ├── schema.ts   # Zod schema
│   │   │       └── use[NameForm].ts # Form logic hook
│   │   │
│   │   ├── modals/             # Modal components
│   │   └── templates/          # Page-specific components
│   │       └── [PageNameTemplate]/
│   │           ├── [PageNameTemplate].tsx
│   │           ├── index.ts
│   │           └── components/  # Components used only in this template
```

### Key Principles:

1. **Component Folders**: Each component should have its own folder
2. **Related Files**: Keep component-specific logic, types, and constants in the same folder
3. **Hierarchy**: Subcomponents should be in a `/components` subfolder
4. **Index Files**: Use index.ts files to re-export components for cleaner imports

### Page-Specific Component Organization

For page-specific components in the templates directory, follow this hierarchical structure:

```
src/components/templates/
└── ProfileTemplate/                    # Template component
    ├── ProfileTemplate.tsx             # Main template
    ├── index.ts
    └── components/
        ├── ProfileTemplateClientView/        # View component
        │   ├── ProfileTemplateClientView.tsx
        │   └── components/
        │       ├── ProfileTemplateAccountSection/   # Section component
        │       │   └── ProfileTemplateAccountSection.tsx
        │       └── ProfileTemplateDetailsSection/   # Section component
        │           └── ProfileTemplateDetailsSection.tsx
        └── ProfileTemplateProfessionalView/   # Alternative view
            └── ...
```

This hierarchical structure aligns with the page architecture defined in the [Page Creation Guide](./page-creation-guide.md) and enables:

1. **Clear Organization**: Each component has a clear place in the hierarchy
2. **Separation of Concerns**: Template, view, and section components have distinct responsibilities
3. **Scalability**: New views and sections can be added without affecting existing ones
4. **Maintainability**: Components are logically grouped by their purpose and relation

## Component Structure

### Basic Component Structure

```tsx
'use client'; // Only if using client-side features

import { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ComponentProps } from './types';
import { CONSTANTS } from './constants';
import { SubComponent } from './components/SubComponent';

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Component logic here

  return <div>{/* Component JSX */}</div>;
}
```

### Types File Structure

```tsx
// types.ts
export type ComponentProps = {
  prop1: string;
  prop2?: number;
  onAction?: (value: string) => void;
};

export type SubComponentProps = {
  // Props for sub-component
};
```

## Size and Complexity

### Component Size Guidelines

- **Maximum Lines**: Components should not exceed 80 lines (excluding imports)
- **Responsibility**: Each component should have a single responsibility
- **Extraction Threshold**: When a component exceeds 50 lines, consider extracting logic

### When to Break Down Components

1. When a component serves multiple purposes
2. When a component has multiple state concerns
3. When a component renders significantly different UIs based on conditions
4. When a section of JSX is reused in multiple places
5. When a component contains complex logic that can be isolated

## Type Safety

- **Always** define prop types for components
- **Never** use `any` type
- Use TypeScript's strict mode features:
  - Discriminated unions for complex state
  - Non-nullable types when appropriate
  - Proper typing for event handlers

Example of proper typing:

```tsx
type ButtonProps = {
  variant: 'primary' | 'secondary' | 'outline';
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
};
```

## State Management

### Local Component State

- Use `useState` for simple component-specific state
- Use `useReducer` for complex state logic within a component
- Extract complex state logic to custom hooks

### Application State

- Use React Query for server state
- Use Zustand for global UI state
- Keep state as close to where it's used as possible

## Performance Considerations

### Memoization

- Use `React.memo` for components that render often but with the same props
- Use `useCallback` for functions passed as props
- Use `useMemo` for expensive calculations

### Code Splitting

- Keep component imports granular
- Use dynamic imports for large components not needed on initial load

## Component Naming Convention

We follow these naming conventions for all components in the application:

1. **Template Component**: Named as `[Name]Template` (e.g., `ProfileTemplate`)
2. **View Components**: Named as `[Template]View` (e.g., `ProfileTemplateClientView`, `ProfileTemplateProfessionalView`)
3. **Section Components**: Named as `[Template]Section` (e.g., `ProfileTemplateAccountSection`, `ProfileTemplateDetailsSection`)
4. **Other Components**: Any other component specific to a template should also be prefixed with the template name

For detailed guidance on template, view, and section components organization, please refer to the [Page Creation Guide](./page-creation-guide.md).

## Examples

### Simple Component Example

```tsx
// src/components/common/UserAvatar/UserAvatar.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarProps } from './types';

export function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Avatar size={size} className="border-2 border-white">
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={user.name} />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </Avatar>
  );
}

// src/components/common/UserAvatar/types.ts
export type UserAvatarProps = {
  user: {
    name: string;
    avatarUrl?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

// src/components/common/UserAvatar/index.ts
export * from './UserAvatar';
```

### Complex Component with Subcomponents

```tsx
// src/components/templates/DashboardTemplate/DashboardTemplate.tsx
'use client';

import { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { DashboardHeader } from './components/DashboardHeader';
import { StatisticsPanel } from './components/StatisticsPanel';
import { RecentActivity } from './components/RecentActivity';
import { DashboardTemplateProps } from './types';

export function DashboardTemplate({ user, stats }: DashboardTemplateProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <DashboardHeader
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'overview' && (
        <>
          <StatisticsPanel stats={stats} />
          <RecentActivity userId={user.id} />
        </>
      )}

      {activeTab === 'settings' && <Typography>Settings Content</Typography>}
    </div>
  );
}
```

### Using Custom Hooks for Logic

```tsx
// src/components/templates/ProfileTemplate/components/PortfolioSection/hooks/usePortfolioUploads.ts
import { useState, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useUploadPortfolioPhoto } from '@/api/portfolio-photos/hooks';
import { compressImage } from '@/utils';

export function usePortfolioUploads(userId: string) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPortfolioPhoto();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    try {
      const compressedFile = await compressImage(file, { maxSizeMB: 2 });

      const formData = new FormData();
      formData.append('file', compressedFile);

      await uploadPhoto.mutateAsync({ userId, formData });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
      });
    }
  };

  return {
    fileInputRef,
    isUploading: uploadPhoto.isPending,
    handleFileChange,
    triggerFileSelect: () => fileInputRef.current?.click(),
  };
}
```

### Template with Server Actions Example

Below is an example of a complete template implementation that showcases our approach to creating a services listing page:

```tsx
// src/components/templates/ServicesTemplate/
├── ServicesTemplate.tsx         # Main template component
├── ServicesTemplateClient.tsx   # Client component with state management
├── index.ts                     # Export file
├── actions.ts                   # Server actions for data fetching
├── utils.ts                     # Client-side utility functions
├── types.ts                     # Type definitions
└── components/                  # Template-specific components
    ├── ServiceCard/             # Card component for individual services
    ├── ServicesList/            # Container for service cards
    ├── ServicesPagination/      # Pagination controls
    ├── ServicesSearch/          # Search input component
    └── ...
```

```tsx
// src/components/templates/ServicesTemplate/ServicesTemplate.tsx
// Server component that serves as the main entry point
import { Suspense } from 'react';
import { getServices } from './actions';
import { ServicesTemplateClient } from './ServicesTemplateClient';
import { SearchParams } from '@/app/services/page';

export type ServicesTemplateProps = {
  searchParams: SearchParams;
};

export async function ServicesTemplate({
  searchParams,
}: ServicesTemplateProps) {
  // Extract and validate parameters from URL
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || '';

  // Fetch initial data on the server
  const initialData = await getServices(page, 12, search);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Services</h1>

      <Suspense fallback={<div>Loading...</div>}>
        <ServicesTemplateClient
          initialData={initialData}
          initialPage={page}
          initialSearch={search}
        />
      </Suspense>
    </div>
  );
}
```

```tsx
// src/components/templates/ServicesTemplate/ServicesTemplateClient.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchServicesAction } from './actions';
import { ServicesList } from './components/ServicesList';
import { ServicesPagination } from './components/ServicesPagination';
import { ServicesSearch } from './components/ServicesSearch';
import { scrollToElement } from './utils';
import type { ServicesWithPagination } from './actions';

type ServicesTemplateClientProps = {
  initialData: ServicesWithPagination;
  initialPage: number;
  initialSearch: string;
};

export function ServicesTemplateClient({
  initialData,
  initialPage,
  initialSearch,
}: ServicesTemplateClientProps) {
  // State management
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement>(null);

  // Handle pagination changes
  const handlePageChange = async (newPage: number) => {
    setIsLoading(true);

    try {
      // Update URL with new page parameter
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', newPage.toString());
      router.push(`${pathname}?${params.toString()}`);

      // Fetch data for the new page
      const newData = await fetchServicesAction(newPage, 12, search);
      setData(newData);
      setPage(newPage);

      // Scroll to the top of the list
      if (listRef.current) {
        scrollToElement(listRef.current, 100);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearch = async (searchTerm: string) => {
    setIsLoading(true);
    setSearch(searchTerm);

    try {
      // Update URL with search parameter and reset to page 1
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      router.push(`${pathname}?${params.toString()}`);

      // Fetch data with the search filter
      const newData = await fetchServicesAction(1, 12, searchTerm);
      setData(newData);
      setPage(1);
    } catch (error) {
      console.error('Error searching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <ServicesSearch initialValue={search} onSearch={handleSearch} />

      <div ref={listRef}>
        <ServicesList services={data.services} isLoading={isLoading} />
      </div>

      {data.pagination.totalPages > 1 && (
        <ServicesPagination
          currentPage={page}
          totalPages={data.pagination.totalPages}
          onPageChange={handlePageChange}
          disabled={isLoading}
        />
      )}
    </div>
  );
}
```

The above example demonstrates several important principles:

1. **Separation of Concerns**:

   - Server component for initial data fetching
   - Client component for interactive functionality
   - Specialized sub-components for specific UI elements

2. **Component Hierarchy**:

   - Template as the top-level container
   - Client component handling state management
   - UI components for specific functionality

3. **Tight Integration with Data Layer**:

   - Server actions in `actions.ts` for data fetching
   - Client-side utilities in `utils.ts` for UI operations

4. **Type Safety**:
   - Strict typing through shared type definitions
   - Proper TypeScript interfaces for component props

Remember that well-structured components lead to a more maintainable codebase. Always prioritize readability, reusability, and adherence to the single responsibility principle when creating components.
