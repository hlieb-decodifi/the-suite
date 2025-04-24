# The Suite - Database Schema

This document outlines the database schema for The Suite platform, including table definitions, relationships, and security rules for Supabase implementation.

## Schema Overview

The database is structured around the following core entities:

- Users (authentication)
- Profiles (user details by role)
- Services (offered by professionals)
- Bookings (appointments between clients and professionals)
- Reviews (client feedback for professionals)
- Categories (service categorization)
- Availability (professional scheduling)
- Messages (communication between users)

## Table Definitions

### `public.profiles`

Extends the Supabase auth.users table with additional profile information.

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('client', 'professional', 'admin')),
  first_name text,
  last_name text,
  avatar_url text,
  phone_number text,
  email text not null,
  bio text,
  location_data jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Define access policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
```

### `public.professional_profiles`

Extended information for professional users.

```sql
create table public.professional_profiles (
  id uuid references public.profiles on delete cascade primary key,
  business_name text,
  specializations text[],
  years_of_experience integer,
  certifications jsonb,
  featured_photos text[],
  average_rating numeric(3, 2),
  is_verified boolean default false,
  social_media jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security
alter table public.professional_profiles enable row level security;

-- Define access policies
create policy "Professional profiles are viewable by everyone"
  on professional_profiles for select
  using (true);

create policy "Professionals can update their own profile"
  on professional_profiles for update
  using (
    auth.uid() = id and
    exists(select 1 from profiles where id = auth.uid() and role = 'professional')
  );
```

### `public.categories`

Service categories for organization and discovery.

```sql
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  icon_url text,
  parent_id uuid references public.categories,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security
alter table public.categories enable row level security;

-- Define access policies
create policy "Categories are viewable by everyone"
  on categories for select
  using (true);

create policy "Only admins can modify categories"
  on categories for all
  using (
    exists(select 1 from profiles where id = auth.uid() and role = 'admin')
  );
```

### `public.services`

Services offered by professionals.

```sql
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  professional_id uuid references public.professional_profiles not null,
  category_id uuid references public.categories not null,
  name text not null,
  description text,
  price numeric(10, 2) not null,
  duration_minutes integer not null,
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security
alter table public.services enable row level security;

-- Define access policies
create policy "Services are viewable by everyone"
  on services for select
  using (true);

create policy "Professionals can manage their own services"
  on services for all
  using (
    professional_id = auth.uid() and
    exists(select 1 from profiles where id = auth.uid() and role = 'professional')
  );
```

### `public.availability`

Professional availability slots.

```sql
create table public.availability (
  id uuid default uuid_generate_v4() primary key,
  professional_id uuid references public.professional_profiles not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean default true,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  -- Ensure end_time is after start_time
  constraint valid_time_range check (end_time > start_time)
);

-- Enable Row Level Security
alter table public.availability enable row level security;

-- Define access policies
create policy "Availability is viewable by everyone"
  on availability for select
  using (true);

create policy "Professionals can manage their own availability"
  on availability for all
  using (
    professional_id = auth.uid() and
    exists(select 1 from profiles where id = auth.uid() and role = 'professional')
  );
```

### `public.bookings`

Appointment bookings between clients and professionals.

```sql
create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');

create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.profiles not null,
  professional_id uuid references public.professional_profiles not null,
  service_id uuid references public.services not null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status booking_status default 'pending' not null,
  notes text,
  payment_status text check (payment_status in ('unpaid', 'deposit_paid', 'fully_paid', 'refunded')),
  payment_amount numeric(10, 2),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable Row Level Security
alter table public.bookings enable row level security;

-- Define access policies
create policy "Users can view their own bookings"
  on bookings for select
  using (
    client_id = auth.uid() or
    professional_id = auth.uid()
  );

create policy "Clients can create bookings"
  on bookings for insert
  using (
    client_id = auth.uid() and
    exists(select 1 from profiles where id = auth.uid() and role = 'client')
  );

create policy "Involved parties can update bookings"
  on bookings for update
  using (
    client_id = auth.uid() or
    professional_id = auth.uid()
  );
```

### `public.reviews`

Client reviews for professional services.

```sql
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references public.bookings not null,
  client_id uuid references public.profiles not null,
  professional_id uuid references public.professional_profiles not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  professional_response text,
  is_public boolean default true,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  -- Ensure one review per booking
  constraint one_review_per_booking unique (booking_id)
);

-- Enable Row Level Security
alter table public.reviews enable row level security;

-- Define access policies
create policy "Reviews are viewable by everyone"
  on reviews for select
  using (is_public);

create policy "Clients can create reviews for their bookings"
  on reviews for insert
  using (
    client_id = auth.uid() and
    exists(
      select 1 from bookings
      where id = booking_id and client_id = auth.uid() and status = 'completed'
    )
  );

