# Page Creation Guide

## Introduction

This guide outlines the standard approach for creating pages within our Next.js application. We follow a consistent pattern to ensure separation of concerns, reusability, and maintainability.

> **Note:** This guide focuses on page-level architecture and works in conjunction with the [Component Creation Guide](./component-creation-guide.md), which provides detailed standards for individual component implementation. Please refer to both guides when developing new features.

## Page Structure Overview

Our application follows a three-tiered page structure:

1. **Page Component** (`src/app/[route]/page.tsx`): Minimal component that mainly handles routing and renders a template
2. **Template Component** (`src/components/templates/[PageName]Template/`): Contains the page layout and composition logic
3. **View/Section Components**: Modular components that make up the various sections of a page

This separation ensures clean code organization, reusability, and easier testing.

## Page Component

Pages should be created in the `src/app` directory following Next.js App Router conventions:

```
src/app/
├── page.tsx               # Home page
├── layout.tsx             # Root layout
├── profile/               # Profile route
│   └── page.tsx           # Profile page
└── auth/                  # Auth routes
    ├── callback/
    │   └── page.tsx
    ├── confirmed/
    │   └── page.tsx
    └── email-verification/
        └── page.tsx
```

The page component should be minimal and primarily responsible for:

- Importing and rendering the corresponding template
- Handling any route-specific logic (like loading route parameters)

**Example page component:**

```tsx
// src/app/profile/page.tsx
import { ProfileTemplate } from '@/components/templates/ProfileTemplate';

export default function ProfilePage() {
  return <ProfileTemplate />;
}
```

## Template Component

Templates are the primary composition layer for pages. Each page should have a corresponding template in the `src/components/templates` directory:

```
src/components/templates/
├── ProfileTemplate/
├── HomeTemplate/
├── AuthConfirmedTemplate/
├── EmailVerificationTemplate/
└── ...
```

A template component is responsible for:

- Defining the overall page layout
- Managing page-level state and data fetching
- Composing various views and sections

**Example template structure:**

```
src/components/templates/ProfileTemplate/
├── ProfileTemplate.tsx       # Main template component
├── index.ts                  # Export file
└── components/               # Template-specific components
    ├── ProfileTemplateClientView/    # View component for client
    │   ├── ProfileTemplateClientView.tsx
    │   └── ... # Components specific to this view
    ├── ProfileTemplateProfessionalView/  # Alternative view
    │   ├── ProfileTemplateProfessionalView.tsx
    │   └── ... # Components specific to this view
    └── ... # Components specific to this template
```

**Example template component:**

```tsx
// src/components/templates/ProfileTemplate/ProfileTemplate.tsx
'use client';

import { useAuthStore } from '@/stores/authStore';
import { ProfileTemplateClientView } from './components/ProfileTemplateClientView/ProfileTemplateClientView';
import { ProfileTemplateProfessionalView } from './components/ProfileTemplateProfessionalView/ProfileTemplateProfessionalView';

export function ProfileTemplate() {
  const { user, profile } = useAuthStore();

  if (!user) {
    return <div>Please sign in to view your profile</div>;
  }

  // Conditional rendering based on user type
  return profile?.type === 'professional' ? (
    <ProfileTemplateProfessionalView user={user} />
  ) : (
    <ProfileTemplateClientView user={user} />
  );
}
```

## View Components

When a page has multiple views or modes (like different user types), create separate view components:

- Place views in the template's `components` directory
- Each view should be in its own subdirectory **prefixed with the template name**
- Render views conditionally based on state/props

View components encapsulate a specific representation of the page for a particular user type, mode, or state.

**Example view component:**

```tsx
// src/components/templates/ProfileTemplate/components/ProfileTemplateClientView/ProfileTemplateClientView.tsx
'use client';

import { useClientProfile } from '@/api/profiles';
import { User } from '@supabase/supabase-js';
import { ProfileTemplateAccountSection } from './components/ProfileTemplateAccountSection/ProfileTemplateAccountSection';
import { ProfileTemplateDetailsSection } from './components/ProfileTemplateDetailsSection/ProfileTemplateDetailsSection';

export type ProfileTemplateClientViewProps = {
  user: User;
};

export function ProfileTemplateClientView({
  user,
}: ProfileTemplateClientViewProps) {
  const { data, isLoading, error } = useClientProfile(user.id);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <ProfileTemplateAccountSection user={user} />
        </div>
        <div className="md:col-span-2">
          <ProfileTemplateDetailsSection user={user} profile={data?.profile} />
        </div>
      </div>
    </div>
  );
}
```

## Section Components

