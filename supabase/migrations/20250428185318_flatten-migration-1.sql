create type "public"."photo_type" as enum ('avatar', 'portfolio', 'profile');

create table "public"."addresses" (
    "id" uuid not null default uuid_generate_v4(),
    "country" text,
    "state" text,
    "city" text,
    "street_address" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."addresses" enable row level security;

create table "public"."client_profiles" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "phone_number" text,
    "location" text,
    "address_id" uuid,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."client_profiles" enable row level security;

create table "public"."photos" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "url" text not null,
    "type" photo_type not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."photos" enable row level security;

create table "public"."professional_profiles" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "description" text,
    "appointment_requirements" text,
    "phone_number" text,
    "working_hours" jsonb,
    "location" text,
    "address_id" uuid,
    "facebook_url" text,
    "instagram_url" text,
    "is_published" boolean default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."professional_profiles" enable row level security;

create table "public"."professional_services" (
    "professional_profile_id" uuid not null,
    "service_id" uuid not null,
    "price" numeric(10,2),
    "duration" integer,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."professional_services" enable row level security;

create table "public"."roles" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."roles" enable row level security;

create table "public"."services" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "price" numeric(10,2) not null,
    "duration" integer not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."services" enable row level security;

create table "public"."users" (
    "id" uuid not null,
    "first_name" text not null,
    "last_name" text not null,
    "avatar_url" text,
    "role_id" uuid not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX addresses_pkey ON public.addresses USING btree (id);

CREATE UNIQUE INDEX client_profiles_pkey ON public.client_profiles USING btree (id);

CREATE UNIQUE INDEX client_profiles_user_id_key ON public.client_profiles USING btree (user_id);

CREATE UNIQUE INDEX photos_pkey ON public.photos USING btree (id);

CREATE UNIQUE INDEX professional_profiles_pkey ON public.professional_profiles USING btree (id);

CREATE UNIQUE INDEX professional_profiles_user_id_key ON public.professional_profiles USING btree (user_id);

CREATE UNIQUE INDEX professional_services_pkey ON public.professional_services USING btree (professional_profile_id, service_id);

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."addresses" add constraint "addresses_pkey" PRIMARY KEY using index "addresses_pkey";

alter table "public"."client_profiles" add constraint "client_profiles_pkey" PRIMARY KEY using index "client_profiles_pkey";

alter table "public"."photos" add constraint "photos_pkey" PRIMARY KEY using index "photos_pkey";

alter table "public"."professional_profiles" add constraint "professional_profiles_pkey" PRIMARY KEY using index "professional_profiles_pkey";

alter table "public"."professional_services" add constraint "professional_services_pkey" PRIMARY KEY using index "professional_services_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."services" add constraint "services_pkey" PRIMARY KEY using index "services_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."client_profiles" add constraint "client_profiles_address_id_fkey" FOREIGN KEY (address_id) REFERENCES addresses(id) not valid;

alter table "public"."client_profiles" validate constraint "client_profiles_address_id_fkey";

alter table "public"."client_profiles" add constraint "client_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."client_profiles" validate constraint "client_profiles_user_id_fkey";

alter table "public"."client_profiles" add constraint "client_profiles_user_id_key" UNIQUE using index "client_profiles_user_id_key";

alter table "public"."photos" add constraint "photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."photos" validate constraint "photos_user_id_fkey";

alter table "public"."professional_profiles" add constraint "professional_profiles_address_id_fkey" FOREIGN KEY (address_id) REFERENCES addresses(id) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_address_id_fkey";

alter table "public"."professional_profiles" add constraint "professional_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."professional_profiles" validate constraint "professional_profiles_user_id_fkey";

alter table "public"."professional_profiles" add constraint "professional_profiles_user_id_key" UNIQUE using index "professional_profiles_user_id_key";

alter table "public"."professional_services" add constraint "professional_services_professional_profile_id_fkey" FOREIGN KEY (professional_profile_id) REFERENCES professional_profiles(id) not valid;

alter table "public"."professional_services" validate constraint "professional_services_professional_profile_id_fkey";

alter table "public"."professional_services" add constraint "professional_services_service_id_fkey" FOREIGN KEY (service_id) REFERENCES services(id) not valid;

alter table "public"."professional_services" validate constraint "professional_services_service_id_fkey";

alter table "public"."roles" add constraint "roles_name_key" UNIQUE using index "roles_name_key";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."users" validate constraint "users_id_fkey";

alter table "public"."users" add constraint "users_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) not valid;

alter table "public"."users" validate constraint "users_role_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  select id into professional_role_id from roles where name = 'professional';
  
  if new.role_id = professional_role_id then
    -- Create professional profile if it doesn't exist
    insert into professional_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
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

CREATE OR REPLACE FUNCTION public.insert_address_and_return_id(p_country text, p_state text, p_city text, p_street_address text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  new_id uuid;
begin
  insert into addresses (country, state, city, street_address)
  values (p_country, p_state, p_city, p_street_address)
  returning id into new_id;
  
  return new_id;
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
    select 1 from users
    join roles on users.role_id = roles.id
    where users.id = user_uuid
    and roles.name = 'client'
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
    select 1 from users
    join roles on users.role_id = roles.id
    where users.id = user_uuid
    and roles.name = 'professional'
  ) into is_professional;
  
  return is_professional;
end;
$function$
;

grant delete on table "public"."addresses" to "anon";

grant insert on table "public"."addresses" to "anon";

grant references on table "public"."addresses" to "anon";

grant select on table "public"."addresses" to "anon";

grant trigger on table "public"."addresses" to "anon";

grant truncate on table "public"."addresses" to "anon";

grant update on table "public"."addresses" to "anon";

grant delete on table "public"."addresses" to "authenticated";

grant insert on table "public"."addresses" to "authenticated";

grant references on table "public"."addresses" to "authenticated";

grant select on table "public"."addresses" to "authenticated";

grant trigger on table "public"."addresses" to "authenticated";

grant truncate on table "public"."addresses" to "authenticated";

grant update on table "public"."addresses" to "authenticated";

grant delete on table "public"."addresses" to "service_role";

grant insert on table "public"."addresses" to "service_role";

grant references on table "public"."addresses" to "service_role";

grant select on table "public"."addresses" to "service_role";

grant trigger on table "public"."addresses" to "service_role";

grant truncate on table "public"."addresses" to "service_role";

grant update on table "public"."addresses" to "service_role";

grant delete on table "public"."client_profiles" to "anon";

grant insert on table "public"."client_profiles" to "anon";

grant references on table "public"."client_profiles" to "anon";

grant select on table "public"."client_profiles" to "anon";

grant trigger on table "public"."client_profiles" to "anon";

grant truncate on table "public"."client_profiles" to "anon";

grant update on table "public"."client_profiles" to "anon";

grant delete on table "public"."client_profiles" to "authenticated";

grant insert on table "public"."client_profiles" to "authenticated";

grant references on table "public"."client_profiles" to "authenticated";

grant select on table "public"."client_profiles" to "authenticated";

grant trigger on table "public"."client_profiles" to "authenticated";

grant truncate on table "public"."client_profiles" to "authenticated";

grant update on table "public"."client_profiles" to "authenticated";

grant delete on table "public"."client_profiles" to "service_role";

grant insert on table "public"."client_profiles" to "service_role";

grant references on table "public"."client_profiles" to "service_role";

grant select on table "public"."client_profiles" to "service_role";

grant trigger on table "public"."client_profiles" to "service_role";

grant truncate on table "public"."client_profiles" to "service_role";

grant update on table "public"."client_profiles" to "service_role";

grant delete on table "public"."photos" to "anon";

grant insert on table "public"."photos" to "anon";

grant references on table "public"."photos" to "anon";

grant select on table "public"."photos" to "anon";

grant trigger on table "public"."photos" to "anon";

grant truncate on table "public"."photos" to "anon";

grant update on table "public"."photos" to "anon";

grant delete on table "public"."photos" to "authenticated";

grant insert on table "public"."photos" to "authenticated";

grant references on table "public"."photos" to "authenticated";

grant select on table "public"."photos" to "authenticated";

grant trigger on table "public"."photos" to "authenticated";

grant truncate on table "public"."photos" to "authenticated";

grant update on table "public"."photos" to "authenticated";

grant delete on table "public"."photos" to "service_role";

grant insert on table "public"."photos" to "service_role";

grant references on table "public"."photos" to "service_role";

grant select on table "public"."photos" to "service_role";

grant trigger on table "public"."photos" to "service_role";

grant truncate on table "public"."photos" to "service_role";

grant update on table "public"."photos" to "service_role";

grant delete on table "public"."professional_profiles" to "anon";

grant insert on table "public"."professional_profiles" to "anon";

grant references on table "public"."professional_profiles" to "anon";

grant select on table "public"."professional_profiles" to "anon";

grant trigger on table "public"."professional_profiles" to "anon";

grant truncate on table "public"."professional_profiles" to "anon";

grant update on table "public"."professional_profiles" to "anon";

grant delete on table "public"."professional_profiles" to "authenticated";

grant insert on table "public"."professional_profiles" to "authenticated";

grant references on table "public"."professional_profiles" to "authenticated";

grant select on table "public"."professional_profiles" to "authenticated";

grant trigger on table "public"."professional_profiles" to "authenticated";

grant truncate on table "public"."professional_profiles" to "authenticated";

grant update on table "public"."professional_profiles" to "authenticated";

grant delete on table "public"."professional_profiles" to "service_role";

grant insert on table "public"."professional_profiles" to "service_role";

grant references on table "public"."professional_profiles" to "service_role";

grant select on table "public"."professional_profiles" to "service_role";

grant trigger on table "public"."professional_profiles" to "service_role";

grant truncate on table "public"."professional_profiles" to "service_role";

grant update on table "public"."professional_profiles" to "service_role";

grant delete on table "public"."professional_services" to "anon";

grant insert on table "public"."professional_services" to "anon";

grant references on table "public"."professional_services" to "anon";

grant select on table "public"."professional_services" to "anon";

grant trigger on table "public"."professional_services" to "anon";

grant truncate on table "public"."professional_services" to "anon";

grant update on table "public"."professional_services" to "anon";

grant delete on table "public"."professional_services" to "authenticated";

grant insert on table "public"."professional_services" to "authenticated";

grant references on table "public"."professional_services" to "authenticated";

grant select on table "public"."professional_services" to "authenticated";

grant trigger on table "public"."professional_services" to "authenticated";

grant truncate on table "public"."professional_services" to "authenticated";

grant update on table "public"."professional_services" to "authenticated";

grant delete on table "public"."professional_services" to "service_role";

grant insert on table "public"."professional_services" to "service_role";

grant references on table "public"."professional_services" to "service_role";

grant select on table "public"."professional_services" to "service_role";

grant trigger on table "public"."professional_services" to "service_role";

grant truncate on table "public"."professional_services" to "service_role";

grant update on table "public"."professional_services" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant delete on table "public"."roles" to "authenticated";

grant insert on table "public"."roles" to "authenticated";

grant references on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant update on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."services" to "anon";

grant insert on table "public"."services" to "anon";

grant references on table "public"."services" to "anon";

grant select on table "public"."services" to "anon";

grant trigger on table "public"."services" to "anon";

grant truncate on table "public"."services" to "anon";

grant update on table "public"."services" to "anon";

grant delete on table "public"."services" to "authenticated";

grant insert on table "public"."services" to "authenticated";

grant references on table "public"."services" to "authenticated";

grant select on table "public"."services" to "authenticated";

grant trigger on table "public"."services" to "authenticated";

grant truncate on table "public"."services" to "authenticated";

grant update on table "public"."services" to "authenticated";

grant delete on table "public"."services" to "service_role";

grant insert on table "public"."services" to "service_role";

grant references on table "public"."services" to "service_role";

grant select on table "public"."services" to "service_role";

grant trigger on table "public"."services" to "service_role";

grant truncate on table "public"."services" to "service_role";

grant update on table "public"."services" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "Users can create addresses"
on "public"."addresses"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can delete addresses linked to their profile"
on "public"."addresses"
as permissive
for delete
to public
using (((EXISTS ( SELECT 1
   FROM client_profiles
  WHERE ((client_profiles.address_id = addresses.id) AND (client_profiles.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.address_id = addresses.id) AND (professional_profiles.user_id = auth.uid()))))));


create policy "Users can update addresses linked to their profile"
on "public"."addresses"
as permissive
for update
to public
using (((EXISTS ( SELECT 1
   FROM client_profiles
  WHERE ((client_profiles.address_id = addresses.id) AND (client_profiles.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.address_id = addresses.id) AND (professional_profiles.user_id = auth.uid()))))));


create policy "Users can view addresses linked to their profile"
on "public"."addresses"
as permissive
for select
to public
using (((EXISTS ( SELECT 1
   FROM client_profiles
  WHERE ((client_profiles.address_id = addresses.id) AND (client_profiles.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.address_id = addresses.id) AND (professional_profiles.user_id = auth.uid()))))));


create policy "Clients can update their own profile"
on "public"."client_profiles"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Clients can view and update their own profile"
on "public"."client_profiles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Anyone can view portfolio photos of published professionals"
on "public"."photos"
as permissive
for select
to public
using (((type = 'portfolio'::photo_type) AND (EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.user_id = photos.user_id) AND (professional_profiles.is_published = true))))));


