set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_portfolio_photo_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (select count(*) from public.portfolio_photos where user_id = new.user_id) >= 20 then
    raise exception 'Maximum of 20 portfolio photos allowed per professional';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_professional_availability()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (
    select 1 from public.appointments a
    join public.bookings b on a.booking_id = b.id
    where b.professional_profile_id = (
      select professional_profile_id from public.bookings where id = new.booking_id
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
  -- Get current service count
  select count(*) into current_count
  from public.services
  where professional_profile_id = new.professional_profile_id;
  
  -- Get the limit for this professional
  max_allowed := get_service_limit(new.professional_profile_id);
  
  if current_count >= max_allowed then
    raise exception 'Maximum of % services allowed for this professional. Contact support to increase your limit.', max_allowed;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_service_limit(prof_profile_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  limit_value integer;
begin
  select max_services into limit_value
  from public.service_limits
  where professional_profile_id = prof_profile_id;
  
  -- Return default of 50 if no custom limit is set
  return coalesce(limit_value, 50);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  client_role_id uuid;
begin
  -- Only proceed if the role was changed to client
  select id into client_role_id from public.roles where name = 'client';
  
  if new.role_id = client_role_id then
    -- Create client profile if it doesn't exist
    insert into public.client_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_professional()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  professional_role_id uuid;
begin
  -- Only proceed if the role was changed to professional
  select id into professional_role_id from public.roles where name = 'professional';
  
  if new.role_id = professional_role_id then
    -- Create professional profile if it doesn't exist
    insert into public.professional_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_client(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  is_client boolean;
begin
  select exists(
    select 1 from public.users
    join public.roles on public.users.role_id = public.roles.id
    where public.users.id = user_uuid
    and public.roles.name = 'client'
  ) into is_client;
  
  return is_client;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_professional(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  is_professional boolean;
begin
  select exists(
    select 1 from public.users
    join public.roles on public.users.role_id = public.roles.id
    where public.users.id = user_uuid
    and public.roles.name = 'professional'
  ) into is_professional;
  
  return is_professional;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_service_limit(prof_profile_id uuid, new_limit integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Validate input
  if new_limit < 1 then
    raise exception 'Service limit must be at least 1';
  end if;
  
  -- Insert or update the service limit
  insert into public.service_limits (professional_profile_id, max_services)
  values (prof_profile_id, new_limit)
  on conflict (professional_profile_id)
  do update set 
    max_services = new_limit,
    updated_at = timezone('utc'::text, now());
    
  return true;
end;
$function$
;


