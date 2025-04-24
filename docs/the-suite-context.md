# The Suite - Project Context

## Project Overview

"The Suite" is a comprehensive platform connecting clients with beauty professionals. The platform facilitates service discovery, booking management, and professional portfolio showcasing within the beauty industry.

## User Roles

### 1. Clients

- End users seeking beauty services
- Can browse professionals and services
- Can book and manage appointments
- Can leave reviews and ratings
- Can maintain a profile with preferences and history

### 2. Professionals

- Beauty service providers (stylists, makeup artists, estheticians, etc.)
- Can create and showcase professional portfolios
- Can list and manage service offerings
- Can manage availability calendar
- Can accept/decline booking requests
- Can view client histories and preferences

### 3. Administrators

- Platform managers with elevated privileges
- Can verify and approve professional accounts
- Can moderate reviews and content
- Can manage platform settings and features
- Can access analytics and reporting

## Core Features

### Authentication and Authorization

- Secure user registration and login
- Role-based access control
- Profile management for all user types
- Identity verification for professionals

### Professional Profiles

- Detailed professional portfolios with:
  - Biography and qualifications
  - Service areas and specialties
  - Photo gallery of previous work
  - Client reviews and ratings
  - Certifications and credentials

### Service Management

- Professionals can create and manage service offerings
- Service categorization and discovery
- Pricing and duration specifications
- Service availability management

### Booking System

- Calendar-based availability management
- Real-time booking functionality
- Appointment confirmation workflow
- Cancellation and rescheduling options
- Reminder notifications

### Search and Discovery

- Location-based search functionality
- Category and service type filtering
- Advanced search with multiple criteria
- Featured and recommended professionals

### Review and Rating System

- Post-service client reviews
- Star ratings for various aspects of service
- Professional response capabilities
- Moderation system for inappropriate content

### Notifications and Communications

- Appointment reminders
- Booking confirmations and updates
- In-platform messaging between clients and professionals
- System announcements and updates

### Payment Processing

- Secure payment collection
- Multiple payment method support
- Deposit and full payment options
- Refund processing for cancellations
- Professional payout management

### Admin Dashboard

- User management interface
- Content moderation tools
- Platform analytics and reporting
- System configuration and settings

## Technical Architecture

### Frontend

- Next.js with TypeScript for type safety
- React for component-based UI
- Tailwind CSS with shadcn/ui for design system
- Zustand for state management
- React Query for data fetching
- React Hook Form with Zod for form validation

### Backend

- Supabase for authentication, database, and storage
- PostgreSQL database with row-level security
- Supabase edge functions for custom backend logic
- Real-time subscriptions for live updates

### Data Model

#### Users

- Base user properties (email, password, etc.)
- Role-specific profile information
- Authentication and session management

#### Professional Profiles

- Detailed information about professionals
- Portfolio images and content
- Service areas and specializations
- Availability settings

#### Services

- Service definitions and details
- Pricing and duration information
- Category and tag associations
- Availability rules

#### Bookings

- Appointment details and status
- Client and professional references
- Scheduling information
- Payment status

#### Reviews

- Rating data for completed services
- Written review content
- Professional responses
- Moderation status

## Development Guidelines

### Code Organization

- Follow component organization patterns defined in project standards
- Maintain clear separation of concerns between UI, state, and data fetching
- Implement proper TypeScript interfaces for all data structures
- Use dedicated folders for domain-specific components and logic

### State Management

- Use Zustand stores organized by domain
- Separate UI state from application data
- Implement proper typing for all state
- Handle loading, error, and success states consistently

### Authentication Flow

- Implement secure authentication using Supabase
- Handle role-based redirects and protected routes
- Maintain session state across the application
- Implement proper error handling for auth failures

### Styling Approach

- Use Tailwind CSS utility classes
- Leverage shadcn/ui components for consistent UI
- Maintain responsive design across all views
- Follow accessibility best practices

## Environment Setup

- Next.js application with TypeScript configuration
- Supabase project setup with schema definitions
- Development, staging, and production environments
- CI/CD pipeline for automated testing and deployment
