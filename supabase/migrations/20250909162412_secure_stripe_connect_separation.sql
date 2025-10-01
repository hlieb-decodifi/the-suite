-- Secure Stripe Connect Data Separation
-- Move Stripe Connect fields from professional_profiles to a separate secure table
-- This prevents professionals from directly modifying their Stripe Connect status

-- Step 1: Create the new secure table for Stripe Connect data
create table if not exists professional_stripe_connect (
  id uuid primary key default extensions.uuid_generate_v4(),
  professional_profile_id uuid references professional_profiles not null unique,
  stripe_account_id text,
  stripe_connect_status text default 'not_connected' not null check (stripe_connect_status in ('not_connected', 'pending', 'complete')),
  stripe_connect_updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on the new table
alter table professional_stripe_connect enable row level security;

-- Step 2: Create indexes for better performance
create index if not exists idx_professional_stripe_connect_profile_id 
on professional_stripe_connect(professional_profile_id);

create index if not exists idx_professional_stripe_connect_account_id 
on professional_stripe_connect(stripe_account_id) 
where stripe_account_id is not null;

create index if not exists idx_professional_stripe_connect_status 
on professional_stripe_connect(stripe_connect_status);

-- Step 3: Create RLS policy for professionals to view their own data
create policy "Professionals can view their own Stripe Connect data"
  on professional_stripe_connect for select
  using (
    exists (
      select 1 from professional_profiles
      where professional_profiles.id = professional_stripe_connect.professional_profile_id
      and professional_profiles.user_id = auth.uid()
    )
  );

-- Step 4: Migrate existing data from professional_profiles to the new table
-- Only migrate records that have non-default Stripe data
insert into professional_stripe_connect (
  professional_profile_id,
  stripe_account_id,
  stripe_connect_status,
  stripe_connect_updated_at,
  created_at,
  updated_at
)
select 
  pp.id,
  pp.stripe_account_id,
  coalesce(pp.stripe_connect_status, 'not_connected'),
  pp.stripe_connect_updated_at,
  pp.created_at,
  pp.updated_at
from professional_profiles pp
where pp.stripe_account_id is not null 
   or pp.stripe_connect_status != 'not_connected' 
   or pp.stripe_connect_updated_at is not null
on conflict (professional_profile_id) do nothing;

-- Step 5: Add trigger function for Stripe Connect status changes
create or replace function handle_stripe_connect_status_changes()
returns trigger as $$
begin
  -- Mark all services for re-sync when Stripe Connect status changes
  if (old.stripe_connect_status is distinct from new.stripe_connect_status) then
    
    update services 
    set stripe_sync_status = 'pending', 
        updated_at = timezone('utc'::text, now())
    where professional_profile_id = new.professional_profile_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Step 6: Create trigger for Stripe Connect status changes
create trigger stripe_connect_status_sync_trigger
  after update on professional_stripe_connect
  for each row
  execute function handle_stripe_connect_status_changes();

-- Step 7: Update the existing professional profile trigger to remove Stripe Connect dependency
create or replace function handle_professional_profile_stripe_changes()
returns trigger as $$
begin
  -- Mark all services for re-sync when key fields change that affect Stripe status
  if (old.is_published is distinct from new.is_published) then
    
    update services 
    set stripe_sync_status = 'pending', 
        updated_at = timezone('utc'::text, now())
    where professional_profile_id = new.id;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Step 8: Drop the old Stripe Connect indexes from professional_profiles
drop index if exists idx_professional_profiles_stripe_account_id;
drop index if exists idx_professional_profiles_stripe_connect_status;

-- Step 9: Remove Stripe Connect columns from professional_profiles
-- Note: This will be the last step to ensure data migration completes first
alter table professional_profiles drop column if exists stripe_account_id;
alter table professional_profiles drop column if exists stripe_connect_status;
alter table professional_profiles drop column if exists stripe_connect_updated_at;