create policy "Users can delete their own photos"
on "public"."photos"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own photos"
on "public"."photos"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own photos"
on "public"."photos"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own photos"
on "public"."photos"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Anyone can view published professional profiles"
on "public"."professional_profiles"
as permissive
for select
to public
using ((is_published = true));


create policy "Professionals can update their own profile"
on "public"."professional_profiles"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Professionals can view their own profile"
on "public"."professional_profiles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Anyone can view professional services"
on "public"."professional_services"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = professional_services.professional_profile_id) AND (professional_profiles.is_published = true)))));


create policy "Professionals can manage their own services"
on "public"."professional_services"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM professional_profiles
  WHERE ((professional_profiles.id = professional_services.professional_profile_id) AND (professional_profiles.user_id = auth.uid())))));


create policy "Anyone can view roles"
on "public"."roles"
as permissive
for select
to public
using (true);


create policy "Anyone can view services"
on "public"."services"
as permissive
for select
to public
using (true);


create policy "Professionals can delete their own services"
on "public"."services"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM (professional_profiles
     JOIN professional_services ON ((professional_profiles.id = professional_services.professional_profile_id)))
  WHERE ((professional_profiles.user_id = auth.uid()) AND (professional_services.service_id = services.id)))));


create policy "Users can update their own basic data"
on "public"."users"
as permissive
for update
to public
using ((auth.uid() = id))
with check (((auth.uid() = id) AND (role_id = ( SELECT users_1.role_id
   FROM users users_1
  WHERE (users_1.id = auth.uid())))));


create policy "Users can view their own data"
on "public"."users"
as permissive
for select
to public
using ((auth.uid() = id));


CREATE TRIGGER on_user_role_change AFTER UPDATE OF role_id ON public.users FOR EACH ROW EXECUTE FUNCTION handle_new_professional();

CREATE TRIGGER on_user_role_change_to_client AFTER UPDATE OF role_id ON public.users FOR EACH ROW EXECUTE FUNCTION handle_new_client();