Break down complex views into smaller, focused section components:

- Each section should handle a specific part of the page (e.g., profile details, account settings)
- Place sections in the view's `components` directory
- **Name sections with the template name as prefix** (e.g., `ProfileTemplateAccountSection`)

**Example section structure:**

```
src/components/templates/ProfileTemplate/components/ProfileTemplateClientView/components/
├── ProfileTemplateAccountSection/
│   ├── ProfileTemplateAccountSection.tsx
│   └── components/        # (Optional) Section-specific components
├── ProfileTemplateDetailsSection/
│   └── ...
└── ProfileTemplateLocationSection/
    └── ...
```

**Example section component:**

```tsx
// src/components/templates/ProfileTemplate/components/ProfileTemplateClientView/components/ProfileTemplateAccountSection/ProfileTemplateAccountSection.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { User } from '@supabase/supabase-js';

export type ProfileTemplateAccountSectionProps = {
  user: User;
};

export function ProfileTemplateAccountSection({
  user,
}: ProfileTemplateAccountSectionProps) {
  return (
    <div className="p-6 bg-card rounded-lg border border-border">
      <Typography variant="h3" className="font-bold text-foreground mb-4">
        Account Information
      </Typography>
      <div className="space-y-2">
        <div>
          <Typography variant="small" className="text-muted-foreground">
            Email
          </Typography>
          <Typography>{user.email}</Typography>
        </div>
        <Button variant="outline" className="mt-4">
          Change Password
        </Button>
      </div>
    </div>
  );
}
```

## Component Naming Convention

We follow these naming conventions for all components in the template structure:

1. **Template Component**: Named as `[Name]Template` (e.g., `ProfileTemplate`)
2. **View Components**: Named as `[Template]View` (e.g., `ProfileTemplateClientView`, `ProfileTemplateProfessionalView`)
3. **Section Components**: Named as `[Template]Section` (e.g., `ProfileTemplateAccountSection`, `ProfileTemplateDetailsSection`)
4. **Other Components**: Any other component specific to a template should also be prefixed with the template name

This consistent naming convention:

- Makes it easy to understand which template a component belongs to
- Prevents naming collisions between similar components in different templates
- Improves code organization and maintainability
- Makes refactoring and moving components easier

## Styling Best Practices

### Use Tailwind Variables for Colors

**IMPORTANT:** Always use Tailwind color variables defined in `tailwind.config.ts` instead of hardcoding color values.

```tsx
// INCORRECT - hardcoded colors
<div className="bg-[#F5F5F5] text-[#313131]">...</div>

// CORRECT - using Tailwind variables
<div className="bg-card text-foreground">...</div>
```

Our theme defines semantic color variables like:

- `background`/`foreground`
- `card`/`card-foreground`
- `primary`/`primary-foreground`
- `secondary`/`secondary-foreground`
- `muted`/`muted-foreground`
- `accent`/`accent-foreground`
- `destructive`/`destructive-foreground`

### Reuse UI Components

Always check and use components from the `src/components/ui` directory rather than creating new ones or using HTML elements directly:

```tsx
// INCORRECT - using HTML elements
<h1 className="text-2xl font-bold">Title</h1>
<input type="text" className="border rounded p-2" />

// CORRECT - using UI components
<Typography variant="h2">Title</Typography>
<Input placeholder="Enter text..." />
```

Our UI component library includes:

- `Typography` - For text elements with consistent styling
- `Button` - For buttons with various styles and states
- `Input`, `Select`, etc. - For form elements
- `Card`, `Dialog`, etc. - For common UI patterns

## Component Implementation Details

While this guide focuses on the overall structure of pages and their components, the detailed implementation of components follows additional guidelines:

- **Component Structure**: Each component should follow the standardized file structure
- **Type Safety**: All components must have proper TypeScript typing
- **State Management**: Use appropriate state management based on component needs
- **Performance Considerations**: Implement memoization and code splitting techniques where appropriate

For comprehensive guidance on these aspects, please refer to the [Component Creation Guide](./component-creation-guide.md), which provides detailed standards for individual component implementation including:

1. Detailed file organization within component folders
2. Component size and complexity guidelines
3. Type safety implementations
4. State management best practices
5. Performance optimization techniques

## Component Organization Summary

1. **Page Component**: Minimal routing component in `src/app/[route]/page.tsx`
2. **Template Component**: Page composition in `src/components/templates/[Name]Template/`
3. **View Components**: Alternate representations in `template/components/[Template][Name]View/`
4. **Section Components**: Focused content sections in `view/components/[Template][Name]Section/`

