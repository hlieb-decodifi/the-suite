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

Remember that well-structured components lead to a more maintainable codebase. Always prioritize readability, reusability, and adherence to the single responsibility principle when creating components.
