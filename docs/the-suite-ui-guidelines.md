# The Suite - UI/UX Guidelines

This document outlines the UI/UX guidelines for The Suite platform, ensuring a consistent, accessible, and user-friendly experience across all parts of the application.

## Design System

The Suite uses a design system based on Tailwind CSS and shadcn/ui components, with a consistent color palette, typography, and component styles.

### Color Palette

Primary color scheme:

- Primary Gold: (`#DEA85B`)
- Primary Gold Light: (Lighter shade of gold)
- Primary Gold Dark: (Darker shade of gold)
- Dark Text: (`#313131`)
- Muted Text: (`#5D6C6F`)

Neutral colors:

- Background: (`#FFFFFF`)
- Surface: (`#F5F5F5`)
- Border: (`#ECECEC`)
- Text Primary: (`#313131`)
- Text Secondary: (`#5D6C6F`)
- Text Muted: (`#94A3B8`)

Semantic colors:

- Success: (`#10b981`)
- Warning: (`#f59e0b`)
- Error: (`#ef4444`)
- Info: (`#0ea5e9`)

### Typography

The Suite uses two primary fonts:

1. **Futura** - Primary font for most content:

   - Headings:
     - H1: 82px, font-weight: 700
     - H2: 42px, font-weight: 700
     - H3: 32px, font-weight: 700
     - H4: 22px, font-weight: 700
     - H5: 18px, font-weight: 500
     - H6: 16px, font-weight: 500
   - Body text:
     - Large: 22px, font-weight: 500
     - Default: 18px, font-weight: 500
     - Small: 16px, font-weight: 500

2. **Adobe Caslon Pro** - Used sparingly for accent elements:
   - Accent Headings: 32px, font-weight: 600
   - Special elements: 42px, font-weight: 400

For web implementation, ensure proper font fallbacks:

```css
font-family: 'Futura', 'Trebuchet MS', sans-serif;
font-family: 'Adobe Caslon Pro', 'Georgia', serif;
```

### Spacing System

Follow Tailwind's spacing scale for consistent layout spacing:

- 4px = 1 (0.25rem)
- 8px = 2 (0.5rem)
- 12px = 3 (0.75rem)
- 16px = 4 (1rem)
- 20px = 5 (1.25rem)
- 24px = 6 (1.5rem)
- 32px = 8 (2rem)
- 48px = 12 (3rem)
- 64px = 16 (4rem)

## Component Guidelines

### Common Components

#### Buttons

Use the Button component with consistent styling:

