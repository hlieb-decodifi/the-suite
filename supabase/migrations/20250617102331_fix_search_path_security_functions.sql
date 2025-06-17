-- Fix security warning: Add search_path to functions
-- This prevents schema poisoning attacks

-- Update is_professional function
CREATE OR REPLACE FUNCTION public.is_professional(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Update is_client function
CREATE OR REPLACE FUNCTION public.is_client(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;