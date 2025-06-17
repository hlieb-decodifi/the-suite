set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_portfolio_photo_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (select count(*) from public.portfolio_photos where user_id = new.user_id) >= 20 then
    raise exception 'Maximum of 20 portfolio photos allowed per professional';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_client(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
 SET search_path TO ''
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


