-- Migration to remove automatic role assignment from metadata during user signup
-- Sets default 'client' role but prevents privilege escalation (admin role cannot be set via metadata)
-- Admins must be explicitly created via admin panel

-- Update handle_new_user trigger function
-- Extracts role from metadata with security: defaults to 'client', prevents 'admin' escalation
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  first_name_val text;
  last_name_val text;
  role_from_metadata text;
  assigned_role text;
begin
  RAISE NOTICE 'handle_new_user: Starting for user %', new.id;
  
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
  
  -- Extract role from metadata
  role_from_metadata := new.raw_user_meta_data->>'role';
  
  -- Security: Prevent privilege escalation - cannot set admin role via metadata
  -- If role is 'admin', default to 'client' instead
  -- Otherwise use the provided role or default to 'client'
  assigned_role := CASE
    WHEN role_from_metadata = 'admin' THEN 'client'
    WHEN role_from_metadata IN ('client', 'professional') THEN role_from_metadata
    ELSE 'client'
  END;
  
  RAISE NOTICE 'handle_new_user: Role from metadata: %, Assigned role: %', role_from_metadata, assigned_role;
  
  -- Create basic user record
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
    RAISE NOTICE 'handle_new_user: Created user record for %', new.id;
  exception when others then
    RAISE EXCEPTION 'Error creating user record: %', SQLERRM;
  end;
  
  -- Insert role (defaults to 'client', admin role blocked)
  begin
    insert into public.user_roles (
      user_id,
      role
    )
    values (
      new.id,
      assigned_role
    );
    RAISE NOTICE 'handle_new_user: Assigned role % to user %', assigned_role, new.id;
  exception when others then
    RAISE EXCEPTION 'Error creating user role record: %', SQLERRM;
  end;
  
  -- Create appropriate profile based on assigned role
  begin
    if assigned_role = 'professional' then
      insert into public.professional_profiles (user_id)
      values (new.id);
      RAISE NOTICE 'handle_new_user: Created professional profile for %', new.id;
    elsif assigned_role = 'client' then
      insert into public.client_profiles (user_id)
      values (new.id);
      RAISE NOTICE 'handle_new_user: Created client profile for %', new.id;
    end if;
  exception when others then
    RAISE EXCEPTION 'Error creating profile record: %', SQLERRM;
  end;
  
  return new;
end;
$function$;

-- Add a comment to document the change
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user with default client role. Prevents admin privilege escalation - admin role can only be assigned via admin panel.';
