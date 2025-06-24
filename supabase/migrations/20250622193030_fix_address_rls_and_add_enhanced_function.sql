set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.insert_address_and_return_id(p_country text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_street_address text DEFAULT NULL::text, p_apartment text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_google_place_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  new_id uuid;
begin
  insert into addresses (
    country, 
    state, 
    city, 
    street_address,
    apartment,
    latitude,
    longitude,
    google_place_id
  ) values (
    p_country, 
    p_state, 
    p_city, 
    p_street_address,
    p_apartment,
    p_latitude,
    p_longitude,
    p_google_place_id
  ) returning id into new_id;
  
  return new_id;
end;
$function$
;


