-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing function and recreate it with the fix
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  user_role_id uuid;
  role_name text;
BEGIN
  -- Get the role from metadata with better error handling
  role_name := new.raw_user_meta_data->>'role';
  
  -- Log for debugging
  RAISE NOTICE 'Raw user meta data: %', new.raw_user_meta_data;
  RAISE NOTICE 'Role name extracted: %', role_name;
  
  -- Validate the role with better error message
  IF role_name IS NULL OR (role_name != 'client' AND role_name != 'professional') THEN
    RAISE NOTICE 'Invalid role specified: %', role_name;
    role_name := 'client'; -- Default to client if not specified properly
  END IF;
  
  -- Get the corresponding role ID with fully qualified schema
  SELECT id INTO user_role_id FROM public.roles WHERE name = role_name;
  
  IF user_role_id IS NULL THEN
    RAISE EXCEPTION 'Could not find role_id for role: %', role_name;
  END IF;
  
  -- Insert the user with the specified role
  BEGIN
    INSERT INTO public.users (
      id, 
      first_name, 
      last_name, 
      avatar_url, 
      role_id
    )
    VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'first_name', ''),
      COALESCE(new.raw_user_meta_data->>'last_name', ''),
      new.raw_user_meta_data->>'avatar_url',
      user_role_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating user record: %', SQLERRM;
  END;
  
  -- Create the appropriate profile based on role
  BEGIN
    IF role_name = 'professional' THEN
      INSERT INTO public.professional_profiles (user_id)
      VALUES (new.id);
    ELSIF role_name = 'client' THEN
      INSERT INTO public.client_profiles (user_id)
      VALUES (new.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating profile record: %', SQLERRM;
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 