This hierarchical structure ensures code organization, separation of concerns, and maintainability.

## Component Size and Complexity

To maintain code quality and readability, follow these guidelines for component size:

- **Maximum Lines**: Components should not exceed 80 lines (excluding imports)
- **Single Responsibility**: Each component should have one clear purpose
- **Extraction Threshold**: When a component exceeds 50 lines, consider breaking it down

For more detailed guidelines on component size, structure, and best practices, refer to the [Component Creation Guide](./component-creation-guide.md).

## Example: Complete Page Structure

```
src/
├── app/
│   └── profile/
│       └── page.tsx           # Minimal page component
│
└── components/
    └── templates/
        └── ProfileTemplate/   # Template for the profile page
            ├── ProfileTemplate.tsx
            ├── index.ts
            └── components/
                ├── ProfileTemplateClientView/       # View for client users
                │   ├── ProfileTemplateClientView.tsx
                │   └── components/
                │       ├── ProfileTemplateAccountSection/  # Section for account info
                │       ├── ProfileTemplateDetailsSection/  # Section for personal details
                │       └── ProfileTemplateLocationSection/ # Section for location info
                └── ProfileTemplateProfessionalView/ # View for professional users
                    └── ...
```

## Case Study: Services Page Implementation

The services page in our application demonstrates a comprehensive implementation of our architecture patterns, with a particular focus on server components, data fetching, and client interactivity.

### Page Component

```tsx
// src/app/services/page.tsx
import { ServicesTemplate } from '@/components/templates/ServicesTemplate';

type SearchParams = {
  search?: string;
  page?: string;
};

// Enable dynamic rendering for this page to access searchParams
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache for this route

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Await the searchParams before passing to the template
  const resolvedSearchParams = await searchParams;

  return <ServicesTemplate searchParams={resolvedSearchParams} />;
}
```

This page component:

1. Is minimal and focused only on routing concerns
2. Handles URL search parameters for filtering and pagination
3. Uses `dynamic = 'force-dynamic'` to ensure fresh data on each request
4. Disables caching with `revalidate = 0` for real-time data

### Template Structure

The ServicesTemplate follows a specialized structure optimized for server components and client interactivity:

```
src/components/templates/ServicesTemplate/
├── ServicesTemplate.tsx        # Server component entry point
├── ServicesTemplateClient.tsx  # Client component with interactivity
├── index.ts                    # Export file
├── actions.ts                  # Server actions for data fetching
├── utils.ts                    # Client utility functions
├── types.ts                    # Type definitions
└── components/                 # Template-specific components
    ├── ServiceCard/            # Individual service display
    ├── ServicesList/           # Container for service cards
    ├── ServicesPagination/     # Pagination controls
    └── ServicesSearch/         # Search functionality
```

This structure differs from our standard template organization in a few key ways:

1. **Server/Client Split**: Instead of view components, we split the template into server and client components
2. **Co-located Server Actions**: Server actions are placed in the template directory instead of a separate domain folder
3. **Utility Functions**: Client-side utilities are organized in a separate file for better code organization

### Data Fetching Integration

The services page integrates data fetching directly into the template through server actions:

```tsx
// Inside ServicesTemplate.tsx (server component)
export async function ServicesTemplate({
  searchParams,
}: ServicesTemplateProps) {
  // Extract query parameters
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || '';

  // Fetch initial data on the server
  const initialData = await getServices(page, 12, search);

  // Pass data to client component
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

The client component then handles interactivity:

```tsx
// Inside ServicesTemplateClient.tsx (client component)
export function ServicesTemplateClient({
  initialData,
  initialPage,
  initialSearch,
}: ServicesTemplateClientProps) {
  // Client-side state
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);

  // Event handlers for pagination and search
  const handlePageChange = async (newPage: number) => {
    // Update URL and fetch new data
    // ...
  };

  const handleSearch = async (searchTerm: string) => {
    // Update URL and fetch filtered data
    // ...
  };

  // Render components with data and handlers
  return (
    <div className="space-y-8">
      <ServicesSearch initialValue={search} onSearch={handleSearch} />
      <ServicesList services={data.services} />
      <ServicesPagination
        currentPage={page}
        totalPages={data.pagination.totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
```

### When to Use This Pattern

This server/client component split with co-located server actions is ideal for:

1. Pages with search and filtering that benefit from URL parameters
2. Listings that require pagination with server-side data fetching
3. Features where the data model is specific to a single page or view
4. Cases where SEO benefits from server-rendered initial content

By following these patterns, we maintain consistency across the application, simplify development, and ensure a better user experience.
