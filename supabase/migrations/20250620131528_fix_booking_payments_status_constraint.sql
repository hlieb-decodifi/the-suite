set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_professional_availability()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (
    select 1 from appointments a
    join bookings b on a.booking_id = b.id
    where b.professional_profile_id = (
      select professional_profile_id from bookings where id = new.booking_id
    )
    and a.date = new.date
    and a.status != 'cancelled'
    and b.status not in ('pending_payment', 'cancelled') -- Exclude pending payments and cancelled bookings
    and a.booking_id != new.booking_id
    and (
      (new.start_time < a.end_time and new.end_time > a.start_time) -- time slots overlap
    )
  ) then
    raise exception 'Professional is already booked for this time slot';
  end if;
  return new;
end;
$function$
;


