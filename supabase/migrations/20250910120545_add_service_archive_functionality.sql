drop policy "Anyone can view services from published professionals" on "public"."services";

drop policy "Professionals can view their own services" on "public"."services";

alter table "public"."services" add column "archived_at" timestamp with time zone;

alter table "public"."services" add column "is_archived" boolean not null default false;

CREATE INDEX idx_services_is_archived ON public.services USING btree (is_archived);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.archive_service(service_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update services
  set 
    is_archived = true,
    archived_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  where id = service_id
  and is_archived = false; -- Only archive non-archived services
  
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.unarchive_service(service_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  professional_profile_id_val uuid;
  current_count integer;
  max_allowed integer;
begin
  -- Get the professional profile ID for this service
  select professional_profile_id into professional_profile_id_val
  from services
  where id = service_id
  and is_archived = true;
  
  -- If service doesn't exist or is not archived, return false
  if professional_profile_id_val is null then
    return false;
  end if;
  
  -- Get current non-archived service count for this professional
  select count(*) into current_count
  from services
  where professional_profile_id = professional_profile_id_val
  and is_archived = false;
  
  -- Get the limit for this professional
  max_allowed := get_service_limit(professional_profile_id_val);
  
  -- Check if unarchiving would exceed the limit
  if current_count >= max_allowed then
    raise exception 'Cannot unarchive service: would exceed maximum of % services allowed for this professional. Archive or delete other services first, or contact support to increase your limit.', max_allowed;
  end if;
  
  -- Unarchive the service
  update services
  set 
    is_archived = false,
    archived_at = null,
    updated_at = timezone('utc'::text, now())
  where id = service_id
  and is_archived = true;
  
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_service_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  current_count integer;
  max_allowed integer;
begin
  -- Get current service count (excluding archived services)
  select count(*) into current_count
  from services
  where professional_profile_id = new.professional_profile_id
  and is_archived = false;
  
  -- Get the limit for this professional
  max_allowed := get_service_limit(new.professional_profile_id);
  
  if current_count >= max_allowed then
    raise exception 'Maximum of % services allowed for this professional. Contact support to increase your limit.', max_allowed;
  end if;
  
  return new;
end;
$function$
;

-- Update the "all" policy for professionals to handle both archived and non-archived services
-- Note: The "all" policy already exists and covers all operations including select
-- We just need to ensure it works with both archived and non-archived services

-- Public can only view non-archived services from published professionals
create policy "Anyone can view services from published professionals"
on "public"."services"
as permissive
for select
to public
using (((is_archived = false) AND (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = services.professional_profile_id) AND (professional_profiles.is_published = true))))));

-- Add missing RLS policies that diff tool doesn't detect
-- Allow clients to view archived services they have bookings for (for history/reference)
create policy "Clients can view archived services they have bookings for"
  on services for select
  using (
    is_archived = true
    and exists (
      select 1 from booking_services bs
      join bookings b on bs.booking_id = b.id
      where bs.service_id = services.id
      and b.client_id = auth.uid()
    )
  );

-- Update booking services policies to prevent booking archived services
-- Drop and recreate the client booking policy
drop policy if exists "Clients can create booking services for their bookings" on booking_services;
create policy "Clients can create booking services for their bookings"
  on booking_services for insert
  with check (
    exists (
      select 1 from bookings
      where bookings.id = booking_services.booking_id
      and bookings.client_id = auth.uid()
    )
    and exists (
      select 1 from services
      where services.id = booking_services.service_id
      and services.is_archived = false
    )
  );

-- Drop and recreate the professional booking policy
drop policy if exists "Professionals can create booking services for their bookings" on booking_services;
create policy "Professionals can create booking services for their bookings"
  on booking_services for insert
  with check (
    exists (
      select 1 from bookings b
      join professional_profiles pp on b.professional_profile_id = pp.id
      where b.id = booking_services.booking_id
      and pp.user_id = auth.uid()
    )
    and exists (
      select 1 from services
      where services.id = booking_services.service_id
      and services.is_archived = false
    )
  );



