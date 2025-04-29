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

-- RLS policies for users table
create policy "Users can view their own data"
  on users for select
  using (auth.uid() = id);
  
create policy "Users can update their own basic data"
  on users for update
  using (auth.uid() = id)
  with check (
    -- Can't change their own role
    auth.uid() = id AND
    role_id = (SELECT role_id FROM users WHERE id = auth.uid())
  );

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
  appointment_requirements text,
  phone_number text,
  working_hours jsonb, -- Store as JSON with days and hours
  location text,
  address_id uuid references addresses,
  facebook_url text,
  instagram_url text,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table professional_profiles enable row level security;

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
  name text not null,
  description text,
  price decimal(10, 2) not null,
  duration integer not null, -- in minutes
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table services enable row level security;

/**
* PROFESSIONAL_SERVICES
* Junction table to link professionals with their offered services
*/
create table professional_services (
  professional_profile_id uuid references professional_profiles not null,
  service_id uuid references services not null,
  price decimal(10, 2), -- Optional override of service price
  duration integer, -- Optional override of service duration
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (professional_profile_id, service_id)
);
alter table professional_services enable row level security;

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

-- RLS policies for services
create policy "Anyone can view services"
  on services for select
  using (true);

create policy "Professionals can delete their own services"
  on services for delete
  using (
    exists (
      select 1 from professional_profiles
      join professional_services on professional_profiles.id = professional_services.professional_profile_id
      where professional_profiles.user_id = auth.uid()
      and professional_services.service_id = services.id
    )
  );

-- RLS policies for professional services
create policy "Anyone can view professional services"
  on professional_services for select
  using (
    -- If the professional profile is published
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = professional_services.professional_profile_id
      and professional_profiles.is_published = true
    )
  );
  
create policy "Professionals can manage their own services"
  on professional_services for all
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = professional_services.professional_profile_id
      and professional_profiles.user_id = auth.uid()
    )
  );

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
begin
  -- Get the role from metadata with better error handling
  role_name := new.raw_user_meta_data->>'role';
  
  -- Log for debugging
  RAISE NOTICE 'Raw user meta data: %', new.raw_user_meta_data;
  RAISE NOTICE 'Role name extracted: %', role_name;
  
  -- Validate the role with better error message
  if role_name is null or (role_name != 'client' and role_name != 'professional') then
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
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
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
* REALTIME SUBSCRIPTIONS
* Only allow realtime listening on public tables.
*/
drop publication if exists supabase_realtime;
create publication supabase_realtime for table services;
