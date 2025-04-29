-- Drop the existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with better error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  user_role_id uuid;
  role_name text;
  current_timestamp text := current_timestamp::text;
BEGIN
  -- Log function execution for debugging
  RAISE LOG 'handle_new_user() triggered for user: % at %', new.id, current_timestamp;
  
  -- Get the role from metadata with better error handling
  role_name := new.raw_user_meta_data->>'role';
  
  -- Log metadata
  RAISE LOG 'Raw user meta data: %', new.raw_user_meta_data;
  RAISE LOG 'Role name extracted: %', role_name;
  
  -- Validate the role with better error message
  IF role_name IS NULL OR (role_name != 'client' AND role_name != 'professional') THEN
    RAISE LOG 'Invalid role specified: %. Defaulting to client.', role_name;
    role_name := 'client'; -- Default to client if not specified properly
  END IF;
  
  -- Get the corresponding role ID with fully qualified schema
  BEGIN
    SELECT id INTO user_role_id FROM public.roles WHERE name = role_name;
    
    IF user_role_id IS NULL THEN
      RAISE LOG 'Could not find role_id for role: %. Using fallback query.', role_name;
      -- Fallback to simpler query
      SELECT id INTO user_role_id FROM roles WHERE name = 'client';
      
      IF user_role_id IS NULL THEN
        RAISE EXCEPTION 'Critical: Could not find any valid role ID';
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error finding role_id: %', SQLERRM;
    RAISE;
  END;
  
  -- Insert the user with the specified role
  BEGIN
    RAISE LOG 'Inserting into users table with role_id: %', user_role_id;
    
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
    
    RAISE LOG 'Successfully inserted user record for: %', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating user record: %', SQLERRM;
    RAISE;
  END;
  
  -- Create the appropriate profile based on role
  BEGIN
    IF role_name = 'professional' THEN
      RAISE LOG 'Creating professional profile for: %', new.id;
      INSERT INTO public.professional_profiles (user_id)
      VALUES (new.id);
    ELSIF role_name = 'client' THEN
      RAISE LOG 'Creating client profile for: %', new.id;
      INSERT INTO public.client_profiles (user_id)
      VALUES (new.id);
    END IF;
    
    RAISE LOG 'Successfully created profile for: %', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error creating profile record: %', SQLERRM;
    RAISE;
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Also ensure the roles exist
INSERT INTO public.roles (name) 
VALUES ('client'), ('professional'), ('admin')
ON CONFLICT (name) DO NOTHING;

-- Add a function to safely insert address and return the ID
CREATE OR REPLACE FUNCTION insert_address_and_return_id(
  p_country TEXT,
  p_state TEXT,
  p_city TEXT,
  p_street_address TEXT
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- bypasses RLS
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO addresses (country, state, city, street_address)
  VALUES (p_country, p_state, p_city, p_street_address)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_address_and_return_id TO authenticated;