-- Enable UUID generation
create extension if not exists "uuid-ossp";

/**
* ROLES
* Defines user roles in the system (client, professional, admin)
*/
create table roles (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table roles enable row level security;

-- Insert default roles
insert into roles (name) values ('client'), ('professional'), ('admin');

-- RLS policies for roles table
-- Anyone can view roles (needed for signup)
create policy "Anyone can view roles" on roles for select 
  using (true);

/**
* USERS
* Note: This table contains user data that extends auth.users
*/
create table users (
  -- UUID from auth.users
  id uuid references auth.users not null primary key,
  first_name text not null,
  last_name text not null,
  role_id uuid references roles not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table users enable row level security;

-- Helper functions for role checking
create or replace function is_professional(user_uuid uuid)
returns boolean as $$
declare
  is_professional boolean;
begin
  select exists(
    select 1 from users
    join roles on users.role_id = roles.id
    where users.id = user_uuid
    and roles.name = 'professional'
  ) into is_professional;
  
  return is_professional;
end;
$$ language plpgsql security definer;

create or replace function is_client(user_uuid uuid)
returns boolean as $$
declare
  is_client boolean;
begin
  select exists(
    select 1 from users
    join roles on users.role_id = roles.id
    where users.id = user_uuid
    and roles.name = 'client'
  ) into is_client;
  
  return is_client;
end;
$$ language plpgsql security definer;

-- RLS policies for users will be defined after all tables are created

/**
* ADDRESSES
* Stores detailed address information for users
*/
create table addresses (
  id uuid primary key default uuid_generate_v4(),
  country text,
  state text,
  city text,
  street_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table addresses enable row level security;

/**
* PROFESSIONAL_PROFILES
* Extended profile information for professionals
*/
create table professional_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users not null unique,
  description text,
  profession text,
  appointment_requirements text,
  phone_number text,
  working_hours jsonb, -- Store as JSON with days and hours
  location text,
  address_id uuid references addresses,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  is_published boolean default false,
  is_subscribed boolean default false,
  -- Stripe Connect fields
  stripe_account_id text,
  stripe_connect_status text default 'not_connected' not null check (stripe_connect_status in ('not_connected', 'pending', 'complete')),
  stripe_connect_updated_at timestamp with time zone,
  -- Payment settings
  requires_deposit boolean default false not null,
  deposit_type text default 'percentage' check (deposit_type in ('percentage', 'fixed')),
  deposit_value decimal(10, 2) check (
    (requires_deposit = false) OR
    (requires_deposit = true AND deposit_type = 'percentage' AND deposit_value >= 0 AND deposit_value <= 100) OR
    (requires_deposit = true AND deposit_type = 'fixed' AND deposit_value >= 0)
  ),
  balance_payment_method text default 'card' check (balance_payment_method in ('card', 'cash')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table professional_profiles enable row level security;

-- Create indexes for Stripe Connect fields
create index if not exists idx_professional_profiles_stripe_account_id 
on professional_profiles(stripe_account_id) 
where stripe_account_id is not null;

create index if not exists idx_professional_profiles_stripe_connect_status 
on professional_profiles(stripe_connect_status);

/**
* CLIENT_PROFILES
* Extended profile information for clients
*/
create table client_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users not null unique,
  phone_number text,
  location text,
  address_id uuid references addresses,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table client_profiles enable row level security;

/**
* SERVICES
* Services that can be offered by professionals
*/
create table services (
  id uuid primary key default uuid_generate_v4(),
  professional_profile_id uuid references professional_profiles not null,
  name text not null,
  description text,
  price decimal(10, 2) not null,
  duration integer not null, -- in minutes
  -- Stripe integration fields
  stripe_product_id text,
  stripe_price_id text,
  stripe_status text default 'draft' not null check (stripe_status in ('draft', 'active', 'inactive')),
  stripe_sync_status text default 'pending' not null check (stripe_sync_status in ('pending', 'synced', 'error')),
  stripe_sync_error text,
  stripe_synced_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table services enable row level security;

-- Create indexes for Stripe fields
create index if not exists idx_services_stripe_product_id 
on services(stripe_product_id) 
where stripe_product_id is not null;

create index if not exists idx_services_stripe_status 
on services(stripe_status);

create index if not exists idx_services_stripe_sync_status 
on services(stripe_sync_status);

-- Constraint to limit services to 10 per professional
create or replace function check_service_limit()
returns trigger as $$
begin
  if (select count(*) from services where professional_profile_id = new.professional_profile_id) >= 10 then
    raise exception 'Maximum of 10 services allowed per professional';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_service_limit
  before insert on services
  for each row
  execute function check_service_limit();

/**
* PROFESSIONAL_SERVICES
* Junction table to link professionals with their offered services
* Note: This table is no longer needed since we've added professional_profile_id to services
*/
-- drop table if exists professional_services;
-- Keep the table for now to avoid breaking existing code, but mark it as deprecated

-- RLS policies for services
-- Drop existing policies first
drop policy if exists "Anyone can view services" on services;
drop policy if exists "Professionals can delete their own services" on services;
drop policy if exists "Professionals can manage their own services" on services;
drop policy if exists "Anyone can view services from published professionals" on services;
drop policy if exists "Professionals can view their own unpublished services" on services;

-- New policies for services
create policy "Professionals can manage their own services"
  on services for all
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = services.professional_profile_id
      and professional_profiles.user_id = auth.uid()
    )
  );

create policy "Anyone can view services from published professionals"
  on services for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = services.professional_profile_id
      and professional_profiles.is_published = true
    )
  );

create policy "Professionals can view their own services"
  on services for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = services.professional_profile_id
      and professional_profiles.user_id = auth.uid()
    )
  );

