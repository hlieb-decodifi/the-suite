set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_portfolio_photo_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if (select count(*) from portfolio_photos where user_id = new.user_id) >= 20 then
    raise exception 'Maximum of 20 portfolio photos allowed per professional';
  end if;
  return new;
end;
$function$
;


