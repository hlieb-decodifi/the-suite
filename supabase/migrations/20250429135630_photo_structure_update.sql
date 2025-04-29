drop policy "Anyone can view portfolio photos of published professionals" on "public"."photos";

drop policy "Users can delete their own photos" on "public"."photos";

drop policy "Users can insert their own photos" on "public"."photos";

drop policy "Users can update their own photos" on "public"."photos";

drop policy "Users can view their own photos" on "public"."photos";

revoke delete on table "public"."photos" from "anon";

revoke insert on table "public"."photos" from "anon";

revoke references on table "public"."photos" from "anon";

revoke select on table "public"."photos" from "anon";

revoke trigger on table "public"."photos" from "anon";

revoke truncate on table "public"."photos" from "anon";

revoke update on table "public"."photos" from "anon";

revoke delete on table "public"."photos" from "authenticated";

revoke insert on table "public"."photos" from "authenticated";

revoke references on table "public"."photos" from "authenticated";

revoke select on table "public"."photos" from "authenticated";

revoke trigger on table "public"."photos" from "authenticated";

revoke truncate on table "public"."photos" from "authenticated";

revoke update on table "public"."photos" from "authenticated";

revoke delete on table "public"."photos" from "service_role";

revoke insert on table "public"."photos" from "service_role";

revoke references on table "public"."photos" from "service_role";

revoke select on table "public"."photos" from "service_role";

revoke trigger on table "public"."photos" from "service_role";

revoke truncate on table "public"."photos" from "service_role";

revoke update on table "public"."photos" from "service_role";

alter table "public"."photos" drop constraint "photos_user_id_fkey";

drop function if exists "public"."insert_address_and_return_id"(p_country text, p_state text, p_city text, p_street_address text);

alter table "public"."photos" drop constraint "photos_pkey";

drop index if exists "public"."photos_pkey";

drop table "public"."photos";

create table "public"."portfolio_photos" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "url" text not null,
    "filename" text not null,
    "description" text,
    "order_index" integer not null default 0,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."portfolio_photos" enable row level security;

create table "public"."profile_photos" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "url" text not null,
    "filename" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."profile_photos" enable row level security;

drop type "public"."photo_type";

CREATE UNIQUE INDEX portfolio_photos_pkey ON public.portfolio_photos USING btree (id);

CREATE UNIQUE INDEX profile_photos_pkey ON public.profile_photos USING btree (id);

CREATE UNIQUE INDEX profile_photos_user_id_key ON public.profile_photos USING btree (user_id);

alter table "public"."portfolio_photos" add constraint "portfolio_photos_pkey" PRIMARY KEY using index "portfolio_photos_pkey";

alter table "public"."profile_photos" add constraint "profile_photos_pkey" PRIMARY KEY using index "profile_photos_pkey";

alter table "public"."portfolio_photos" add constraint "portfolio_photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."portfolio_photos" validate constraint "portfolio_photos_user_id_fkey";

alter table "public"."portfolio_photos" add constraint "user_is_professional" CHECK (is_professional(user_id)) not valid;

alter table "public"."portfolio_photos" validate constraint "user_is_professional";

alter table "public"."profile_photos" add constraint "profile_photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."profile_photos" validate constraint "profile_photos_user_id_fkey";

alter table "public"."profile_photos" add constraint "profile_photos_user_id_key" UNIQUE using index "profile_photos_user_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_portfolio_photo_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (select count(*) from portfolio_photos where user_id = new.user_id) >= 10 then
    raise exception 'Maximum of 10 portfolio photos allowed per professional';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

grant delete on table "public"."portfolio_photos" to "anon";

grant insert on table "public"."portfolio_photos" to "anon";

grant references on table "public"."portfolio_photos" to "anon";

grant select on table "public"."portfolio_photos" to "anon";

grant trigger on table "public"."portfolio_photos" to "anon";

grant truncate on table "public"."portfolio_photos" to "anon";

grant update on table "public"."portfolio_photos" to "anon";

grant delete on table "public"."portfolio_photos" to "authenticated";

grant insert on table "public"."portfolio_photos" to "authenticated";

grant references on table "public"."portfolio_photos" to "authenticated";

grant select on table "public"."portfolio_photos" to "authenticated";

grant trigger on table "public"."portfolio_photos" to "authenticated";

grant truncate on table "public"."portfolio_photos" to "authenticated";

grant update on table "public"."portfolio_photos" to "authenticated";

grant delete on table "public"."portfolio_photos" to "service_role";

grant insert on table "public"."portfolio_photos" to "service_role";

grant references on table "public"."portfolio_photos" to "service_role";

grant select on table "public"."portfolio_photos" to "service_role";

grant trigger on table "public"."portfolio_photos" to "service_role";

grant truncate on table "public"."portfolio_photos" to "service_role";

grant update on table "public"."portfolio_photos" to "service_role";

grant delete on table "public"."profile_photos" to "anon";

grant insert on table "public"."profile_photos" to "anon";

grant references on table "public"."profile_photos" to "anon";

grant select on table "public"."profile_photos" to "anon";

grant trigger on table "public"."profile_photos" to "anon";

grant truncate on table "public"."profile_photos" to "anon";

grant update on table "public"."profile_photos" to "anon";

grant delete on table "public"."profile_photos" to "authenticated";

grant insert on table "public"."profile_photos" to "authenticated";

grant references on table "public"."profile_photos" to "authenticated";

grant select on table "public"."profile_photos" to "authenticated";

grant trigger on table "public"."profile_photos" to "authenticated";

grant truncate on table "public"."profile_photos" to "authenticated";

grant update on table "public"."profile_photos" to "authenticated";

grant delete on table "public"."profile_photos" to "service_role";

grant insert on table "public"."profile_photos" to "service_role";

grant references on table "public"."profile_photos" to "service_role";

grant select on table "public"."profile_photos" to "service_role";

grant trigger on table "public"."profile_photos" to "service_role";

grant truncate on table "public"."profile_photos" to "service_role";

grant update on table "public"."profile_photos" to "service_role";

create policy "Anyone can view portfolio photos of published professionals"
on "public"."portfolio_photos"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = portfolio_photos.user_id) AND (professional_profiles.is_published = true)))));


create policy "Professionals can delete their own portfolio photos"
on "public"."portfolio_photos"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Professionals can insert their own portfolio photos"
on "public"."portfolio_photos"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Professionals can update their own portfolio photos"
on "public"."portfolio_photos"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Professionals can view their own portfolio photos"
on "public"."portfolio_photos"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Anyone can view profile photos of published professionals"
on "public"."profile_photos"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = profile_photos.user_id) AND (professional_profiles.is_published = true)))));


create policy "Users can delete their own profile photo"
on "public"."profile_photos"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own profile photo"
on "public"."profile_photos"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own profile photo"
on "public"."profile_photos"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own profile photo"
on "public"."profile_photos"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER enforce_portfolio_photo_limit BEFORE INSERT ON public.portfolio_photos FOR EACH ROW EXECUTE FUNCTION check_portfolio_photo_limit();


