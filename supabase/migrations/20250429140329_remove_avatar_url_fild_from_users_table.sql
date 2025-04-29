alter table "public"."users" drop column "avatar_url";

set check_function_bodies = off;

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
$function$
;


