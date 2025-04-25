-- Enable UUID generation
create extension if not exists "uuid-ossp";

/**
* Helper functions for role checking
* These need to be defined BEFORE they are used in RLS policies
*/
create or replace function is_admin(user_uuid uuid)
returns boolean as $$
declare
  is_admin boolean;
begin
  select exists(
    select 1 from users
    join roles on users.role_id = roles.id
    where users.id = user_uuid
    and roles.name = 'admin'
  ) into is_admin;
  
  return is_admin;
end;
$$ language plpgsql security definer;

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
  
create policy "Only admins can insert roles" 
  on roles for insert 
  with check (is_admin(auth.uid()));
  
create policy "Only admins can update roles" 
  on roles for update 
  using (is_admin(auth.uid()));
  
create policy "Only admins can delete roles" 
  on roles for delete 
  using (is_admin(auth.uid()));

/**
* USERS
* Note: This table contains user data that extends auth.users
*/
create table users (
  -- UUID from auth.users
  id uuid references auth.users not null primary key,
  first_name text not null,
  last_name text not null,
  avatar_url text,
  role_id uuid references roles not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table users enable row level security;

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

create policy "Admins can view all user data"
  on users for select
  using (is_admin(auth.uid()));
  
create policy "Admins can update all user data"
  on users for update
  using (is_admin(auth.uid()));
  
create policy "Admins can delete user data"
  on users for delete
  using (is_admin(auth.uid()));

create policy "Anyone can view published professional profiles"
  on users for select
  using (
    -- If the user is a professional and has a published profile, anyone can view
    exists (
      select 1 from professional_profiles
      where professional_profiles.user_id = users.id
      and professional_profiles.is_published = true
    )
  );

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
  -- Get the role from metadata
  role_name := new.raw_user_meta_data->>'role';
  
  -- Validate the role
  if role_name is null or (role_name != 'client' and role_name != 'professional') then
    raise exception 'Role must be specified as either "client" or "professional"';
  end if;
  
  -- Get the corresponding role ID
  select id into user_role_id from roles where name = role_name;
  
  if user_role_id is null then
    raise exception 'Invalid role specified';
  end if;
  
  -- Insert the user with the specified role
  insert into public.users (
    id, 
    first_name, 
    last_name, 
    avatar_url, 
    role_id
  )
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    user_role_id
  );
  
  -- Create the appropriate profile based on role
  if role_name = 'professional' then
    insert into professional_profiles (user_id)
    values (new.id);
  elsif role_name = 'client' then
    insert into client_profiles (user_id)
    values (new.id);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

-- RLS policies for services
create policy "Anyone can view services"
  on services for select
  using (true);

create policy "Professionals and admins can insert services"
  on services for insert
  with check (is_professional(auth.uid()) OR is_admin(auth.uid()));
  
create policy "Professionals and admins can update services"
  on services for update
  using (is_professional(auth.uid()) OR is_admin(auth.uid()));
  
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
  
create policy "Admins can delete any service"
  on services for delete
  using (is_admin(auth.uid()));

/**
* PHOTOS
* All photos for the app (avatars, portfolio, etc.)
*/
create type photo_type as enum ('avatar', 'portfolio', 'profile');
create table photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users not null,
  url text not null,
  type photo_type not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table photos enable row level security;

-- RLS policies for photos
create policy "Users can view their own photos"
  on photos for select
  using (auth.uid() = user_id);
  
create policy "Users can insert their own photos"
  on photos for insert
  with check (auth.uid() = user_id);
  
create policy "Users can update their own photos"
  on photos for update
  using (auth.uid() = user_id);
  
create policy "Users can delete their own photos"
  on photos for delete
  using (auth.uid() = user_id);
  
create policy "Anyone can view portfolio photos of published professionals"
  on photos for select
  using (
    -- If the photo belongs to a professional with a published profile
    type = 'portfolio' AND
    exists (
      select 1 from professional_profiles
      where professional_profiles.user_id = photos.user_id
      and professional_profiles.is_published = true
    )
  );


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
  facebook_url text,
  instagram_url text,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table professional_profiles enable row level security;

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
  
create policy "Admins can manage all professional profiles"
  on professional_profiles for all
  using (is_admin(auth.uid()));

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
  
create policy "Admins can manage all professional services"
  on professional_services for all
  using (is_admin(auth.uid()));

/**
* CLIENT_PROFILES
* Extended profile information for clients
*/
create table client_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users not null unique,
  phone_number text,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table client_profiles enable row level security;

-- RLS policies for client profiles
create policy "Clients can view and update their own profile"
  on client_profiles for select
  using (auth.uid() = user_id);
  
create policy "Clients can update their own profile"
  on client_profiles for update
  using (auth.uid() = user_id);
  
create policy "Admins can manage all client profiles"
  on client_profiles for all
  using (is_admin(auth.uid()));

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
* REALTIME SUBSCRIPTIONS
* Only allow realtime listening on public tables.
*/
drop publication if exists supabase_realtime;
create publication supabase_realtime for table services;