-- RLS policies for addresses
create policy "Users can create addresses"
  on addresses for insert
  to authenticated
  with check (true);

create policy "Users can view addresses linked to their profile"
  on addresses for select
  using (
    exists (
      select 1 from client_profiles
      where client_profiles.address_id = addresses.id
      and client_profiles.user_id = auth.uid()
    )
    OR
    exists (
      select 1 from professional_profiles
      where professional_profiles.address_id = addresses.id
      and professional_profiles.user_id = auth.uid()
    )
  );
  
create policy "Users can update addresses linked to their profile"
  on addresses for update
  using (
    exists (
      select 1 from client_profiles
      where client_profiles.address_id = addresses.id
      and client_profiles.user_id = auth.uid()
    )
    OR
    exists (
      select 1 from professional_profiles
      where professional_profiles.address_id = addresses.id
      and professional_profiles.user_id = auth.uid()
    )
  );

create policy "Users can delete addresses linked to their profile"
  on addresses for delete
  using (
    exists (
      select 1 from client_profiles
      where client_profiles.address_id = addresses.id
      and client_profiles.user_id = auth.uid()
    )
    OR
    exists (
      select 1 from professional_profiles
      where professional_profiles.address_id = addresses.id
      and professional_profiles.user_id = auth.uid()
    )
  );

-- RLS policies for professional profiles
drop policy if exists "Professionals can view their own profile" on professional_profiles;
drop policy if exists "Professionals can update their own profile" on professional_profiles;
drop policy if exists "Anyone can view published professional profiles" on professional_profiles;

create policy "Professionals can view their own profile"
  on professional_profiles for select
  using (auth.uid() = user_id);
  
create policy "Professionals can update their own profile"
  on professional_profiles for update
  using (auth.uid() = user_id);
  
create policy "Anyone can view published professional profiles"
  on professional_profiles for select
  using (is_published = true);

-- RLS policies for client profiles
create policy "Clients can view and update their own profile"
  on client_profiles for select
  using (auth.uid() = user_id);
  
create policy "Clients can update their own profile"
  on client_profiles for update
  using (auth.uid() = user_id);

-- This trigger creates a professional profile when a user's role is changed to professional
create function handle_new_professional()
returns trigger as $$
declare
  professional_role_id uuid;
begin
  -- Only proceed if the role was changed to professional
  select id into professional_role_id from roles where name = 'professional';
  
  if new.role_id = professional_role_id then
    -- Create professional profile if it doesn't exist
    insert into professional_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_role_change
  after update of role_id on users
  for each row
  execute procedure handle_new_professional();

-- This trigger creates a client profile when a user's role is changed to client
create function handle_new_client()
returns trigger as $$
declare
  client_role_id uuid;
begin
  -- Only proceed if the role was changed to client
  select id into client_role_id from roles where name = 'client';
  
  if new.role_id = client_role_id then
    -- Create client profile if it doesn't exist
    insert into client_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_role_change_to_client
  after update of role_id on users
  for each row
  execute procedure handle_new_client();