create policy "Clients can update their own reviews"
  on reviews for update
  using (
    client_id = auth.uid()
  )
  with check (
    client_id = auth.uid() and
    (
      -- Only allow updating comment and is_public
      (
        (old.rating = new.rating) and
        (old.booking_id = new.booking_id) and
        (old.client_id = new.client_id) and
        (old.professional_id = new.professional_id)
      )
    )
  );

create policy "Professionals can respond to their reviews"
  on reviews for update
  using (
    professional_id = auth.uid()
  )
  with check (
    professional_id = auth.uid() and
    (
      -- Only allow updating professional_response
      (
        (old.rating = new.rating) and
        (old.comment = new.comment) and
        (old.booking_id = new.booking_id) and
        (old.client_id = new.client_id) and
        (old.professional_id = new.professional_id) and
        (old.is_public = new.is_public)
      )
    )
  );
```

### `public.messages`

In-platform communication between users.

```sql
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles not null,
  recipient_id uuid references public.profiles not null,
  related_booking_id uuid references public.bookings,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now() not null
);

-- Enable Row Level Security
alter table public.messages enable row level security;

-- Define access policies
create policy "Users can access messages they sent or received"
  on messages for select
  using (
    sender_id = auth.uid() or
    recipient_id = auth.uid()
  );

create policy "Users can send messages"
  on messages for insert
  using (
    sender_id = auth.uid()
  );

create policy "Recipients can mark messages as read"
  on messages for update
  using (
    recipient_id = auth.uid()
  )
  with check (
    recipient_id = auth.uid() and
    (
      -- Only allow updating is_read flag
      (
        (old.sender_id = new.sender_id) and
        (old.recipient_id = new.recipient_id) and
        (old.related_booking_id = new.related_booking_id) and
        (old.content = new.content) and
        (old.created_at = new.created_at)
      )
    )
  );
```

## Database Functions

### Update Professional Average Rating

```sql
create or replace function update_professional_rating()
returns trigger as $$
begin
  update professional_profiles
  set average_rating = (
    select avg(rating)
    from reviews
    where professional_id = new.professional_id
    and is_public = true
  )
  where id = new.professional_id;
  return new;
end;
$$ language plpgsql;

create trigger update_rating_after_review
after insert or update or delete on reviews
for each row
execute function update_professional_rating();
```

### Check Availability Before Booking

```sql
create or replace function check_booking_availability(
  p_professional_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time
)
returns boolean as $$
declare
  day_of_week integer;
  is_available boolean;
  conflicting_bookings integer;
begin
  -- Calculate day of week (0 = Sunday, 6 = Saturday)
  day_of_week := extract(dow from p_booking_date);

  -- Check if professional is generally available at this time
  select exists(
    select 1 from availability
    where professional_id = p_professional_id
    and day_of_week = day_of_week
    and start_time <= p_start_time
    and end_time >= p_end_time
    and is_available = true
  ) into is_available;

  if not is_available then
    return false;
  end if;

  -- Check for conflicting bookings
  select count(*)
  from bookings
  where professional_id = p_professional_id
  and booking_date = p_booking_date
  and status in ('pending', 'confirmed')
  and (
    (start_time <= p_start_time and end_time > p_start_time) or
    (start_time < p_end_time and end_time >= p_end_time) or
    (start_time >= p_start_time and end_time <= p_end_time)
  )
  into conflicting_bookings;

  return conflicting_bookings = 0;
end;
$$ language plpgsql;
```

## Indexes

```sql
-- Profile searching
create index idx_profiles_role on profiles(role);
create index idx_professional_profiles_specializations on professional_profiles using gin(specializations);

-- Service discovery
create index idx_services_category_id on services(category_id);
create index idx_services_professional_id on services(professional_id);
create index idx_services_price on services(price);
create index idx_services_is_active on services(is_active);

-- Booking management
create index idx_bookings_client_id on bookings(client_id);
create index idx_bookings_professional_id on bookings(professional_id);
create index idx_bookings_status on bookings(status);
create index idx_bookings_date on bookings(booking_date);

-- Review queries
create index idx_reviews_professional_id on reviews(professional_id);
create index idx_reviews_rating on reviews(rating);
```

## Realtime Subscriptions

Enable realtime for key tables to support live updates:

```sql
-- Enable realtime for selected tables
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table messages;
```

## Security Considerations

1. Row Level Security (RLS) is enabled on all tables to control data access
2. Policies enforce role-based permissions for each table
3. Sensitive operations verify user roles and relationships
4. Functions validate business rules before allowing data modifications
5. Triggers maintain data integrity and derived values
