create table "public"."service_limits" (
    "id" uuid not null default uuid_generate_v4(),
    "professional_profile_id" uuid not null,
    "max_services" integer not null default 50,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."service_limits" enable row level security;

CREATE UNIQUE INDEX service_limits_pkey ON public.service_limits USING btree (id);

CREATE UNIQUE INDEX service_limits_professional_profile_id_key ON public.service_limits USING btree (professional_profile_id);

alter table "public"."service_limits" add constraint "service_limits_pkey" PRIMARY KEY using index "service_limits_pkey";

alter table "public"."service_limits" add constraint "service_limits_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."service_limits" validate constraint "service_limits_professional_profile_id_fkey";

alter table "public"."service_limits" add constraint "service_limits_professional_profile_id_key" UNIQUE using index "service_limits_professional_profile_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_service_limit(prof_profile_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  limit_value integer;
begin
  select max_services into limit_value
  from service_limits
  where professional_profile_id = prof_profile_id;
  
  -- Return default of 50 if no custom limit is set
  return coalesce(limit_value, 50);
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
  insert into service_limits (professional_profile_id, max_services)
  values (prof_profile_id, new_limit)
  on conflict (professional_profile_id)
  do update set 
    max_services = new_limit,
    updated_at = timezone('utc'::text, now());
    
  return true;
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
  from services
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

grant delete on table "public"."service_limits" to "anon";

grant insert on table "public"."service_limits" to "anon";

grant references on table "public"."service_limits" to "anon";

grant select on table "public"."service_limits" to "anon";

grant trigger on table "public"."service_limits" to "anon";

grant truncate on table "public"."service_limits" to "anon";

grant update on table "public"."service_limits" to "anon";

grant delete on table "public"."service_limits" to "authenticated";

grant insert on table "public"."service_limits" to "authenticated";

grant references on table "public"."service_limits" to "authenticated";

grant select on table "public"."service_limits" to "authenticated";

grant trigger on table "public"."service_limits" to "authenticated";

grant truncate on table "public"."service_limits" to "authenticated";

grant update on table "public"."service_limits" to "authenticated";

grant delete on table "public"."service_limits" to "service_role";

grant insert on table "public"."service_limits" to "service_role";

grant references on table "public"."service_limits" to "service_role";

grant select on table "public"."service_limits" to "service_role";

grant trigger on table "public"."service_limits" to "service_role";

grant truncate on table "public"."service_limits" to "service_role";

grant update on table "public"."service_limits" to "service_role";

create policy "Professionals can view their own service limits"
on "public"."service_limits"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = service_limits.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));