/**
* This trigger automatically creates a user entry when a new user signs up via Supabase Auth.
* Role should be explicitly passed during registration
*/
create function public.handle_new_user() 
returns trigger as $$
declare
  user_role_id uuid;
  role_name text;
  first_name_val text;
  last_name_val text;
begin
  -- Get the role from metadata with better error handling
  role_name := new.raw_user_meta_data->>'role';
  
  -- Log for debugging
  RAISE NOTICE 'Raw user meta data: %', new.raw_user_meta_data;
  RAISE NOTICE 'Role name extracted: %', role_name;
  
  -- Extract first and last name from metadata (handles both custom signup and OAuth)
  first_name_val := coalesce(
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'given_name',
    split_part(new.raw_user_meta_data->>'name', ' ', 1),
    split_part(new.raw_user_meta_data->>'full_name', ' ', 1),
    ''
  );
  
  last_name_val := coalesce(
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'family_name',
    case when new.raw_user_meta_data->>'name' is not null then
      trim(substr(new.raw_user_meta_data->>'name', length(split_part(new.raw_user_meta_data->>'name', ' ', 1)) + 2))
    when new.raw_user_meta_data->>'full_name' is not null then
      trim(substr(new.raw_user_meta_data->>'full_name', length(split_part(new.raw_user_meta_data->>'full_name', ' ', 1)) + 2))
    else ''
    end,
    ''
  );
  
  -- For OAuth users without role metadata, we'll handle them in the callback
  -- For regular signups, validate the role
  if role_name is not null then
    -- Validate the role with better error message
    if role_name != 'client' and role_name != 'professional' then
      RAISE NOTICE 'Invalid role specified: %', role_name;
      role_name := 'client'; -- Default to client if not specified properly
    end if;
    
    -- Get the corresponding role ID with fully qualified schema
    select id into user_role_id from public.roles where name = role_name;
    
    if user_role_id is null then
      RAISE EXCEPTION 'Could not find role_id for role: %', role_name;
    end if;
    
    -- Insert the user with the specified role
    begin
    insert into public.users (
      id, 
      first_name, 
      last_name, 
      role_id
    )
    values (
      new.id, 
      first_name_val,
      last_name_val,
      user_role_id
    );
    exception when others then
      RAISE EXCEPTION 'Error creating user record: %', SQLERRM;
    end;
    
    -- Create the appropriate profile based on role
    begin
    if role_name = 'professional' then
        insert into public.professional_profiles (user_id)
      values (new.id);
    elsif role_name = 'client' then
        insert into public.client_profiles (user_id)
      values (new.id);
    end if;
    exception when others then
      RAISE EXCEPTION 'Error creating profile record: %', SQLERRM;
    end;
  else
    -- OAuth user without role metadata - create basic user record without role
    -- Role will be assigned later in the callback
    RAISE NOTICE 'OAuth user detected, creating basic user record without role';
    
    begin
    insert into public.users (
      id, 
      first_name, 
      last_name, 
      role_id
    )
    values (
      new.id, 
      first_name_val,
      last_name_val,
      (select id from public.roles where name = 'client' limit 1) -- Temporary default role
    );
    exception when others then
      RAISE EXCEPTION 'Error creating OAuth user record: %', SQLERRM;
    end;
    
    -- Create default client profile (will be updated in callback if needed)
    begin
    insert into public.client_profiles (user_id)
    values (new.id);
    exception when others then
      RAISE EXCEPTION 'Error creating OAuth client profile: %', SQLERRM;
    end;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Drop the existing photos table and enum
drop table if exists photos;
drop type if exists photo_type;

/**
* PROFILE_PHOTOS
* One profile photo per user (both clients and professionals)
*/
create table profile_photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users not null unique, -- Unique constraint ensures only one photo per user
  url text not null,
  filename text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table profile_photos enable row level security;

-- RLS policies for profile photos
create policy "Users can view their own profile photo"
  on profile_photos for select
  using (auth.uid() = user_id);
  
create policy "Users can insert their own profile photo"
  on profile_photos for insert
  with check (auth.uid() = user_id);
  
create policy "Users can update their own profile photo"
  on profile_photos for update
  using (auth.uid() = user_id);
  
create policy "Users can delete their own profile photo"
  on profile_photos for delete
  using (auth.uid() = user_id);
  
