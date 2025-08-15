set check_function_bodies = off;

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
      first_name_val,
      last_name_val,
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
    -- No profile creation for admin role
    end if;
    exception when others then
      RAISE EXCEPTION 'Error creating profile record: %', SQLERRM;
    end;
  else
    -- OAuth user without role metadata - create basic user record without role
    -- Role will be assigned later in the callback
    RAISE NOTICE 'OAuth user detected, creating basic user record without role';
    
    begin
    insert into public.users (
      id, 
      first_name, 
      last_name, 
      role_id
    )
    values (
      new.id, 
      first_name_val,
      last_name_val,
      (select id from public.roles where name = 'client' limit 1) -- Temporary default role
    );
    exception when others then
      RAISE EXCEPTION 'Error creating OAuth user record: %', SQLERRM;
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


