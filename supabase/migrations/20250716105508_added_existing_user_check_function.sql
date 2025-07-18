set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.user_exists(p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- Check for email existence in the auth.users table
  return exists (select 1 from auth.users where lower(email) = lower(p_email));
end;
$function$
;