- Primary: Gold background (#DEA85B) with white text
- Secondary: White background with dark border and dark text
- Outline: Transparent with gold border and gold text
- Ghost: Transparent with dark text
- Destructive: Used for potentially destructive actions

```tsx
// Primary button example
<Button>Book Appointment</Button>

// Secondary button example
<Button variant="secondary">View Details</Button>

// Outline button example
<Button variant="outline">Cancel</Button>
```

Button styling should be consistent with:

- Rounded corners (border-radius: 4px)
- Clear hover/active states
- Proper padding (px-4 py-2 for standard buttons)
- Font: Futura, 22px, font-weight: 700 for main CTAs

#### Forms

- Use React Hook Form with Zod for form validation
- Group related form fields together
- Provide clear error messages
- Use consistent label positioning (top-aligned)
- Use appropriate input types (text, email, password, etc.)
- Include helper text for complex inputs
- Form elements should have light gray backgrounds (#F5F5F5)
- Form borders should be #ECECEC with focus states using the primary gold

```tsx
// Form example with validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: '',
    email: '',
  },
});
```

#### Cards

Use cards to group related content with consistent padding and styling:

- White background (#FFFFFF)
- Light border (#ECECEC)
- Consistent padding (p-6)
- Optional shadow for elevated cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Service Name</CardTitle>
    <CardDescription>Brief description of the service</CardDescription>
  </CardHeader>
  <CardContent>{/* Service details */}</CardContent>
  <CardFooter>
    <Button>Book Now</Button>
  </CardFooter>
</Card>
```

#### Navigation

- Maintain consistent navigation patterns
- Use Futura font for navigation items (16px, medium weight)
- Highlight active navigation items with gold underline or accent
- Use breadcrumbs for deep navigation structures
- Ensure mobile-responsive navigation with proper hamburger menu

#### Modals and Dialogs

Use the Dialog component for confirmations, forms, and detailed views:

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmation</DialogTitle>
      <DialogDescription>Are you sure you want to proceed?</DialogDescription>
    </DialogHeader>
    <div className="py-4">{/* Dialog content */}</div>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Page Layout Structure

#### Common Layout Elements

Every page should include:

- Header with navigation and logo
- Main content area
- Footer with links and information
- Consistent max-width and padding

```tsx
<div className="flex min-h-screen flex-col">
  <Header />
  <main className="flex-1 container mx-auto px-4 py-8">
    {/* Page content */}
  </main>
  <Footer />
</div>
```

#### Responsive Design Guidelines

- Mobile-first approach
- Breakpoints:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1536px
- Use Flexbox and Grid for complex layouts
- Avoid fixed heights/widths that may break on different screens
- Test on multiple device sizes

## User Flow Design Patterns

### Authentication Flows

- Clear sign-in/sign-up options
- Clean, simple forms with proper validation
- Password recovery process
- Email verification
- Welcome experience for new users

### Booking Process

1. Service selection
2. Professional selection
3. Date/time selection
4. Booking details confirmation
5. Payment information (if applicable)
6. Booking confirmation

### Profile Management

- User profile editing
- Preference settings
- Notification management
- Connected accounts

### Service Management (for Professionals)

- Service creation/editing
- Availability management
- Booking responses
- Dashboard with analytics

## Accessibility Guidelines

- Use semantic HTML elements
- Maintain proper heading hierarchy
- Ensure sufficient color contrast (WCAG AA compliance)
- Add appropriate ARIA attributes
- Support keyboard navigation
- Provide text alternatives for images
- Ensure form fields have associated labels
- Test with screen readers

## Performance Considerations

- Optimize image loading
- Use Suspense boundaries for loading states
- Implement progressive enhancement
- Use skeleton loaders for content
- Consider code splitting for large components

## Animation and Transitions

- Use subtle animations for state changes
- Ensure animations respect reduced motion preferences
- Keep transitions under 300ms for perceived performance
- Use CSS transitions when possible

## Implementation Examples

### Service Card Component

```tsx
// components/common/ServiceCard/ServiceCard.tsx
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';
import Image from 'next/image';

interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  imageUrl?: string;
  onBookNow: (serviceId: string) => void;
}

export const ServiceCard = ({
  id,
  name,
  description,
  price,
  duration,
  imageUrl,
  onBookNow,
}: ServiceCardProps) => {
  return (
    <Card className="overflow-hidden h-full flex flex-col border border-[#ECECEC]">
      {imageUrl && (
        <div className="relative h-48 w-full">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl font-futura font-bold text-[#313131]">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-[#5D6C6F] text-sm line-clamp-3 mb-4 font-futura">
          {description}
        </p>
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="font-bold text-[#DEA85B]">
              {formatCurrency(price)}
            </span>
          </div>
          <div className="text-[#5D6C6F]">{duration} min</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-[#DEA85B] hover:bg-[#C89245] text-white font-futura font-bold"
          onClick={() => onBookNow(id)}
        >
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
};
```

### Professional Profile View

```tsx
// components/templates/ProfessionalProfileTemplate/ProfessionalProfileTemplate.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceList } from './components/ServiceList/ServiceList';
import { ProfileHeader } from './components/ProfileHeader/ProfileHeader';
import { ReviewList } from './components/ReviewList/ReviewList';
import { Gallery } from './components/Gallery/Gallery';
import { About } from './components/About/About';
import { AvailabilityCalendar } from './components/AvailabilityCalendar/AvailabilityCalendar';
import { type ProfessionalProfile, type Service, type Review } from './types';

interface ProfessionalProfileTemplateProps {
  professional: ProfessionalProfile;
  services: Service[];
  reviews: Review[];
}

export const ProfessionalProfileTemplate = ({
  professional,
  services,
  reviews,
}: ProfessionalProfileTemplateProps) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProfileHeader professional={professional} />

      <Tabs defaultValue="services" className="mt-8">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-4 font-futura">
          <TabsTrigger
            value="services"
            className="data-[state=active]:text-[#DEA85B]"
          >
            Services
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="data-[state=active]:text-[#DEA85B]"
          >
            About
          </TabsTrigger>
          <TabsTrigger
            value="gallery"
            className="data-[state=active]:text-[#DEA85B]"
          >
            Gallery
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="data-[state=active]:text-[#DEA85B]"
          >
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          <ServiceList services={services} professionalId={professional.id} />
          <AvailabilityCalendar professionalId={professional.id} />
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <About professional={professional} />
        </TabsContent>

        <TabsContent value="gallery" className="mt-6">
          <Gallery photos={professional.featuredPhotos} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewList reviews={reviews} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

These guidelines should be applied consistently across the application to ensure a cohesive and professional user experience.
