set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_appointment_computed_status(p_date date, p_start_time time without time zone, p_end_time time without time zone, p_status text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  appointment_start_datetime timestamp with time zone;
  appointment_end_datetime timestamp with time zone;
  current_datetime timestamp with time zone;
begin
  -- If appointment is cancelled, return cancelled
  if p_status = 'cancelled' then
    return 'cancelled';
  end if;

  -- Convert appointment date and times to timestamps in UTC
  appointment_start_datetime := (p_date || ' ' || p_start_time)::timestamp at time zone 'UTC';
  appointment_end_datetime := (p_date || ' ' || p_end_time)::timestamp at time zone 'UTC';
  current_datetime := now() at time zone 'UTC';

  -- If appointment hasn't started yet, it's upcoming
  if current_datetime < appointment_start_datetime then
    return 'upcoming';
  end if;

  -- If appointment has ended, it's completed
  if current_datetime > appointment_end_datetime then
    return 'completed';
  end if;

  -- If we're between start and end time, it's ongoing
  return 'ongoing';
end;
$function$
;

create policy "Professionals can update payment amounts for ongoing appointmen"
on "public"."booking_payments"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM ((bookings b
     JOIN appointments a ON ((a.booking_id = b.id)))
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_payments.booking_id) AND (pp.user_id = auth.uid()) AND (get_appointment_computed_status(a.date, a.start_time, a.end_time, a.status) = 'ongoing'::text)))))
with check ((EXISTS ( SELECT 1
   FROM ((bookings b
     JOIN appointments a ON ((a.booking_id = b.id)))
     JOIN professional_profiles pp ON ((b.professional_profile_id = pp.id)))
  WHERE ((b.id = booking_payments.booking_id) AND (pp.user_id = auth.uid()) AND (get_appointment_computed_status(a.date, a.start_time, a.end_time, a.status) = 'ongoing'::text)))));



