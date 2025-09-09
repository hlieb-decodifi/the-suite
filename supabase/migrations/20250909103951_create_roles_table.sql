drop trigger if exists "on_user_role_change" on "public"."users";

drop trigger if exists "on_user_role_change_to_client" on "public"."users";

drop policy "Anyone can view roles" on "public"."roles";

drop policy "Admins can view all activity logs" on "public"."activity_log";

drop policy "Admins can manage configurations" on "public"."admin_configs";

drop policy "Admins can update inquiries" on "public"."contact_inquiries";

drop policy "Admins can view all inquiries" on "public"."contact_inquiries";

drop policy "Admins can manage email templates" on "public"."email_templates";

drop policy "Users can update their own basic data" on "public"."users";

revoke delete on table "public"."roles" from "anon";

revoke insert on table "public"."roles" from "anon";

revoke references on table "public"."roles" from "anon";

revoke select on table "public"."roles" from "anon";

revoke trigger on table "public"."roles" from "anon";

revoke truncate on table "public"."roles" from "anon";

revoke update on table "public"."roles" from "anon";

revoke delete on table "public"."roles" from "authenticated";

revoke insert on table "public"."roles" from "authenticated";

revoke references on table "public"."roles" from "authenticated";

revoke select on table "public"."roles" from "authenticated";

revoke trigger on table "public"."roles" from "authenticated";

revoke truncate on table "public"."roles" from "authenticated";

revoke update on table "public"."roles" from "authenticated";

revoke delete on table "public"."roles" from "service_role";

revoke insert on table "public"."roles" from "service_role";

revoke references on table "public"."roles" from "service_role";

revoke select on table "public"."roles" from "service_role";

revoke trigger on table "public"."roles" from "service_role";

revoke truncate on table "public"."roles" from "service_role";

revoke update on table "public"."roles" from "service_role";

alter table "public"."roles" drop constraint "roles_name_key";

alter table "public"."users" drop constraint "users_role_id_fkey";

alter table "public"."roles" drop constraint "roles_pkey";

drop index if exists "public"."roles_name_key";

drop index if exists "public"."roles_pkey";

drop table "public"."roles";

create table "public"."user_roles" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "role" text not null default 'client'::text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."user_roles" enable row level security;

alter table "public"."users" drop column "role_id";

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_id_key ON public.user_roles USING btree (user_id);

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_key" UNIQUE using index "user_roles_user_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_support_conversation(p_client_id uuid, p_professional_id uuid DEFAULT NULL::uuid, p_purpose text DEFAULT 'support_request'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  conversation_uuid uuid;
  default_professional_id uuid;
begin
  -- If no professional specified, use a default support professional or admin
  if p_professional_id is null then
    -- Find first admin user to handle support requests
    select u.id into default_professional_id
    from users u
    join user_roles ur on u.id = ur.user_id
    where ur.role = 'admin'
    limit 1;
    
    -- If no admin found, find any professional
    if default_professional_id is null then
      select u.id into default_professional_id
      from users u
      join user_roles ur on u.id = ur.user_id
      where ur.role = 'professional'
      limit 1;
    end if;
    
    p_professional_id := default_professional_id;
  end if;
  
  -- Create a new conversation with specific purpose
  -- Note: Support requests always create new conversations for isolation
  insert into conversations (client_id, professional_id, purpose)
  values (p_client_id, p_professional_id, p_purpose)
  on conflict (client_id, professional_id, purpose) 
  do update set updated_at = timezone('utc'::text, now())
  returning id into conversation_uuid;
  
  return conversation_uuid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Only proceed if the role was changed to client
  if new.role = 'client' then
    -- Create client profile if it doesn't exist
    insert into client_profiles (user_id)
    values (new.user_id)
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
begin
  -- Only proceed if the role was changed to professional
  if new.role = 'professional' then
    -- Create professional profile if it doesn't exist
    insert into professional_profiles (user_id)
    values (new.user_id)
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
  role_name text;
  user_role_value text;
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
    if role_name != 'client' and role_name != 'professional' and role_name != 'admin' then
      RAISE NOTICE 'Invalid role specified: %', role_name;
      role_name := 'client'; -- Default to client if not specified properly
    end if;
    
    -- Cast role name to enum
    user_role_value := role_name;
    
    -- Insert the user record (without role)
    begin
    insert into public.users (
      id, 
      first_name, 
      last_name
    )
    values (
      new.id, 
      first_name_val,
      last_name_val
    );
    exception when others then
      RAISE EXCEPTION 'Error creating user record: %', SQLERRM;
    end;
    
    -- Insert the user role
    begin
    insert into public.user_roles (
      user_id,
      role
    )
    values (
      new.id,
      user_role_value
    );
    exception when others then
      RAISE EXCEPTION 'Error creating user role record: %', SQLERRM;
    end;
    
    -- Create the appropriate profile based on role
    begin
    if role_name = 'professional' then
        insert into public.professional_profiles (user_id)
      values (new.id);
    elsif role_name = 'client' then
        insert into public.client_profiles (user_id)
      values (new.id);
    -- No profile creation for admin role
    end if;
    exception when others then
      RAISE EXCEPTION 'Error creating profile record: %', SQLERRM;
    end;
  else
    -- OAuth user without role metadata - create basic user record without role
    -- Role will be assigned later in the callback
    RAISE NOTICE 'OAuth user detected, creating basic user record with default client role';
    
    begin
    insert into public.users (
      id, 
      first_name, 
      last_name
    )
    values (
      new.id, 
      first_name_val,
      last_name_val
    );
    exception when others then
      RAISE EXCEPTION 'Error creating OAuth user record: %', SQLERRM;
    end;
    
    -- Create default client role
    begin
    insert into public.user_roles (
      user_id,
      role
    )
    values (
      new.id,
      'client'
    );
    exception when others then
      RAISE EXCEPTION 'Error creating OAuth user role record: %', SQLERRM;
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  is_admin boolean;
begin
  select exists(
    select 1 from user_roles
    where user_id = user_uuid
    and role = 'admin'
  ) into is_admin;
  
  return is_admin;
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
    select 1 from user_roles
    where user_id = user_uuid
    and role = 'client'
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
    select 1 from user_roles
    where user_id = user_uuid
    and role = 'professional'
  ) into is_professional;
  
  return is_professional;
end;
$function$
;

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";

create policy "Admins can manage user roles"
on "public"."user_roles"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));


create policy "Users can view their own role"
on "public"."user_roles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Admins can view all activity logs"
on "public"."activity_log"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));


create policy "Admins can manage configurations"
on "public"."admin_configs"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));


create policy "Admins can update inquiries"
on "public"."contact_inquiries"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));


create policy "Admins can view all inquiries"
on "public"."contact_inquiries"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));


create policy "Admins can manage email templates"
on "public"."email_templates"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::text)))));


create policy "Users can update their own basic data"
on "public"."users"
as permissive
for update
to public
using ((auth.uid() = id))
with check ((auth.uid() = id));


CREATE TRIGGER on_user_role_change AFTER UPDATE OF role ON public.user_roles FOR EACH ROW EXECUTE FUNCTION handle_new_professional();

CREATE TRIGGER on_user_role_change_to_client AFTER UPDATE OF role ON public.user_roles FOR EACH ROW EXECUTE FUNCTION handle_new_client();