create policy "Anyone can view profile photos of published professionals"
  on profile_photos for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.user_id = profile_photos.user_id
      and professional_profiles.is_published = true
    )
  );

/**
* PORTFOLIO_PHOTOS
* Up to 10 portfolio photos per professional
*/
create table portfolio_photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users not null,
  url text not null,
  filename text not null,
  description text,
  order_index integer not null default 0, -- For ordering the portfolio photos
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint user_is_professional check (is_professional(user_id)) -- Ensure only professionals can have portfolio photos
);
alter table portfolio_photos enable row level security;

-- Add constraint to limit portfolio photos to 10 per user
create or replace function check_portfolio_photo_limit()
returns trigger as $$
begin
  if (select count(*) from portfolio_photos where user_id = new.user_id) >= 10 then
    raise exception 'Maximum of 10 portfolio photos allowed per professional';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_portfolio_photo_limit
  before insert on portfolio_photos
  for each row
  execute function check_portfolio_photo_limit();

-- RLS policies for portfolio photos
create policy "Professionals can view their own portfolio photos"
  on portfolio_photos for select
  using (auth.uid() = user_id);
  
create policy "Professionals can insert their own portfolio photos"
  on portfolio_photos for insert
  with check (auth.uid() = user_id);
  
create policy "Professionals can update their own portfolio photos"
  on portfolio_photos for update
  using (auth.uid() = user_id);
  
create policy "Professionals can delete their own portfolio photos"
  on portfolio_photos for delete
  using (auth.uid() = user_id);
  
create policy "Anyone can view portfolio photos of published professionals"
  on portfolio_photos for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.user_id = portfolio_photos.user_id
      and professional_profiles.is_published = true
    )
  );

/**
* PAYMENT_METHODS
* Master list of available payment methods
*/
create table payment_methods (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  is_online boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table payment_methods enable row level security;

-- RLS policies for payment_methods
create policy "Anyone can view available payment methods" 
  on payment_methods for select
  using (true);

/**
* PROFESSIONAL_PAYMENT_METHODS
* Junction table linking professionals to the payment methods they accept
*/
create table professional_payment_methods (
  id uuid primary key default uuid_generate_v4(),
  professional_profile_id uuid references professional_profiles not null,
  payment_method_id uuid references payment_methods not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_professional_payment_method unique (professional_profile_id, payment_method_id)
);
alter table professional_payment_methods enable row level security;

-- RLS policies for professional_payment_methods
create policy "Professionals can view their own accepted payment methods" 
  on professional_payment_methods for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = professional_payment_methods.professional_profile_id
      and professional_profiles.user_id = auth.uid()
    )
  );

create policy "Professionals can manage their own accepted payment methods" 
  on professional_payment_methods for all -- insert, update, delete
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = professional_payment_methods.professional_profile_id
      and professional_profiles.user_id = auth.uid()
    )
  );

create policy "Anyone can view payment methods of published professionals"
  on professional_payment_methods for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = professional_payment_methods.professional_profile_id
      and professional_profiles.is_published = true
    )
  );

/**
* STRIPE INTEGRATION
* Tables for Stripe integration
*/
create table customers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users not null unique,
  stripe_customer_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table customers enable row level security;

-- RLS policy for customers table
create policy "Users can view their own customer data"
  on customers for select
  using (auth.uid() = user_id);

create policy "Users can create their own customer record"
  on customers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own customer record"
  on customers for update
  using (auth.uid() = user_id);

/**
* SUBSCRIPTION SYSTEM
* Tables for managing professional subscriptions
*/

/**
* SUBSCRIPTION_PLANS
* Available subscription plans for professionals
*/
create table subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price decimal(10, 2) not null,
  interval text not null check (interval in ('month', 'year')),
  stripe_price_id text, -- For Stripe integration
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table subscription_plans enable row level security;

-- Insert default subscription plans
insert into subscription_plans (name, description, price, interval) 
values 
  ('Monthly', 'Standard monthly subscription', 19.99, 'month'),
  ('Yearly', 'Standard yearly subscription (save 15%)', 199.99, 'year');

