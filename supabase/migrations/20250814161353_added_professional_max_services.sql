alter table "public"."professional_profiles" add column "max_services" integer;

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
    insert into professional_profiles (user_id, max_services)
    values (
      new.id,
      get_admin_config('max_services_default', '50')::integer
    )
    on conflict (user_id) do nothing;
  end if;
  
  return new;
end;
$function$
;


