set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_create_review(p_appointment_id uuid, p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  appointment_computed_status text;
  appointment_client_id uuid;
  appointment_professional_id uuid;
  existing_review_count integer;
begin
  -- Get appointment details
  select a.computed_status, b.client_id, pp.user_id into appointment_computed_status, appointment_client_id, appointment_professional_id
  from appointments_with_status a
  join bookings b on a.booking_id = b.id
  join professional_profiles pp on b.professional_profile_id = pp.id
  where a.id = p_appointment_id;
  
  -- Check if appointment exists
  if appointment_computed_status is null then
    return false;
  end if;
  
  -- Check if appointment is completed
  if appointment_computed_status != 'completed' then
    return false;
  end if;
  
  -- Check if requesting user is the client for this appointment
  if appointment_client_id != p_client_id then
    return false;
  end if;
  
  -- Check if review already exists for this appointment
  select count(*) into existing_review_count
  from reviews
  where appointment_id = p_appointment_id;
  
  if existing_review_count > 0 then
    return false;
  end if;
  
  return true;
end;
$function$
;