/**
* PROFESSIONAL_SUBSCRIPTIONS
* Tracks active subscriptions for professionals
*/
create table professional_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  professional_profile_id uuid references professional_profiles not null,
  subscription_plan_id uuid references subscription_plans not null,
  status text not null check (status in ('active', 'cancelled', 'expired')),
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  end_date timestamp with time zone,
  stripe_subscription_id text, -- For Stripe integration
  cancel_at_period_end boolean default false not null, -- Track if subscription is scheduled to cancel at period end
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table professional_subscriptions enable row level security;

/**
* Create a function to update is_subscribed flag on professional_profiles
* whenever a subscription is created, updated, or deleted
*/
create or replace function update_professional_subscription_status()
returns trigger as $$
begin
  -- If the subscription is being created or updated
  if (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') then
    -- Set is_subscribed to true if the professional has an active subscription
    update professional_profiles
    set is_subscribed = true, updated_at = now()
    where id = new.professional_profile_id
    and exists (
      select 1 from professional_subscriptions
      where professional_profile_id = new.professional_profile_id
      and status = 'active'
    );
  end if;
  
  -- If the subscription is being deleted or updated (to non-active)
  if (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND new.status != 'active')) then
    -- Set is_subscribed to false if the professional has no active subscriptions
    update professional_profiles
    set is_subscribed = false, updated_at = now()
    where id = CASE WHEN TG_OP = 'DELETE' THEN old.professional_profile_id ELSE new.professional_profile_id END
    and not exists (
      select 1 from professional_subscriptions
      where professional_profile_id = CASE WHEN TG_OP = 'DELETE' THEN old.professional_profile_id ELSE new.professional_profile_id END
      and status = 'active'
    );
  end if;
  
  return CASE WHEN TG_OP = 'DELETE' THEN old ELSE new END;
end;
$$ language plpgsql;

-- Create triggers for the update_professional_subscription_status function
create trigger after_professional_subscription_insert
  after insert on professional_subscriptions
  for each row
  execute function update_professional_subscription_status();
  
create trigger after_professional_subscription_update
  after update on professional_subscriptions
  for each row
  execute function update_professional_subscription_status();
  
create trigger after_professional_subscription_delete
  after delete on professional_subscriptions
  for each row
  execute function update_professional_subscription_status();

/**
* RLS policies for subscription tables
*/

-- Subscription plans - visible to all, only editable by admins
create policy "Anyone can view subscription plans"
  on subscription_plans for select
  using (true);

-- Professional subscriptions - visible to the professional or admins
create policy "Professionals can view their own subscriptions"
  on professional_subscriptions for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = professional_subscriptions.professional_profile_id
      and professional_profiles.user_id = auth.uid()
    )
  );

/**
* BOOKING SYSTEM
* Tables and functions related to bookings and appointments
*/

/**
* BOOKINGS
* Core table to track bookings
*/
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references users not null,
  professional_profile_id uuid references professional_profiles not null,
  status text not null check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table bookings enable row level security;

/**
* APPOINTMENTS
* For tracking the actual appointment details
*/
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings not null unique,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null check (status in ('upcoming', 'completed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table appointments enable row level security;

/**
* BOOKING_SERVICES
* To link bookings with services (allowing multiple services per booking)
*/
create table booking_services (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings not null,
  service_id uuid references services not null,
  price decimal(10, 2) not null, -- Store price at time of booking
  duration integer not null, -- in minutes, store duration at time of booking
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table booking_services enable row level security;

/**
* BOOKING_PAYMENTS
* To track payment details
*/
create table booking_payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings not null unique,
  payment_method_id uuid references payment_methods not null,
  amount decimal(10, 2) not null,
  tip_amount decimal(10, 2) default 0 not null,
  service_fee decimal(10, 2) not null,
  status text not null check (status in ('pending', 'completed', 'failed', 'refunded', 'deposit_paid', 'awaiting_balance')),
  stripe_payment_intent_id text, -- For Stripe integration
  -- Stripe checkout session fields
  stripe_checkout_session_id text,
  deposit_amount decimal(10, 2) default 0 not null,
  balance_amount decimal(10, 2) default 0 not null,
  payment_type text default 'full' not null check (payment_type in ('full', 'deposit', 'balance')),
  requires_balance_payment boolean default false not null,
  balance_payment_method text check (balance_payment_method in ('card', 'cash')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table booking_payments enable row level security;

-- Create index for checkout session lookups
create index if not exists idx_booking_payments_stripe_checkout_session_id 
on booking_payments(stripe_checkout_session_id) 
where stripe_checkout_session_id is not null;

/**
* Function to check professional availability
* Prevents double booking
*/
create or replace function check_professional_availability()
returns trigger as $$
begin
  if exists (
    select 1 from appointments a
    join bookings b on a.booking_id = b.id
    where b.professional_profile_id = (
      select professional_profile_id from bookings where id = new.booking_id
    )
    and a.date = new.date
    and a.status != 'cancelled'
    and a.booking_id != new.booking_id
    and (
      (new.start_time < a.end_time and new.end_time > a.start_time) -- time slots overlap
    )
  ) then
    raise exception 'Professional is already booked for this time slot';
  end if;
  return new;
end;
$$ language plpgsql;

/**
* Trigger to enforce no double booking
*/
create trigger enforce_no_double_booking
  before insert or update on appointments
  for each row
  execute function check_professional_availability();

/**
* RLS policies for booking tables
*/

-- Booking policies
create policy "Clients can view their own bookings"
  on bookings for select
  using (auth.uid() = client_id);

create policy "Professionals can view bookings for their profile"
  on bookings for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = bookings.professional_profile_id
      and professional_profiles.user_id = auth.uid()
    )
  );

create policy "Clients can create their own bookings"
  on bookings for insert
  with check (auth.uid() = client_id);

create policy "Clients can update their own bookings"
  on bookings for update
  using (auth.uid() = client_id);

-- Appointment policies
create policy "Clients can view their appointments"
  on appointments for select
  using (
    exists (
      select 1 from bookings
      where bookings.id = appointments.booking_id
      and bookings.client_id = auth.uid()
    )
  );

create policy "Professionals can view appointments for their profile"
  on appointments for select
  using (
    exists (
      select 1 from bookings
      join professional_profiles on bookings.professional_profile_id = professional_profiles.id
      where bookings.id = appointments.booking_id
      and professional_profiles.user_id = auth.uid()
    )
  );

-- Add policy to allow clients to create appointments for their bookings
create policy "Clients can create appointments for their bookings"
  on appointments for insert
  with check (
    exists (
      select 1 from bookings
      where bookings.id = appointments.booking_id
      and bookings.client_id = auth.uid()
    )
  );

-- Booking services policies
create policy "Users can view booking services for their bookings"
  on booking_services for select
  using (
    exists (
      select 1 from bookings
      where bookings.id = booking_services.booking_id
      and (
        bookings.client_id = auth.uid()
        or exists (
          select 1 from professional_profiles
          where professional_profiles.id = bookings.professional_profile_id
          and professional_profiles.user_id = auth.uid()
        )
      )
    )
  );

create policy "Clients can create booking services for their bookings"
  on booking_services for insert
  with check (
    exists (
      select 1 from bookings
      where bookings.id = booking_services.booking_id
      and bookings.client_id = auth.uid()
    )
  );

-- Booking payments policies
create policy "Users can view booking payments for their bookings"
  on booking_payments for select
  using (
    exists (
      select 1 from bookings
      where bookings.id = booking_payments.booking_id
      and (
        bookings.client_id = auth.uid()
        or exists (
          select 1 from professional_profiles
          where professional_profiles.id = bookings.professional_profile_id
          and professional_profiles.user_id = auth.uid()
        )
      )
    )
  );

create policy "Clients can create booking payments for their bookings"
  on booking_payments for insert
  with check (
    exists (
      select 1 from bookings
      where bookings.id = booking_payments.booking_id
      and bookings.client_id = auth.uid()
    )
  );

/**
* Update realtime subscriptions to include booking tables
*/
drop publication if exists supabase_realtime;
create publication supabase_realtime for table 
  services, 
  bookings, 
  appointments, 
  subscription_plans, 
  professional_subscriptions;

/**
* STORAGE BUCKETS
* Define storage buckets and their policies
*/
-- Create profile-photos bucket
insert into storage.buckets (id, name, public)
  values ('profile-photos', 'Profile Photos', true); -- TODO: change to false

-- Create portfolio-photos bucket (not public)
insert into storage.buckets (id, name, public)
  values ('portfolio-photos', 'Portfolio Photos', false);

-- Policies for profile-photos bucket
create policy "Allow authenticated uploads to profile-photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to modify their own profile photos"
  on storage.objects for update to authenticated
  with check (
    bucket_id = 'profile-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to delete their own profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to see all profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
  );

-- Policies for portfolio-photos bucket
create policy "Allow authenticated uploads to portfolio-photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to modify their own portfolio photos"
  on storage.objects for update to authenticated
  with check (
    bucket_id = 'portfolio-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow authenticated users to delete their own portfolio photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Allow viewing portfolio photos of published professionals"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portfolio-photos' and
    exists (
      select 1 from professional_profiles
      where professional_profiles.user_id::text = (storage.foldername(name))[1]
      and professional_profiles.is_published = true
    )
  );

/**
* USER POLICIES
* Define RLS policies for users after all tables are created
*/
-- RLS policies for users
drop policy if exists "Users can view their own data" on users;

create policy "Users can view their own data"
  on users for select
  using (auth.uid() = id);

-- Modified policy to avoid circular reference
drop policy if exists "Anyone can view user data for published professionals" on users;
create policy "Anyone can view user data for published professionals"
  on users for select
  using (
    id in (
      select user_id from professional_profiles
      where is_published = true
    )
  );

-- Add back the update policy that was missing
drop policy if exists "Users can update their own basic data" on users;
create policy "Users can update their own basic data"
  on users for update
  using (auth.uid() = id)
  with check (
    -- Can't change their own role - using a parameter instead of a subquery
    auth.uid() = id AND
    role_id IS NOT NULL
  );

-- RLS policies for profile photos
drop policy if exists "Anyone can view profile photos of published professionals" on profile_photos;

create policy "Anyone can view profile photos of published professionals"
  on profile_photos for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.user_id = profile_photos.user_id
      and professional_profiles.is_published = true
    )
  );

/**
* STRIPE SYNCHRONIZATION FUNCTIONS AND TRIGGERS
* Functions and triggers to handle Stripe product synchronization
*/

-- Function to mark services for Stripe sync when they are modified
create or replace function handle_service_stripe_sync()
returns trigger as $$
begin
  -- Mark service for Stripe sync on any change
  new.stripe_sync_status = 'pending';
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to mark services for sync when they are created or updated
create trigger service_stripe_sync_trigger
  before insert or update on services
  for each row
  execute function handle_service_stripe_sync();

-- Function to handle professional profile changes that affect Stripe sync
create or replace function handle_professional_profile_stripe_changes()
returns trigger as $$
begin
  -- Mark all services for re-sync when key fields change that affect Stripe status
  if (old.is_published is distinct from new.is_published or 
      old.is_subscribed is distinct from new.is_subscribed or 
      old.stripe_connect_status is distinct from new.stripe_connect_status) then
    
    update services 
    set stripe_sync_status = 'pending', 
        updated_at = timezone('utc'::text, now())
    where professional_profile_id = new.id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger for professional profile changes
create trigger professional_profile_stripe_sync_trigger
  after update on professional_profiles
  for each row
  execute function handle_professional_profile_stripe_changes();

-- Function to handle payment method changes that affect Stripe sync
create or replace function handle_payment_method_stripe_changes()
returns trigger as $$
declare
  credit_card_method_id uuid;
  professional_has_credit_card boolean;
begin
  -- Get the credit card payment method ID
  select id into credit_card_method_id 
  from payment_methods 
  where name = 'Credit Card' or name = 'credit card' or name = 'Card'
  limit 1;
  
  if credit_card_method_id is null then
    return coalesce(new, old);
  end if;
  
  -- Check if this change involves the credit card payment method
  if (tg_op = 'INSERT' and new.payment_method_id = credit_card_method_id) or
     (tg_op = 'DELETE' and old.payment_method_id = credit_card_method_id) or
     (tg_op = 'UPDATE' and (old.payment_method_id = credit_card_method_id or new.payment_method_id = credit_card_method_id)) then
    
    -- Mark all services for this professional for re-sync
    update services 
    set stripe_sync_status = 'pending', 
        updated_at = timezone('utc'::text, now())
    where professional_profile_id = coalesce(new.professional_profile_id, old.professional_profile_id);
  end if;
  
  return coalesce(new, old);
end;
$$ language plpgsql;

-- Trigger for payment method changes
create trigger payment_method_stripe_sync_trigger
  after insert or update or delete on professional_payment_methods
  for each row
  execute function handle_payment_method_stripe_changes();

